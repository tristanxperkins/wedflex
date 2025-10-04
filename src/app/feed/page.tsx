// Read-only vendor feed to verify open requests are visible via RLS
import Link from "next/link";

async function getOpenRequests() {
  // Call your own API route so no client keys are needed here
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/open-requests`, {
    // Ensure no caching while developing
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, data: [], error: `HTTP ${res.status}` };
  }
  return res.json();
}

export default async function FeedPage() {
  const { ok, data = [], error } = await getOpenRequests();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Open Requests</h1>
      {!ok && <p className="text-red-600">Error: {String(error)}</p>}
      {ok && data.length === 0 && <p>No open requests yet.</p>}
      <ul className="space-y-3">
        {data.map((r: any) => (
          <li key={r.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{r.title}</h2>
              <span className="text-sm opacity-70">
                ${Math.round(r.offer_cents / 100).toLocaleString()}
              </span>
            </div>
            <p className="text-sm opacity-80">
              {r.category} • {r.location}
            </p>
            <Link href={`/r/${r.id}`} className="text-blue-600 text-sm mt-2 inline-block">
              View
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
