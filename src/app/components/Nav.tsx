"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type Me = {
  email: string | null;
  active_role: "couple" | "wedflexer" | null;
};

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

export default function Nav() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        const [{ data: sess }, { data: u }] = await Promise.all([
          sb.auth.getSession(),
          sb.auth.getUser(),
        ]);

        if (!u?.user) {
          setMe(null);
          setLoading(false);
          return;
        }

        // fetch active_role + email
        const { data: prof, error } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.user.id)
          .single();
        if (error) throw error;

        setMe({
          email: u.user.email ?? null,
          active_role: (prof?.active_role as Me["active_role"]) ?? null,
        });
      } catch (e) {
        setErr(toErrorString(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function setRole(role: "couple" | "wedflexer") {
    try {
      setErr(null);
      const sb = supabaseBrowser();
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) {
        router.push("/auth/signin");
        return;
      }
      // call your me endpoint (PATCH) to update active_role
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: role }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setMe((m) => (m ? { ...m, active_role: role } : m));
      // optional: route to dashboard for the chosen role
      router.push(role === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) {
      setErr(toErrorString(e));
    }
  }

  const linkCls = (href: string) =>
    `px-3 py-2 text-sm rounded hover:bg-gray-100 ${pathname === href ? "font-semibold" : ""}`;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Logo */}
      <Link href="/" className="text-2xl font-extrabold text-purple-700">
        WedFlex
      </Link>

      {/* Middle: Primary links */}
      <nav className="hidden md:flex items-center gap-1">
        <Link href="/feed" className={linkCls("/feed")}>Browse Offers</Link>
        <Link href="/post-offer" className={linkCls("/post-offer")}>Post Offer</Link>
        <Link href="/roles" className={linkCls("/roles")}>Roles</Link>
        <Link
          href={
            me?.active_role === "wedflexer"
              ? "/dashboard/wedflexer"
              : "/dashboard/couple"
          }
          className={linkCls(
            me?.active_role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple"
          )}
        >
          Dashboard
        </Link>
      </nav>

      {/* Right: role toggle + auth */}
      <div className="flex items-center gap-3">
        {/* Role toggle (hidden when logged out) */}
        {!!me && (
          <div className="flex rounded-full border bg-white p-1">
            <button
              onClick={() => setRole("couple")}
              className={`px-3 py-1 text-sm rounded-full ${
                me.active_role === "couple" ? "bg-purple-700 text-white" : "text-gray-700"
              }`}
              aria-pressed={me.active_role === "couple"}
            >
              Couple
            </button>
            <button
              onClick={() => setRole("wedflexer")}
              className={`px-3 py-1 text-sm rounded-full ${
                me.active_role === "wedflexer" ? "bg-purple-700 text-white" : "text-gray-700"
              }`}
              aria-pressed={me.active_role === "wedflexer"}
            >
              WedFlexer
            </button>
          </div>
        )}

        {/* Auth area */}
        {loading ? (
          <span className="text-sm text-gray-500">…</span>
        ) : me ? (
          <span className="text-sm text-gray-700">{me.email}</span>
        ) : (
          <Link href="/auth/signin" className="px-3 py-2 text-sm rounded hover:bg-gray-100">
            Sign In
          </Link>
        )}
      </div>

      {err && <span className="text-xs text-red-600 ml-2">Nav error: {err}</span>}
    </div>
  );
}
