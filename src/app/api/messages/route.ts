import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function errString(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    // auth from bearer
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization") ?? "";
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // who am I
    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const selfId = me.user.id;

    // parse query params
    const { searchParams } = new URL(req.url);
    const otherId = searchParams.get("other");
    const reqId = searchParams.get("request"); // may be null

    if (!otherId) {
      return NextResponse.json(
        { ok: false, error: "Missing other user id" },
        { status: 400 }
      );
    }

        const matchFilters: Record<string, string | null> = reqId
      ? { request_id: reqId }
      : {};

    // We'll query all candidate threads involving me.
    // We'll filter in JS for "other participant matches otherId".
    const { data: threadRows, error: threadErr } = await supabase
      .from("message_threads")
      .select("*")
      .match(matchFilters)
      .or(
        // supabase-js .or() uses PostgREST `or=(...)`
        // We consider both participant slots.
        `user_a.eq.${selfId},user_b.eq.${selfId}`
      );

    if (threadErr) {
      return NextResponse.json(
        { ok: false, error: threadErr.message },
        { status: 400 }
      );
    }

    // Pick the thread where the OTHER participant is the provided otherId
    let threadId: string | null = null;
    if (threadRows && threadRows.length > 0) {
      for (const t of threadRows) {
        // we expect columns: id, user_a, user_b, request_id
        const { id, user_a, user_b } = t as {
          id: string;
          user_a: string;
          user_b: string;
        };
        const matchPair =
          (user_a === selfId && user_b === otherId) ||
          (user_a === otherId && user_b === selfId);
        if (matchPair) {
          threadId = id;
          break;
        }
      }
    }

    if (!threadId) {
      // no thread yet = no messages
      return NextResponse.json({ ok: true, messages: [] });
    }

    // Step 2: fetch messages in that thread
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id,sender_id,body,file_url,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json(
        { ok: false, error: msgErr.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, messages: msgs ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errString(e) },
      { status: 500 }
    );
  }
}
