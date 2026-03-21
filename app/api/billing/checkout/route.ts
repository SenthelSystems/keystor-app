import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = (session as any)?.user as
      | { email?: string; role?: string; organizationId?: string }
      | undefined;

    if (!user?.email || !user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { plan, founding } = body as {
      plan?: "starter" | "growth" | "pro";
      founding?: boolean;
    };

    let priceId: string | undefined;

    if (plan === "starter") {
      priceId = founding
        ? process.env.STRIPE_PRICE_STARTER_FOUNDING
        : process.env.STRIPE_PRICE_STARTER;
    }

    if (plan === "growth") {
      priceId = founding
        ? process.env.STRIPE_PRICE_GROWTH_FOUNDING
        : process.env.STRIPE_PRICE_GROWTH;
    }

    if (plan === "pro") {
      priceId = founding
        ? process.env.STRIPE_PRICE_PRO_FOUNDING
        : process.env.STRIPE_PRICE_PRO;
    }

    if (!plan) {
      return NextResponse.json({ error: "Missing plan." }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error: `Missing Stripe price id for plan "${plan}" (founding=${Boolean(
            founding
          )}).`,
        },
        { status: 400 }
      );
    }

    if (!process.env.NEXTAUTH_URL) {
      return NextResponse.json({ error: "Missing NEXTAUTH_URL." }, { status: 500 });
    }

    const successUrl = `${process.env.NEXTAUTH_URL}/app?trial=started`;
    const cancelUrl = `${process.env.NEXTAUTH_URL}/app/subscribe?cancelled=true&plan=${encodeURIComponent(
      plan
    )}&founding=${founding ? "true" : "false"}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.organizationId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: user.organizationId,
          plan,
          founding: String(Boolean(founding)),
        },
      },
      metadata: {
        organizationId: user.organizationId,
        plan,
        founding: String(Boolean(founding)),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.raw?.message || err?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}