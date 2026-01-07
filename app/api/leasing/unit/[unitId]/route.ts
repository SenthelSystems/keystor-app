import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

type Ctx = { params: Promise<{ unitId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;
    const { unitId } = await params;

    const lease = await prisma.lease.findFirst({
      where: {
        organizationId: orgId,
        unitId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        startDate: true,
        rentCents: true,
        tenant: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: lease });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load unit lease" },
      { status }
    );
  }
}
