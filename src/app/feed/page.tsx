"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../supabase/client";
import { CATEGORY_OPTIONS, CITY_OPTIONS } from "../lib/constants";

type RequestRow = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  service_date: string | null;
  created_at: string;
  offer_cents: number | null;
};

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

export default function FeedPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  // sort controls
  const [sortField, setSortField] = useState<"service_date" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const sb = supabaseBrowser();

        let q = sb
          .from("service_requests")
          .select(
            "id, title, category, location, service_date, created_at, offer_cents"
          )
          .eq("status", "open");

        if (category) q = q.eq("category", category);
        if (location) q = q.eq("location", location);

        // dynamic sort
        q = q.order(sortField, { ascending: sortOrder === "asc", nullsFirst: false });

        const { data, error } = await q;
        if (error) throw error;
        setRequests(data ?? []);
      } catch (e) {
        setErr(toErrorString(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [category, location, sortField, sortOrder]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Browse Wedding Offers</h1>
          <p className="text-sm opacity-70">Filter and sort offers by category, city, and date.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 border-b pb-4">
        <label className="block">
          <div className="text-sm font-medium text-slate-600">Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-56 bg-white"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-slate-600">Location</div>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-56 bg-white"
          >
            <option value="">All Locations</option>
            {CITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {/* Sort Controls */}
        <label className="block">
          <div className="text-sm font-medium text-slate-600">Sort By</div>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as "service_date" | "created_at")}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            <option value="created_at">Date Posted</option>
            <option value="service_date">Service Date</option>
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-slate-600">Order</div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            {sortField === "service_date" ? (
              <>
                <option value="asc">Soonest First</option>
                <option value="desc">Furthest First</option>
              </>
            ) : (
              <>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </>
            )}
          </select>
        </label>

        <button
          onClick={() => {
            setCategory("");
            setLocation("");
            setSortField("created_at");
            setSortOrder("desc");
          }}
          className="text-sm text-purple-700 hover:underline"
        >
          Clear Filters
        </button>
      </div>

      {/* Content */}
      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600 break-all">Error: {err}</p>}

      {!loading && !err && requests.length === 0 && (
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
              📅{" "}
              {r.service_date
                ? new Date(r.service_date).toLocaleDateString()
                : "Flexible date"}
            </p>

            <div className="flex justify-between items-center mt-3">
              <span className="font-semibold text-purple-700">
                ${Math.round((r.offer_cents ?? 0) / 100).toLocaleString()}
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
