import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ propertyId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { propertyId } = await params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });

    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const data = await prisma.unit.findMany({
      where: { organizationId: orgId, propertyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, label: true, category: true, status: true, baseRentCents: true, propertyId: true,
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: e?.message ?? "Failed to load units" }, { status });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { propertyId } = await params;

    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });

    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const body = await req.json();

    const label = String(body?.label ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const status = String(body?.status ?? "VACANT").trim();
    const baseRentDollars = Number(body?.baseRentDollars ?? 0);

    if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!["VACANT", "OCCUPIED"].includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (!Number.isFinite(baseRentDollars) || baseRentDollars < 0)
      return NextResponse.json({ error: "Invalid base rent" }, { status: 400 });

    const baseRentCents = Math.round(baseRentDollars * 100);

    const created = await prisma.unit.create({
      data: { organizationId: orgId, propertyId, label, category, status: status as any, baseRentCents },
      select: { id: true, label: true, category: true, status: true, baseRentCents: true, propertyId: true },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Unit",
      entityId: created.id,
      action: "CREATE",
      metadata: { propertyId, label, category, status, baseRentCents },
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to create unit" }, { status });
  }
}
