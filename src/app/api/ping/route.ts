import { NextResponse } from "next/server";
import { supabaseBrowser } from "../../supabase/client";

export async function GET() {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("service_requests")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({
    ok: true,
    error: null,
    rows: data?.length ?? 0,
  });
}
