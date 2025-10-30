export default function MissionPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-900">
      <h1 className="text-4xl font-bold text-purple-700 mb-6">
        Our Mission
      </h1>

      <p className="text-lg leading-relaxed text-slate-700 mb-8">
        To make getting married affordable and simpler by empowering couples to get support from talented locals.
      </p>

      <div className="space-y-6 text-slate-800 text-base leading-relaxed">
        <p>
          Our Core Values: Getting married should not cause financial stress. Center Marriage around a community first approach. Prioritize trust and safety with transparency and secure payments.

        </p>

        <p className="text-lg leading-relaxed text-slate-700 mb-8">
          Flipping the Script on Weddings.
        </p>

        <p>
          Anyone who has planned or been in a wedding knows the wedding industry is out of hand. The experience goes from excitement to sticker shock to reading contract fine print, and piling on a whole lot of stress. 
          WedFlex was born from a simple idea:If couples can name their price, and talented people in the community can meet their needs, we can give power back to couples and support marriages in a way the
          wedding industry has forgotten. WedFlex is for Marriage and Community. Join the movement today!
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <a
          href="/post-offer"
          className="bg-purple-700 text-white text-sm font-medium px-5 py-3 rounded-md hover:bg-purple-800"
        >
          I am planning a wedding →
        </a>
        <a
          href="/feed"
          className="border border-purple-700 text-purple-700 text-sm font-medium px-5 py-3 rounded-md hover:bg-purple-50"
        >
          I want to earn money →
        </a>
      </div>
    </main>
  );
}
