/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import { supabaseBrowser } from "../../../supabase/client";
import UploadInput from "../../../components/UploadInput";
import DashboardSidebar from "../../../components/DashboardSidebar";

type Profile = {
  id: string;
  avatar_url: string | null;
  services: string[];
  skills: string[];
  intro: string;
};

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

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

        // get profile
        const { data, error } = await sb
          .from("profiles")
          .select("id,avatar_url,services,skills,intro")
          .eq("id", uid)
          .single();
        if (error) throw error;

        // normalize shapes to safe strings/arrays
        const normalized: Profile = {
          id: data.id,
          avatar_url: data.avatar_url ?? null,
          intro:
            typeof data.intro === "string"
              ? data.intro
              : "",
          services: Array.isArray(data.services)
            ? data.services
            : typeof data.services === "string"
            ? data.services
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          skills: Array.isArray(data.skills)
            ? data.skills
            : typeof data.skills === "string"
            ? data.skills
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
        };

        setP(normalized);

        // get portfolio file list from storage bucket "portfolio/{uid}"
        const { data: list, error: lErr } = await sb.storage
          .from("portfolio")
          .list(`${uid}`, {
            sortBy: { column: "created_at", order: "desc" },
          });
        if (!lErr && list) {
          const urls = list.map(
            (it: { name: string }) =>
              sb.storage
                .from("portfolio")
                .getPublicUrl(`${uid}/${it.name}`).data.publicUrl
          );
          setPortfolio(urls);
        }
      } catch (e) {
        setErr(toErrorString(e));
      }
    })();
  }, []);

  // helper: turn ["DJ","Florals"] → "DJ, Florals"
  function parseCommaList(
    v: string[] | string | null | undefined
  ): string {
    if (!v) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  }

  // helper: "DJ, Florals" → ["DJ","Florals"]
  function toArray(v: string): string[] {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
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
          avatar_url: p.avatar_url,
          services: p.services ?? [],
          skills: p.skills ?? [],
          intro: p.intro ?? "",
        })
        .eq("id", p.id);

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
        <DashboardSidebar role="wedflexer" />

        <section className="space-y-6">
          <h1 className="text-2xl font-semibold">WedFlexer Profile</h1>

          {err && (
            <p className="text-red-600 text-sm break-all">
              Error: {err}
            </p>
          )}

          {!p ? (
            <p>Loading…</p>
          ) : (
            <>
              {/* avatar upload */}
              <div className="flex items-center gap-4">
                <img
                  src={p.avatar_url || "/avatar-placeholder.png"}
                  alt="avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
                <UploadInput
                  bucket="avatars"
                  label="Upload avatar"
                  onUploaded={(url) =>
                    setP({ ...p, avatar_url: url })
                  }
                />
              </div>

              {/* intro / bio */}
              <label className="block">
                <div className="text-sm mb-1">Intro / Bio</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-24"
                  value={p.intro}
                  onChange={(e) =>
                    setP({ ...p, intro: e.target.value })
                  }
                  placeholder="Tell couples about your experience, style, and why you’re great."
                />
              </label>

              {/* services + skills */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm mb-1">
                    Services (comma-separated)
                  </div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={parseCommaList(p.services)}
                    onChange={(e) =>
                      setP({
                        ...p,
                        services: toArray(e.target.value),
                      })
                    }
                    placeholder="Photography, Florals, DJ, Setup/Tear-down..."
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">
                    Skills (comma-separated)
                  </div>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={parseCommaList(p.skills)}
                    onChange={(e) =>
                      setP({
                        ...p,
                        skills: toArray(e.target.value),
                      })
                    }
                    placeholder="Lightroom, Bouquet design, MC, lighting..."
                  />
                </label>
              </div>

              {/* portfolio upload + gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Portfolio</h2>
                  <UploadInput
                    bucket="portfolio"
                    label="Upload portfolio"
                    multiple
                    onUploaded={(url) =>
                      setPortfolio((arr) => [url, ...arr])
                    }
                  />
                </div>

                {portfolio.length === 0 ? (
                  <p className="text-sm opacity-70">
                    No images yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {portfolio.map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="rounded border object-cover aspect-square"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* save button */}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="bg-purple-700 text-white rounded px-4 py-2 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Profile"}
                </button>
                {msg && (
                  <p className="text-green-700 self-center">
                    {msg}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
