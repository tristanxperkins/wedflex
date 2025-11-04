"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        // Make sure Supabase has an active session
        const { data: sess, error: sErr } = await sb.auth.getSession();
        if (sErr) throw sErr;
        if (!sess.session) throw new Error("No active session");

        // 1) Read `next` from the URL if present
        let next: string | null = null;
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          next = url.searchParams.get("next");
        }

        // SPECIAL CASE: if next is "/dashboard", we'll decide based on role below
        const wantsGenericDashboard = next === "/dashboard";

        // 2) If no next param (or it's just "/dashboard" or "/"), derive from role
        if (!next || next === "/" || wantsGenericDashboard) {
          const { data: me } = await sb.auth.getUser();
          const uid = me?.user?.id;
          let role: "couple" | "wedflexer" | null = null;

          if (uid) {
            const { data: prof } = await sb
              .from("profiles")
              .select("active_role")
              .eq("id", uid)
              .single();

            role = (prof?.active_role as "couple" | "wedflexer" | null) ?? null;
          }

          if (role === "wedflexer") {
            next = "/dashboard/wedflexer";
          } else if (role === "couple") {
            next = "/dashboard/couple";
          } else {
            next = "/feed"; // fallback if no role yet
          }
        }

        router.replace(next);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [router]);

  return (
    <main className="max-w-md mx-auto px-4 py-10 text-center">
      <h1 className="text-xl font-semibold mb-2">Finishing sign-in…</h1>
      {!err ? (
        <p className="text-sm text-slate-600">
          Please wait while we redirect you.
        </p>
      ) : (
        <p className="text-sm text-red-600">Error: {err}</p>
      )}
    </main>
  );
}
