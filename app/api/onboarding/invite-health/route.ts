import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const now = new Date();
    const soonDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const pendingInvites = await prisma.invite.findMany({
      where: {
        organizationId: orgId,
        role: "TENANT",
        status: "PENDING",
        expiresAt: { gt: now },
      },
      orderBy: [{ email: "asc" }, { expiresAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        token: true,
        expiresAt: true,
      },
      take: 100,
    });

    const inviteEmails = Array.from(
      new Set(
        pendingInvites.map((invite) => invite.email.trim().toLowerCase())
      )
    );

    let registeredTenantEmails = new Set<string>();

    if (inviteEmails.length > 0) {
      const existingTenantUsers = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: "TENANT",
          email: {
            in: inviteEmails,
          },
        },
        select: {
          email: true,
        },
      });

      registeredTenantEmails = new Set(
        existingTenantUsers.map((user) => user.email.trim().toLowerCase())
      );
    }

    const staleInviteIds = pendingInvites
      .filter((invite) =>
        registeredTenantEmails.has(invite.email.trim().toLowerCase())
      )
      .map((invite) => invite.id);

    if (staleInviteIds.length > 0) {
      await prisma.invite.updateMany({
        where: {
          id: {
            in: staleInviteIds,
          },
        },
        data: {
          status: "INVALIDATED",
        },
      });
    }

    const activePendingInvites = pendingInvites.filter(
      (invite) => !registeredTenantEmails.has(invite.email.trim().toLowerCase())
    );

    const dedupedByEmail = new Map<
      string,
      {
        id: string;
        email: string;
        name: string | null;
        token: string;
        expiresAt: Date;
      }
    >();

    for (const invite of activePendingInvites) {
      const key = invite.email.trim().toLowerCase();

      if (!dedupedByEmail.has(key)) {
        dedupedByEmail.set(key, invite);
      }
    }

    const uniquePendingInvites = Array.from(dedupedByEmail.values()).sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );

    const pendingCount = uniquePendingInvites.length;

    const expiringSoonCount = uniquePendingInvites.filter(
      (invite) => new Date(invite.expiresAt).getTime() <= soonDate.getTime()
    ).length;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const topExpiring = uniquePendingInvites.slice(0, 3).map((invite) => ({
      id: invite.id,
      email: invite.email,
      name: invite.name,
      expiresAt: invite.expiresAt,
      link: `${baseUrl}/accept-invite?token=${invite.token}`,
    }));

    return NextResponse.json({
      data: {
        pendingCount,
        expiringSoonCount,
        topExpiring,
      },
    });
  } catch (e: unknown) {
    const error =
      e instanceof Error ? e : new Error("Failed to load invite health");

    const status =
      typeof (e as { code?: string })?.code === "string" &&
      (e as { code?: string }).code === "FORBIDDEN"
        ? 403
        : 401;

    return NextResponse.json({ error: error.message }, { status });
  }
}