// src/app/api/stripe/express-login/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as Stripe.StripeConfig["apiVersion"],
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // 1) Who is calling this?
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Missing bearer token" },
        { status: 401 },
      );
    }

    const anonSb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: me, error: meErr } = await anonSb.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    const userId = me.user.id;

    // 2) Service-role client to get Stripe account id
    const adminSb = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: pErr } = await adminSb
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .single();

    if (pErr) {
      return NextResponse.json(
        { ok: false, error: pErr.message },
        { status: 400 },
      );
    }
    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { ok: false, error: "No Stripe account linked yet" },
        { status: 400 },
      );
    }

    // 3) Create Express login link (no redirect_url, to avoid TS/type issues)
    const loginLink = await stripe.accounts.createLoginLink(
      profile.stripe_account_id
    );

    return NextResponse.json({ ok: true, url: loginLink.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
