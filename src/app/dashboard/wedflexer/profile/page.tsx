"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import UploadInput from "../../../components/UploadInput";
import DashboardSidebar from "../../../components/DashboardSidebar";

type Profile = {
  id: string;
  avatar_url: string | null;
  services: string[] | null;
  skills: string[] | null;
  intro: string | null;
};

export default function WedflexerProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        const { data, error } = await sb
          .from("profiles")
          .select("id,avatar_url,services,skills,intro")
          .eq("id", uid)
          .single();
        if (error) throw error;
        setP(data as Profile);

        const { data: list, error: lErr } = await sb.storage.from("portfolio").list(`${uid}`, { sortBy: { column: "created_at", order: "desc" }});
        if (!lErr && list) {
          const urls = list.map(it => sb.storage.from("portfolio").getPublicUrl(`${uid}/${it.name}`).data.publicUrl);
          setPortfolio(urls);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  function parseCommaList(v: string | string[] | null): string {
    if (!v) return "";
    return Array.isArray(v) ? v.join(", ") : v;
  }
  function toArray(v: string): string[] {
    return v.split(",").map(s => s.trim()).filter(Boolean);
  }

  async function save() {
    if (!p) return;
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      const sb = supabaseBrowser();
      const { error } = await sb.from("profiles").update({
        avatar_url: p.avatar_url,
        services: p.services ?? [],
        skills: p.skills ?? [],
        intro: p.intro ?? "",
      }).eq("id", p.id);
      if (error) throw error;
      setMsg("Saved!");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">WedFlexer Profile</h1>
          {err && <p className="text-red-600">{err}</p>}
          {!p ? <p>Loading…</p> : (
            <>
              <div className="flex items-center gap-4">
                <img
                  src={p.avatar_url || "/avatar-placeholder.png"}
                  alt="avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
                <UploadInput
                  bucket="avatars"
                  label="Upload avatar"
                  onUploaded={(url) => setP({ ...p, avatar_url: url })}
                />
              </div>

              <label className="block">
                <div className="text-sm mb-1">Intro/Bio</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-24"
                  value={p.intro ?? ""}
                  onChange={(e) => setP({ ...p, intro: e.target.value })}
                  placeholder="Tell couples about your experience, style, and why you’re great."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm mb-1">Services (comma-separated)</div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={parseCommaList(p.services)}
                    onChange={(e) => setP({ ...p, services: toArray(e.target.value) })}
                    placeholder="Photography, Florals, DJ, ..."
                  />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Skills (comma-separated)</div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={parseCommaList(p.skills)}
                    onChange={(e) => setP({ ...p, skills: toArray(e.target.value) })}
                    placeholder="Lightroom, MC, Bouquet design, ..."
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Portfolio</h2>
                  <UploadInput
                    bucket="portfolio"
                    label="Upload portfolio"
                    multiple
                    onUploaded={(url) => setPortfolio((arr) => [url, ...arr])}
                  />
                </div>
                {portfolio.length === 0 ? (
                  <p className="text-sm opacity-70">No images yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {portfolio.map((src) => (
                      <img key={src} src={src} className="rounded border object-cover aspect-square" />
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
