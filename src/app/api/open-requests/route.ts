import { NextResponse } from "next/server";
import { supabaseBrowser } from "../../supabase/client";

export async function GET() {
  const supabase = supabaseBrowser();

  // Only reads open requests; matches your RLS (“requests: read open”)
  const { data, error } = await supabase
    .from("service_requests")
    .select("id,title,category,location,offer_cents,created_at")
    .eq("is_open", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: data.length, data });
}
