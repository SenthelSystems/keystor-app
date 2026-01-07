import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    // Vacant units only (v1 leasing flow)
    const units = await prisma.unit.findMany({
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
    });

    // Tenants only (role enforced)
    const tenants = await prisma.user.findMany({
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
    });

    return NextResponse.json({ units, tenants });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load leasing options" },
      { status }
    );
  }
}
