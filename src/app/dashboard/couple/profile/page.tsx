/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import UploadInput from "../../../components/UploadInput";
import DashboardSidebar from "../../../components/DashboardSidebar";
import Image from "next/image";

type CoupleProfile = {
  id: string;
  avatar_url: string | null;
  couple_display_name: string | null;
  wedding_date: string | null;
  our_story: string | null;
  wedding_style: string | null;
};
function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}
export default function CoupleProfilePage() {
  const [p, setP] = useState<CoupleProfile | null>(null);
  const [inspo, setInspo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid: string = me.user.id;

        const { data, error } = await sb
          .from("profiles")
          .select("id, avatar_url, couple_display_name, wedding_date, our_story, wedding_style")
          .eq("id", uid)
          .single();
        if (error) throw error;
        setP(data as CoupleProfile);

        // Optional: list existing inspo (we store only URLs in UI; files live in bucket)
        const { data: list, error: lErr } = await sb.storage.from("wedding_inspo").list(`${uid}`, { sortBy: { column: "created_at", order: "desc" }});
        if (!lErr && list) {
          const urls = list.map(it => sb.storage.from("wedding_inspo").getPublicUrl(`${uid}/${it.name}`).data.publicUrl);
          setInspo(urls);
        }
      } catch (e) {
        setErr(toErrorString(e));
      }
    })();
  }, []);

  async function save() {
    if (!p) return;
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      const sb = supabaseBrowser();
      const { error } = await sb.from("profiles").update({
  couple_display_name: (p.couple_display_name ?? "").trim() || null,
  wedding_date: p.wedding_date || null,
  our_story: (p.our_story ?? "").trim() || null,   // ✅
  wedding_style: (p.wedding_style ?? "").trim() || null,
  avatar_url: p.avatar_url ?? null,
});
      if (error) throw error;
      setMsg("Saved!");
    } catch (e) {
      setErr(toErrorString(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="couple" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Couple Profile</h1>
          {err && <p className="text-red-600">Error: {toErrorString(err)}</p>}
          {!p ? <p>Loading…</p> : (
            <>
              <div className="flex items-center gap-4">
  <div className="h-16 w-16 relative rounded-full overflow-hidden border">
    <Image
      src={p.avatar_url || "/avatar-placeholder.png"}
      alt="Profile avatar"
      fill
      sizes="64px"
      className="object-cover"
      priority
    />
  </div>
  <UploadInput
    bucket="avatars"
    label="Upload avatar"
    onUploaded={(url) => setP({ ...p, avatar_url: url })}
  />
</div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm mb-1">Your Names (display)</div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={p.couple_display_name ?? ""}
                    onChange={(e) => setP({ ...p, couple_display_name: e.target.value })}
                    placeholder="e.g., Taylor & Jordan"
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">Wedding Date</div>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={p.wedding_date ?? ""}
                    onChange={(e) => setP({ ...p, wedding_date: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm mb-1">Our Story</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-24"
                  value={p.our_story ?? ""}
                  onChange={(e) => setP({ ...p, our_story: e.target.value })}
                  placeholder="How you met, your journey, etc."
                />
              </label>

              <label className="block">
                <div className="text-sm mb-1">Wedding Style</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-24"
                  value={p.wedding_style ?? ""}
                  onChange={(e) => setP({ ...p, wedding_style: e.target.value })}
                  placeholder="Vibes, colors, inspirations…"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Wedding Inspiration</h2>
                  <UploadInput
                    bucket="wedding_inspo"
                    label="Upload inspiration"
                    multiple
                    onUploaded={(url) => setInspo((arr) => [url, ...arr])}
                  />
                </div>
                {inspo.length === 0 ? (
                  <p className="text-sm opacity-70">No images yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {portfolio.map((src) => (
    <div key={src} className="relative aspect-square rounded border overflow-hidden">
      <Image src={src} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
    </div>
  ))}
</div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="bg-purple-700 text-white rounded px-4 py-2">
                  {saving ? "Saving…" : "Save Profile"}
                </button>
                {msg && <p className="text-green-700 self-center">{msg}</p>}
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
