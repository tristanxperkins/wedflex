"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);
  const [hasCouple, setHasCouple] = useState(false);
  const [hasWedflexer, setHasWedflexer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: userData, error: userErr } = await sb.auth.getUser();
        if (userErr) throw userErr;

        if (!userData?.user) {
          setEmail(null);
          setRole(null);
          setHasCouple(false);
          setHasWedflexer(false);
          return;
        }

        const u = userData.user;
        setEmail(u.email ?? "");

        // current active role
        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single();

        if (profErr && (profErr as { code?: string }).code !== "PGRST116") {
          throw profErr;
        }
        setRole((prof?.active_role as ActiveRole) ?? null);

        // infer possession of each role from activity
        const [{ count: coupleCnt, error: cErr }, { count: wedCnt, error: wErr }] =
          await Promise.all([
            sb.from("service_requests").select("id", { count: "exact", head: true }).eq("couple_id", u.id),
            sb.from("applications").select("id", { count: "exact", head: true }).eq("wedflexer_id", u.id),
          ]);

        if (cErr) throw cErr;
        if (wErr) throw wErr;

        setHasCouple((coupleCnt ?? 0) > 0);
        setHasWedflexer((wedCnt ?? 0) > 0);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]); // rerun when route changes, so Nav stays in sync

  async function switchRole(next: "couple" | "wedflexer") {
    try {
      const sb = supabaseBrowser();

      // Are they signed in at all?
      const { data: userData } = await sb.auth.getUser();
      if (!userData?.user) {
        // not signed in → send to onboarding funnel
        window.location.href = next === "couple" ? "/post-your-first-offer" : "/earn-money";
        return;
      }

      // If they don't have that role yet, go to that funnel instead of just toggling
      if (next === "couple" && !hasCouple) {
        window.location.href = "/post-your-first-offer";
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        window.location.href = "/earn-money";
        return;
      }

      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active_role: next }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setRole(next);
      // reload so pages like /r/[id] + the Nav pick up the new role
      window.location.reload();
    } catch {
      // fallback → funnel
      window.location.href = next === "couple" ? "/post-your-first-offer" : "/earn-money";
    }
  }

  async function signOut() {
    try {
      const sb = supabaseBrowser();
      await sb.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  const isSignedIn = !!email;
  const bothRoles = hasCouple && hasWedflexer;

  // Dashboard link target, based on role & what they have
  const dashboardHref =
    role === "wedflexer"
      ? "/dashboard/wedflexer"
      : role === "couple"
      ? "/dashboard/couple"
      : hasWedflexer
      ? "/dashboard/wedflexer"
      : "/dashboard/couple";

  return (
    <nav className="flex flex-col md:flex-row md:items-center md:justify-between text-slate-800 gap-3 md:gap-0">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-purple-700">
          WedFlex
        </Link>
      </div>

      {/* Center links */}
      <div className="flex flex-wrap gap-4 text-sm">
        {!isSignedIn ? (
          <>
            <Link
              href="/"
              className={cx(
                "hover:text-purple-700",
                pathname === "/" && "font-semibold text-purple-700",
              )}
            >
              Home
            </Link>
            <Link
              href="/mission"
              className={cx(
                "hover:text-purple-700",
                pathname === "/mission" && "font-semibold text-purple-700",
              )}
            >
              Mission
            </Link>
            <Link
              href="/post-your-first-offer"
              className={cx(
                "hover:text-purple-700",
                pathname === "/post-your-first-offer" && "font-semibold text-purple-700",
              )}
            >
              Post your first offer
            </Link>
            <Link
              href="/earn-money"
              className={cx(
                "hover:text-purple-700",
                pathname === "/earn-money" && "font-semibold text-purple-700",
              )}
            >
              Earn money
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/"
              className={cx(
                "hover:text-purple-700",
                pathname === "/" && "font-semibold text-purple-700",
              )}
            >
              Home
            </Link>
            <Link
              href="/mission"
              className={cx(
                "hover:text-purple-700",
                pathname === "/mission" && "font-semibold text-purple-700",
              )}
            >
              Mission
            </Link>

            {/* Wedflexer-only link */}
            {hasWedflexer && (
              <Link
                href="/feed"
                className={cx(
                  "hover:text-purple-700",
                  pathname === "/feed" && "font-semibold text-purple-700",
                )}
              >
                Browse offers
              </Link>
            )}

            {/* Couple-only link */}
            {hasCouple && (
              <Link
                href="/post-offer"
                className={cx(
                  "hover:text-purple-700",
                  pathname === "/post-offer" && "font-semibold text-purple-700",
                )}
              >
                Post offer
              </Link>
            )}

            {/* Dashboard always visible once signed in */}
            <Link
              href={dashboardHref}
              className={cx(
                "hover:text-purple-700",
                pathname?.startsWith("/dashboard") && "font-semibold text-purple-700",
              )}
            >
              Dashboard
            </Link>
          </>
        )}
      </div>

      {/* Right side: auth + role toggle */}
      <div className="flex items-center gap-3">
        {!isSignedIn && !loading && (
          <Link
            href="/auth/signin"
            className="text-sm px-3 py-2 rounded-md border hover:bg-purple-50 hover:border-purple-300"
          >
            Sign in
          </Link>
        )}

        {isSignedIn && (
          <div className="flex items-center gap-2">
            {/* Email */}
            <span className="text-sm text-slate-700 truncate max-w-[180px]" title={email || ""}>
              {email}
            </span>

            {/* Role toggle */}
            {bothRoles ? (
              <div className="bg-slate-100 border rounded-full flex text-xs">
                <button
                  onClick={() => switchRole("couple")}
                  className={
                    "px-3 py-1 rounded-full " +
                    (role === "couple"
                      ? "bg-purple-700 text-white"
                      : "text-slate-700 hover:text-purple-700")
                  }
                  disabled={loading}
                >
                  Couple
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className={
                    "px-3 py-1 rounded-full " +
                    (role === "wedflexer"
                      ? "bg-purple-700 text-white"
                      : "text-slate-700 hover:text-purple-700")
                  }
                  disabled={loading}
                >
                  WedFlexer
                </button>
              </div>
            ) : hasCouple && !hasWedflexer ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">Couple</span>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className="text-purple-700 hover:underline"
                >
                  Become a WedFlexer
                </button>
              </div>
            ) : hasWedflexer && !hasCouple ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">WedFlexer</span>
                <button
                  onClick={() => switchRole("couple")}
                  className="text-purple-700 hover:underline"
                >
                  Set up Couple
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => switchRole("couple")}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I am planning a wedding
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I am a WedFlexer
                </button>
              </div>
            )}

            {/* Sign out button */}
            <button
              onClick={signOut}
              className="ml-2 text-xs px-3 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Optional debug  
      {loadErr && (
        <div className="text-[10px] text-red-600 max-w-xs break-words">
          Nav error: {loadErr}
        </div>
      )} */}
    </nav>
  );
}
