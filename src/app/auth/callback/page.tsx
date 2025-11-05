"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

function toErr(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        // 1) Exchange the code in the URL for a Supabase session
        const { data, error } = await sb.auth.exchangeCodeForSession(
          window.location.href,
        );
        if (error) throw error;

        // 2) Parse query params from the current URL (no useSearchParams)
        const url = new URL(window.location.href);
        const roleParam = url.searchParams.get("role");
        const next = url.searchParams.get("next") || undefined;

        let activeRole: ActiveRole = null;
        if (roleParam === "couple" || roleParam === "wedflexer") {
          activeRole = roleParam;

          // 3) Persist active_role in the profiles table via /api/me
          const { data: sess } = await sb.auth.getSession();
          const token = sess.session?.access_token;

          if (token) {
            try {
              const res = await fetch("/api/me", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ active_role: activeRole }),
              });
              // ignore JSON format errors; best effort
              await res.json().catch(() => undefined);
            } catch {
              // swallow; not fatal to auth
            }
          }
        }

        // 4) Decide where to send them
        if (next) {
          router.replace(next);
        } else if (activeRole === "couple") {
          router.replace("/dashboard/couple");
        } else if (activeRole === "wedflexer") {
          router.replace("/dashboard/wedflexer");
        } else {
          // generic login → default to couple dashboard
          router.replace("/dashboard/couple");
        }
      } catch (e) {
        setErr(toErr(e));
      }
    })();
  }, [router]);

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-lg font-semibold mb-2">Signing you in…</h1>
      {err ? (
        <p className="text-sm text-red-600 break-words">Error: {err}</p>
      ) : (
        <p className="text-sm text-slate-600">
          Please wait, we&apos;re finishing your sign-in and redirecting you.
        </p>
      )}
    </main>
  );
}
