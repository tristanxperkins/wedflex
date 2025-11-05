/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import { supabaseBrowser } from "../../../supabase/client";

type PaymentRow = {
  id: string;
  amount_cents: number;
  status: "pending" | "escrowed" | "released" | "refunded";
  created_at: string;
};

export default function WedflexerEarningsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeErr, setStripeErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const sb = supabaseBrowser();
        const { data: me, error: meErr } = await sb.auth.getUser();
        if (meErr || !me?.user) throw new Error(meErr?.message || "Not authenticated");

        const { data, error } = await sb
          .from("payments")
          .select("id,amount_cents,status,created_at")
          .eq("wedflexer_id", me.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRows((data ?? []) as PaymentRow[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEarned = useMemo(
    () =>
      rows
        .filter((p) => p.status === "released")
        .reduce((sum, p) => sum + p.amount_cents, 0) / 100,
    [rows],
  );

  const upcoming = useMemo(
    () =>
      rows
        .filter((p) => p.status === "pending" || p.status === "escrowed")
        .reduce((sum, p) => sum + p.amount_cents, 0) / 100,
    [rows],
  );

  const completedJobs = useMemo(
    () => rows.filter((p) => p.status === "released").length,
    [rows],
  );

  async function openStripeExpress() {
    try {
      setStripeLoading(true);
      setStripeErr(null);

      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/stripe/express-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json?.ok || !json.url) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      // Redirect to Stripe Express dashboard
      window.open(json.url as string, "_blank","noopener,noreferrer");
    } catch (e) {
      setStripeErr(e instanceof Error ? e.message : String(e));
    } finally {
      setStripeLoading(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Earnings</h1>
            <p className="text-sm text-slate-600">
              Track what you&apos;ve made on WedFlex and jump into your Stripe Express
              dashboard for full payout details.
            </p>
          </header>

          {err && <p className="text-sm text-red-600">Error: {err}</p>}
          {loading && <p className="text-sm text-slate-500">Loading earnings…</p>}

          {!loading && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Kpi label="Total earnings (released)" value={`$${totalEarned.toFixed(2)}`} />
                <Kpi label="Upcoming earnings" value={`$${upcoming.toFixed(2)}`} />
                <Kpi label="Completed jobs" value={completedJobs} />
              </div>

              {/* Stripe Express section */}
              <section className="border rounded-lg p-4 space-y-3">
                <h2 className="font-semibold mb-1">Stripe Express dashboard</h2>
                <p className="text-sm text-slate-600">
                  View your payouts and tax forms in your Stripe Express dashboard.
                  Stripe handles your banking details securely; WedFlex just sends your payouts.
                </p>
                <button
                  type="button"
                  onClick={openStripeExpress}
                  disabled={stripeLoading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
                >
                  {stripeLoading ? "Opening…" : "Open Stripe dashboard"}
                </button>
                {stripeErr && (
                  <p className="text-xs text-red-600">Stripe error: {stripeErr}</p>
                )}
              </section>

              {/* Payments list */}
              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Payment history</h2>
                {rows.length === 0 ? (
                  <p className="text-sm text-slate-500">No payments yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="text-left py-2 px-2">Date</th>
                          <th className="text-left py-2 px-2">Status</th>
                          <th className="text-right py-2 px-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 px-2">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                            <td className="py-2 px-2 capitalize">{p.status}</td>
                            <td className="py-2 px-2 text-right">
                              ${(p.amount_cents / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
