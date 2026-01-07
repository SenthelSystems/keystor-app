import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const now = new Date();
    const soonMs = 2 * 24 * 60 * 60 * 1000; // 2 days
    const soonDate = new Date(Date.now() + soonMs);

    // Only TENANT invites for this org
    const pendingInvites = await prisma.invite.findMany({
      where: {
        organizationId: orgId,
        role: "TENANT",
        status: "PENDING",
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        token: true,
        expiresAt: true,
      },
      take: 50,
    });

    const pendingCount = pendingInvites.length;
    const expiringSoonCount = pendingInvites.filter(
      (i) => new Date(i.expiresAt).getTime() <= soonDate.getTime()
    ).length;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const topExpiring = pendingInvites.slice(0, 3).map((i) => ({
      id: i.id,
      email: i.email,
      name: i.name,
      expiresAt: i.expiresAt,
      link: `${baseUrl}/accept-invite?token=${i.token}`,
    }));

    return NextResponse.json({
      data: {
        pendingCount,
        expiringSoonCount,
        topExpiring,
      },
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load invite health" },
      { status }
    );
  }
}
