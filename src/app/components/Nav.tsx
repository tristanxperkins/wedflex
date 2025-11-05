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
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: userData } = await sb.auth.getUser();

        if (!userData?.user) {
          setEmail(null);
          setRole(null);
          return;
        }

        setEmail(userData.user.email ?? null);

        const { data: prof, error: profErr } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", userData.user.id)
          .single();

        if (!profErr && prof?.active_role) {
          setRole(prof.active_role as ActiveRole);
        } else {
          setRole(null);
        }
      } catch {
        setEmail(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname]);

  const isSignedIn = !!email;

  // Decide which dashboard link to show when user is signed in
  const dashboardHref =
    role === "wedflexer"
      ? "/dashboard/wedflexer"
      : "/dashboard/couple";

  async function handleSignOut() {
    try {
      const sb = supabaseBrowser();
      await sb.auth.signOut();
    } catch {
      // ignore error for now
    } finally {
      // Hard reload so all client state resets
      window.location.href = "/";
    }
  }

  return (
    <nav className="flex flex-col md:flex-row md:items-center md:justify-between text-slate-800 gap-3 md:gap-0">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-purple-700">
          WedFlex
        </Link>
      </div>

      {/* Center links: Home, Mission, and (if signed in) Dashboard */}
      <div className="flex flex-wrap gap-4 text-sm">
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

        {isSignedIn && (
          <Link
            href={dashboardHref}
            className={cx(
              "hover:text-purple-700",
              pathname?.startsWith("/dashboard") &&
                "font-semibold text-purple-700",
            )}
          >
            Dashboard
          </Link>
        )}
      </div>

      {/* Right side: auth state */}
      <div className="flex items-center gap-3">
        {/* Logged out → Sign in */}
        {!isSignedIn && !loading && (
          <Link
            href="/auth/signin"
            className="text-sm px-3 py-2 rounded-md border hover:bg-purple-50 hover:border-purple-300"
          >
            Sign in
          </Link>
        )}

        {/* Logged in → email + Sign out */}
        {isSignedIn && (
          <div className="flex items-center gap-2">
            <span
              className="text-sm text-slate-700 truncate max-w-[180px]"
              title={email || ""}
            >
              {email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs px-2 py-1 rounded-md border bg-white hover:bg-purple-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
