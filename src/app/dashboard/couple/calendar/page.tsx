"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import DashboardSidebar from "../../../components/DashboardSidebar";
import MonthGrid, { type CalendarItem } from "../../../components/MonthGrid";

type RequestRow = {
  id: string;
  title: string;
  event_at: string | null;        // ISO
  status: "open" | "awarded" | "closed" | "cancelled";
};

export default function CoupleCalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        const [{ data: prof }, { data: reqs, error: rErr }] = await Promise.all([
          sb.from("profiles").select("wedding_date").eq("id", uid).single(),
          sb.from("service_requests").select("id,title,event_at,status")
            .eq("couple_id", uid)
            .in("status", ["awarded", "closed"])
            .order("event_at", { ascending: true }),
        ]);
        if (rErr) throw rErr;

        setWeddingDate((prof?.wedding_date as string | null) ?? null);
        setRows((reqs ?? []) as RequestRow[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items: CalendarItem[] = useMemo(
    () =>
      rows
        .filter(r => r.event_at)
        .map(r => ({
          id: r.id,
          when: r.event_at as string,
          title: `${r.title} (${r.status})`,
          href: `/r/${r.id}`,
        })),
    [rows]
  );

  function prevMonth() {
    setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const countdown = useMemo(() => {
    if (!weddingDate) return null;
    const now = new Date();
    const target = new Date(weddingDate);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "It's your wedding day! 🎉";
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} days until your wedding`;
  }, [weddingDate]);

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />

        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}

          {!loading && !err && (
            <>
              {countdown && (
                <div className="border rounded-lg p-4 bg-purple-50 text-purple-900">
                  {countdown}
                </div>
              )}

              <MonthGrid
                date={month}
                items={items}
                onPrev={prevMonth}
                onNext={nextMonth}
                title="Booked Services"
              />

              <section className="border rounded-lg p-4">
                <h2 className="font-semibold mb-2">Upcoming & Past</h2>
                {rows.length === 0 ? (
                  <p className="text-sm opacity-70">No booked services yet.</p>
                ) : (
                  <ul className="divide-y">
                    {rows.map(r => (
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
