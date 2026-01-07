import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "TENANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await prisma.maintenanceRequest.findMany({
      where: { organizationId: user.organizationId, tenantId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        unitId: true,
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load requests" },
      { status: 401 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (user.role !== "TENANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 6 per minute per tenant
    const rl = rateLimit(`tenant:${user.id}:requests`, 6, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const priority = String(body?.priority ?? "MEDIUM").trim().toUpperCase();
    const unitId = body?.unitId ? String(body.unitId) : null;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
    if (!["LOW", "MEDIUM", "HIGH"].includes(priority))
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });

    // Payload limits
    if (title.length > 120)
      return NextResponse.json({ error: "Title too long (max 120)" }, { status: 400 });
    if (description.length > 5000)
      return NextResponse.json({ error: "Description too long (max 5000)" }, { status: 400 });

    // SECURITY: unitId must belong to an ACTIVE lease for this tenant (if provided)
    if (unitId) {
      const lease = await prisma.lease.findFirst({
        where: {
          organizationId: user.organizationId,
          tenantId: user.id,
          unitId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!lease) {
        return NextResponse.json(
          { error: "Invalid unit: you do not have an active lease for this unit." },
          { status: 400 }
        );
      }
    }

    const created = await prisma.maintenanceRequest.create({
      data: {
        organizationId: user.organizationId,
        tenantId: user.id,
        unitId,
        title,
        description,
        priority,
        status: "OPEN",
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        unitId: true,
      },
    });

    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      entityType: "MaintenanceRequest",
      entityId: created.id,
      action: "CREATE",
      metadata: { title, priority, unitId },
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to submit request" },
      { status: 500 }
    );
  }
}
