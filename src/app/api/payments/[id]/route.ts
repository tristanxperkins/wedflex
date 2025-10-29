
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function errStr(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

// Optional no-op so Next clearly recognizes this file as a module
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  try {
    const { id } = await ctx.params;

    const body = (await req.json()) as { status?: unknown };
    const status = body?.status === "released" || body?.status === "refunded"
      ? (body.status as "released" | "refunded")
      : null;

    if (!id || !status) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    const hdrs = await headers(); // Next 15 dynamic API
    const auth = hdrs.get("authorization") ?? "";
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });

    // Who am I?
    const { data: me, error: meErr } = await sb.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Ensure payment belongs to this couple and is currently escrowed
    const { data: pay, error: pErr } = await sb
      .from("payments")
      .select("id, couple_id, status")
      .eq("id", id)
      .single();

    if (pErr || !pay) return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
    if (pay.couple_id !== me.user.id) return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    if (pay.status !== "escrowed") return NextResponse.json({ ok: false, error: "Only escrowed payments can be updated" }, { status: 400 });

    const stamp = status === "released"
      ? { released_at: new Date().toISOString() }
      : { refunded_at: new Date().toISOString() };

    const { error: updErr } = await sb
      .from("payments")
      .update({ status, ...stamp })
      .eq("id", id);

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
