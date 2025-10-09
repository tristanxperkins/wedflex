"use client";

import { useState } from "react";
// RELATIVE import = robust on Vercel
import { supabaseBrowser } from "../../supabase/client";

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

      // Works on localhost & prod automatically
      const redirectBase = `${window.location.origin}/auth/callback`;

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectBase },
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
          {error && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
        </form>
      )}
    </main>
  );
}
