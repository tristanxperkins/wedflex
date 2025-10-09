import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { title, category, location, offer_cents } = await req.json();

    if (!title || !category || !location) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const cents =
      offer_cents === null || offer_cents === undefined
        ? null
        : Number.isFinite(Number(offer_cents))
        ? Math.max(0, Math.floor(Number(offer_cents)))
        : null;

    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // who am I
    const { data: me, error: uErr } = await supabase.auth.getUser();
    if (uErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    }

    const insert = {
      title: String(title).trim(),
      category: String(category).trim(),
      location: String(location).trim(),
      offer_cents: cents,
      couple_id: me.user.id,
      status: "open" as const,
    };

    const { data, error } = await supabase
      .from("service_requests")
      .insert(insert)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
