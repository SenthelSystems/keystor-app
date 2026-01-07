import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unitId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const { unitId } = await params;
    if (!unitId) {
      return NextResponse.json({ error: "Missing unitId" }, { status: 400 });
    }

    // Ensure the unit belongs to this org
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, organizationId: orgId },
      select: { id: true },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Find active lease (if any)
    const lease = await prisma.lease.findFirst({
      where: {
        organizationId: orgId,
        unitId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        startDate: true,
        rentCents: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ data: lease ?? null });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load unit lease" },
      { status }
    );
  }
}
