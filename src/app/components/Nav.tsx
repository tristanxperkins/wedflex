"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/supabase/client";

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [active, setActive] = useState<"couple" | "wedflexer" | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();

    // Get current user
    sb.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    // Subscribe to session changes (login/logout)
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });

    // Fetch active role from profiles
    sb
      .from("profiles")
      .select("active_role")
      .single()
      .then(({ data }) => {
        setActive((data?.active_role as any) ?? null);
      });

    // Cleanup subscription on unmount
    return () => sub?.subscription?.unsubscribe();
  }, []);

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      {/* Logo / Brand */}
      <Link href="/" className="text-lg font-semibold">
        WedFlex
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-3">
        <Link href="/post-offer" className="underline">
          Post Offer
        </Link>
        <Link href="/feed" className="underline">
          Browse Offers
        </Link>
        <Link href="/setup-role" className="underline">
          Roles
        </Link>

        {/* Active Role Badge */}
        {active && (
          <span className="text-xs rounded bg-gray-200 px-2 py-1 capitalize">
            {active}
          </span>
        )}

        {/* Auth State */}
        {email ? (
          <span className="opacity-70 text-sm">{email}</span>
        ) : (
          <Link href="/signin" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
