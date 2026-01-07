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

    // Only units with an ACTIVE lease for this tenant
    const leases = await prisma.lease.findMany({
      where: {
        organizationId: user.organizationId,
        tenantId: user.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      select: {
        unit: {
          select: {
            id: true,
            label: true,
            category: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    const data = leases.map((l) => ({
      id: l.unit.id,
      label: l.unit.label,
      category: l.unit.category,
      propertyName: l.unit.property.name,
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load units" },
      { status: 401 }
    );
  }
}
