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
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load user, role, and whether they "have" each role (by activity)
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

        const user = userData.user;
        setEmail(user.email ?? "");

        // current role from profile
        const { data: prof, error: pErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", user.id)
          .single();
        if (pErr && pErr.code !== "PGRST116") throw pErr;
        setRole((prof?.active_role as ActiveRole) ?? null);

        // infer both-role availability by activity:
        // - couple if they’ve posted a service_request
        // - wedflexer if they’ve submitted an application
        const [{ count: coupleCnt, error: cErr }, { count: wedCnt, error: wErr }] =
          await Promise.all([
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
  }, [pathname]); // re-check on route changes

  async function switchRole(next: Exclude<ActiveRole, null>) {
    try {
      const sb = supabaseBrowser();
      const { data: userData } = await sb.auth.getUser();
      if (!userData?.user) {
        router.push(`/auth/signin?role=${next}`);
        return;
      }

      // If they don't "have" that role yet, send to onboarding
      if (next === "couple" && !hasCouple) {
        // couple onboarding (profile page or first-offer page)
        router.push("/dashboard/couple/profile");
        return;
      }
      if (next === "wedflexer" && !hasWedflexer) {
        // wedflexer onboarding (profile page)
        router.push("/dashboard/wedflexer/profile");
        return;
      }

      // They have it → persist and send to the dashboard
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_role: next }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setRole(next);
      router.push(next === "couple" ? "/dashboard/couple" : "/dashboard/wedflexer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <nav className="flex items-center justify-between text-slate-800">
      {/* Brand */}
      <Link href="/" className="text-2xl font-extrabold text-purple-700">WedFlex</Link>

      {/* Center links */}
      <div className="hidden md:flex gap-6 text-sm">
        <Link href="/feed" className={cx("hover:text-purple-700", pathname === "/feed" && "font-semibold text-purple-700")}>
          Browse Offers
        </Link>
        <Link href="/post-offer" className={cx("hover:text-purple-700", pathname === "/post-offer" && "font-semibold text-purple-700")}>
          Post Offer
        </Link>
        <Link
          href={role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple"}
          className={cx("hover:text-purple-700", pathname?.startsWith("/dashboard") && "font-semibold text-purple-700")}
        >
          Dashboard
        </Link>
      </div>

      {/* Right: auth + role */}
      <div className="flex items-center gap-3">
        {/* Not signed in → show Sign in */}
        {!email && !loading && (
          <Link
            href="/auth/signin"
            className="text-sm px-3 py-2 rounded-md border hover:bg-purple-50 hover:border-purple-300"
          >
            Sign in
          </Link>
        )}

        {/* Signed in → show username + role/toggle */}
        {!!email && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700 truncate max-w-[180px]" title={email}>
              {email}
            </span>

            {/* If both available → toggle; else show a simple badge + CTA to create the other role */}
            {hasCouple && hasWedflexer ? (
              <div className="bg-slate-100 border rounded-full flex">
                <button
                  onClick={() => switchRole("couple")}
                  className={cx(
                    "px-3 py-1 text-sm rounded-full",
                    role === "couple" ? "bg-purple-700 text-white" : "text-slate-700 hover:text-purple-700"
                  )}
                  disabled={loading}
                >
                  Couple
                </button>
                <button
                  onClick={() => switchRole("wedflexer")}
                  className={cx(
                    "px-3 py-1 text-sm rounded-full",
                    role === "wedflexer" ? "bg-purple-700 text-white" : "text-slate-700 hover:text-purple-700"
                  )}
                  disabled={loading}
                >
                  WedFlexer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full border bg-white">
                  {role ?? "—"}
                </span>
                {/* Offer a path to create the other role */}
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

      {/* Optional inline error for debugging */}
      {/* {err && <span className="text-xs text-red-600 ml-2">Nav error: {err}</span>} */}
    </nav>
  );
}
