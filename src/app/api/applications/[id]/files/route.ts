// src/app/api/files/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type AppRow = {
  id: string;
  wedflexer_id: string;
  request_id: string;
  file_urls: string[] | null;
};

type ReqRow = {
  id: string;
  couple_id: string;
};

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const body = await req.json();
    const application_id: string = body.application_id;
    const file_path: string = body.file_path; // e.g. "<appId>/<filename>"

    if (!application_id || !file_path) {
      return NextResponse.json(
        { ok: false, error: "Missing application_id or file_path" },
        { status: 400 }
      );
    }

    // User-scoped client for auth / RLS paths
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // Who am I?
    const { data: me, error: meErr } = await userClient.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // 1) Get the application (owner wedflexer + request_id)
    const { data: app, error: aErr } = await userClient
      .from("applications")
      .select("id, wedflexer_id, request_id, file_urls")
      .eq("id", application_id)
      .single<AppRow>();

    if (aErr || !app) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
    }

    // 2) Look up the service request to find the couple_id (no embed)
    const { data: reqRow, error: rErr } = await userClient
      .from("service_requests")
      .select("id, couple_id")
      .eq("id", app.request_id)
      .single<ReqRow>();

    if (rErr || !reqRow) {
      return NextResponse.json({ ok: false, error: "Related request not found" }, { status: 404 });
    }

    const coupleId = reqRow.couple_id;

    // Authorization: only the app’s wedflexer or the request’s couple can create signed URLs
    const isOwner = me.user.id === app.wedflexer_id || me.user.id === coupleId;
    if (!isOwner) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Service client strictly on the server to create a signed URL
    const serverClient = createClient(url, service);

    const { data: signed, error: sErr } = await serverClient.storage
      .from("application_files")
      .createSignedUrl(file_path, 60 * 10); // 10 min

    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, url: signed.signedUrl });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : (() => {
            try { return JSON.stringify(e); } catch { return String(e); }
          })();
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
