"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import RequireAuth from "../components/RequireAuth";
import DashboardSidebar from "../components/DashboardSidebar";
import { supabaseBrowser } from "../supabase/client";

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

type Profile = {
  id: string;
  avatar_url: string | null;
  display_name: string | null;         // wedflexer display name
  intro: string | null;                 // short bio/intro
  services_offered: string[] | null;    // array of strings
};

export default function WedflexerProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        // who am I
        const { data: me } = await sb.auth.getUser();
        if (!me?.user) throw new Error("Not authenticated");
        const uid = me.user.id;

        // load profile fields we need
        const { data: prof, error: pErr } = await sb
          .from("profiles")
          .select("id, avatar_url, display_name, intro, services_offered")
          .eq("id", uid)
          .single();
        if (pErr) throw pErr;

        // portfolio: store as a simple string[] in a dedicated table or JSON column if you have one.
        // If you don't yet, we'll tolerate empty. Replace this with a real query later.
        // Example (uncomment when you add a table):
        // const { data: pf } = await sb
        //   .from("wedflexer_portfolio")
        //   .select("image_url")
        //   .eq("wedflexer_id", uid);
        // setPortfolio((pf ?? []).map((row: { image_url: string }) => row.image_url));

        setP({
          id: prof.id,
          avatar_url: prof.avatar_url ?? null,
          display_name: prof.display_name ?? null,
          intro: prof.intro ?? null,
          services_offered: Array.isArray(prof.services_offered)
            ? (prof.services_offered as string[])
            : (prof.services_offered ? String(prof.services_offered).split(",").map(s => s.trim()).filter(Boolean) : []),
        });
        setPortfolio((arr) => arr ?? []); // keep as []
      } catch (e) {
        setErr(toErrorString(e));
      }
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    try {
      setSaving(true);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not authenticated");

      const patch = {
        avatar_url: p.avatar_url ?? null,
        display_name: (p.display_name ?? "").trim() || null,
        intro: (p.intro ?? "").trim() || null,
        services_offered: p.services_offered ?? [], // store as text[] in Postgres
      };

      const { error } = await sb
        .from("profiles")
        .update(patch)
        .eq("id", me.user.id);
      if (error) throw error;
    } catch (e) {
      setErr(toErrorString(e));
    } finally {
      setSaving(false);
    }
  }

  // helpers to update array safely
  function setServicesFromCommaList(v: string) {
    const arr = v
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    setP(prev => prev ? { ...prev, services_offered: arr } : prev);
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />
        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">Profile</h1>
          {err && <p className="text-red-600">Error: {toErrorString(err)}</p>}
          {!p ? (
            <p>Loading…</p>
          ) : (
            <>
              {/* Avatar */}
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
                {/* Placeholder upload button – wire to your uploader when ready */}
                <button
                  type="button"
                  className="px-3 py-2 rounded border"
                  onClick={() => alert("Hook up Supabase Storage upload here")}
                >
                  Upload avatar
                </button>
              </div>

              {/* Form */}
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Display Name</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={p.display_name ?? ""}
                    onChange={(e) => setP(prev => prev ? { ...prev, display_name: e.target.value } : prev)}
                    placeholder="Your public name"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Intro</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    value={p.intro ?? ""}
                    onChange={(e) => setP(prev => prev ? { ...prev, intro: e.target.value } : prev)}
                    placeholder="Tell couples about yourself and your style…"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Services Offered (comma-separated)</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={(p.services_offered ?? []).join(", ")}
                    onChange={(e) => setServicesFromCommaList(e.target.value)}
                    placeholder="DJ, Photographer, Planner"
                  />
                  <p className="text-xs opacity-70 mt-1">
                    Saved as a list. We’ll design nicer chips later.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-purple-700 text-white rounded px-4 py-2 disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              </form>

              {/* Portfolio grid (URLs) */}
              <section>
                <h2 className="font-semibold mb-2">Portfolio</h2>
                {portfolio.length === 0 ? (
                  <div className="border rounded p-6 text-sm opacity-70">
                    No portfolio yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {portfolio.map((url) => (
                      <div key={url} className="relative aspect-square rounded border overflow-hidden">
                        <Image
                          src={url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    className="px-3 py-2 rounded border"
                    onClick={() => alert("Hook up Supabase Storage upload for portfolio")}
                  >
                    Upload portfolio image
                  </button>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
