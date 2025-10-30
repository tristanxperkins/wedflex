"use client";

import { useEffect, useState, useMemo } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import UploadInput from "../../../components/UploadInput";
import DashboardSidebar from "../../../components/DashboardSidebar";

type Profile = {
  id: string;
  avatar_url: string | null;
  intro: string | null;
  services: string[] | null;   
  skills: string[] | null;     
  phone: string | null;        
  city: string | null;         
};

const CITIES = [
  "Atlanta, Georgia",
  "Charlotte, North Carolina",
  "Dallas, Texas",
  "Kansas City, Missouri",
  "Chicago, Illinois",
  "Washington D.C.",
  "New York City, New York",
] as const;

const SKILL_TAGS = [
  // group broadly; adjust to your PDF list
  "Taking pictures or videos",
  "Videography",
  "Recording social media content",
  "Making Food",
  "Serving Food and drinks",
  "Making decorations",
  "Decor Setup",
  "Day-of Coordination",
  "Full Planning",
  "Playing music (DJing)",
  "Event set up/Clean up",
  "Hair",
  "Makeup",
  "Bartending",
  "Making cakes or desserts",
  "Desserts",
  "Venue",
  "Lighting",
  "Sound / A/V",
  "Playing an instrument",
  "Live Band",
  "Other entertainment (Painting, Dancing, Performing)",
  "Officiant",
  "Being a bridesmaid or groomsmen filler",
  "Dance Instructor",
  "EmCeeing",
  "Designing Invitations or Save the Dates",
  "Designated Driver",
  "Transportation",
  "Security / Crowd Mgmt",
  "Other helpful things (Day-of deliveries, etc.)",
] as const;

export default function WedflexerProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // computed
  const selectedSkills = useMemo(() => new Set(p?.skills ?? []), [p?.skills]);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // load profile
        const { data, error } = await sb
          .from("profiles")
          .select("id, avatar_url, intro, services, skills, phone, city")
          .eq("id", uid)
          .single();
        if (error) throw error;
        setP((data ?? null) as Profile);

        // load portfolio thumbnails (public bucket)
        const { data: list, error: lErr } = await sb.storage
          .from("portfolio")
          .list(`${uid}`, { sortBy: { column: "created_at", order: "desc" } });
        if (!lErr && list) {
          const urls = list.map(
            (it) => sb.storage.from("portfolio").getPublicUrl(`${uid}/${it.name}`).data.publicUrl
          );
          setPortfolio(urls);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  function toggleSkill(tag: string) {
    if (!p) return;
    const current = new Set(p.skills ?? []);
    if (current.has(tag)) current.delete(tag);
    else current.add(tag);
    setP({ ...p, skills: Array.from(current) });
  }

  // basic phone sanitizer (keeps digits, formats lightly)
  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 15); // allow intl-ish
    // simple US style grouping when 10+ digits
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
  }

  async function save() {
    if (!p) return;
    try {
      setSaving(true);
      setMsg(null);
      setErr(null);
      const sb = supabaseBrowser();
      const { error } = await sb
        .from("profiles")
        .update({
          avatar_url: p.avatar_url ?? null,
          intro: p.intro ?? "",
          services: p.services ?? [], // optional if used elsewhere
          skills: p.skills ?? [],
          phone: p.phone ?? null,
          city: p.city ?? null,
        })
        .eq("id", p.id);
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
          <header>
            <h1 className="text-2xl font-semibold">WedFlexer Profile</h1>
            <p className="text-sm opacity-70">
              Build trust with couples: add your intro, city, phone, skills, and portfolio.
            </p>
          </header>

          {err && <p className="text-red-600">Error: {err}</p>}
          {!p ? (
            <p>Loading…</p>
          ) : (
            <>
              {/* Avatar + upload */}
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

              {/* Intro */}
              <label className="block">
                <div className="text-sm mb-1">Intro/Bio</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-24"
                  value={p.intro ?? ""}
                  onChange={(e) => setP({ ...p, intro: e.target.value })}
                  placeholder="Tell couples about your experience, style, and why you’re great."
                />
              </label>

              {/* Phone + City */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm mb-1">Phone Number</div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    inputMode="tel"
                    value={p.phone ?? ""}
                    onChange={(e) => setP({ ...p, phone: formatPhone(e.target.value) })}
                    placeholder="(555) 555-5555"
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">Location (launch markets)</div>
                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={p.city ?? ""}
                    onChange={(e) => setP({ ...p, city: e.target.value || null })}
                  >
                    <option value="">Select your city…</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Skills (select all that apply) */}
              <div>
                <div className="text-sm mb-2">Skills & Services (select all that apply)</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SKILL_TAGS.map((tag) => {
                    const on = selectedSkills.has(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleSkill(tag)}
                        className={
                          "text-xs px-3 py-2 rounded border transition " +
                          (on
                            ? "bg-purple-700 text-white border-purple-700"
                            : "bg-white hover:border-purple-400")
                        }
                        aria-pressed={on}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] opacity-60 mt-1">
                  These tags power search & matching—keep them accurate.
                </p>
              </div>

              {/* Portfolio uploader + grid */}
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
                      <img
                        key={src}
                        src={src}
                        className="rounded border object-cover aspect-square"
                        alt=""
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="bg-purple-700 text-white rounded px-4 py-2"
                >
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
