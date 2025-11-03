import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  const admin = createClient(url, service);

  // join payouts->payments->bookings to check service_date today
  const { data: rows, error } = await admin
    .rpc("release_payout_candidates"); // (optional: create a SQL function or inline a select)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  for (const r of rows as Array<{ payout_id: string; amount_cents: number; wedflexer_stripe_account: string }>) {
    try {
      const tr = await stripe.transfers.create({
        amount: r.amount_cents,
        currency: "usd",
        destination: r.wedflexer_stripe_account,
      });
      await admin.from("payouts").update({ stripe_transfer_id: tr.id, status: "paid" }).eq("id", r.payout_id);
    } catch (e) {
      await admin.from("payouts").update({ status: "failed" }).eq("id", r.payout_id);
    }
  }

  return NextResponse.json({ ok: true, count: (rows || []).length });
}
