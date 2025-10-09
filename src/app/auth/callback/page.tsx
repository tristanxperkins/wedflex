"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

// Avoid prerendering; this page needs request-time URL params
export const dynamic = "force-dynamic";

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const sb = supabaseBrowser();

    (async () => {
      try {
        // Handle ?code=... (OAuth/code-style links)
        const code = sp.get("code");
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Magic link (#access_token) is auto-handled by the SDK on init
        const { data } = await sb.auth.getSession();
        if (data.session) {
          const returnTo = sp.get("returnTo");
          router.replace(returnTo || "/feed");
          return;
        }

        // Fallback: wait for session
        const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
          if (session) {
            const returnTo = sp.get("returnTo");
            router.replace(returnTo || "/feed");
          }
        });

        // cleanup after a few seconds
        setTimeout(() => sub.subscription.unsubscribe(), 8000);
      } catch (e) {
        console.error(e);
        router.replace("/auth/signin?error=callback");
      }
    })();
  }, [router, sp]);

  return <main className="p-6">Signing you in…</main>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="p-6">Signing you in…</main>}>
      <CallbackInner />
    </Suspense>
  );
}
