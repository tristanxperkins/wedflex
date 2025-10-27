/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

export default function EarnMoneyPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getUser();
      setSignedIn(!!data?.user);
      setChecking(false);
    })();
  }, []);

  function handleContinue() {
    if (signedIn) {
      // eventually: if profile incomplete, keep them on profile first
      router.push("/dashboard/wedflexer/profile");
    } else {
      router.push("/auth/signin?role=wedflexer");
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-slate-900">
      <div className="mb-8">
        <p className="text-xs font-medium text-purple-700 tracking-wide uppercase">
          Step 1 of 3
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">
          Earn money off of weddings with your talent
        </h1>
        <p className="text-slate-700 text-base leading-relaxed mt-4">
          WedFlexers are talented locals - not traditional wedding vendors. All you need is a skill and a passion to help people get married. 
          WedFlexers are everyday people with skills they are not already monetizing such as: having the best playlist, having an eye for design, 
          being a great DIY-er, or being a type-A organizer. You can make money with your talents on WedFlex, starting right now!
        </p>
      </div>

      {/* step breakdown */}
      <section className="space-y-6 text-sm leading-relaxed text-slate-800">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Create your WedFlexer profile
          </h2>
          <p>
            Click the link in your email to activate your WedFlexer account. Magic links are how you will login to your WedFlex account each time. 
            Go to your WedFlexer Dashboard to complete your profile to tell us about yourself and what services you can offer. 
            Tip: Adding a few photos or examples of what you can do helps couples see your amazing talent before they book you. 
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Browse offers near you
          </h2>
          <p>
            Browse offers from couples in your community for services they are looking for help with. Couples post offers for all types of wedding services from setup/teardown,
            florals and decor, bartending (license may be required), officiating (license required), photography, planning, DIY builds — all of it. 
            Accept the offer or counteroffer and apply in one click. 
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Get booked and paid
          </h2>
          <p>
            Chat with the couple to confirm details and, if you are the best fit for them, the couple books you directly in the WedFlex app. 
            What you will earn is tracked in your Dashboard and as soon as the job is done, you get paid! Make your own schedule and accept offers that work for you!
            Tip: Always be professional in how you do business! Never double book yourself.
          </p>
        </div>

      </section>


      <div className="mt-10">
        <button
          disabled={checking}
          onClick={handleContinue}
          className="bg-purple-700 text-white text-sm font-medium px-5 py-3 rounded-md hover:bg-purple-800 disabled:opacity-50"
        >
          {checking
            ? "Checking…"
            : signedIn
            ? "Start Your WedFlexer Profile"
            : "Continue to Become a WedFlexer"}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          Click the button above to continute setting up your WedFlexer profile.
        </p>
      </div>
    </main>
  );
}
