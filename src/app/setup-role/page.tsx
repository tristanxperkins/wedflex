"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { supabaseBrowser } from "../supabase/client";

type Role = "couple" | "wedflexer";

export default function SetupRolePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [active, setActive] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const sb = supabaseBrowser();

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: u, error: uErr } = await sb.auth.getUser();
    if (uErr || !u.user) {
      setErr("You must sign in first.");
      setLoading(false);
      return;
    }
    setEmail(u.user.email ?? null);
    setUserId(u.user.id);

    const { data: rData, error: rErr } = await sb
      .from("roles")
      .select("role")
      .order("role");
    if (rErr) setErr(rErr.message);
    const list = (rData ?? []).map((r) => r.role as Role);
    setRoles(list);

    const { data: pData, error: pErr } = await sb
      .from("profiles")
      .select("active_role")
      .eq("id", u.user.id)
      .single();
    if (pErr) setErr(pErr.message);
    setActive((pData?.active_role as Role) ?? null);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addRole(role: Role) {
    if (!userId) return;
    setErr(null);
    const { error } = await sb.from("roles").insert({ user_id: userId, role });
    if (error) setErr(error.message);
    await load();
  }

  async function removeRole(role: Role) {
    setErr(null);
    const { error } = await sb.from("roles").delete().eq("role", role);
    if (error) setErr(error.message);
    if (role === active) {
      await sb.from("profiles").update({ active_role: null }).eq("id", userId as string);
    }
    await load();
  }

  async function makeActive(role: Role) {
    if (!userId) return;
    setErr(null);
    const { error } = await sb.from("profiles").update({ active_role: role }).eq("id", userId);
    if (error) setErr(error.message);
    await load();
  }

  const has = (r: Role) => roles.includes(r);

  return (
    <RequireAuth>
      <main className="max-w-xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Choose your role</h1>
        {email && <p className="opacity-70 text-sm">Signed in as {email}</p>}
        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">{err}</p>}

        {!loading && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Couple card */}
              <div className="border rounded-xl p-4 space-y-2">
                <h2 className="text-lg font-medium">I’m planning a wedding</h2>
                <p className="opacity-80 text-sm">
                  Post requests, compare applications, manage bookings.
                </p>
                <div className="flex gap-2">
                  {!has("couple") ? (
                    <button className="bg-black text-white rounded px-3 py-2" onClick={() => addRole("couple")}>
                      Enable Couple
                    </button>
                  ) : (
                    <>
                      <button
                        className={`rounded px-3 py-2 ${active === "couple" ? "bg-green-600 text-white" : "border"}`}
                        onClick={() => makeActive("couple")}
                      >
                        {active === "couple" ? "Active" : "Set Active"}
                      </button>
                      <button className="border rounded px-3 py-2" onClick={() => removeRole("couple")}>
                        Disable
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Wedflexer card */}
              <div className="border rounded-xl p-4 space-y-2">
                <h2 className="text-lg font-medium">I’m a Wedflexer</h2>
                <p className="opacity-80 text-sm">Browse requests, apply, get paid.</p>
                <div className="flex gap-2">
                  {!has("wedflexer") ? (
                    <button className="bg-black text-white rounded px-3 py-2" onClick={() => addRole("wedflexer")}>
                      Enable Wedflexer
                    </button>
                  ) : (
                    <>
                      <button
                        className={`rounded px-3 py-2 ${active === "wedflexer" ? "bg-green-600 text-white" : "border"}`}
                        onClick={() => makeActive("wedflexer")}
                      >
                        {active === "wedflexer" ? "Active" : "Set Active"}
                      </button>
                      <button className="border rounded px-3 py-2" onClick={() => removeRole("wedflexer")}>
                        Disable
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>

            <p className="text-sm opacity-70">You can enable both and switch anytime.</p>
          </>
        )}
      </main>
    </RequireAuth>
  );
}
