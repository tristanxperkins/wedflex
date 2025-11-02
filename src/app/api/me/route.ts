/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(req: NextRequest) {
  try {
    const { active_role } = await req.json();
    if (active_role !== "couple" && active_role !== "wedflexer") {
      return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
    }

    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const sb = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: me, error: uErr } = await sb.auth.getUser();
    if (uErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await sb
      .from("profiles")
      .update({ active_role })
      .eq("id", me.user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
