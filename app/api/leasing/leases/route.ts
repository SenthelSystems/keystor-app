import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

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
        createdAt: true,
        unit: { select: { id: true, label: true, category: true } },
        tenant: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load leases" },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const body = await req.json().catch(() => ({}));

    const unitId = String(body?.unitId ?? "").trim();
    const tenantId = String(body?.tenantId ?? "").trim();
    const startDateRaw = String(body?.startDate ?? "").trim();
    const rentDollars = Number(body?.rentDollars ?? NaN);

    if (!unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });
    if (!tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    if (!startDateRaw) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    if (!Number.isFinite(rentDollars) || rentDollars < 0)
      return NextResponse.json({ error: "Invalid rent" }, { status: 400 });

    const startDate = new Date(startDateRaw);
    if (isNaN(startDate.getTime()))
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });

    const rentCents = Math.round(rentDollars * 100);

    // Ensure unit belongs to org + is vacant
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, organizationId: orgId },
      select: { id: true, status: true },
    });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    if (unit.status !== "VACANT")
      return NextResponse.json({ error: "Unit is not vacant" }, { status: 400 });

    // Ensure tenant belongs to org and is tenant role
    const tenant = await prisma.user.findFirst({
      where: { id: tenantId, organizationId: orgId },
      select: { id: true, role: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if (String(tenant.role).toUpperCase() !== "TENANT")
      return NextResponse.json({ error: "User is not a tenant" }, { status: 400 });

    // Create lease + set unit to OCCUPIED
    const created = await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          organizationId: orgId,
          unitId,
          tenantId,
          status: "ACTIVE",
          startDate,
          rentCents,
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentCents: true,
          createdAt: true,
          unit: { select: { id: true, label: true, category: true } },
          tenant: { select: { id: true, email: true, name: true } },
        },
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { status: "OCCUPIED" },
      });

      return lease;
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to create lease" },
      { status }
    );
  }
}
