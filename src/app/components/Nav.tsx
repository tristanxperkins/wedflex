"use client";

import Link from "next/link";
import { JSX, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

  const pathname = usePathname();
  const router = useRouter();

  // Load auth and role info
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

        // active_role from profiles
        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single();

        if (profErr && (profErr as { code?: string }).code !== "PGRST116") {
          throw profErr;
        }

        const activeRole = (prof?.active_role as ActiveRole) ?? null;
        setRole(activeRole);

        // soft signal: have they ever used each side?
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

        // treat the active_role as “has this role” too
        setHasCouple((coupleCnt ?? 0) > 0 || activeRole === "couple");
        setHasWedflexer((wedCnt ?? 0) > 0 || activeRole === "wedflexer");
      } catch {
        // don’t block nav if Supabase flakes
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]);

  const isSignedIn = !!email;
  const bothRoles = hasCouple && hasWedflexer;

  /** Toggle dashboard role (only for users who already have that role) */
  async function switchRole(next: "couple" | "wedflexer") {
    try {
      const sb = supabaseBrowser();
      const { data: userData } = await sb.auth.getUser();
      if (!userData?.user) {
        // somehow not signed in → send to funnel for that side
        window.location.href =
          next === "couple" ? "/post-your-first-offer" : "/earn-money";
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
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setRole(next);
      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch {
      // worst case: take them through the relevant funnel
      window.location.href =
        next === "couple" ? "/post-your-first-offer" : "/earn-money";
    }
  }

  /** Start onboarding flows (used by buttons, not by the toggle) */
  function startCoupleOnboarding() {
    window.location.href = "/post-your-first-offer";
  }
  function startWedflexerOnboarding() {
    window.location.href = "/earn-money";
  }

  async function signOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    setEmail(null);
    setRole(null);
    setHasCouple(false);
    setHasWedflexer(false);
    router.push("/");
  }

  /** NAV LINK GROUPS */

  function GuestLinks() {
    return (
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
    );
  }

  function CoupleLinksOnly() {
    return (
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
          href="/post-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-offer" && "font-semibold text-purple-700",
          )}
        >
          Post Offer
        </Link>
        <button
          type="button"
          onClick={() => switchRole("couple")}
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard/couple") &&
              "font-semibold text-purple-700",
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
          href="/feed"
          className={cx(
            "hover:text-purple-700",
            pathname === "/feed" && "font-semibold text-purple-700",
          )}
        >
          Browse Offers
        </Link>
        <button
          type="button"
          onClick={() => switchRole("wedflexer")}
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard/wedflexer") &&
              "font-semibold text-purple-700",
          )}
        >
          Dashboard
        </button>
      </>
    );
  }

  function BothLinks() {
    return (
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
          href="/feed"
          className={cx(
            "hover:text-purple-700",
            pathname === "/feed" && "font-semibold text-purple-700",
          )}
        >
          Browse Offers
        </Link>
        <Link
          href="/post-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-offer" && "font-semibold text-purple-700",
          )}
        >
          Post Offer
        </Link>
        <button
          type="button"
          onClick={() =>
            switchRole(role === "wedflexer" ? "wedflexer" : "couple")
          }
          className={cx(
            "hover:text-purple-700",
            pathname?.startsWith("/dashboard") &&
              "font-semibold text-purple-700",
          )}
        >
          Dashboard
        </button>
      </>
    );
  }

  // Decide which link set to show in the center
  let CenterLinks: JSX.Element | null = null;
  if (!isSignedIn) {
    CenterLinks = <GuestLinks />;
  } else if (bothRoles) {
    CenterLinks = <BothLinks />;
  } else if (role === "couple" || hasCouple) {
    CenterLinks = <CoupleLinksOnly />;
  } else if (role === "wedflexer" || hasWedflexer) {
    CenterLinks = <WedflexerLinksOnly />;
  } else {
    // signed-in but no clearly established role yet → still show guest style
    CenterLinks = <GuestLinks />;
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
        {!loading && CenterLinks}
      </div>

      {/* Right side: auth + role UI */}
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
            <span
              className="text-sm text-slate-700 truncate max-w-[180px]"
              title={email || ""}
            >
              {email}
            </span>

            {/* Role display */}
            {bothRoles ? (
              // Toggle if they have both roles
              <div className="bg-slate-100 border rounded-full flex text-xs">
                <button
                  type="button"
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
                  type="button"
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
            ) : role === "couple" || hasCouple ? (
              // Couple only
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">
                  Couple
                </span>
                <button
                  type="button"
                  onClick={startWedflexerOnboarding}
                  className="text-purple-700 hover:underline"
                >
                  Become a WedFlexer
                </button>
              </div>
            ) : role === "wedflexer" || hasWedflexer ? (
              // Wedflexer only
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full border bg-white">
                  WedFlexer
                </span>
                <button
                  type="button"
                  onClick={startCoupleOnboarding}
                  className="text-purple-700 hover:underline"
                >
                  Set up Couple
                </button>
              </div>
            ) : (
              // Signed in but no role yet (rare) → let them choose a funnel
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={startCoupleOnboarding}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I am planning a wedding
                </button>
                <button
                  type="button"
                  onClick={startWedflexerOnboarding}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I am a WedFlexer
                </button>
              </div>
            )}

            {/* Sign out */}
            <button
              type="button"
              onClick={signOut}
              className="text-xs px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
