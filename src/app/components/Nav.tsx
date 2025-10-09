"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../supabase/client"; // relative to /app/components

type ActiveRole = "couple" | "wedflexer" | null;

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRole>(null);

  useEffect(() => {
    const sb = supabaseBrowser();

    const loadActive = async (uid: string) => {
      const { data } = await sb
        .from("profiles")
        .select("active_role")
        .eq("id", uid) // RLS-safe
        .single();
      setActive((data?.active_role as ActiveRole) ?? null);
    };

    // Initial user load
    sb.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setEmail(u?.email ?? null);
      if (u?.id) void loadActive(u.id);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setEmail(u?.email ?? null);
      if (u?.id) void loadActive(u.id);
      else setActive(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold">
        WedFlex
      </Link>

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

        {active && (
          <span className="text-xs rounded bg-gray-200 px-2 py-1 capitalize">
            {active}
          </span>
        )}

        {email ? (
          <span className="opacity-70 text-sm">{email}</span>
        ) : (
          <Link href="/auth/signin" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
