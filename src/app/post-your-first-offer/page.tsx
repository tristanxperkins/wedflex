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

  async function handleContinue() {
    const sb = supabaseBrowser ();
    const {data} = await sb.auth.getUser();

      if (!data?.user) {
      router.push(
        "/auth/signin?role=couple&next=/dashboard/couple/post-offer"
      );
      return;
    }

    // If already signed in → just take them straight to post-offer flow
    router.push("/dashboard/couple/post-offer");
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-slate-900">
      <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mt-2">
          How WedFlex works for couples
        </h1>
        <p className="text-slate-700 text-base leading-relaxed mt-4">
          WedFlex puts marriage first. Posting an offer is the powerful way WedFlex gives couples the ability to get married affordably.
          Name your price for wedding services to WedFlexers in your area. You can trust delivery of services with WedFlex Escrow
          and transparent WedFlexer portfolios.
          
        </p>
      </div>

      {/* step breakdown */}
      <section className="space-y-6 text-sm leading-relaxed text-slate-800">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
          1. Create your Couple Account
          </h2>
          <p>
          Continue on this page and follow the magic link in your email to login. 
          Magic links are how you will login to your WedFlex account each time. 
                   
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
          2. Post your first offer
          </h2>
          <p>
          Tell us what you need, set your offer price, and share your wedding details. 
          Talented locals accept your offer and share their profile with you. 
          Review WedFlexer profiles, chat to confirm details, and book to lock in the help you need for your wedding. 
          You can relax knowing you are protected by WedFlex Escrow - WedFlexers only get paid when the job is done.
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold text-slate-900 mb-1">
           3. Complete your Couple Profile
          </h2>
          <p>
        Visit your dashboard to track your offers, budget, and more. 
        Tell us your story, wedding details, and add your wedding inspo pics to your Dashboard. 
        Manage your Dashboard to track your wedding budget and view applications and messages with WedFlexers. 
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
            : "Create Your Couple Profile"}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          Click the button above to continue to create your couple profile.
        </p>
      </div>
    </main>
  );
}
