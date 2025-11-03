import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature")!;
    const event = stripe.webhooks.constructEvent(raw, sig, endpointSecret);

    const admin = createClient(url, service);

    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      const bookingId = (cs.metadata?.booking_id ?? "") as string;
      const fee_cents = Number(cs.metadata?.fee_cents ?? "0");

      const piId = cs.payment_intent as string;

      // mark payment succeeded
      const { data: pay } = await admin
        .from("payments")
        .update({ status: "succeeded", stripe_payment_intent_id: piId })
        .eq("booking_id", bookingId)
        .select("id, amount_cents, wedflexer_id")
        .single();

      if (pay) {
        // queue payout (we'll transfer on service date)
        await admin.from("payouts").insert({
          payment_id: pay.id,
          wedflexer_id: pay.wedflexer_id,
          amount_cents: pay.amount_cents - fee_cents,
          fee_cents,
          status: "queued",
        });

        await admin.from("bookings").update({ status: "paid" }).eq("id", bookingId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
