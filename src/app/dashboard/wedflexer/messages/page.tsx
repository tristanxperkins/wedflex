"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import DashboardSidebar from "../../../components/DashboardSidebar";
import Chat from "../../../components/chat";
import { supabaseBrowser } from "../../../supabase/client";

// This page shows your inbox as a WedFlexer.
// For v1 we'll just let you pick a "conversation partner" by ID query param (?other=...)
// and optionally a request context (?request=...).

export default function WedflexerMessagesPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string>("");
  const [requestId, setRequestId] = useState<string>(""); // optional
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // grab logged-in user id for debugging / future use
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: me, error } = await sb.auth.getUser();
        if (error) throw error;
        if (!me?.user) throw new Error("Not authenticated");
        setMeId(me.user.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // We’ll let you manually enter "other user id" to open a chat for now
  // (later we’ll replace this with a list of threads from the DB).
  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <DashboardSidebar role="wedflexer" />

        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Messages</h1>
            <p className="text-sm opacity-70">
              Chat with couples about gigs. (Demo view)
            </p>
          </header>

          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600 text-sm">Error: {err}</p>}

          {!loading && (
            <>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium">Open a conversation</div>

                <label className="block text-sm">
                  <span className="block text-xs mb-1">
                    Other user ID (the couple&apos;s user id)
                  </span>
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="paste other user's id"
                    value={otherId}
                    onChange={(e) => setOtherId(e.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span className="block text-xs mb-1">
                    Request ID (optional, links convo to a specific offer)
                  </span>
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="optional service_requests.id"
                    value={requestId}
                    onChange={(e) => setRequestId(e.target.value)}
                  />
                </label>

                <p className="text-[11px] opacity-60">
                  In production this will be a list of active threads. For now
                  you can paste IDs from the DB to test end-to-end messaging.
                </p>
              </div>

              {otherId ? (
                <Chat
                  otherUserId={otherId}
                  requestId={requestId || undefined}
                />
              ) : (
                <p className="text-sm opacity-70">
                  Select a conversation above to start chatting.
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}
