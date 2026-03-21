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

  // TENANT users go to tenant experience
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

  // If owner is not in an allowed billing state, only allow the subscribe page.
  if (!allowed && !isSubscribeRoute) {
    redirect("/app/subscribe");
  }

  // If owner is already allowed, keep them out of subscribe page.
  if (allowed && isSubscribeRoute) {
    redirect("/app");
  }

  return <AppShell user={{ email: user.email, role: user.role }}>{children}</AppShell>;
}