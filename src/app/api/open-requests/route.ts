
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
     const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data, error } = await supabase
      .from("service_requests")
      .select("id, title, category, location, offer_cents, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
