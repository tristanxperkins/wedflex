"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { supabaseBrowser } from "../../supabase/client";
import DashboardSidebar from "../../components/DashboardSidebar";
import Image from "next/image";

type ServiceReq = {
  id: string;
  title: string;
  status: "open" | "awarded" | "closed" | "cancelled";
};

type AppRow = {
  id: string;
  request_id: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | null;
  bid_cents: number | null;
  created_at: string;
  service_requests?: ServiceReq | null;
};

type RawAppRow = {
  id: string;
  request_id: string;
  status: string | null;
  bid_cents: number | null;
  created_at: string;
  service_requests?:
    | { id: string; title: string; status: "open" | "awarded" | "closed" | "cancelled" }
    | Array<{ id: string; title: string; status: "open" | "awarded" | "closed" | "cancelled" }>
    | null;
};

type PayRow = {
  id: string;
  amount_cents: number;
  status: "escrowed" | "released" | "refunded";
  created_at: string;
};

type Profile = {
  id: string;
  avatar_url: string | null;
  active_role: "couple" | "wedflexer" | null;
};

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

export default function WedflexerDashboard() {
  const [p, setP] = useState<Profile | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [pays, setPays] = useState<PayRow[]>([]);
  const [activeOffers, setActiveOffers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // Load minimal profile (for avatar)
        const { data: prof } = await sb
          .from("profiles")
          .select("id, avatar_url, active_role")
          .eq("id", uid)
          .single();
        if (prof) setP(prof as Profile);

        // Applications with joined request
const { data: myApps, error: aErr } = await sb
  .from("applications")
  .select(
    "id, request_id, status, bid_cents, created_at, service_requests:service_requests!applications_request_id_fkey(id,title,status)"
  )
  .eq("wedflexer_id", uid)
  .order("created_at", { ascending: false });

if (aErr) throw aErr;

        const normalizedApps: AppRow[] = (myApps ?? []).map((a: RawAppRow) => ({
  id: a.id,
  request_id: a.request_id,
  status: (a.status ?? "pending") as AppRow["status"],
  bid_cents: a.bid_cents,
  created_at: a.created_at,
  service_requests: Array.isArray(a.service_requests)
    ? (a.service_requests[0] ?? null)
    : (a.service_requests ?? null),
}));

        // Payments list
        const { data: myPays, error: pErr } = await sb
          .from("payments")
          .select("id, amount_cents, status, created_at")
          .eq("wedflexer_id", uid)
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;

        // Count of open requests
        const { count, error: rErr } = await sb
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "open");
        if (rErr) throw rErr;

        setApps(normalizedApps);
        setPays((myPays ?? []) as PayRow[]);
        setActiveOffers(count ?? 0);
      } catch (e) {
        setErr(toErrorString(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = useMemo(
    () => apps.filter((a) => a.status === "pending").length,
    [apps]
  );
  const booked = useMemo(
    () => apps.filter((a) => a.status === "accepted").length,
    [apps]
  );
  const completed = useMemo(
    () => apps.filter((a) => a.service_requests?.status === "closed").length,
    [apps]
  );

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-8">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">WedFlexer Dashboard</h1>
              <p className="opacity-70">Track your applications, bookings, and payouts.</p>
            </div>
            <div className="h-16 w-16 relative rounded-full overflow-hidden border">
              <Image
                src={p?.avatar_url || "/avatar-placeholder.png"}
                alt="Profile avatar"
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </div>
          </header>

          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {toErrorString(err)}</p>}


          {!loading && !err && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Active Offers" value={activeOffers} />
                <Kpi label="Pending Applications" value={pending} />
                <Kpi label="Booked Services" value={booked} />
                <Kpi label="Completed" value={completed} />
              </section>

              <div className="flex justify-end">
                <Link
                  href="/feed"
                  className="bg-purple-700 text-white text-sm rounded px-4 py-2"
                >
                  Browse Offers
                </Link>
              </div>

              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">My Applications</h2>
                {apps.length === 0 ? (
                  <p className="text-sm opacity-70">No applications yet.</p>
                ) : (
                  <ul className="divide-y">
                    {apps.map((a) => (
                      <li key={a.id} className="py-3 flex justify-between">
                        <div>
                          <div className="font-medium">
                            {a.service_requests?.title ?? a.request_id}
                          </div>
                          <div className="text-xs opacity-70">
                            App: {a.status ?? "pending"} • Request:{" "}
                            {a.service_requests?.status ?? "unknown"}
                            {typeof a.bid_cents === "number"
                              ? ` • Bid $${Math.round(a.bid_cents / 100).toLocaleString()}`
                              : ""}
                          </div>
                        </div>
                        <Link
                          href={`/r/${a.request_id}`}
                          className="text-purple-700 text-sm hover:underline"
                        >
                          View →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Payments</h2>
                {pays.length === 0 ? (
                  <p className="text-sm opacity-70">No payments yet.</p>
                ) : (
                  <ul className="divide-y">
                    {pays.map((p) => (
                      <li key={p.id} className="py-3 flex justify-between">
                        <span className="text-sm">
                          {p.status} • {new Date(p.created_at).toLocaleString()}
                        </span>
                        <span className="font-medium">
                          ${(p.amount_cents / 100).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
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
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
