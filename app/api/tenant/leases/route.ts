import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();

    if (user.role !== "TENANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // v1: tenant belongs to one org, so filter by that org
    const data = await prisma.lease.findMany({
      where: {
        organizationId: user.organizationId,
        tenantId: user.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        rentCents: true,
        unit: {
          select: {
            id: true,
            label: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load leases" },
      { status: 401 }
    );
  }
}
