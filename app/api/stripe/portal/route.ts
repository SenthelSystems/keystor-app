import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXTAUTH_URL;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!appUrl) {
  throw new Error("Missing NEXTAUTH_URL");
}

const stripe = new Stripe(stripeSecretKey);

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const user = (session as any)?.user as
      | { email?: string; role?: string; organizationId?: string }
      | undefined;

    if (!user?.email || !user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owner users can manage billing." },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    if (!organization.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer is linked to this organization yet." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${appUrl}/app/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Stripe portal error:", err);

    return NextResponse.json(
      { error: err?.raw?.message || err?.message || "Failed to open billing portal." },
      { status: 500 }
    );
  }
}