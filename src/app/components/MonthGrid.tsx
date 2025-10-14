"use client";

import { useMemo } from "react";

export type CalendarItem = {
  id: string;
  when: string;       // ISO string
  title: string;
  href?: string;
};

export default function MonthGrid({
  date,            // JS Date anchored to month to render
  items = [],
  onPrev,
  onNext,
  title = "Calendar",
}: {
  date: Date;
  items?: CalendarItem[];
  onPrev: () => void;
  onNext: () => void;
  title?: string;
}) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // make Monday=0 if you prefer; here Sun=0
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const cells = useMemo(() => {
    const arr: { day: number | null; items: CalendarItem[] }[] = [];
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const byDay = new Map<number, CalendarItem[]>();
    for (const it of items) {
      const d = new Date(it.when);
      if (d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) {
        const day = d.getDate();
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(it);
      }
    }
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      const valid = dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null;
      arr.push({ day: valid, items: valid ? (byDay.get(valid) ?? []) : [] });
    }
    return arr;
  }, [date, items, startWeekday, daysInMonth]);

  const monthName = date.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <button onClick={onPrev} className="text-sm px-2 py-1 border rounded">←</button>
        <h3 className="text-sm font-semibold">{title}: {monthName}</h3>
        <button onClick={onNext} className="text-sm px-2 py-1 border rounded">→</button>
      </div>
      <div className="grid grid-cols-7 border-b text-xs">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-1 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => (
          <div key={i} className="min-h-24 border p-2">
            {c.day && <div className="text-xs font-semibold mb-1">{c.day}</div>}
            <div className="space-y-1">
              {c.items.slice(0,3).map(ev => (
                <a
                  key={ev.id}
                  href={ev.href ?? "#"}
                  className="block text-xs truncate px-2 py-1 rounded bg-purple-50 text-purple-800"
                  title={ev.title}
                >
                  {ev.title}
                </a>
              ))}
              {c.items.length > 3 && (
                <div className="text-[11px] opacity-70">+{c.items.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
