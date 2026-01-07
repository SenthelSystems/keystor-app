import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unitId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { unitId } = await params;

    const before = await prisma.unit.findFirst({
      where: { id: unitId, organizationId: orgId },
      select: {
        id: true,
        label: true,
        category: true,
        status: true,
        baseRentCents: true,
        propertyId: true,
        notes: true,
      },
    });

    if (!before) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const label = String(body?.label ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const status = String(body?.status ?? "").trim();
    const baseRentDollars = Number(body?.baseRentDollars ?? NaN);
    const notes = body?.notes !== undefined ? String(body.notes) : before.notes ?? null;

    if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!["VACANT", "OCCUPIED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status (use VACANT or OCCUPIED)" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(baseRentDollars) || baseRentDollars < 0) {
      return NextResponse.json({ error: "Invalid base rent" }, { status: 400 });
    }

    const baseRentCents = Math.round(baseRentDollars * 100);

    const after = await prisma.unit.update({
      where: { id: unitId },
      data: { label, category, status: status as any, baseRentCents, notes },
      select: {
        id: true,
        label: true,
        category: true,
        status: true,
        baseRentCents: true,
        propertyId: true,
        notes: true,
      },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Unit",
      entityId: unitId,
      action: "UPDATE",
      metadata: { before, after },
    });

    return NextResponse.json({ data: after });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to update unit" },
      { status }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { unitId } = await params;

    const before = await prisma.unit.findFirst({
      where: { id: unitId, organizationId: orgId },
      select: {
        id: true,
        label: true,
        category: true,
        status: true,
        baseRentCents: true,
        propertyId: true,
        notes: true,
      },
    });

    if (!before) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Guardrail: do not delete occupied units
    if (before.status === "OCCUPIED") {
      return NextResponse.json(
        { error: "Cannot delete an occupied unit. End the lease first." },
        { status: 400 }
      );
    }

    await prisma.unit.delete({ where: { id: unitId } });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Unit",
      entityId: unitId,
      action: "DELETE",
      metadata: { before },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to delete unit" },
      { status }
    );
  }
}
