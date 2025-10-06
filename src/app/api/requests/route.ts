// src/app/api/requests/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title: string = (body.title || "").trim();
    const category: string = (body.category || "").trim();
    const location: string = (body.location || "").trim();
    const offer_cents: number = Number(body.offer_cents ?? 0);

    if (!title || !category || !location || !Number.isFinite(offer_cents)) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
   // ✅ Await headers()
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization") ?? "";
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Who am I?
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const uid = userData.user.id;

    // Insert the offer
    const { data, error } = await supabase
      .from("service_requests")
      .insert({
        couple_id: uid,
        title,
        category,
        location,
        offer_cents,
        status: "open",
      })
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
