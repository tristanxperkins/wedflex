"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<ActiveRole>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  // Load auth + active_role (just to pick the right dashboard link)
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

        setEmail(userData.user.email ?? "");

        const { data: prof } = await sb
          .from("profiles")
          .select("active_role")
          .eq("id", userData.user.id)
          .single();

        setRole((prof?.active_role as ActiveRole) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSignOut() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    setEmail(null);
    setRole(null);
    router.push("/");
  }

  const isSignedIn = !!email;

  // If we know their active_role, send them to that dashboard.
  // Fallback default = couple dashboard.
  const dashboardHref =
    role === "wedflexer" ? "/dashboard/wedflexer" : "/dashboard/couple";

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

        {isSignedIn && (
          <Link
            href={dashboardHref}
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

      {/* Right side: auth */}
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
          <>
            <span
              className="text-sm text-slate-700 truncate max-w-[180px]"
              title={email || ""}
            >
              {email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm px-3 py-2 rounded-md border hover:bg-slate-50"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
