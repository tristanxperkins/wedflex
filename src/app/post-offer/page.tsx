"use client";
import RequireAuth from "@/app/components/RequireAuth";

export default function PostOfferPage() {
  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Post a Wedding Offer</h1>
        <p className="opacity-70 mb-6">
          Couples can post what they need for their wedding and set their budget. 
          Only signed-in users can access this page.
        </p>
        {/* later: form fields for title, description, price, date */}
      </main>
    </RequireAuth>
  );
}
