// src/app/api/applications/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { request_id, message, bid_cents } = await req.json();

    if (!request_id || typeof request_id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing request_id" }, { status: 400 });
    }

    const bid = Number.isFinite(Number(bid_cents)) ? Number(bid_cents) : null;
    if (bid !== null && bid < 0) {
      return NextResponse.json({ ok: false, error: "Invalid bid" }, { status: 400 });
    }

    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // who am I?
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const wedflexer_id = u.user.id;

    // insert (RLS enforces active_role = 'wedflexer')
    const { data, error } = await supabase
      .from("applications")
      .insert({ request_id, wedflexer_id, message: message ?? null, bid_cents: bid ?? null })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
