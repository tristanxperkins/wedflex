/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import DashboardSidebar from "../../../components/DashboardSidebar";

type Payment = {
  id: string;
  amount_cents: number;
  status: "escrowed" | "released" | "refunded";
  created_at: string;
  service_requests: { title: string | null; status: string } | null; // single or null
};

type RawPayment = {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  service_requests?: { title: string | null; status: string } | { title: string | null; status: string }[] | null;
};

export default function WedflexerEarningsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        const { data, error } = await sb
          .from("payments")
          .select("id, amount_cents, status, created_at, service_requests(title,status)")
          .eq("wedflexer_id", uid)
          .order("created_at", { ascending: false });
        if (error) throw error;

const normalized: Payment[] = (data ?? []).map((r: RawPayment) => ({
  id: r.id,
  amount_cents: r.amount_cents,
  status: r.status as Payment["status"],
  created_at: r.created_at,
  service_requests: Array.isArray(r.service_requests)
    ? (r.service_requests[0] ?? null)
    : (r.service_requests ?? null),
}));

setRows(normalized);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + r.amount_cents, 0), [rows]);
  const released = useMemo(
    () => rows.filter(r => r.status === "released").reduce((s, r) => s + r.amount_cents, 0),
    [rows]
  );
  const escrowed = useMemo(
    () => rows.filter(r => r.status === "escrowed").reduce((s, r) => s + r.amount_cents, 0),
    [rows]
  );
  const completedJobs = useMemo(
    () => rows.filter(r => r.status === "released").length,
    [rows]
  );
  const avgBooking = useMemo(
    () => (rows.length ? total / rows.length / 100 : 0),
    [total, rows]
  );

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Earnings Dashboard</h1>
          {loading && <p>Loading earnings…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}

          {!loading && !err && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Earnings" value={`$${(total/100).toLocaleString()}`} />
                <Stat label="Released Payouts" value={`$${(released/100).toLocaleString()}`} />
                <Stat label="In Escrow" value={`$${(escrowed/100).toLocaleString()}`} />
                <Stat label="Avg Booking" value={`$${avgBooking.toFixed(2)}`} />
                <Stat label="Completed Jobs" value={completedJobs.toString()} />
              </div>

              <div className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Recent Transactions</h2>
                {rows.length === 0 ? (
                  <p className="text-sm opacity-70">No transactions yet.</p>
                ) : (
                  <ul className="divide-y">
                    {rows.map(r => (
                      <li key={r.id} className="py-3 flex justify-between">
                        <div>
                          <div className="font-medium">{r.service_requests?.title ?? "Unnamed Service"}</div>
                          <div className="text-xs opacity-70">
                            {r.status} • {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="font-semibold">${(r.amount_cents/100).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 text-center bg-green-50">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
