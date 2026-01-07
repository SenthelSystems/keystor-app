import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const data = await prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        tenantId: true,
        unitId: true,

        tenant: {
          select: {
            name: true,
            email: true,
          },
        },

        unit: {
          select: {
            label: true,
            category: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load service requests" },
      { status }
    );
  }
}
