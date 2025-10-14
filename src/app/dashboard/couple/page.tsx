"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { supabaseBrowser } from "../../supabase/client";
import DashboardSidebar from "../../components/DashboardSidebar";

type RequestRow = { id: string; title: string; status: "open"|"awarded"|"closed"|"cancelled"; offer_cents: number|null; created_at: string; };
type PaymentRow = { id: string; amount_cents: number; status: "escrowed"|"released"|"refunded"; created_at: string; };

export default function CoupleDashboard() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingApps, setPendingApps] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // My requests
        const { data: reqs, error: rErr } = await sb
          .from("service_requests")
          .select("id,title,status,offer_cents,created_at")
          .eq("couple_id", uid)
          .order("created_at", { ascending: false });
        if (rErr) throw rErr;

        // Pending applications received to my requests
        let pending = 0;
        if (reqs && reqs.length) {
          const ids = reqs.map(r => r.id);
          const { count, error: cErr } = await sb
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("request_id", ids)
            .eq("status", "pending");
          if (cErr) throw cErr;
          pending = count ?? 0;
        }

        // My payments
        const { data: pays, error: pErr } = await sb
          .from("payments")
          .select("id,amount_cents,status,created_at")
          .eq("couple_id", uid)
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;

        setRequests(reqs ?? []);
        setPayments(pays ?? []);
        setPendingApps(pending);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEscrow = useMemo(
    () => payments.filter(p => p.status === "escrowed").reduce((s,p)=>s+p.amount_cents,0),
    [payments]
  );
  const totalReleased = useMemo(
    () => payments.filter(p => p.status === "released").reduce((s,p)=>s+p.amount_cents,0),
    [payments]
  );
  const activeOffers = requests.filter(r => r.status === "open").length;
  const booked = requests.filter(r => r.status === "awarded").length;
  const completed = requests.filter(r => r.status === "closed").length;

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />
        <section className="space-y-8">
          <header>
            <h1 className="text-2xl font-bold">WedFlex for Couples</h1>
            <p className="opacity-70">Your central hub for planning your affordable, dream wedding.</p>
          </header>

          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}
          {!loading && !err && (
            <>
              {/* KPIs */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Active Offers" value={activeOffers} />
                <Kpi label="Pending Applications" value={pendingApps} />
                <Kpi label="Booked Services" value={booked} />
                <Kpi label="Completed" value={completed} />
              </section>

              <div className="flex justify-end">
                <Link href="/post-offer" className="bg-purple-700 text-white text-sm rounded px-4 py-2">
                  + Post New Offer
                </Link>
              </div>

              {/* Requests table */}
              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Your Requests</h2>
                {requests.length === 0 ? (
                  <p className="text-sm opacity-70">No requests yet.</p>
                ) : (
                  <ul className="divide-y">
                    {requests.map(r=>(
                      <li key={r.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs opacity-70">
                            {r.status} • {new Date(r.created_at).toLocaleDateString()}
                            {typeof r.offer_cents === "number" ? ` • $${Math.round(r.offer_cents/100).toLocaleString()}` : ""}
                          </div>
                        </div>
                        <Link href={`/r/${r.id}`} className="text-purple-700 text-sm hover:underline">View →</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Payments summary (no escrow breakdown shown here) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card title="Total Released Spend" value={`$${(totalReleased/100).toLocaleString()}`} />
                <Card title="Currently In Escrow" value={`$${(totalEscrow/100).toLocaleString()}`} />
              </section>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

function Kpi({label, value}:{label:string; value:string|number}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
function Card({title, value}:{title:string; value:string}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
