import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AppShell from "@/components/app-shell";

function isOwnerAccessAllowed(params: {
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
}) {
  const { subscriptionStatus, subscriptionCurrentPeriodEnd } = params;

  if (subscriptionStatus === "TRIALING" || subscriptionStatus === "ACTIVE") {
    return true;
  }

  if (
    subscriptionStatus === "CANCELED" &&
    subscriptionCurrentPeriodEnd &&
    subscriptionCurrentPeriodEnd > new Date()
  ) {
    return true;
  }

  return false;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = (session as any).user as {
    email: string;
    role: string;
    organizationId: string;
  };

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  if (user.role === "TENANT") {
    redirect("/tenant");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (!organization) {
    redirect("/login");
  }

  const allowed = isOwnerAccessAllowed({
    subscriptionStatus: organization.subscriptionStatus ?? null,
    subscriptionCurrentPeriodEnd: organization.subscriptionCurrentPeriodEnd,
  });

  const isSubscribeRoute = pathname === "/app/subscribe";

  // Not allowed? Force them to the billing gate.
  if (!allowed && !isSubscribeRoute) {
    redirect("/app/subscribe");
  }

  // Already allowed? Keep them out of the subscribe gate.
  if (allowed && isSubscribeRoute) {
    redirect("/app");
  }

  // Critical: do NOT render the real app shell for unpaid/unactivated users.
  if (!allowed && isSubscribeRoute) {
    return <>{children}</>;
  }

  return <AppShell user={{ email: user.email, role: user.role }}>{children}</AppShell>;
}