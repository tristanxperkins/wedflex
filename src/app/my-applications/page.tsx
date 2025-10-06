/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import RequireAuth from "../components/RequireAuth";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../supabase/client";

type Row = {
  id: string;
  request_id: string;
  wedflexer_id: string;
  message: string | null;
  bid_cents: number | null;
  created_at: string;
  title?: string;
};

export default function MyApplicantsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const sb = supabaseBrowser();
      // We’ll fetch in two steps to keep RLS simple:
      // 1) My request ids (as couple)
      const { data: me } = await sb.auth.getUser();
      if (!me?.user?.id) return;

      const { data: myReqs } = await sb
        .from("service_requests")
        .select("id, title")
        .eq("couple_id", me.user.id);

      const mapTitle = new Map<string, string>();
      (myReqs ?? []).forEach((r: any) => mapTitle.set(r.id, r.title));

      // 2) Applications to those requests
      const { data: apps, error } = await sb
        .from("applications")
        .select("id, request_id, wedflexer_id, message, bid_cents, created_at")
        .in("request_id", (myReqs ?? []).map((r: any) => r.id))
        .order("created_at", { ascending: false });

      if (cancel) return;
      if (error) setErr(error.message);
      else
        setRows(
          (apps ?? []).map((a: any) => ({
            ...a,
            title: mapTitle.get(a.request_id),
          }))
        );
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Applications to My Requests</h1>
        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}
        {!loading && !err && rows.length === 0 && <p>No applications yet.</p>}
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <strong>{a.title ?? a.request_id.slice(0, 8)}</strong>
                {a.bid_cents != null && (
                  <span className="text-sm opacity-70">
                    Bid ${Math.round(a.bid_cents / 100).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-sm opacity-80">From: {a.wedflexer_id}</p>
              {a.message && <p className="mt-2 text-sm">{a.message}</p>}
            </li>
          ))}
        </ul>
      </main>
    </RequireAuth>
  );
}
