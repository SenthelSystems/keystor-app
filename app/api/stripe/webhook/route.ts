import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { BillingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set.");
}

const stripe = new Stripe(stripeSecretKey);

function toDate(unixSeconds?: number | null): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

function mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case "trialing":
      return BillingStatus.TRIALING;
    case "active":
      return BillingStatus.ACTIVE;
    case "past_due":
      return BillingStatus.PAST_DUE;
    case "canceled":
      return BillingStatus.CANCELED;
    case "unpaid":
      return BillingStatus.UNPAID;
    case "incomplete":
      return BillingStatus.INCOMPLETE;
    case "incomplete_expired":
      return BillingStatus.INCOMPLETE_EXPIRED;
    default:
      return BillingStatus.INCOMPLETE;
  }
}

async function recordBillingEvent(params: {
  organizationId: string;
  stripeEventId: string;
  eventType: string;
  payload: unknown;
}) {
  await prisma.billingEvent.upsert({
    where: { stripeEventId: params.stripeEventId },
    update: {
      eventType: params.eventType,
      payload: params.payload as object,
      processedAt: new Date(),
    },
    create: {
      organizationId: params.organizationId,
      stripeEventId: params.stripeEventId,
      eventType: params.eventType,
      payload: params.payload as object,
      processedAt: new Date(),
    },
  });
}

async function findOrganizationForSubscription(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const metadataOrganizationId = subscription.metadata?.organizationId;

  if (metadataOrganizationId) {
    const byMetadata = await prisma.organization.findUnique({
      where: { id: metadataOrganizationId },
      select: { id: true },
    });

    if (byMetadata) {
      return byMetadata;
    }
  }

  const byCustomer = await prisma.organization.findFirst({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (byCustomer) {
    return byCustomer;
  }

  throw new Error(
    `No organization found for subscription ${subscription.id} (customer ${stripeCustomerId})`
  );
}

async function syncOrganizationFromSubscription(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const stripeSubscriptionId = subscription.id;
  const stripePriceId = subscription.items.data[0]?.price?.id ?? null;

  const organization = await findOrganizationForSubscription(subscription);

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      subscriptionStatus: mapStripeStatus(subscription.status),
      subscriptionCurrentPeriodStart: toDate(
        (subscription as Stripe.Subscription & {
          current_period_start?: number;
        }).current_period_start ?? null
      ),
      subscriptionCurrentPeriodEnd: toDate(
        (subscription as Stripe.Subscription & {
          current_period_end?: number;
        }).current_period_end ?? null
      ),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      subscriptionCanceledAt: toDate(subscription.canceled_at),
    },
  });

  return organization.id;
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const body = await req.text();

  console.error("Stripe webhook debug", {
    hasSignature: Boolean(signature),
    secretPrefix: webhookSecret?.slice(0, 12) ?? null,
    bodyLength: body.length,
    livemodeHint: body.includes('"livemode":true'),
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook signature verification failed.";

    const debug = {
      hasSignature: Boolean(signature),
      secretPrefix: webhookSecret?.slice(0, 12) ?? null,
      bodyLength: body.length,
      livemodeHint: body.includes('"livemode":true'),
    };

    console.error("Webhook signature verification failed:", {
      message,
      ...debug,
    });

    return NextResponse.json(
      {
        error: `Webhook Error: ${message}`,
        debug,
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") {
          break;
        }

        const organizationId = session.metadata?.organizationId;
        if (!organizationId) {
          throw new Error(
            "checkout.session.completed missing metadata.organizationId"
          );
        }

        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: stripeCustomerId ?? undefined,
            stripeSubscriptionId: stripeSubscriptionId ?? undefined,
          },
        });

        await recordBillingEvent({
          organizationId,
          stripeEventId: event.id,
          eventType: event.type,
          payload: event,
        });

        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

          await syncOrganizationFromSubscription(subscription);
        }

        console.log("Stripe checkout.session.completed processed", {
          eventId: event.id,
          organizationId,
          stripeCustomerId,
          stripeSubscriptionId,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const organizationId = await syncOrganizationFromSubscription(
          subscription
        );

        await recordBillingEvent({
          organizationId,
          stripeEventId: event.id,
          eventType: event.type,
          payload: event,
        });

        console.log(`Stripe ${event.type} processed`, {
          eventId: event.id,
          organizationId,
          subscriptionId: subscription.id,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          status: subscription.status,
        });

        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const invoiceWithSubscription = invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };

        const subscriptionId =
          typeof invoiceWithSubscription.subscription === "string"
            ? invoiceWithSubscription.subscription
            : invoiceWithSubscription.subscription?.id ?? null;

        if (!subscriptionId) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const organizationId = await syncOrganizationFromSubscription(
          subscription
        );

        await recordBillingEvent({
          organizationId,
          stripeEventId: event.id,
          eventType: event.type,
          payload: event,
        });

        console.log(`Stripe ${event.type} processed`, {
          eventId: event.id,
          organizationId,
          subscriptionId,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
        });

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook handler failed.";
    console.error("Stripe webhook handler failed:", {
      eventId: event.id,
      eventType: event.type,
      message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}