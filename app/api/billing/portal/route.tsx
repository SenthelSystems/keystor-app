import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const user = (session as any)?.user as
      | { email?: string; role?: string }
      | undefined;

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // v1 shortcut:
    // find the Stripe customer by the logged-in owner's email.
    // Later, replace this with a stored stripe_customer_id from webhook processing.
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer found for this account yet. Start a subscription first.",
        },
        { status: 400 }
      );
    }

    if (!process.env.NEXTAUTH_URL) {
      return NextResponse.json(
        { error: "Missing NEXTAUTH_URL." },
        { status: 500 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXTAUTH_URL}/app/subscribe`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Stripe billing portal error:", err);

    const message =
      err?.raw?.message ||
      err?.message ||
      "Unable to open billing portal.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}