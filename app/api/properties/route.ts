import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const data = await prisma.property.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, city: true, state: true, createdAt: true },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load properties" },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const type = String(body?.type ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const city = String(body?.city ?? "").trim();
    const state = String(body?.state ?? "").trim();
    const postalCode = String(body?.postalCode ?? "").trim();
    const notes = body?.notes ? String(body.notes) : null;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Type is required" }, { status: 400 });
    if (!address) return NextResponse.json({ error: "Address is required" }, { status: 400 });
    if (!city) return NextResponse.json({ error: "City is required" }, { status: 400 });
    if (!state) return NextResponse.json({ error: "State is required" }, { status: 400 });
    if (!postalCode) return NextResponse.json({ error: "Postal code is required" }, { status: 400 });

    const created = await prisma.property.create({
      data: { organizationId: orgId, name, type, address, city, state, postalCode, notes },
      select: { id: true, name: true, city: true, state: true, createdAt: true },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Property",
      entityId: created.id,
      action: "CREATE",
      metadata: { name, city, state, type },
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to create property" },
      { status }
    );
  }
}
