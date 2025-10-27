"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

/** Roles we recognize */
type ActiveRole = "couple" | "wedflexer" | null;

/** tiny classnames helper */
function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);

  // "hasCouple" = they've ever acted as a couple (ex: posted an offer)
  // "hasWedflexer" = they've ever acted as a wedflexer (ex: applied)
  const [hasCouple, setHasCouple] = useState(false);
  const [hasWedflexer, setHasWedflexer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // On mount (and when path changes), fetch:
  // - current authenticated user (if any)
  // - active_role from profiles
  // - evidence of couple/wedflexer roles
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: userData, error: userErr } = await sb.auth.getUser();
        if (userErr) throw userErr;

        if (!userData?.user) {
          // not signed in
          setEmail(null);
          setRole(null);
          setHasCouple(false);
          setHasWedflexer(false);
          return;
        }

        const u = userData.user;
        setEmail(u.email ?? "");

        // 1) grab active_role from profiles
        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single();

        if (profErr && profErr.code !== "PGRST116") {
          throw profErr;
        }
        setRole((prof?.active_role as ActiveRole) ?? null);

        // 2) figure out if they "haveCouple" or "haveWedflexer"
        // couple: any posted service_requests
        // wedflexer: any submitted applications
        const [{ count: coupleCnt, error: cErr }, { count: wedCnt, error: wErr }] =
          await Promise.all([
            sb
              .from("service_requests")
              .select("id", { count: "exact", head: true })
              .eq("couple_id", u.id),
            sb
              .from("applications")
              .select("id", { count: "exact", head: true })
              .eq("wedflexer_id", u.id),
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

  //
  // switchRole:
  // - if user not signed in at all, send them to signin with the desired role hint
  // - if they don't have that role yet, send them to onboarding funnel (post-your-first-offer or earn-money)
  // - if they do, persist active_role in /api/me and route to dashboard
  //
  async function switchRole(next: Exclude<ActiveRole, null>) {
    try {
      const sb = supabaseBrowser();
      const { data: userData } = await sb.auth.getUser();

      // case 0: not logged in
      if (!userData?.user) {
        if (next === "couple") {
          router.push("/post-your-first-offer");
        } else {
          router.push("/earn-money");
        }
        return;
      }

      const uid = userData.user.id;

      // case 1: user is logged in but hasn't established that role
      if (next === "couple" && !hasCouple) {
        // no popup, just go to couple onboarding funnel
        router.push("/post-your-first-offer");
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        // no popup, just go to wedflexer onboarding funnel
        router.push("/earn-money");
        return;
      }

      // case 2: user has that role; save as active_role and go to dashboard
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: next }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        // if PATCH fails for some reason, fall back to just routing
        console.warn("Failed to persist active_role", json);
      } else {
        setRole(next);
      }

      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) {
      console.error("switchRole error:", e);
      // fail-soft: route them to funnel if something explodes
      if (next === "couple") {
        router.push("/post-your-first-offer");
      } else {
        router.push("/earn-money");
      }
    }
  }

  // convenience booleans
  const isSignedIn = !!email;
  const bothRoles = hasCouple && hasWedflexer;

  // nav link sets for clarity
  function GuestLinks() {
    return (
      <>
        <Link
          href="/"
          className={cx(
            "hover:text-purple-700",
            pathname === "/" && "font-semibold text-purple-700"
          )}
        >
          Home
        </Link>

        <Link
          href="/mission"
          className={cx(
            "hover:text-purple-700",
            pathname === "/mission" && "font-semibold text-purple-700"
          )}
        >
          Mission
        </Link>

        <Link
          href="/post-your-first-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-your-first-offer" && "font-semibold text-purple-700"
          )}
        >
          Post your first offer
        </Link>

        <Link
          href="/earn-money"
          className={cx(
            "hover:text-purple-700",
            pathname === "/earn-money" && "font-semibold text-purple-700"
          )}
        >
          Earn money
        </Link>
      </>
    );
  }

  function CoupleLinksOnly() {
    return (
      <>
        <Link
          href="/"
          className={cx(
            "hover:text-purple-700",
            pathname === "/" && "font-semibold text-purple-700"
          )}
        >
          Home
        </Link>

        <Link
          href="/mission"
          className={cx(
            "hover:text-purple-700",
            pathname === "/mission" && "font-semibold text-purple-700"
          )}
        >
          Mission
        </Link>

        <Link
          href="/post-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-offer" && "font-semibold text-purple-700"
          )}
        >
          Post Offer
        </Link>

        <button
          onClick={() => switchRole("couple")}
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard/couple") &&
              "font-semibold text-purple-700"
          )}
        >
          Dashboard
        </button>
      </>
    );
  }

  function WedflexerLinksOnly() {
    return (
      <>
        <Link
          href="/"
          className={cx(
            "hover:text-purple-700",
            pathname === "/" && "font-semibold text-purple-700"
          )}
        >
          Home
        </Link>

        <Link
          href="/mission"
          className={cx(
            "hover:text-purple-700",
            pathname === "/mission" && "font-semibold text-purple-700"
          )}
        >
          Mission
        </Link>

        <Link
          href="/feed"
          className={cx(
            "hover:text-purple-700",
            pathname === "/feed" && "font-semibold text-purple-700"
          )}
        >
          Browse Offers
        </Link>

        <button
          onClick={() => switchRole("wedflexer")}
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard/wedflexer") &&
              "font-semibold text-purple-700"
          )}
        >
          Dashboard
        </button>
      </>
    );
  }

  function BothLinks() {
    // Both roles unlocked → show the full power nav:
    // Home | Mission | Browse Offers | Post Offer | Dashboard
    return (
      <>
        <Link
          href="/"
          className={cx(
            "hover:text-purple-700",
            pathname === "/" && "font-semibold text-purple-700"
          )}
        >
          Home
        </Link>

        <Link
          href="/mission"
          className={cx(
            "hover:text-purple-700",
            pathname === "/mission" && "font-semibold text-purple-700"
          )}
        >
          Mission
        </Link>

        <Link
          href="/feed"
          className={cx(
            "hover:text-purple-700",
            pathname === "/feed" && "font-semibold text-purple-700"
          )}
        >
          Browse Offers
        </Link>

        <Link
          href="/post-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-offer" && "font-semibold text-purple-700"
          )}
        >
          Post Offer
        </Link>

        <button
          onClick={() =>
            switchRole(role === "wedflexer" ? "wedflexer" : "couple")
          }
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard") &&
              "font-semibold text-purple-700"
          )}
        >
          Dashboard
        </button>
      </>
    );
  }

  // render -------------------------------------------------------------

  return (
    <nav className="flex flex-col md:flex-row md:items-center md:justify-between text-slate-800 gap-3 md:gap-0">
      {/* Brand / left side */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-purple-700">
          WedFlex
        </Link>
      </div>

      {/* Center links */}
      <div className="flex flex-wrap gap-4 text-sm">
        {loading ? null : !isSignedIn ? (
          <GuestLinks />
        ) : bothRoles ? (
          <BothLinks />
        ) : hasCouple ? (
          <CoupleLinksOnly />
        ) : hasWedflexer ? (
          <WedflexerLinksOnly />
        ) : (
          // edge case: signed in but hasn't done either role yet
          <GuestLinks />
        )}
      </div>

      {/* Right side: auth / identity */}
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
            {/* Email display */}
            <span
              className="text-sm text-slate-700 truncate max-w-[180px]"
              title={email || ""}
            >
              {email}
            </span>

            {/* Role UI: */}
            {bothRoles ? (
              // toggle pill
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
                <span className="px-2 py-1 rounded-full border bg-white">
                  Couple
                </span>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className="text-purple-700 hover:underline"
                >
                  Become a WedFlexer
                </button>
              </div>
            ) : hasWedflexer && !hasCouple ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">
                  WedFlexer
                </span>
                <button
                  onClick={() => switchRole("couple")}
                  className="text-purple-700 hover:underline"
                >
                  Set up Couple
                </button>
              </div>
            ) : (
              // rare: logged in but has neither role activity yet
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => switchRole("couple")}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I am planning a Wedding
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

      {/* Optional tiny debug (hide in prod) */}
      {/* {loadErr && (
        <div className="text-[10px] text-red-600 max-w-xs break-words">
          Nav error: {loadErr}
        </div>
      )} */}
    </nav>
  );
}
