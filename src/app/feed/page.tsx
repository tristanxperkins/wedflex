/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function FeedPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/open-requests", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          if (!cancelled) setError(json?.error || `HTTP ${res.status}`);
        } else {
          if (!cancelled) setData(json.data || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Open Requests</h1>

      {loading && <p>Loading…</p>}
      {!loading && error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p>No open requests yet.</p>}

      <ul className="space-y-3">
        {data.map((r: any) => (
          <li key={r.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{r.title}</h2>
              <span className="text-sm opacity-70">
                ${Math.round(r.offer_cents / 100).toLocaleString()}
              </span>
            </div>
            <p className="text-sm opacity-80">
              {r.category} • {r.location}
            </p>
            <Link href={`/r/${r.id}`} className="text-blue-600 text-sm mt-2 inline-block">
              View
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
