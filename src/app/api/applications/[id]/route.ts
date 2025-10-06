import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Next 15: await params + headers()
    const { id } = await context.params;
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { status } = await req.json();
    const allowed = new Set(["pending", "accepted", "rejected", "withdrawn"]);
    if (!allowed.has(String(status))) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    // RLS will ensure only the couple who owns the request can update
    const { data, error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
