/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * helpers
 */
function errStr(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// GET /api/messages?other=<uuid>&request=<request_id?>
// returns the thread + messages between me and "other" for (optional) request_id
export async function GET(req: NextRequest) {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization") ?? "";

    // create supabase instance with user token (RLS)
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // who am I
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    const myId = userRes.user.id;

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("other");
    const requestId = searchParams.get("request");

    if (!otherUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing other user id" },
        { status: 400 }
      );
    }

    // normalize pair so (A,B) and (B,A) match same row
    const [u1, u2] =
      myId < otherUserId ? [myId, otherUserId] : [otherUserId, myId];

    // find thread
    const { data: threadRow, error: threadErr } = await supabase
      .from("message_threads")
      .select("id")
      .eq("user_one", u1)
      .eq("user_two", u2)
      .eq("request_id", requestId || null)
      .single();

    if (threadErr || !threadRow) {
      // no thread yet → return empty array
      return NextResponse.json({ ok: true, messages: [] });
    }

    // load messages for that thread
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id,sender_id,body,file_url,created_at")
      .eq("thread_id", threadRow.id)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    return NextResponse.json({ ok: true, messages: msgs ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errStr(e) },
      { status: 500 }
    );
  }
}

// POST /api/messages
// body: { other: <uuid>, request_id?: <uuid|null>, text: <string>, file_url?: <string> }
export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get("authorization") ?? "";

    // supabase with RLS identity
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // me
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    const myId = userRes.user.id;

    const bodyJson = await req.json();
    const otherUserId = bodyJson.other;
    const requestId = bodyJson.request_id ?? null;
    const text = bodyJson.text ?? "";
    const fileUrl = bodyJson.file_url ?? null;

    if (!otherUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing other user id" },
        { status: 400 }
      );
    }
    if (!text && !fileUrl) {
      return NextResponse.json(
        { ok: false, error: "Message empty" },
        { status: 400 }
      );
    }

    // normalize the pair
    const [u1, u2] =
      myId < otherUserId ? [myId, otherUserId] : [otherUserId, myId];

    // 1. try to find existing thread
    const { data: threadRow, error: findErr } = await supabase
      .from("message_threads")
      .select("id")
      .eq("user_one", u1)
      .eq("user_two", u2)
      .eq("request_id", requestId || null)
      .single();

    let threadId: string | null = null;

    if (!findErr && threadRow) {
      threadId = threadRow.id;
    } else {
      // 2. create new thread
      const { data: newThread, error: insertErr } = await supabase
        .from("message_threads")
        .insert({
          user_one: u1,
          user_two: u2,
          request_id: requestId || null,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !newThread) {
        return NextResponse.json(
          { ok: false, error: errStr(insertErr) },
          { status: 400 }
        );
      }

      threadId = newThread.id;
    }

    // 3. insert message
    const { data: newMsg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: myId,
        body: text,
        file_url: fileUrl,
      })
      .select("id,sender_id,body,file_url,created_at")
      .single();

    if (msgErr || !newMsg) {
      return NextResponse.json(
        { ok: false, error: errStr(msgErr) },
        { status: 400 }
      );
    }

    // 4. bump thread last_message_at
    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    return NextResponse.json({ ok: true, message: newMsg });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: errStr(e) },
      { status: 500 }
    );
  }
}
