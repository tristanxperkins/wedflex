import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function toErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

type PostBody = {
  request_id: string;
  message: string;
  accept_offer?: boolean;
  counter_offer?: number | string | null;
  file_urls?: string[] | null;
};

export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    type Body = {
      request_id: string;
      message: string;
      accept_offer?: boolean;
      counter_offer?: number | string | null;
      file_urls?: string[] | null;
    };

    const body = (await req.json()) as Body;
    const request_id = String(body.request_id || "");
    const message = String(body.message || "").trim();
    const accept_offer = Boolean(body.accept_offer);
    const counter_offer = body.counter_offer;
    const file_urls = Array.isArray(body.file_urls) ? body.file_urls : null;

    if (!request_id) {
      return NextResponse.json({ ok: false, error: "Missing request_id" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: "Please add a message" }, { status: 400 });
    }

    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: reqRow, error: rErr } = await supabase
      .from("service_requests")
      .select("id, couple_id, offer_cents, status")
      .eq("id", request_id)
      .single();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status !== "open") {
      return NextResponse.json({ ok: false, error: "This offer is not open" }, { status: 400 });
    }

    let bid_cents: number | null = null;
    if (accept_offer) {
      if (typeof reqRow.offer_cents === "number" && Number.isFinite(reqRow.offer_cents)) {
        bid_cents = Math.max(0, Math.floor(reqRow.offer_cents));
      } else {
        return NextResponse.json(
          { ok: false, error: "Couple did not post an offer amount. Please submit a counter-offer." },
          { status: 400 }
        );
      }
    } else {
      if (counter_offer == null || String(counter_offer).trim() === "") {
        bid_cents = null;
      } else {
        const parsed = Number(counter_offer);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return NextResponse.json({ ok: false, error: "Counter-offer must be a non-negative number" }, { status: 400 });
        }
        bid_cents = Math.floor(parsed * 100);
      }
    }

    const { data: app, error } = await supabase
      .from("applications")
      .insert({
        request_id,
        wedflexer_id: me.user.id,
        message,
        bid_cents,
        file_urls, // 👈 will be null or string[]
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: app.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (() => { try { return JSON.stringify(e); } catch { return String(e); } })();
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


type AppListRow = {
  id: string;
  request_id: string;
  message: string | null;
  bid_cents: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | null;
  created_at: string;
};

export async function GET(_req: NextRequest) {
  try {
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("applications")
      .select("id, request_id, message, bid_cents, status, created_at")
      .eq("wedflexer_id", me.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: (data ?? []) as AppListRow[] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: toErr(e) }, { status: 500 });
  }
}
