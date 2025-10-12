// src/app/api/requests/[id]/book/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function errString(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next 15: params is a Promise
) {
  try {
    const { id: request_id } = await context.params; // ✅ await params
    const { application_id } = await req.json();

    if (!request_id || !application_id) {
      return NextResponse.json(
        { ok: false, error: "Missing request_id or application_id" },
        { status: 400 }
      );
    }

    const hdrs = await headers(); // ✅ Next 15 dynamic APIs must be awaited
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // Verify request ownership & openness
    const { data: reqRow, error: reqErr } = await supabase
      .from("service_requests")
      .select("id, couple_id, status")
      .eq("id", request_id)
      .single();

    if (reqErr || !reqRow)
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });

    if (reqRow.status !== "open")
      return NextResponse.json({ ok: false, error: "Request not open" }, { status: 400 });

    // Who am I?
    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user)
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    if (me.user.id !== reqRow.couple_id)
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });

    // Fetch application and wedflexer
    const { data: appRow, error: appErr } = await supabase
      .from("applications")
      .select("id, request_id, wedflexer_id")
      .eq("id", application_id)
      .eq("request_id", request_id)
      .single();

    if (appErr || !appRow)
      return NextResponse.json(
        { ok: false, error: "Application not found for this request" },
        { status: 404 }
      );

    // 1) Accept chosen application
    const { error: winnerErr } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", application_id);
    if (winnerErr)
      return NextResponse.json({ ok: false, error: winnerErr.message }, { status: 400 });

    // 2) Reject all others on the request
    const { error: rejectErr } = await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("request_id", request_id)
      .neq("id", application_id);
    if (rejectErr)
      return NextResponse.json({ ok: false, error: rejectErr.message }, { status: 400 });

    // 3) Mark request as awarded
    const { error: updErr } = await supabase
      .from("service_requests")
      .update({
        status: "awarded",
        awarded_application_id: application_id,
        awarded_wedflexer_id: appRow.wedflexer_id,
        awarded_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .eq("couple_id", me.user.id);
    if (updErr)
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errString(e) }, { status: 500 });
  }
}
