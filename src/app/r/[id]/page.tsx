/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "../../supabase/client";
import RequireAuth from "../../components/RequireAuth";

type ActiveRole = "couple" | "wedflexer" | null;

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [reqRow, setReqRow] = useState<any | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [active, setActive] = useState<ActiveRole>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applyMsg, setApplyMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const sb = supabaseBrowser();

        // Who am I? + active role
        const { data: me } = await sb.auth.getUser();
        if (me?.user?.id) {
          const { data: p } = await sb
            .from("profiles")
            .select("active_role")
            .eq("id", me.user.id)
            .single();
          setActive((p?.active_role as ActiveRole) ?? null);
        }

        // token
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        // load request (+apps if owner) via API
        const res = await fetch(`/api/requests/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        setReqRow(json.request);
        setApps(json.applications || []);
        if (me?.user?.id && json.request?.couple_id === me.user.id) setIsOwner(true);
      } catch (e: any) {
        if (!cancel) setErr(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  async function apply() {
    try {
      setPosting(true);
      setOkMsg(null); setErr(null);
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ request_id: id, message: applyMsg, bid_cents: null }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setOkMsg("Applied!");
      setApplyMsg("");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}
        {!loading && reqRow && (
          <>
            <h1 className="text-2xl font-semibold mb-1">{reqRow.title}</h1>
            <p className="opacity-80 text-sm mb-4">
              {reqRow.category} • {reqRow.location} • ${Math.round(reqRow.offer_cents/100).toLocaleString()}
            </p>

            {active === "wedflexer" && (
              <section className="border rounded-lg p-4 mb-6">
                <h2 className="font-medium mb-2">Apply to this offer</h2>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  placeholder="Optional message to the couple"
                  value={applyMsg}
                  onChange={(e) => setApplyMsg(e.target.value)}
                />
                <button
                  onClick={apply}
                  disabled={posting}
                  className="mt-2 bg-black text-white rounded px-4 py-2 disabled:opacity-60"
                >
                  {posting ? "Applying…" : "Send Application"}
                </button>
                {okMsg && <p className="text-green-700 mt-2">{okMsg}</p>}
              </section>
            )}

            {isOwner && (
              <section className="border rounded-lg p-4">
                <h2 className="font-medium mb-3">Applications</h2>
                {apps.length === 0 && <p className="text-sm opacity-70">No applications yet.</p>}
                <ul className="space-y-3">
                  {apps.map((a: any) => (
                    <li key={a.id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <strong>{a.wedflexer_id}</strong>
                        {a.bid_cents != null && (
                          <span className="text-sm opacity-70">
                            Bid ${Math.round(a.bid_cents/100).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {a.message && <p className="text-sm mt-2">{a.message}</p>}
                      <p className="text-xs opacity-60 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </RequireAuth>
  );
}
