import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ requestId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { requestId } = await params;

    const before = await prisma.maintenanceRequest.findFirst({
      where: { id: requestId, organizationId: orgId },
      select: { id: true, status: true, priority: true, title: true },
    });

    if (!before) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const body = await req.json();
    const status = String(body?.status ?? "").trim();
    const priority = body?.priority ? String(body.priority).trim().toUpperCase() : null;

    if (!["OPEN", "IN_PROGRESS", "COMPLETE", "CANCELLED"].includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    if (priority && !["LOW", "MEDIUM", "HIGH"].includes(priority))
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });

    const after = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: status as any, ...(priority ? { priority } : {}) },
      select: { id: true, title: true, priority: true, status: true, createdAt: true, tenantId: true, unitId: true },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "MaintenanceRequest",
      entityId: requestId,
      action: "UPDATE",
      metadata: { before, after },
    });

    return NextResponse.json({ data: after });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to update request" }, { status });
  }
}
