import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const properties = await prisma.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const units = await prisma.unit.findMany({
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
    });

    const propertiesTotal = properties.length;
    const unitsTotal = units.length;
    const vacant = units.filter((u) => u.status === "VACANT").length;
    const occupied = units.filter((u) => u.status === "OCCUPIED").length;
    const baseRentMonthlyCents = units.reduce(
      (sum, u) => sum + (u.baseRentCents || 0),
      0
    );

    // Rollups by property
    const propMap = new Map<
      string,
      {
        propertyId: string;
        name: string;
        location: string;
        unitsTotal: number;
        vacant: number;
        occupied: number;
        baseRentMonthlyCents: number;
      }
    >();

    for (const p of properties) {
      propMap.set(p.id, {
        propertyId: p.id,
        name: p.name,
        location: [p.city, p.state].filter(Boolean).join(", "),
        unitsTotal: 0,
        vacant: 0,
        occupied: 0,
        baseRentMonthlyCents: 0,
      });
    }

    for (const u of units) {
      const roll = propMap.get(u.propertyId);
      if (!roll) continue;

      roll.unitsTotal += 1;
      if (u.status === "VACANT") roll.vacant += 1;
      if (u.status === "OCCUPIED") roll.occupied += 1;
      roll.baseRentMonthlyCents += u.baseRentCents || 0;
    }

    const byProperty = Array.from(propMap.values()).sort(
      (a, b) => b.baseRentMonthlyCents - a.baseRentMonthlyCents
    );

    return NextResponse.json({
      summary: {
        propertiesTotal,
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
