/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

// small helper for conditional classes
function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);

  // does this user "have" each role yet?
  const [hasCouple, setHasCouple] = useState(false);
  const [hasWedflexer, setHasWedflexer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // load auth, role, role availability
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();

        const { data: userData, error: userErr } = await sb.auth.getUser();
        if (userErr) throw userErr;

        // visitor / signed out
        if (!userData?.user) {
          setEmail(null);
          setRole(null);
          setHasCouple(false);
          setHasWedflexer(false);
          return;
        }

        const user = userData.user;
        setEmail(user.email ?? "");

        // get active_role from profile
        const { data: prof, error: pErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", user.id)
          .single();
        if (pErr && pErr.code !== "PGRST116") throw pErr;
        setRole((prof?.active_role as ActiveRole) ?? null);

        // infer whether this account has acted as couple or wedflexer
        const [
          { count: coupleCnt, error: cErr },
          { count: wedCnt, error: wErr },
        ] = await Promise.all([
          sb
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("couple_id", user.id),
          sb
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("wedflexer_id", user.id),
        ]);

        if (cErr) throw cErr;
        if (wErr) throw wErr;

        setHasCouple((coupleCnt ?? 0) > 0);
        setHasWedflexer((wedCnt ?? 0) > 0);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]);

  // try switching active role
  async function switchRole(next: Exclude<ActiveRole, null>) {
    try {
      const sb = supabaseBrowser();
      const { data: userData } = await sb.auth.getUser();

      // if somehow not signed in, send to signin with intent
      if (!userData?.user) {
        router.push(`/auth/signin?role=${next}`);
        return;
      }

      // onboarding case:
      // they clicked a role they don't "have" yet → route them to that setup
      if (next === "couple" && !hasCouple) {
        router.push("/dashboard/couple/profile");
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        router.push("/dashboard/wedflexer/profile");
        return;
      }

      // they have that role: persist active_role via /api/me
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: next }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setRole(next);
      router.push(
        next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer"
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <nav className="flex items-center justify-between text-slate-800">
      {/* Brand / left side */}
      <Link
        href="/"
        className="text-2xl font-extrabold text-purple-700"
      >
        WedFlex
      </Link>

      {/* center links */}
<div className="hidden md:flex gap-6 text-sm">
  {/* Public marketing funnels, always visible */}
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
    Post Your First Offer
  </Link>

  <Link
    href="/earn-money"
    className={cx(
      "hover:text-purple-700",
      pathname === "/earn-money" && "font-semibold text-purple-700"
    )}
  >
    Earn Money
  </Link>



  {/* Only show “Browse Offers” if this user is (or can be) a WedFlexer */}
  {!!email && (hasWedflexer || hasCouple) && (
    <>
      {hasWedflexer && (
        <Link
          href="/feed"
          className={cx(
            "hover:text-purple-700",
            pathname === "/feed" && "font-semibold text-purple-700"
          )}
        >
          Browse Offers
        </Link>
      )}

      {/* Only show “Post Offer” if this user is (or can be) a Couple */}
      {hasCouple && (
        <Link
          href="/post-offer"
          className={cx(
            "hover:text-purple-700",
            pathname === "/post-offer" && "font-semibold text-purple-700"
          )}
        >
          Post Offer
        </Link>
      )}
    </>
  )}

  {/* Dashboard is only meaningful if signed in */}
  {!!email && (
    <Link
      href={
        role === "wedflexer"
          ? "/dashboard/wedflexer"
          : "/dashboard/couple"
      }
      className={cx(
        "hover:text-purple-700",
        pathname?.startsWith("/dashboard") &&
          "font-semibold text-purple-700"
      )}
    >
      Dashboard
    </Link>
  )}
</div>

       


      {/* right side: auth / role */}
      <div className="flex items-center gap-3">
        {/* if signed OUT */}
        {!email && !loading && (
          <Link
            href="/auth/signin"
            className="text-sm px-3 py-2 rounded-md border hover:bg-purple-50 hover:border-purple-300"
          >
            Sign in
          </Link>
        )}

        {/* if signed IN */}
        {!!email && (
          <div className="flex items-center gap-2">
            {/* email / username */}
            <button
  onClick={() => {
    // send them to whichever dashboard matches current active_role
    const dest =
      role === "wedflexer"
        ? "/dashboard/wedflexer"
        : "/dashboard/couple";
    router.push(dest);
  }}
  className="text-sm text-slate-700 truncate max-w-[180px] text-left hover:text-purple-700"
  title={email}
>
  {email}
</button>


            {/* CASE: has both roles → show toggle pill */}
            {hasCouple && hasWedflexer ? (
              <div className="bg-slate-100 border rounded-full flex">
                <button
                  onClick={() => switchRole("couple")}
                  disabled={loading}
                  className={
                    "px-3 py-1 text-sm rounded-full " +
                    (role === "couple"
                      ? "bg-purple-700 text-white"
                      : "text-slate-700 hover:text-purple-700")
                  }
                >
                  Couple
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  disabled={loading}
                  className={
                    "px-3 py-1 text-sm rounded-full " +
                    (role === "wedflexer"
                      ? "bg-purple-700 text-white"
                      : "text-slate-700 hover:text-purple-700")
                  }
                >
                  WedFlexer
                </button>
              </div>
            ) : (
              // CASE: only one role right now
              <div className="flex items-center gap-2">
                {hasCouple && !hasWedflexer && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-white">
                    Couple
                  </span>
                )}

                {hasWedflexer && !hasCouple && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-white">
                    WedFlexer
                  </span>
                )}

                {/* allow upgrade to the other role */}
                {!hasCouple && (
                  <button
                    onClick={() => switchRole("couple")}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Set up Couple
                  </button>
                )}

                {!hasWedflexer && (
                  <button
                    onClick={() => switchRole("wedflexer")}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Become a WedFlexer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* debug error helper (optional) */}
      {/* {err && (
        <span className="text-[10px] text-red-600 ml-2 max-w-[200px] truncate">
          Nav error: {err}
        </span>
      )} */}
    </nav>
  );
}
