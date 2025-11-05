"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking");

  // After a few seconds, send the couple back to their dashboard
  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push("/dashboard/couple");
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-3xl font-extrabold text-slate-900">
        🎉 You just WedFlexed the Wedding! Woohoo!🎉
      </h1>
      <p className="text-slate-700">
        Your payment was successful and your WedFlexer has been booked.
        WedFlex values trust and transparency. Your WedFlexer will not get paid until service is delivered.
      </p>

      {bookingId && (
        <p className="text-xs text-slate-500">
          Booking reference: <span className="font-mono">{bookingId}</span>
        </p>
      )}

      <p className="text-sm text-slate-600 mt-4">
        We&apos;re redirecting you back to your dashboard so you can review
        your booking details, messages, and post another offer! Cheers!🎉
      </p>
    </main>
  );
}

export default function BookedSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-700">Finishing your booking…</p>
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
