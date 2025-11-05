"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client"; // adjust if your path differs

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/dashboard/couple";

      // No code? This is an invalid/old callback, send them to sign-in
      if (!code) {
        router.replace("/auth/signin");
        return;
      }

      const supabase = supabaseBrowser();

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Supabase exchange error:", error);
          router.replace(
            "/auth/signin?error=" +
              encodeURIComponent(error.message || "Sign-in failed")
          );
          return;
        }

        // Success → go where the funnel wanted, or default dashboard
        router.replace(next);
      } catch (e) {
        console.error("Auth callback error:", e);
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
