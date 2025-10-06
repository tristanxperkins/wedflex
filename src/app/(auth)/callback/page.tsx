"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();

    // Magic link (hash) or OAuth (code) are both handled by the SDK
    // We just wait for a session and then redirect.
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/feed"); // or wherever you want to land users
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/feed");
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return <main className="p-6">Signing you in…</main>;
}
