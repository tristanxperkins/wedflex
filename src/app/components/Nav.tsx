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
        const { data: u } = await sb.auth.getUser();
        if (!u?.user) { setMe(null); setLoading(false); return; }
        const { data: prof, error } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.user.id)
          .single();
        if (error) throw error;
        setMe({ email: u.user.email ?? null, active_role: (prof?.active_role as Me["active_role"]) ?? null });
      } catch (e) { setErr(toErrorString(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  async function setRole(role: "couple" | "wedflexer") {
    try {
      const sb = supabaseBrowser();
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return router.push("/auth/signin");
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: role }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setMe(m => m ? { ...m, active_role: role } : m);
      router.push(role === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) { setErr(toErrorString(e)); }
  }

  const linkCls = (href: string) =>
    `px-3 py-2 text-sm rounded-md hover:bg-violet-50 ${pathname === href ? "text-violet-700 font-semibold" : "text-slate-700"}`;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Logo */}
      <Link href="/" className="text-2xl font-extrabold text-violet-700">WedFlex</Link>

      {/* Primary links */}
      <nav className="hidden md:flex items-center gap-1">
        <Link href="/feed" className={linkCls("/feed")}>Browse Offers</Link>
        <Link href="/post-offer" className={linkCls("/post-offer")}>Post Offer</Link>
        <Link href="/roles" className={linkCls("/roles")}>Roles</Link>
        <Link
          href={me?.active_role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple"}
          className={linkCls(me?.active_role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple")}
        >
          Dashboard
        </Link>
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {!!me && (
          <div className="flex rounded-full border bg-white p-1 shadow-sm">
            <button
              onClick={() => setRole("couple")}
              className={`px-3 py-1 text-sm rounded-full ${me.active_role === "couple" ? "bg-violet-700 text-white" : "text-slate-700"}`}
              aria-pressed={me.active_role === "couple"}
            >
              Couple
            </button>
            <button
              onClick={() => setRole("wedflexer")}
              className={`px-3 py-1 text-sm rounded-full ${me.active_role === "wedflexer" ? "bg-violet-700 text-white" : "text-slate-700"}`}
              aria-pressed={me.active_role === "wedflexer"}
            >
              WedFlexer
            </button>
          </div>
        )}
        {loading ? (
          <span className="text-sm text-slate-500">…</span>
        ) : me ? (
          <span className="text-sm text-slate-700">{me.email}</span>
        ) : (
          <Link href="/auth/signin" className="px-3 py-2 text-sm rounded-md hover:bg-violet-50 text-slate-700">
            Sign In
          </Link>
        )}
      </div>

      {/* Remove or comment this out if you don’t want the inline error */}
      {/* {err && <span className="text-xs text-red-600 ml-2">Nav error: {err}</span>} */}
    </div>
  );
}
