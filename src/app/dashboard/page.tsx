"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";

type KPIs = {
  totals: { total_requests: number; open: number; awarded: number; closed: number };
  applicationsReceived: number;
  escrow: { escrowed_cents: number; released_cents: number; refunded_cents: number };
};

type RequestRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  awarded_wedflexer_id?: string | null;
};

type PaymentRow = {
  amount_cents: number;
  status: "escrowed" | "released" | "refunded";
  created_at: string;
};

export default function CoupleDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestRow[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [allRequests, setAllRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch("/api/couple-dashboard", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        if (!cancel) {
          setKpis(json.kpis);
          setRecentRequests(json.recentRequests || []);
          setRecentPayments(json.recentPayments || []);
          setAllRequests(json.allRequests || []);
        }
      } catch (e: unknown) {
        if (!cancel) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true };
  }, []);

  const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;

  return (
    <RequireAuth>
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <header>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="opacity-70 text-sm">Track requests, applications, and escrow.</p>
        </header>

        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}

        {kpis && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Requests" value={kpis.totals.total_requests} />
            <KpiCard label="Open" value={kpis.totals.open} />
            <KpiCard label="Applications" value={kpis.applicationsReceived} />
            <KpiCard label="Awarded" value={kpis.totals.awarded} />
            <KpiCard label="Escrowed" value={money(kpis.escrow.escrowed_cents)} />
            <KpiCard label="Released" value={money(kpis.escrow.released_cents)} />
            <KpiCard label="Refunded" value={money(kpis.escrow.refunded_cents)} />
            <KpiLink label="Post New Request" href="/post-offer" />
          </section>
        )}

        {/* Recent activity */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Recent Requests</h2>
            <ul className="space-y-3">
              {recentRequests.map((r) => (
                <li key={r.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <Link href={`/r/${r.id}`} className="font-medium hover:underline">
                        {r.title}
                      </Link>
                      <p className="text-xs opacity-70">
                        {r.category} • {r.status} • {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link className="text-purple-700 text-sm hover:underline" href={`/r/${r.id}`}>
                      View →
                    </Link>
                  </div>
                </li>
              ))}
              {recentRequests.length === 0 && <p className="text-sm opacity-70">No requests yet.</p>}
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Recent Escrow Activity</h2>
            <ul className="space-y-3">
              {recentPayments.map((p, i) => (
                <li key={i} className="border rounded p-3 flex justify-between">
                  <span className="text-sm">
                    {new Date(p.created_at).toLocaleString()} • {p.status}
                  </span>
                  <span className="font-medium">{money(p.amount_cents)}</span>
                </li>
              ))}
              {recentPayments.length === 0 && <p className="text-sm opacity-70">No escrow yet.</p>}
            </ul>
          </div>
        </section>

        {/* Full table of requests */}
        <section className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">All My Requests</h2>
            <Link href="/post-offer" className="text-purple-700 text-sm hover:underline">
              + Post Offer
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {allRequests.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2">{r.title}</td>
                    <td className="py-2">{r.category}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      <Link href={`/r/${r.id}`} className="text-purple-700 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {allRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 opacity-70">
                      No requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function KpiLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="border rounded-lg p-4 hover:bg-purple-50 transition">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-sm text-purple-700 mt-1">Go →</div>
    </Link>
  );
}
