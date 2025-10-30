/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../supabase/client";

const LOCATIONS = [
  "Atlanta, Georgia",
  "Charlotte, North Carolina",
  "Dallas, Texas",
  "Kansas City, Missouri",
  "Chicago, Illinois",
  "Washington D.C.",
  "New York City, New York"
];

export default function FeedPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const sb = supabaseBrowser();

        let query = sb.from("service_requests")
          .select("id, title, category, location, service_date, description, status, min_price_cents")
          .eq("status", "open");

        // Apply filters if set
        if (category) query = query.ilike("category", `%${category}%`);
        if (location) query = query.eq("location", location);
        if (date) query = query.eq("service_date", date);

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [category, location, date]); // re-run when filters change

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Browse Wedding Offers</h1>
          <p className="text-sm opacity-70">Find wedding gigs that match your skills and location.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 border-b pb-4">
        <div>
          <label className="block text-sm font-medium text-slate-600">Category</label>
          <input
            type="text"
            placeholder="e.g. Photographer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-48"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-56 bg-white"
          >
            <option value="">All Locations</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600">Service Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-48"
          />
        </div>

        <button
          onClick={() => {
            setCategory("");
            setLocation("");
            setDate("");
          }}
          className="text-sm text-purple-700 hover:underline"
        >
          Clear Filters
        </button>
      </div>

      {/* Results */}
      {loading && <p>Loading offers...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && requests.length === 0 && (
        <p className="text-sm opacity-70">No offers match your filters.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((r) => (
          <li key={r.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <h2 className="font-semibold text-lg">{r.title}</h2>
            <p className="text-sm opacity-70 mb-2">{r.category || "Uncategorized"}</p>
            <p className="text-sm">
              📍 {r.location || "Location TBD"}
              <br />
              📅 {r.service_date ? new Date(r.service_date).toLocaleDateString() : "Flexible date"}
            </p>

            <p className="text-sm mt-2 line-clamp-2">{r.description}</p>

            <div className="flex justify-between items-center mt-3">
              <span className="font-semibold text-purple-700">
                ${Math.round((r.min_price_cents || 0) / 100).toLocaleString()}
              </span>

              <Link
                href={`/r/${r.id}`}
                className="text-sm bg-purple-700 text-white rounded px-3 py-1 hover:bg-purple-800"
              >
                Apply
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
