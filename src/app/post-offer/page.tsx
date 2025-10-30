"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";
import { CATEGORY_OPTIONS, CITY_OPTIONS } from "../lib/constants";

type Role = "couple" | "wedflexer" | null;

export default function PostOfferPage() {
  const [role, setRole] = useState<Role>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [serviceDate, setServiceDate] = useState<string>("");
  const [description, setDescription] = useState("");
  const [offer, setOffer] = useState<string>(""); // dollars (we’ll convert to cents)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

   useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (me?.user?.id) {
        const { data: p } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", me.user.id)
          .single();
        setRole((p?.active_role as Role) ?? null);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      if (role !== "couple") {
        throw new Error("Switch to Couple role to post an offer.");
      }
      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const offer_cents =
        offer.trim() === ""
          ? null
          : Math.max(0, Math.round(parseFloat(offer) * 100));

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          category,
          location,
          offer_cents,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setOk("Offer posted!");
      setTitle("");
      setCategory("");
      setLocation("");
      setOffer("");
      // optionally navigate to the new detail page:
      // window.location.href = `/r/${json.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Post an Offer</h1>

        {role !== "couple" && (
          <p className="text-sm mb-4 text-amber-700">
            You are currently <strong>{role ?? "unset"}</strong>. Switch to <strong>Couple</strong> on the Setup Role page to post.
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              required
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Pink, Green, and White Floral Arch"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <div className="text-sm mb-1">Category *</div>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm mb-1">Location *</div>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={location}
            onChange={(e)=>setLocation(e.target.value)}
          >
            <option value="">Select city</option>
            {CITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
      </div>

          <div>
            <label className="block text-sm mb-1">Offer (USD)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full border rounded px-3 py-2"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="500"
            />
            <p className="text-xs opacity-70 mt-1">
              Optional. Leave blank if you want WedFlexers to submit a bid.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || role !== "couple"}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Posting…" : "Post Offer"}
          </button>

          {ok && <p className="text-green-700">{ok}</p>}
          {error && <p className="text-red-600">Error: {error}</p>}
        </form>
      </main>
    </RequireAuth>
  );
}
