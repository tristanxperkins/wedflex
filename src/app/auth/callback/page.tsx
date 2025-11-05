"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client"; // adjust path if needed

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      const code = searchParams.get("code");
      // if you're using PKCE explicitly and have code_verifier in URL:
      const codeVerifier = searchParams.get("code_verifier");

      // ✅ No code? Don't call Supabase at all – just send them to signin.
      if (!code) {
        router.replace("/auth/signin");
        return;
      }

      const supabase = supabaseBrowser();

      // For supabase-js v2, normally you only pass `code`:
      // https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Supabase exchange error:", error);
        router.replace(
          "/auth/signin?error=" + encodeURIComponent(error.message || "Sign-in failed")
        );
        return;
      }

      // Optional: read ?next=… for redirects (we used this for couple/wedflexer funnels)
      const next = searchParams.get("next") || "/dashboard/couple";
      router.replace(next);
    })();
  }, [router, searchParams]);

  return (
    <main className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-slate-600">Signing you in…</p>
    </main>
  );
}
