import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const secret = String(body?.secret ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;

    if (!process.env.ADMIN_INVITE_SECRET) {
      return NextResponse.json(
        { error: "ADMIN_INVITE_SECRET is not configured" },
        { status: 500 }
      );
    }

    if (!secret || secret !== process.env.ADMIN_INVITE_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // Invalidate any existing pending OWNER invites for this email (clean behavior)
    await prisma.invite.updateMany({
      where: {
        email,
        role: "OWNER",
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
      },
    });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        organizationId: null,   // ✅ owner org is created at acceptance time
        email,
        name,
        role: "OWNER",
        status: "PENDING",
        token,
        expiresAt,
      },
      select: { id: true, token: true, expiresAt: true },
    });

    // Audit under SYSTEM user; org unknown until acceptance
    await logAudit({
      organizationId: "SYSTEM",
      userId: "SYSTEM",
      entityType: "Invite",
      entityId: invite.id,
      action: "CREATE",
      metadata: { email, role: "OWNER" },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/accept-invite?token=${invite.token}`;

    return NextResponse.json({
      data: {
        link,
        expiresAt: invite.expiresAt,
        email,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to create owner invite" },
      { status: 500 }
    );
  }
}
