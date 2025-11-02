import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function toErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

interface Params {
  id: string;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
) {
  try {
    const { id } = await ctx.params;
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const body: { status?: string } = await req.json().catch(() => ({}));
    const nextStatus = (body.status ?? "").trim().toLowerCase();

    const allowed = ["pending", "accepted", "rejected", "withdrawn"] as const;
    if (!allowed.includes(nextStatus as (typeof allowed)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid status value" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id, request_id, status, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: toErr(e) }, { status: 500 });
  }
}
