"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../supabase/client";

type Step = 1 | 2 | 3;

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function EarnMoneyPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [agreed, setAgreed] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeErr, setStripeErr] = useState<string | null>(null);

  // Read step from the URL on the client (no useSearchParams)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("step");
    const n = raw ? Number(raw) : 1;
    if (n === 2) setStep(2);
    else if (n === 3) setStep(3);
    else setStep(1);
  }, []);

  // Check if user is already signed in
  useEffect(() => {
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data } = await sb.auth.getUser();
        setIsAuthed(!!data?.user);
      } catch {
        // ignore
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  function updateStep(next: Step) {
    setStep(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    router.replace(url.pathname + url.search);
  }
  async function startStripeConnect() {
    try {
      setStripeLoading(true);
      setStripeErr(null);

      const sb = supabaseBrowser();
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/stripe/connect-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json?.ok || !json.url) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      // go to Stripe-hosted onboarding / dashboard
      window.location.href = json.url as string;
    } catch (e) {
      setStripeErr(e instanceof Error ? e.message : String(e));
    } finally {
      setStripeLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Hero / intro */}
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-purple-600 uppercase">
          How to become a wedFlexer
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
          Who are WedFlexers?
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Be the local hero behind someone&apos;s best day. WedFlex connects real couples
          with real people, not traditional vendors, for creative, flexible wedding work.
          Control what you earn and on your own time.
        </p>
      </header>

      {/* Who are WedFlexers? */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Who are WedFlexers?</h2>
        <p className="text-slate-600 max-w-2xl">
          WedFlexers are talented locals not traditional wedding vendors. WedFlexers are
          neighbors, college students, hobbyists, and side-hustlers using their skills to
          help couples get married without the high markup of traditional vendors.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            "People with a passion for photography",
            "Friends known for the best playlists",
            "Locals with an eye for floral design",
            "Home cooks who love feeding people",
            "Confident public speakers and MCs",
            "Hosts with a great backyard or space",
            "Type-A organizers and day-of helpers",
            "DIY crafters and décor geniuses",
          ].map((label) => (
            <div
              key={label}
              className="border rounded-2xl px-3 py-4 bg-slate-50 flex items-start gap-2 text-sm"
            >
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-500" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works summary */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">How WedFlex work works</h2>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 text-sm">
          <li>Create your WedFlexer profile and a Stripe account to get paid directly.</li>
          <li>Browse wedding offers in your city, apply, and chat with couples to confirm details.</li>
          <li>Get booked and track your bookings on your WedFlexer dashboard.</li>
          <li>Deliver the service and get paid the same day, minus a small platform fee.</li>
        </ol>
      </section>

      {/* Step tracker + content */}
      <section className="space-y-4 border rounded-2xl p-4 md:p-6 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-[0.2em]">
              Step {step} of 3
            </p>
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">
              {step === 1 && "Agree to WedFlex terms and conditions"}
              {step === 2 && "Create your WedFlex account"}
              {step === 3 && "Connect payouts & complete profile"}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={cx(
                  "h-2 w-6 rounded-full",
                  step === s ? "bg-purple-600" : "bg-slate-200",
                )}
              />
            ))}
          </div>
        </div>

        {/* STEP 1 – terms */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-700">
              Before you start earning, please review and agree to the WedFlex terms for
              WedFlexers. These protect both you and the couples you work with.
            </p>

            <div className="border rounded-xl p-3 bg-slate-50 text-xs text-slate-700 space-y-1 max-h-40 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1">
                <li>You are an independent contractor, not an employee of WedFlex. As such, you are responsible for maintaining any required licenses relevant for your county or state (for example, officiants must be legally ordained).</li>
                <li>
                  You agree to show up on time, perform the work you agreed to, and
                  communicate clearly with couples.
                </li>
                <li>
                  Payments are processed through WedFlex and Stripe; payouts are sent to your
                  connected bank account, minus a small service fee, on the day of the service, after the service is complete.
                </li>
                <li>
                  You agree to our community standards, including professionalism, respect, and
                  delivering quality.
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and agree to the WedFlex WedFlexer terms and conditions.
              </span>
            </label>

            <div className="flex justify-end">
              <button
                onClick={() => updateStep(2)}
                disabled={!agreed}
                className={cx(
                  "px-4 py-2 rounded-md text-sm font-medium",
                  agreed
                    ? "bg-purple-700 text-white hover:bg-purple-800"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed",
                )}
              >
                Continue to Step 2
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 – sign in / create account */}
        {step === 2 && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-700">
              Create or sign in to your WedFlex account so we can connect your applications,
              bookings, and payouts.
            </p>

            {checkingAuth ? (
              <p className="text-sm text-slate-500">Checking your account…</p>
            ) : isAuthed ? (
              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  You&apos;re already signed in. Next we&apos;ll connect payouts and complete
                  your WedFlexer profile.
                </p>
                <button
                  onClick={() => updateStep(3)}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-purple-700 text-white hover:bg-purple-800"
                >
                  Continue to Step 3
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Use your email to sign in or create a WedFlex account. When you are
                  done, we will bring you back here to finish setup.
                </p>
                <Link
                  href="/auth/signin?role=wedflexer&next=/earn-money?step=2"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-purple-700 text-white hover:bg-purple-800"
                >
                  Sign in / Create account
                </Link>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 – payouts + profile */}
        {step === 3 && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-700">
              Last step: connect payouts (via Stripe) and complete your WedFlexer profile.
            </p>

            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
              <li>Securely connect your bank account through Stripe Connect.</li>
              <li>Add you a short bio, highlighting why you became a WedFlexer and your skills, and select the services you want to provide.</li>
              <li>Upload a profile photo and add pictures of your work to your portfolio, if you have them. (If you do not have any that is okay, you can add them after your first WedFlex wedding!)</li>
            </ul>

            <div className="flex flex-wrap gap-3">
              <button
  type="button"
  onClick={startStripeConnect}
  disabled={stripeLoading}
  className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
>
  {stripeLoading ? "Connecting…" : "Connect payouts with Stripe"}
</button>
{stripeErr && (
  <p className="text-xs text-red-600 mt-2">Stripe error: {stripeErr}</p>
)}
              <Link
                href="/dashboard/wedflexer/profile"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-purple-700 text-purple-700 hover:bg-purple-50"
              >
                Complete WedFlexer profile
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              Once you have connected payouts and finished your profile, you will be
              ready to browse offers and start earning money on WedFlex! 🎉
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
