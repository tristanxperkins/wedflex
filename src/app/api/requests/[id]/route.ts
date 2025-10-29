import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Next 15: params is a Promise
    const { id } = await context.params;

    // Next 15: headers() must be awaited
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // 1) Fetch the request
    const { data: reqRow, error: rErr } = await supabase
      .from("service_requests")
      .select(
        "id, title, category, location, offer_cents, status, created_at, couple_id"
      )
      .eq("id", id)
      .single();

    if (rErr) {
      return NextResponse.json({ ok: false, error: rErr.message }, { status: 404 });
    }

    // 2) If caller is the couple owner, fetch applications (RLS allows)
    const { data: me } = await supabase.auth.getUser();
    let applications: unknown[] = [];
    if (me?.user?.id && me.user.id === reqRow.couple_id) {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, wedflexer_id, message, bid_cents, status, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      applications = apps ?? [];
    }

    return NextResponse.json({ ok: true, request: reqRow, applications });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
