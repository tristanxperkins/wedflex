"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../supabase/client";

export default function PostYourFirstOfferPage() {
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
      // eventually: check if couple profile is set up; if not, send to /dashboard/couple/profile
      router.push("/post-offer");
    } else {
      // not signed in yet; go sign in as couple
      router.push("/auth/signin?role=couple");
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-slate-900">
      <div className="mb-8">
        <p className="text-xs font-medium text-purple-700 tracking-wide uppercase">
          Step 1 of 3
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">
          Creating your Couple Account
        </h1>
        <p className="text-slate-700 text-base leading-relaxed mt-4">
          Create your free WedFlex Couple account to start posting Offers to talented locals in your community.  
        </p>
      </div>

      {/* step breakdown */}
      <section className="space-y-6 text-sm leading-relaxed text-slate-800">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Create your account and profile
          </h2>
          <p>
          Click the link in your email to activate your Couple account. Magic links are how you will login to your WedFlex account each time. 
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Post Your First Offer - Stress Free
          </h2>
          <p>
            Tell us what you need, set your offer price, and share your wedding details. Talented locals accept your offer (or make a counter-offer) and share their profile with you. Review WedFlexer profiles, chat to confirm details, and lock in the help you need for your wedding. You can relax knowing you are protected by WedFlex Escrow - WedFlexers only get paid when the job is done. 
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
            Complete your Couple Profile
          </h2>
          <p>
        Add your sweet love story, wedding details, and wedding inspo pics to your Dashboard. Manage your Dashboard to track your wedding budget and view messages with WedFlexers. 
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
            ? "Start Posting an Offer"
            : "Continue – Create Your Couple Profile"}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          Click the button above to continue to create your couple profile.
        </p>
      </div>
    </main>
  );
}
