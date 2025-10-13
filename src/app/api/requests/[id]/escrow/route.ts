// src/app/api/requests/[id]/escrow/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function errToString(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  try {
    const { id: request_id } = await ctx.params;

    // Parse body safely
    const body = (await req.json()) as { amount_cents?: unknown };
    const amount_cents_num =
      typeof body.amount_cents === "number" ? body.amount_cents : Number(body.amount_cents);

    if (!request_id || !Number.isFinite(amount_cents_num) || amount_cents_num <= 0) {
      return NextResponse.json(
        { ok: false, error: "Missing request_id or invalid amount_cents" },
        { status: 400 }
      );
    }

    // Next 15: dynamic headers must be awaited
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });

    // Who am I?
    const { data: me, error: meErr } = await sb.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Request must belong to me (couple), be awarded, and have a winner
    const { data: reqRow, error: rErr } = await sb
      .from("service_requests")
      .select("id, couple_id, status, awarded_wedflexer_id")
      .eq("id", request_id)
      .single();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.couple_id !== me.user.id) {
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    }
    if (reqRow.status !== "awarded" || !reqRow.awarded_wedflexer_id) {
      return NextResponse.json(
        { ok: false, error: "Request must be awarded first" },
        { status: 400 }
      );
    }

    // Create ESCROW payment (unique partial index protects from duplicates)
    const { data, error } = await sb
      .from("payments")
      .insert({
        request_id,
        couple_id: me.user.id,
        wedflexer_id: reqRow.awarded_wedflexer_id,
        amount_cents: Math.round(amount_cents_num),
        status: "escrowed",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errToString(e) }, { status: 500 });
  }
}
