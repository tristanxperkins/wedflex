import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/app/supabase/client";

export async function GET() {
  const sb = supabaseBrowser();
  const { data, error } = await sb.auth.getUser();
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 401 });
  return NextResponse.json({ ok:true, user: data.user });
}
