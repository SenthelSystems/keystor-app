import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as
      | { id?: string; role?: string; organizationId?: string }
      | undefined;

    if (!sessionUser?.id || !sessionUser?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!name) {
      return NextResponse.json({ error: "Tenant name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Tenant email is required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, organizationId: true },
    });

    if (existing) {
      if (existing.organizationId !== sessionUser.organizationId) {
        return NextResponse.json(
          { error: "A user with this email already exists in another organization." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          data: {
            id: existing.id,
            email: existing.email,
            name: existing.name,
          },
          existing: true,
        },
        { status: 200 }
      );
    }

    // Temporary password hash placeholder.
    // Tenant invite / password-set flow can come later.
    const placeholderPasswordHash = "PENDING_INVITE_DO_NOT_USE";

    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: placeholderPasswordHash,
        role: "TENANT",
        organizationId: sessionUser.organizationId,
        tenantProfile: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tenants failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create tenant." },
      { status: 500 }
    );
  }
}