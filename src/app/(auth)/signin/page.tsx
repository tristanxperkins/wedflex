"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/app/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {sent ? (
        <p>Check your email for the magic link.</p>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <button className="bg-black text-white rounded px-4 py-2">Send link</button>
          {err && <p className="text-red-600 text-sm">{err}</p>}
        </form>
      )}
    </main>
  );
}
