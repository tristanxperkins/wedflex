/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import RequireAuth from "../components/RequireAuth";
import { useState } from "react";
import { supabaseBrowser } from "../supabase/client";

export default function PostOfferPage() {
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    offer_cents: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setMsg(null);

    try {
      // Get the current access token
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json?.error || `HTTP ${res.status}`);
      } else {
        setMsg("Offer posted! It will appear in Browse Offers.");
        setForm({ title: "", category: "", location: "", offer_cents: 0 });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Post a Wedding Offer</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Photographer, DJ, Florist..."
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Location</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="City, State"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Offer ($)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-3 py-2"
              value={Math.round(form.offer_cents / 100)}
              onChange={(e) =>
                setForm({
                  ...form,
                  offer_cents: Math.max(0, Number(e.target.value) || 0) * 100,
                })
              }
              required
            />
          </div>

          <button
            disabled={submitting}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Post Offer"}
          </button>
        </form>

        {msg && <p className="text-green-700 mt-4">{msg}</p>}
        {err && <p className="text-red-600 mt-2">Error: {err}</p>}
      </main>
    </RequireAuth>
  );
}
