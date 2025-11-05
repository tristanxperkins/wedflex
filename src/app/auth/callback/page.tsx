"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const supabase = supabaseBrowser();

      // 1) Figure out where to go after auth
      const next = url.searchParams.get("next") || "/dashboard/couple";

      // 2) If we already have a session, just go there
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.replace(next);
          return;
        }
      } catch {
        // ignore and fall through to exchange
      }

      // 3) Try to exchange the auth info from URL
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const search = url.search.startsWith("?") ? url.search.slice(1) : url.search;
      const hasCode = url.searchParams.get("code");

      try {
        let error = null as unknown;

        if (hash) {
          // Magic link / email flow – Supabase puts tokens in the hash fragment
          const res = await supabase.auth.exchangeCodeForSession(hash);
          error = res.error;
        } else if (hasCode) {
          // PKCE / OAuth-style flow – pass the full query string
          const res = await supabase.auth.exchangeCodeForSession(search);
          error = res.error;
        } else {
          // Nothing to exchange – probably hit directly
          router.replace("/auth/signin");
          return;
        }

        if (error) {
          console.error("Supabase exchange error:", error);
          router.replace(
            "/auth/signin?error=" +
              encodeURIComponent(
                (error as { message?: string })?.message || "Sign-in failed",
              ),
          );
          return;
        }

        // 4) Success – go to funnel destination
        router.replace(next);
      } catch (e) {
        console.error("Auth callback fatal error:", e);
        router.replace("/auth/signin");
      }
    })();
  }, [router]);

  return (
    <main className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-slate-600">Signing you in…</p>
    </main>
  );
}
