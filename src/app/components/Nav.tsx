"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/supabase/client";

type ActiveRole = "couple" | "wedflexer" | null;

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRole>(null);

  useEffect(() => {
    const sb = supabaseBrowser();

    // 1) Load current user once
    sb.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setEmail(u?.email ?? null);
      setUserId(u?.id ?? null);

      // 2) After we know userId, fetch their active_role (RLS-safe)
      if (u?.id) {
        sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id) // IMPORTANT for RLS
          .single()
          .then(({ data: p }) => {
            const role = (p?.active_role as ActiveRole) ?? null;
            setActive(role);
          })
          .catch(() => {});
      }
    });

    // 3) Subscribe to auth changes and clean up correctly
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setEmail(u?.email ?? null);
      setUserId(u?.id ?? null);

      if (u?.id) {
        sb
          .from("profiles")
          .select("active_role")
          .eq("id", u.id)
          .single()
          .then(({ data: p }) => {
            const role = (p?.active_role as ActiveRole) ?? null;
            setActive(role);
          })
          .catch(() => {});
      } else {
        setActive(null);
      }
    });

    return () => {
      // correct cleanup shape
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link href="/" className="text-lg font-semibold">
        WedFlex
      </Link>

      {/* Links */}
      <div className="flex items-center gap-3">
        <Link href="/post-offer" className="underline">
          Post Offer
        </Link>

        {/* We’re keeping /feed and labeling it “Browse Offers” */}
        <Link href="/feed" className="underline">
          Browse Offers
        </Link>

        <Link href="/setup-role" className="underline">
          Roles
        </Link>

        {/* Active role badge */}
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