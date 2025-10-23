/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

export default function RolesPage() {
  const [role, setRole] = useState<ActiveRole>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const [{ data: me }, { data: prof, error }] = await Promise.all([
          sb.auth.getUser(),
          sb.from("profiles").select("active_role").single(),
        ]);

        if (!me?.user) {
          router.replace("/auth/signin");
          return;
        }
        if (error && error.code !== "PGRST116") throw error; // ignore "Results contain 0 rows"

        setEmail(me.user.email ?? null);
        setRole((prof?.active_role as ActiveRole) ?? null);
      } catch (e) {
        setErr(toErrorString(e));
      }
    })();
  }, [router]);

  async function choose(next: Exclude<ActiveRole, null>) {
    try {
      setBusy(true);
      setErr(null);
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: next }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setRole(next);
      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) {
      setErr(toErrorString(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Choose your role</h1>
        {email && <p className="text-sm opacity-70 mb-4">{email}</p>}
        {err && <p className="text-red-600 mb-3">Error: {err}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => choose("couple")}
            disabled={busy}
            className={`border rounded-lg p-4 text-left hover:shadow ${
              role === "couple" ? "border-purple-700" : "border-gray-200"
            }`}
          >
            <div className="text-lg font-medium">Couple</div>
            <p className="text-sm opacity-70">
              Post offers, review applications, manage your wedding.
            </p>
            {role === "couple" && <div className="text-purple-700 text-sm mt-2">Current</div>}
          </button>

          <button
            onClick={() => choose("wedflexer")}
            disabled={busy}
            className={`border rounded-lg p-4 text-left hover:shadow ${
              role === "wedflexer" ? "border-purple-700" : "border-gray-200"
            }`}
          >
            <div className="text-lg font-medium">WedFlexer</div>
            <p className="text-sm opacity-70">
              Browse offers, apply, track bookings and earnings.
            </p>
            {role === "wedflexer" && <div className="text-purple-700 text-sm mt-2">Current</div>}
          </button>
        </div>

        <p className="text-xs opacity-60 mt-4">
          You can switch roles anytime from here or the top nav toggle.
        </p>
      </main>
    </RequireAuth>
  );
}
