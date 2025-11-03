import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// platform fee in basis points, e.g. 800 = 8%
const FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? "800");

type ServiceReqRow = {
  id: string;
  title: string;
  location: string;
  service_date: string;
  status: "open" | "closed" | "awarded" | "cancelled";
  couple_id: string;
};

export async function POST(req: NextRequest) {
  try {
    // Authenticated Supabase client (RLS will use this token)
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });

    // Who is calling this?
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const { application_id } = await req.json();

    if (!application_id || typeof application_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid application_id" },
        { status: 400 },
      );
    }

    // Pull application + related service_request (the original offer)
    const { data: rawApp, error: aErr } = await supabase
      .from("applications")
      .select(
        `
          id,
          bid_cents,
          request_id,
          wedflexer_id,
          service_requests:service_requests!applications_request_id_fkey (
            id,
            title,
            location,
            service_date,
            status,
            couple_id
          )
        `,
      )
      .eq("id", application_id)
      .single();

    if (aErr || !rawApp) {
      return NextResponse.json(
        { ok: false, error: aErr?.message ?? "Application not found" },
        { status: 404 },
      );
    }

    // Normalize shape: Supabase can return `service_requests` as array or single object
    const app = rawApp as {
      id: string;
      bid_cents: number | null;
      request_id: string;
      wedflexer_id: string;
      service_requests: ServiceReqRow | ServiceReqRow[] | null;
    };

    const srRaw = Array.isArray(app.service_requests)
      ? app.service_requests[0]
      : app.service_requests;

    if (!srRaw) {
      return NextResponse.json(
        { ok: false, error: "Related service request not found" },
        { status: 400 },
      );
    }

    const sr = srRaw as ServiceReqRow;

    // Offer must still be open
    if (sr.status !== "open") {
      return NextResponse.json(
        { ok: false, error: "Offer is not open for booking" },
        { status: 400 },
      );
    }

    const amount_cents = app.bid_cents ?? 0;
    if (amount_cents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Application has no valid bid amount" },
        { status: 400 },
      );
    }

    const fee_cents = Math.floor((amount_cents * FEE_BPS) / 10_000);

    // Create booking record
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        request_id: app.request_id,
        application_id: app.id,
        couple_id: sr.couple_id,
        wedflexer_id: app.wedflexer_id,
        service_date: sr.service_date,
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (bErr || !booking) {
      return NextResponse.json(
        { ok: false, error: bErr?.message ?? "Could not create booking" },
        { status: 500 },
      );
    }

    // Close the original request & mark this application as awarded
    await supabase
      .from("service_requests")
      .update({ status: "closed" })
      .eq("id", app.request_id);

    await supabase
      .from("applications")
      .update({ is_awarded: true })
      .eq("id", app.id);

    const origin =
      req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/booked/success?booking=${booking.id}`,
      cancel_url: `${origin}/r/${app.request_id}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount_cents,
            product_data: {
              name: `Booking: ${sr.title}`,
              description: `${sr.location} • Service date ${sr.service_date}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        wedflexer_id: app.wedflexer_id,
        fee_cents: String(fee_cents),
      },
    });

    // Record the pending payment in your DB
    await supabase.from("payments").insert({
      booking_id: booking.id,
      couple_id: sr.couple_id,
      wedflexer_id: app.wedflexer_id,
      amount_cents,
      stripe_checkout_session_id: session.id,
      status: "pending",
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
