/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import { supabaseBrowser } from "../../supabase/client";
import UploadInput from "../../components/UploadInput";

type ActiveRole = "couple" | "wedflexer" | null;

function toErr(x: unknown): string {
  if (!x) return "Unknown error";
  if (typeof x === "string") return x;
  if (x instanceof Error) return x.message;
  try { return JSON.stringify(x); } catch { return String(x); }
}

/** DB shapes used on this page */
type RequestRow = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string | null;
  offer_cents: number | null;
  status: "open" | "awarded" | "closed" | "cancelled";
  created_at: string;
  couple_id: string;
};

type CoupleProfile = {
  id: string;
  avatar_url: string | null;
  couple_display_name: string | null; // e.g., "Alex & Jamie"
  wedding_style: string | null;
  our_story: string | null;
  wedding_date: string | null; // ISO
  inspiration_urls: string[] | null; // optional: if you stored these
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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reqRow, setReqRow] = useState<RequestRow | null>(null);
  const [couple, setCouple] = useState<CoupleProfile | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [active, setActive] = useState<ActiveRole>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Apply form
  const [applyMsg, setApplyMsg] = useState("");
  const [acceptOffer, setAcceptOffer] = useState(false);
  const [counter, setCounter] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const offerAmount = useMemo(
    () => (reqRow?.offer_cents != null
      ? `$${Math.round(reqRow.offer_cents / 100).toLocaleString()}`
      : undefined),
    [reqRow]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const sb = supabaseBrowser();

        // who am I + role?
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

        // fetch request via API (keeps RLS rules server-side)
        const { data: sess } = await sb.auth.getSession();
        const token = sess.session?.access_token;

        const res = await fetch(`/api/requests/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        const request: RequestRow = json.request;
        const applications: ApplicationRow[] = json.applications || [];

        // couple snippet
        const { data: cp, error: cErr } = await sb
          .from("profiles")
          .select("id, avatar_url, couple_display_name, our_story, wedding_style, wedding_date, inspiration_urls")
          .eq("id", request.couple_id)
          .single();
        if (cErr) throw cErr;

        if (!cancel) {
          setReqRow(request);
          setApps(applications);
          setCouple(cp as CoupleProfile);
          if (uid && request.couple_id === uid) setIsOwner(true);
        }
      } catch (e) {
        if (!cancel) setErr(toErr(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  async function submitApplication() {
    if (!reqRow) return;
    try {
      setPosting(true);
      setOkMsg(null);
      setErr(null);

      // WedFlexer only
      if (active !== "wedflexer") {
        // if not a wedflexer, send to the funnel
        router.push("/earn-money");
        return;
      }

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
          request_id: reqRow.id,
          message: applyMsg.trim() || null,
          accept_offer: !!acceptOffer,
          counter_offer: counter.trim() === "" ? null : Number(counter),
          file_urls: files,
        }),
      });

      let json: unknown = null;
      let raw = "";
      try { json = await res.json(); } catch { raw = await res.text(); }
type apiresponse = {ok?:boolean;error?:string;id?:string}
const parsed = json as apiresponse;

      if (!res.ok || !parsed?.ok) {
        throw new Error(parsed?.error ?? (raw || `HTTP ${res.status}`));
      }

      setOkMsg("Application sent!");
      setApplyMsg("");
      setAcceptOffer(false);
      setCounter("");
      setFiles([]);

      // Optional: route to dashboard
      // router.push("/dashboard/wedflexer");
    } catch (e) {
      setErr(toErr(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="max-w-6xl mx-auto p-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT: Offer details + couple snippet */}
        <section>
          {loading && <p>Loading…</p>}
          {err && <p className="text-red-600">Error: {err}</p>}

          {!loading && reqRow && (
            <>
              <header className="mb-3">
                <h1 className="text-2xl font-semibold">{reqRow.title}</h1>
                <p className="opacity-80 text-sm">
                  {reqRow.category} • {reqRow.location} {offerAmount ? `• ${offerAmount}` : ""}
                </p>
                <p className="text-xs mt-1 opacity-70">Status: {reqRow.status}</p>
              </header>

              {reqRow.description && (
                <article className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{reqRow.description}</p>
                </article>
              )}

              {/* Couple snippet */}
              {couple && (
                <div className="mt-6 border rounded-lg p-4">
                  <h2 className="font-semibold mb-3">About the Couple</h2>
                  <div className="flex items-center gap-3">
                    <img
                      src={couple.avatar_url || "/avatar-placeholder.png"}
                      alt="Couple avatar"
                      className="h-14 w-14 rounded-full object-cover border"
                    />
                    <div>
                      <div className="font-medium">
                        {couple.couple_display_name || "Wedding Couple"}
                      </div>
                      {couple.wedding_date && (
                        <div className="text-xs opacity-70">
                          Wedding Date: {new Date(couple.wedding_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {couple.our_story && (
                    <p className="text-sm opacity-90 mt-3 whitespace-pre-wrap">
                      {couple.our_story}
                    </p>
                  )}

                  {Array.isArray(couple.inspiration_urls) && couple.inspiration_urls.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium mt-4">Inspiration</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {couple.inspiration_urls.map((u) => (
                          <img key={u} src={u} className="aspect-square object-cover rounded border" />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* If owner, show simple applicants list */}
              {isOwner && apps.length > 0 && (
                <div className="mt-6 border rounded-lg p-4">
                  <h2 className="font-semibold mb-2">Applications</h2>
                  <ul className="divide-y">
                    {apps.map((a) => (
                      <li key={a.id} className="py-3 text-sm">
                        <div>Application: <span className="font-medium">{a.status ?? "pending"}</span></div>
                        {typeof a.bid_cents === "number" && (
                          <div>Bid: ${Math.round(a.bid_cents / 100).toLocaleString()}</div>
                        )}
                        {a.message && <div className="opacity-80 mt-1">{a.message}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT: WedFlexer Apply panel */}
        <aside className="lg:sticky lg:top-4 h-max">
          {/* If not wedflexer or request not open, gate the form */}
          {reqRow?.status !== "open" ? (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Applications closed</h3>
              <p className="text-sm opacity-70 mt-1">This request is not open.</p>
            </div>
          ) : active !== "wedflexer" ? (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">Apply to this Request</h3>
              <p className="text-sm opacity-70">You need a WedFlexer account to apply.</p>
              <button
                onClick={() => router.push("/earn-money")}
                className="mt-3 bg-purple-700 text-white rounded px-4 py-2"
              >
                Become a WedFlexer
              </button>
            </div>
          ) : (
            <section className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">Apply Now</h3>
              <p className="text-sm opacity-80 mb-4">
                Send a short message and (optionally) attach work samples. You can accept the posted offer or submit a counter.
              </p>

              <label className="block text-sm font-medium mb-1">Your Message *</label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                value={applyMsg}
                onChange={(e) => setApplyMsg(e.target.value)}
                placeholder="Tell the couple why you're a great fit!"
                required
              />

              {/* Offer acceptance / counter-offer */}
              <div className="mt-4">
                <label className="block text-sm font-medium">Offer</label>
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
                    disabled={reqRow?.offer_cents == null}
                  />
                  <label htmlFor="accept-offer" className="text-sm">
                    {reqRow?.offer_cents != null
                      ? `I accept the offer of $${Math.round(reqRow.offer_cents / 100).toLocaleString()}`
                      : "Couple did not post an offer amount"}
                  </label>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Counter-offer</label>
                  <div className="flex items-center gap-2">
                    <span className="border rounded px-2 py-2 text-sm select-none">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-full border rounded px-3 py-2"
                      placeholder={
                        reqRow?.offer_cents != null
                          ? Math.round(reqRow.offer_cents / 100).toString()
                          : "Enter your bid"
                      }
                      value={counter}
                      onChange={(e) => setCounter(e.target.value)}
                      disabled={acceptOffer && reqRow?.offer_cents != null}
                    />
                  </div>
                  <p className="text-xs opacity-70 mt-1">Leave blank to send only your message.</p>
                </div>
              </div>

              {/* Attachments */}
              <div className="mt-4">
  <label className="text-sm font-medium">Attachments</label>
  <div className="mt-2 flex items-center gap-2">
    <input
      type="file"
      multiple
      onChange={async (e) => {
        if (!e.currentTarget.files?.length) return;
        try {
          setPosting(true);
          const sb = supabaseBrowser();
          const { data: me } = await sb.auth.getUser();
          if (!me?.user?.id) throw new Error("Not authenticated");

          const list: string[] = [];
          for (const file of Array.from(e.currentTarget.files)) {
            // create a unique path per user
            const path = `${me.user.id}/${Date.now()}-${file.name}`;
            const { error: upErr } = await sb.storage
              .from("applications")
              .upload(path, file, { upsert: false });
            if (upErr) throw upErr;

            // get a public URL for display / API
            const { data: pub } = sb.storage.from("applications").getPublicUrl(path);
            list.push(pub.publicUrl);
          }
          setFiles((prev) => [...list, ...prev]);
        } catch (e) {
          setErr(e instanceof Error ? e.message : String(e));
        } finally {
          setPosting(false);
          // clear the file input so same files can be selected again if needed
          e.currentTarget.value = "";
        }
      }}
    />
  </div>

  {files.length > 0 && (
    <ul className="mt-2 space-y-1 text-xs break-all">
      {files.map((u) => (
        <li key={u} className="text-purple-700 underline">{u}</li>
      ))}
    </ul>
  )}
</div>

              <button
                onClick={submitApplication}
                disabled={posting || !applyMsg.trim()}
                className="mt-4 bg-purple-700 text-white rounded px-4 py-2 disabled:opacity-60"
              >
                {posting ? "Sending…" : "Submit Application"}
              </button>

              {okMsg && <p className="text-green-700 mt-2">{okMsg}</p>}
              {!okMsg && err && <p className="text-red-600 mt-2">Error: {err}</p>}
            </section>
          )}
        </aside>
      </main>
    </RequireAuth>
  );
}
