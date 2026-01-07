import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";
import { requireOwnerUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();

    const superAdmin = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (!superAdmin) {
      return NextResponse.json(
        { error: "SUPER_ADMIN_EMAIL is not configured" },
        { status: 500 }
      );
    }

    if (String(user.email).toLowerCase() !== superAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // v1: prevent reusing an existing email for an owner invite
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email already has a SentryCor account." },
        { status: 400 }
      );
    }

    // Invalidate any existing pending OWNER invites for this email
    await prisma.invite.updateMany({
      where: { email, role: "OWNER", status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        organizationId: null, // owner org created at acceptance time
        email,
        name,
        role: "OWNER",
        status: "PENDING",
        token,
        expiresAt,
      },
      select: { id: true, token: true, expiresAt: true },
    });

    await logAudit({
      organizationId: "SYSTEM",
      userId: user.id,
      entityType: "Invite",
      entityId: invite.id,
      action: "CREATE",
      metadata: { email, role: "OWNER" },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/accept-invite?token=${invite.token}`;

    return NextResponse.json({
      data: { link, expiresAt: invite.expiresAt, email },
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to create owner invite" },
      { status }
    );
  }
}
