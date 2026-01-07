import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgIdFromSession } from "@/lib/org-context";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;


    const data = await prisma.unit.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        category: true,
        status: true,
        baseRentCents: true,
        propertyId: true,
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load units" },
      { status: 401 }
    );
  }
}
