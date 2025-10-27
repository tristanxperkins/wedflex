/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function errStr(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export async function GET(_req: NextRequest){
  try {
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";
    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });

    // Who am I?
    const { data: me, error: meErr } = await sb.auth.getUser();
    if (meErr || !me?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const uid = me.user.id;

    // 1) Requests (counts by status)
    const idsRes = await sb
      .from("service_requests")
      .select("id, status, title, category, created_at, awarded_wedflexer_id")
      .eq("couple_id", uid)
      .order("created_at", { ascending: false });
    if (idsRes.error) throw idsRes.error;

    const requests = idsRes.data ?? [];
    const requestIds = requests.map(r => r.id);

    const totals = {
      total_requests: requests.length,
      open: requests.filter(r => r.status === "open").length,
      awarded: requests.filter(r => r.status === "awarded").length,
      closed: requests.filter(r => r.status === "closed").length,
    };

    // 2) Applications received for my requests
    let applicationsReceived = 0;
    if (requestIds.length) {
      const appsRes = await sb
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("request_id", requestIds);
      if (appsRes.error) throw appsRes.error;
      applicationsReceived = appsRes.count ?? 0;
    }

    // 3) Payments (escrow metrics)
    const payRes = await sb
      .from("payments")
      .select("amount_cents, status, created_at")
      .eq("couple_id", uid);
    if (payRes.error) throw payRes.error;

    let escrow_cents = 0;
    let released_cents = 0;
    let refunded_cents = 0;
    (payRes.data ?? []).forEach(p => {
      if (p.status === "escrowed") escrow_cents += Number(p.amount_cents || 0);
      else if (p.status === "released") released_cents += Number(p.amount_cents || 0);
      else if (p.status === "refunded") refunded_cents += Number(p.amount_cents || 0);
    });

    const kpis = {
      totals,
      applicationsReceived,
      escrow: {
        escrowed_cents: escrow_cents,
        released_cents,
        refunded_cents,
      },
    };

    // Recent slices for UI lists
    const recentPayments = (payRes.data ?? [])
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentRequests = requests.slice(0, 5);

    return NextResponse.json({
      ok: true,
      kpis,
      recentRequests,
      recentPayments,
      allRequests: requests, // for the table
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errStr(e) }, { status: 500 });
  }
}
