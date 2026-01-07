import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const data = await prisma.lease.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        rentCents: true,
        unit: { select: { id: true, label: true, category: true } },
        tenant: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: e?.message ?? "Failed to load leases" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const body = await req.json();

    const unitId = String(body?.unitId ?? "");
    const tenantId = String(body?.tenantId ?? "");
    const startDateISO = String(body?.startDate ?? "");
    const rentDollars = Number(body?.rentDollars ?? 0);

    if (!unitId) return NextResponse.json({ error: "Unit is required" }, { status: 400 });
    if (!tenantId) return NextResponse.json({ error: "Tenant is required" }, { status: 400 });
    if (!startDateISO) return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    if (!Number.isFinite(rentDollars) || rentDollars < 0)
      return NextResponse.json({ error: "Invalid rent" }, { status: 400 });

    const startDate = new Date(startDateISO);
    if (Number.isNaN(startDate.getTime()))
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });

    // Ensure unit belongs to org and is vacant
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, organizationId: orgId },
      select: { id: true, status: true, baseRentCents: true },
    });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    if (unit.status !== "VACANT")
      return NextResponse.json({ error: "Unit is not vacant" }, { status: 400 });

    // Ensure tenant belongs to same org and is TENANT role
    const tenant = await prisma.user.findFirst({
      where: { id: tenantId, organizationId: orgId, role: "TENANT" },
      select: { id: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const rentCents = Math.round(rentDollars * 100);

    const created = await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          organizationId: orgId,
          unitId,
          tenantId,
          startDate,
          rentCents,
          status: "ACTIVE",
        },
        select: { id: true, organizationId: true, unitId: true, tenantId: true, rentCents: true, startDate: true, status: true },
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { status: "OCCUPIED" },
      });

      return lease;
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Lease",
      entityId: created.id,
      action: "CREATE",
      metadata: { unitId, tenantId, rentCents, startDate: startDateISO },
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to create lease" }, { status });
  }
}
