"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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

  const router = useRouter();
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

        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single();

        if (profErr && (profErr as { code?: string }).code !== "PGRST116") {
          throw profErr;
        }
        setRole((prof?.active_role as ActiveRole) ?? null);

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

  async function switchRole(next: Exclude<ActiveRole, null>) {
    try {
      const sb = supabaseBrowser();
      const { data: userData } = await sb.auth.getUser();

      // not logged in at all -> send to correct onboarding funnel
      if (!userData?.user) {
        if (next === "couple") {
          router.push("/post-your-first-offer");
        } else {
          router.push("/earn-money");
        }
        return;
      }

      // logged in, but not established as that role yet
      if (next === "couple" && !hasCouple) {
        router.push("/post-your-first-offer");
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        router.push("/earn-money");
        return;
      }

      // already has that role -> persist active_role and route to dashboard
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: next }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        console.warn("Failed to persist active_role", json);
      } else {
        setRole(next);
      }

      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) {
      console.error("switchRole error:", e);
      if (next === "couple") {
        router.push("/post-your-first-offer");
      } else {
        router.push("/earn-money");
      }
    }
  }

  const isSignedIn = !!email;
  const bothRoles = hasCouple && hasWedflexer;

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
            pathname === "/post-your-first-offer" &&
              "font-semibold text-purple-700"
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

  return (
    <nav className="flex flex-col md:flex-row md:items-center md:justify-between text-slate-800 gap-3 md:gap-0">
      {/* left / brand */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-purple-700">
          WedFlex
        </Link>
      </div>

      {/* center links */}
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

      {/* right / auth state */}
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
            <span
              className="text-sm text-slate-700 truncate max-w-[180px]"
              title={email || ""}
            >
              {email}
            </span>

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
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => switchRole("couple")}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I'm a Couple
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className="px-2 py-1 rounded-full border bg-white hover:text-purple-700"
                >
                  I'm a WedFlexer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* debug helper for us
      {loadErr && (
        <div className="text-[10px] text-red-600 max-w-xs break-words">
          Nav error: {loadErr}
        </div>
      )} */}
    </nav>
  );
}
