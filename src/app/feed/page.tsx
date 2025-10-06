/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import RequireAuth from "../components/RequireAuth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

export default function FeedPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveRole>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sb = supabaseBrowser();

        // load active role
        const { data: user } = await sb.auth.getUser();
        if (user.user?.id) {
          const { data: p } = await sb
            .from("profiles")
            .select("active_role")
            .eq("id", user.user.id)
            .single();
          setActive((p?.active_role as ActiveRole) ?? null);
        }

        // token for API
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch("/api/open-requests", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          if (!cancelled) setError(json?.error || `HTTP ${res.status}`);
        } else {
          if (!cancelled) setData(json.data || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function applyTo(request_id: string) {
    try {
      setPostingId(request_id);
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ request_id, message: applyMsg, bid_cents: null }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert(json?.error || `HTTP ${res.status}`);
      } else {
        alert("Applied!");
        setApplyMsg("");
      }
    } finally {
      setPostingId(null);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Browse Offers</h1>

        {loading && <p>Loading…</p>}
        {!loading && error && <p className="text-red-600">Error: {error}</p>}
        {!loading && !error && data.length === 0 && (
          <p>No offers available yet. Check back soon!</p>
        )}

        <ul className="space-y-3">
          {data.map((r: any) => (
            <li key={r.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{r.title}</h2>
                <span className="text-sm opacity-70">
                  ${Math.round(r.offer_cents / 100).toLocaleString()}
                </span>
              </div>
              <p className="text-sm opacity-80">
                {r.category} • {r.location}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/r/${r.id}`}
                  className="text-blue-600 text-sm inline-block"
                >
                  View
                </Link>

                {active === "wedflexer" && (
                  <>
                    <input
                      className="border rounded px-2 py-1 text-sm flex-1"
                      placeholder="Optional message to the couple"
                      value={applyMsg}
                      onChange={(e) => setApplyMsg(e.target.value)}
                    />
                    <button
                      onClick={() => applyTo(r.id)}
                      disabled={postingId === r.id}
                      className="bg-black text-white text-sm rounded px-3 py-1 disabled:opacity-60"
                    >
                      {postingId === r.id ? "Applying…" : "Apply"}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </RequireAuth>
  );
}
