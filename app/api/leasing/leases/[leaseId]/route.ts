import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ leaseId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const { leaseId } = await params;
    if (!leaseId) {
      return NextResponse.json({ error: "Missing leaseId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").toUpperCase();

    if (action !== "END") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const endDateRaw = body?.endDate ? String(body.endDate) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : new Date();

    // Ensure lease belongs to org
    const lease = await prisma.lease.findFirst({
      where: { id: leaseId, organizationId: orgId },
      select: { id: true, unitId: true, status: true },
    });

    if (!lease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    if (lease.status === "ENDED") {
      return NextResponse.json({ error: "Lease already ended" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ended = await tx.lease.update({
        where: { id: leaseId },
        data: {
          status: "ENDED",
          endDate,
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentCents: true,
          unitId: true,
          tenantId: true,
        },
      });

      // Return unit to VACANT
      await tx.unit.update({
        where: { id: lease.unitId },
        data: { status: "VACANT" },
      });

      return ended;
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to update lease" },
      { status }
    );
  }
}
