import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const [properties, units] = await Promise.all([
      prisma.property.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, city: true, state: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.unit.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          label: true,
          category: true,
          status: true,
          baseRentCents: true,
          propertyId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const unitsTotal = units.length;
    const vacant = units.filter((u) => u.status === "VACANT").length;
    const occupied = units.filter((u) => u.status === "OCCUPIED").length;

    const baseRentMonthlyCents = units.reduce(
      (sum, u) => sum + (u.baseRentCents || 0),
      0
    );

    const byProperty = properties.map((p) => {
      const pUnits = units.filter((u) => u.propertyId === p.id);
      const pTotal = pUnits.length;
      const pVacant = pUnits.filter((u) => u.status === "VACANT").length;
      const pOccupied = pUnits.filter((u) => u.status === "OCCUPIED").length;
      const pRent = pUnits.reduce((sum, u) => sum + (u.baseRentCents || 0), 0);

      return {
        propertyId: p.id,
        name: p.name,
        location: `${p.city}, ${p.state}`,
        unitsTotal: pTotal,
        vacant: pVacant,
        occupied: pOccupied,
        baseRentMonthlyCents: pRent,
      };
    });

    return NextResponse.json({
      summary: {
        propertiesTotal: properties.length,
        unitsTotal,
        vacant,
        occupied,
        baseRentMonthlyCents,
      },
      byProperty,
      units,
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load ledger snapshot" },
      { status }
    );
  }
}
