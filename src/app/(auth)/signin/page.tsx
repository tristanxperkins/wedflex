"use client";

import { useState } from "react";
// If your tsconfig sets `@/*` to "src/*", this alias works:
import { supabaseBrowser } from "@/app/supabase/client";
// If that alias isn't set up, use the relative path instead:
// import { supabaseBrowser } from "../../supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const sb = supabaseBrowser();

      // build a redirect URL that works on localhost AND vercel
      const redirectBase = `${window.location.origin}/auth/callback`;

      // optional: preserve where the user was headed (e.g., /r/<id>)
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      const emailRedirectTo = returnTo
        ? `${redirectBase}?returnTo=${encodeURIComponent(returnTo)}`
        : redirectBase;

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      {sent ? (
        <div className="rounded border p-4 bg-green-50">
          <p>Magic link sent to <strong>{email}</strong>.</p>
          <p className="text-sm opacity-80 mt-1">
            Open it on the same device if you’re signing into localhost.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !email}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send magic link"}
          </button>

          {error && <p className="text-red-600 text-sm">Error: {error}</p>}
        </form>
      )}
    </main>
  );
}
