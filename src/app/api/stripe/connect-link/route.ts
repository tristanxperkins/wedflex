import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    // ensure account
    const { data: prof } = await supabase.from("profiles").select("stripe_account_id").eq("id", me.user.id).single();
    let accountId = prof?.stripe_account_id;

    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        email: me.user.email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: "individual",
      });
      accountId = acct.id;
      await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", me.user.id);
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
    const returnUrl = `${origin}/earn-money?step=3&connected=1`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/earn-money?step=3&refresh=1`,
      return_url: returnUrl,
    });

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
