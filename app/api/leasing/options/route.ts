import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const [units, tenants] = await Promise.all([
      prisma.unit.findMany({
        where: {
          organizationId: orgId,
          status: "VACANT",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          label: true,
          category: true,
          baseRentCents: true,
        },
      }),
      prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: "TENANT",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
    ]);

    return NextResponse.json({ units, tenants });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load leasing options" },
      { status }
    );
  }
}
