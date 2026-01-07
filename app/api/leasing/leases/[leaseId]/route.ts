import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ leaseId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { leaseId } = await params;

    const body = await req.json();
    const action = String(body?.action ?? "").toUpperCase(); // "END"
    const endDateISO = String(body?.endDate ?? "");

    if (action !== "END") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const endDate = new Date(endDateISO);
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }

    const existing = await prisma.lease.findFirst({
      where: { id: leaseId, organizationId: orgId },
      select: { id: true, unitId: true, status: true },
    });

    if (!existing) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    if (existing.status !== "ACTIVE")
      return NextResponse.json({ error: "Lease is not active" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.update({
        where: { id: leaseId },
        data: { status: "ENDED", endDate },
        select: { id: true, status: true, endDate: true, unitId: true },
      });

      await tx.unit.update({
        where: { id: existing.unitId },
        data: { status: "VACANT" },
      });

      return lease;
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Lease",
      entityId: leaseId,
      action: "UPDATE",
      metadata: { action: "END", endDate: endDateISO, unitId: existing.unitId },
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to update lease" }, { status });
  }
}
