import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const [propertiesCount, unitsCount, tenantsCount, activeLeaseCount] =
      await Promise.all([
        prisma.property.count({ where: { organizationId: orgId } }),
        prisma.unit.count({ where: { organizationId: orgId } }),
        prisma.user.count({ where: { organizationId: orgId, role: "TENANT" } }),
        prisma.lease.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      ]);

    return NextResponse.json({
      data: {
        hasProperty: propertiesCount > 0,
        hasUnit: unitsCount > 0,
        hasTenant: tenantsCount > 0,
        hasActiveLease: activeLeaseCount > 0,
        counts: { propertiesCount, unitsCount, tenantsCount, activeLeaseCount },
      },
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load onboarding status" },
      { status }
    );
  }
}

