"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import { supabaseBrowser } from "../../supabase/client";

function toErrorString(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

type ActiveRole = "couple" | "wedflexer" | null;

type RequestRow = {
  id: string;
  title: string;
  category: string;
  location: string;
  offer_cents: number | null;
  status: "open" | "awarded" | "closed" | "cancelled";
  created_at: string;
  couple_id: string;
};

type ApplicationRow = {
  id: string;
  request_id: string;
  wedflexer_id: string;
  message: string | null;
  bid_cents: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | null;
  created_at: string;
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter(); // ✅ moved to top-level

  const [reqRow, setReqRow] = useState<RequestRow | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [active, setActive] = useState<ActiveRole>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [applyMsg, setApplyMsg] = useState("");
  const [acceptOffer, setAcceptOffer] = useState(false);
  const [counter, setCounter] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const sb = supabaseBrowser();

        const { data: me } = await sb.auth.getUser();
        let uid: string | null = null;
        if (me?.user?.id) {
          uid = me.user.id;
          const { data: p } = await sb
            .from("profiles")
            .select("active_role")
            .eq("id", me.user.id)
            .single();
          setActive((p?.active_role as ActiveRole) ?? null);
        }

        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch(`/api/requests/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        const request: RequestRow = json.request;
        const applications: ApplicationRow[] = json.applications || [];

        if (!cancel) {
          setReqRow(request);
          setApps(applications);
          if (uid && request.couple_id === uid) setIsOwner(true);
        }
      } catch (e) {
        if (!cancel) setErr(toErrorString(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id]);

  const offerAmount = useMemo(
    () =>
      reqRow?.offer_cents != null
        ? `$${Math.round(reqRow.offer_cents / 100).toLocaleString()}`
        : undefined,
    [reqRow]
  );

  async function apply() {
    try {
      setPosting(true);
      setOkMsg(null);
      setErr(null);

      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          request_id: id,
          message: applyMsg,
          accept_offer: acceptOffer,
          counter_offer: counter.trim() === "" ? null : Number(counter),
        }),
      });

      let json: { ok?: boolean; error?: unknown } | null = null;
      let raw = "";
      try {
        json = await res.json();
      } catch {
        raw = await res.text();
      }

      if (!res.ok || !json?.ok) {
        const apiErr = json?.error ?? (raw || `HTTP ${res.status}`);
        throw new Error(toErrorString(apiErr));
      }

      setOkMsg("Applied!");
      setApplyMsg("");
      setAcceptOffer(false);
      setCounter("");

      // ✅ redirect after success
      setTimeout(() => {
        router.push("/feed");
      }, 1200);
    } catch (e) {
      console.error("Apply failed:", e);
      setErr(toErrorString(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}
        {!loading && reqRow && (
          <>
            <header className="mb-4">
              <h1 className="text-2xl font-semibold mb-1">{reqRow.title}</h1>
              <p className="opacity-80 text-sm">
                {reqRow.category} • {reqRow.location}{" "}
                {offerAmount ? `• ${offerAmount}` : ""}
              </p>
              <p className="text-xs mt-1 opacity-70">Status: {reqRow.status}</p>
            </header>

            {/* WedFlexer apply panel */}
            {active === "wedflexer" && reqRow.status === "open" && (
              <section className="border rounded-lg p-4 mb-6">
                <h2 className="text-xl font-semibold mb-1">Apply Now</h2>
                <p className="text-sm opacity-80 mb-4">
                  Send a message to the couple letting them know why you are a
                  perfect fit
                </p>

                <label className="block text-sm font-medium mb-1">
                  Your Message to the Couple *
                </label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  placeholder="Tell the couple why you are a perfect fit. Talk about your talent or ability to pull it off!"
                  value={applyMsg}
                  onChange={(e) => setApplyMsg(e.target.value)}
                  required
                />

                {/* Offer acceptance / counter-offer */}
                <div className="mt-4">
                  <label className="block text-sm font-medium">
                    Offer Acceptance
                  </label>
                  <div className="mt-2 border rounded p-3 flex items-center gap-2">
                    <input
                      id="accept-offer"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={acceptOffer}
                      onChange={(e) => {
                        setAcceptOffer(e.target.checked);
                        if (e.target.checked) setCounter("");
                      }}
                      disabled={reqRow.offer_cents == null}
                    />
                    <label htmlFor="accept-offer" className="text-sm">
                      {reqRow.offer_cents != null
                        ? `I accept the offer of $${Math.round(
                            reqRow.offer_cents / 100
                          ).toLocaleString()}`
                        : "Couple did not post an offer amount"}
                    </label>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">
                      Your counter-offer
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="border rounded px-2 py-2 text-sm select-none">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="w-full border rounded px-3 py-2"
                        placeholder={
                          reqRow.offer_cents != null
                            ? Math.round(reqRow.offer_cents / 100).toString()
                            : "Enter your bid"
                        }
                        value={counter}
                        onChange={(e) => setCounter(e.target.value)}
                        disabled={acceptOffer && reqRow.offer_cents != null}
                      />
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      Leave blank to send only your message.
                    </p>
                  </div>
                </div>

                <button
                  onClick={apply}
                  disabled={posting}
                  className="mt-4 bg-purple-700 text-white rounded px-4 py-2 disabled:opacity-60"
                >
                  {posting ? "Sending…" : "Send Application & Message"}
                </button>
                {okMsg && <p className="text-green-700 mt-2">{okMsg}</p>}
                {!okMsg && err && (
                  <p className="text-red-600 mt-2">Error: {err}</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </RequireAuth>
  );
}
