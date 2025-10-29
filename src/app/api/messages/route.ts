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
// ✅ POST (the sender creates/uses a thread, then inserts a message)
export async function POST(req: NextRequest) {
  try {
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

    // body from client
    const { other_id, request_id, body, file_url } = await req.json();

    if (!other_id || (typeof other_id !== "string")) {
      return NextResponse.json(
        { ok: false, error: "Missing other_id" },
        { status: 400 }
      );
    }

    // STEP 1: find or create thread
    // attempt to find an existing thread between me + other_id (+ same request_id if provided)

    // get all my threads that match this request_id (or all, if request_id null)
    const matchFilters: Record<string, string | null> = request_id
      ? { request_id }
      : {};

    const { data: candidateThreads, error: candErr } = await supabase
      .from("message_threads")
      .select("*")
      .match(matchFilters)
      .or(`user_a.eq.${selfId},user_b.eq.${selfId}`);

    if (candErr) {
      return NextResponse.json(
        { ok: false, error: candErr.message },
        { status: 400 }
      );
    }

    let threadId: string | null = null;
    if (candidateThreads && candidateThreads.length > 0) {
      for (const t of candidateThreads as Array<{
        id: string;
        user_a: string;
        user_b: string;
      }>) {
        const matchPair =
          (t.user_a === selfId && t.user_b === other_id) ||
          (t.user_a === other_id && t.user_b === selfId);
        if (matchPair) {
          threadId = t.id;
          break;
        }
      }
    }

    // if no thread yet, create one
    if (!threadId) {
      const { data: newThread, error: newThreadErr } = await supabase
        .from("message_threads")
        .insert({
          user_a: selfId,
          user_b: other_id,
          request_id: request_id ?? null,
        })
        .select("id")
        .single();

      if (newThreadErr || !newThread) {
        return NextResponse.json(
          { ok: false, error: newThreadErr?.message || "Cannot create thread" },
          { status: 400 }
        );
      }
      threadId = newThread.id;
    }

    // STEP 2: insert the message
    const { data: inserted, error: insErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: selfId,
        body: body ?? null,
        file_url: file_url ?? null,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { ok: false, error: insErr?.message || "Insert failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message_id: inserted.id,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errString(e) },
      { status: 500 }
    );
  }
}