"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/app/supabase/client";

export default function Nav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link href="/">WedFlex</Link>
      <div className="space-x-3">
        <Link href="/feed" className="underline">Feed</Link>
        {email ? (
          <>
            <span className="opacity-70">{email}</span>
            <button onClick={signOut} className="underline">Sign out</button>
          </>
        ) : (
          <Link href="/(auth)/signin" className="underline">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
