"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";

type RequestRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  awarded_wedflexer_id?: string | null;
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch("/api/my-requests", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        if (!cancel) setRequests(json.data || []);
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true };
  }, []);

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">My Wedding Requests</h1>
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!loading && requests.length === 0 && (
          <p className="opacity-70">You haven’t created any requests yet.</p>
        )}
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center"
            >
              <div>
                <Link href={`/r/${r.id}`}>
                  <h2 className="font-semibold hover:underline">{r.title}</h2>
                </Link>
                <p className="text-sm opacity-70">
                  {r.category} • {r.status} • {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.awarded_wedflexer_id && (
                  <p className="text-xs text-green-700 mt-1">
                    Awarded WedFlexer: {r.awarded_wedflexer_id}
                  </p>
                )}
              </div>
              <Link
                href={`/r/${r.id}`}
                className="text-purple-700 text-sm mt-2 sm:mt-0 hover:underline"
              >
                View Details →
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </RequireAuth>
  );
}
