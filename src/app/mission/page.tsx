export default function MissionPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-900">
      <h1 className="text-4xl font-bold text-purple-700 mb-6">
        Our Mission
      </h1>

      <p className="text-lg leading-relaxed text-slate-700 mb-8">
        To put marriage and community back at the center of the wedding industry by empowering 
        couples and creating opportunities for talented locals.
      </p>

      <div className="space-y-6 text-slate-800 text-base leading-relaxed">
        <p>
          WedFlex is where couples post what they actually need — real tasks, real budgets —
          and local creatives, friends, and side-hustlers can raise their hand and say
          “I can do that.”

        </p>

        <p className="text-lg leading-relaxed text-slate-700 mb-8">
          Flipping the Script on Weddings.
        </p>

        <p>
          Anyone who has planned or been in a wedding knows the wedding industry is out of hand. The experience goes from excitement to sticker shock to reading contract fine print, and a whole lot of stress. WedFlex was born from a simple idea
          If couples can name their price, and talented people in the community can meet their needs, we can change the entire structure of the
          wedding industry. We are not just a marketplace to bring both sides together - we are a movement. A movement that brings the focus back
          to support marriages and stregthening the community. WedFlex is a win-win. Join the movement today!
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <a
          href="/post-offer"
          className="bg-purple-700 text-white text-sm font-medium px-5 py-3 rounded-md hover:bg-purple-800"
        >
          I’m planning a wedding →
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
