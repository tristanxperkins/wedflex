"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);
  const [hasCouple, setHasCouple] = useState(false);
  const [hasWedflexer, setHasWedflexer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // ---------- Load auth + role state ----------
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        // who am I?
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

        // current active role on profile (nullable)
        const { data: prof, error: pErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single();
        // PGRST116 means no row; treat as null
        if (pErr && (pErr as { code?: string }).code !== "PGRST116") throw pErr;
        setRole((prof?.active_role as ActiveRole) ?? null);

        // infer if the account *has* each role
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
  }, [pathname]);

  // ---------- Derived helpers ----------
  const isSignedIn = !!email;
  const bothRoles = hasCouple && hasWedflexer;

  const dashboardHref = useMemo<string | null>(() => {
    if (!isSignedIn) return null;
    // Prefer explicit active_role; otherwise infer from what they "have".
    const effective: ActiveRole =
      role ?? (hasCouple ? "couple" : hasWedflexer ? "wedflexer" : null);
    if (effective === "couple") return "/dashboard/couple";
    if (effective === "wedflexer") return "/dashboard/wedflexer";
    return null;
  }, [isSignedIn, role, hasCouple, hasWedflexer]);

  // Always keeps the Dashboard link in sync with the current toggle/role.
  function goDashboard() {
    if (!dashboardHref) return;
    router.push(dashboardHref);
  }

  // ---------- Toggle logic (sets role + routes) ----------
  async function switchRole(next: "couple" | "wedflexer") {
    try {
      const sb = supabaseBrowser();

      // If not signed in → send them into the correct funnel
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) {
        router.push(next === "couple" ? "/post-your-first-offer" : "/earn-money");
        return;
      }

      // Signed in but doesn't *have* that role yet → onboarding/funnel
      if (next === "couple" && !hasCouple) {
        router.push("/post-your-first-offer");
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        router.push("/earn-money");
        return;
      }

      // Persist active_role using a proper bearer for RLS
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

      setRole(next);            // update toggle immediately
      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer"); // and route to the matching dashboard
    } catch {
      // On any failure, route into the correct funnel for a smoother experience
      router.push(next === "couple" ? "/post-your-first-offer" : "/earn-money");
    }
  }

  // ---------- Link groups ----------
  function GuestLinks() {
    return (
      <>
        <Link href="/" className={cx("hover:text-purple-700", pathname === "/" && "font-semibold text-purple-700")}>
          Home
        </Link>
        <Link href="/mission" className={cx("hover:text-purple-700", pathname === "/mission" && "font-semibold text-purple-700")}>
          Mission
        </Link>
        <Link href="/post-your-first-offer" className={cx("hover:text-purple-700", pathname === "/post-your-first-offer" && "font-semibold text-purple-700")}>
          Post your first offer
        </Link>
        <Link href="/earn-money" className={cx("hover:text-purple-700", pathname === "/earn-money" && "font-semibold text-purple-700")}>
          Earn money
        </Link>
      </>
    );
  }

  function CoupleLinksOnly() {
    return (
      <>
        <Link href="/" className={cx("hover:text-purple-700", pathname === "/" && "font-semibold text-purple-700")}>
          Home
        </Link>
        <Link href="/mission" className={cx("hover:text-purple-700", pathname === "/mission" && "font-semibold text-purple-700")}>
          Mission
        </Link>
        <Link href="/post-offer" className={cx("hover:text-purple-700", pathname === "/post-offer" && "font-semibold text-purple-700")}>
          Post Offer
        </Link>
        <button
          onClick={goDashboard}
          className={cx("hover:text-purple-700", pathname?.startsWith("/dashboard/couple") && "font-semibold text-purple-700")}
        >
          Dashboard
        </button>
      </>
    );
  }

  function WedflexerLinksOnly() {
    return (
      <>
        <Link href="/" className={cx("hover:text-purple-700", pathname === "/" && "font-semibold text-purple-700")}>
          Home
        </Link>
        <Link href="/mission" className={cx("hover:text-purple-700", pathname === "/mission" && "font-semibold text-purple-700")}>
          Mission
        </Link>
        <Link href="/feed" className={cx("hover:text-purple-700", pathname === "/feed" && "font-semibold text-purple-700")}>
          Browse Offers
        </Link>
        <button
          onClick={goDashboard}
          className={cx("hover:text-purple-700", pathname?.startsWith("/dashboard/wedflexer") && "font-semibold text-purple-700")}
        >
          Dashboard
        </button>
      </>
    );
  }

  function BothLinks() {
    return (
      <>
        <Link href="/" className={cx("hover:text-purple-700", pathname === "/" && "font-semibold text-purple-700")}>
          Home
        </Link>
        <Link href="/mission" className={cx("hover:text-purple-700", pathname === "/mission" && "font-semibold text-purple-700")}>
          Mission
        </Link>
        <Link href="/feed" className={cx("hover:text-purple-700", pathname === "/feed" && "font-semibold text-purple-700")}>
          Browse Offers
        </Link>
        <Link href="/post-offer" className={cx("hover:text-purple-700", pathname === "/post-offer" && "font-semibold text-purple-700")}>
          Post Offer
        </Link>
        <button
          onClick={goDashboard}
          className={cx("hover:text-purple-700", pathname?.startsWith("/dashboard") && "font-semibold text-purple-700")}
        >
          Dashboard
        </button>
      </>
    );
  }

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
        {loading
          ? null
          : !isSignedIn
          ? <GuestLinks />
          : bothRoles
          ? <BothLinks />
          : hasCouple
          ? <CoupleLinksOnly />
          : hasWedflexer
          ? <WedflexerLinksOnly />
          : <GuestLinks />}
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

        {!!isSignedIn && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700 truncate max-w-[180px]" title={email || ""}>
              {email}
            </span>

            {/* Toggle appears only if the account has both roles */}
            {bothRoles ? (
              <div className="bg-slate-100 border rounded-full flex text-xs">
                <button
                  onClick={() => switchRole("couple")}
                  className={
                    "px-3 py-1 rounded-full " +
                    (role === "couple" ? "bg-purple-700 text-white" : "text-slate-700 hover:text-purple-700")
                  }
                  disabled={loading}
                >
                  Couple
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className={
                    "px-3 py-1 rounded-full " +
                    (role === "wedflexer" ? "bg-purple-700 text-white" : "text-slate-700 hover:text-purple-700")
                  }
                  disabled={loading}
                >
                  WedFlexer
                </button>
              </div>
            ) : hasCouple && !hasWedflexer ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">Couple</span>
                <button onClick={() => switchRole("wedflexer")} className="text-purple-700 hover:underline">
                  Become a WedFlexer
                </button>
              </div>
            ) : hasWedflexer && !hasCouple ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">WedFlexer</span>
                <button onClick={() => switchRole("couple")} className="text-purple-700 hover:underline">
                  Set up Couple
                </button>
              </div>
            ) : (
              // Signed in but neither role inferred yet → show paths
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
          </div>
        )}
      </div>

      {/* Optional tiny error for debugging */}
      {/* {loadErr && <div className="text-[10px] text-red-600 max-w-xs break-words">Nav error: {loadErr}</div>} */}
    </nav>
  );
}
