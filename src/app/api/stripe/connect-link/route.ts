import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers();
    const auth = hdrs.get("authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });

    // Who is this?
    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    const user = me.user;

    // We assume your "profiles" table has a "stripe_account_id" column
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, stripe_account_id")
      .eq("id", user.id)
      .single();

    if (pErr) {
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 400 });
    }

    let accountId = profile?.stripe_account_id as string | null;

    // 1) Create an **Express** connected account if the user doesn't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          },
          business_profile: {
            mcc: "7299",
            product_description: "I provide wedding-related services to couples via WedFlex.",
            url: "https://wedflex.com"
        },
        metadata: {
          supabase_user_id: user.id,
        },
      });

      accountId = account.id;

      const { error: uErr } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (uErr) {
        return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
      }
    }

    // 2) Create an onboarding / dashboard link for that Express account
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding", // Express onboarding
      refresh_url: `${origin}/earn-money?step=2`,
      return_url: `${origin}/earn-money?step=3`,
    });

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
