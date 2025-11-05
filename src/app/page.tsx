import Nav from "./components/Nav";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16 text-slate-900">
      <section className="mb-16">
        <h1 className="text-4xl font-bold text-purple-700 mb-4">
          Your Wedding. Your Town. Your WedFlex.
        </h1>
        <p className="text-lg max-w-2xl leading-relaxed text-slate-700">
          WedFlex makes getting married affordable and simpler by connecting you
          with talented locals in your community to help you 
          with your big day at a price you set.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/post-your-first-offer"
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-700 text-white text-sm font-medium hover:bg-purple-800"
          >
            Post your first offer
          </Link>

          <Link
            href="/earn-money"
            className="inline-flex items-center px-4 py-2 rounded-md border border-purple-700 text-purple-700 text-sm font-medium hover:bg-purple-50"
          >
            Earn money as a WedFlexer
          </Link>
        </div>
</section>
      <section className="grid md:grid-cols-3 gap-8 text-sm">
        <div className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Who Are WedFlexers?
          </h2>
          <p className="text-slate-700">
            WedFlexers are talented locals - not traditional wedding vendors. They are everyday people
            like college students, hobbyist, and side-hustlers using their skills to help you get married
            without the high mark up of traditional vendors.
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            How WedFlex Works
          </h2>
          <p className="text-slate-700">
            Post Your Offer. WedFlexers Accept your Offer. Book & Relax.
          </p>
        </div>

        <div className="border rounded-lg p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Safe booking & payout
          </h2>
          <p className="text-slate-700">
            You are protected by secure Stripe payments and WedFlex Escrow. WedFlexers only get paid when the job is done.
          </p>
        </div>
      </section>
    </main>
  );
}
