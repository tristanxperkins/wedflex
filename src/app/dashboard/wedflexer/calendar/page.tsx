"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import DashboardSidebar from "../../../components/DashboardSidebar";
import MonthGrid, { type CalendarItem } from "../../../components/MonthGrid";

type Row = {
  id: string;
  title: string;
  event_at: string | null;
  status: "open" | "awarded" | "closed" | "cancelled";
};

type Pay = {
  id: string;
  amount_cents: number;
  status: "escrowed" | "released" | "refunded";
  created_at: string;
};

export default function WedflexerCalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [jobs, setJobs] = useState<Row[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // Requests where I am the awarded provider
        const { data: reqs, error: rErr } = await sb
          .from("service_requests")
          .select("id,title,event_at,status")
          .eq("awarded_wedflexer_id", uid)
          .in("status", ["awarded","closed"])
          .order("event_at", { ascending: true });
        if (rErr) throw rErr;

        // My payments
        const { data: payments, error: pErr } = await sb
          .from("payments")
          .select("id,amount_cents,status,created_at")
          .eq("wedflexer_id", uid)
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;

        setJobs((reqs ?? []) as Row[]);
        setPays((payments ?? []) as Pay[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items: CalendarItem[] = useMemo(
    () =>
      jobs
        .filter(r => r.event_at)
        .map(r => ({
          id: r.id,
          when: r.event_at as string,
          title: `${r.title} (${r.status})`,
          href: `/r/${r.id}`,
        })),
    [jobs]
  );

  function prevMonth() { setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  // Simple payout ETA: show escrowed amounts for awarded jobs (release typically at/after event date)
  const upcomingEarnings = useMemo(
    () => pays.filter(p => p.status === "escrowed").reduce((s,p)=>s+p.amount_cents,0),
    [pays]
  );

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}

          {!loading && !err && (
            <>
              <div className="border rounded-lg p-4 bg-green-50 text-green-900">
                Upcoming earnings in escrow: <strong>${(upcomingEarnings/100).toLocaleString()}</strong>
              </div>

              <MonthGrid
                date={month}
                items={items}
                onPrev={prevMonth}
                onNext={nextMonth}
                title="Booked Gigs"
              />

              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Upcoming & Past</h2>
                {jobs.length === 0 ? (
                  <p className="text-sm opacity-70">No booked gigs yet.</p>
                ) : (
                  <ul className="divide-y">
                    {jobs.map(r => (
                      <li key={r.id} className="py-3 flex justify-between">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs opacity-70">
                            {r.event_at ? new Date(r.event_at).toLocaleString() : "No date set"} • {r.status}
                          </div>
                        </div>
                        <a className="text-purple-700 text-sm hover:underline" href={`/r/${r.id}`}>View →</a>
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
