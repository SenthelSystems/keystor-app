import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    // rate limit: prevent abuse
    const rl = rateLimit(`owner:${user.id}:invite-tenant`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many invites. Please wait and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // v1 constraint:
    // If user exists in another org, we cannot attach them yet (v2 OrgMembership).
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true, role: true },
    });

    if (existing && existing.organizationId !== orgId) {
      return NextResponse.json(
        {
          error:
            "This email already has a SentryCor account under another owner. Cross-owner tenants are supported in v2.",
        },
        { status: 400 }
      );
    }

    // Create a token + invite record (expires in 7 days)
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        organizationId: orgId,
        email,
        name,
        role: "TENANT",
        status: "PENDING",
        token,
        expiresAt,
      },
      select: { id: true, token: true, expiresAt: true },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Invite",
      entityId: invite.id,
      action: "CREATE",
      metadata: { email, role: "TENANT" },
    });

    // Build invite link (works in dev + prod if NEXTAUTH_URL is set)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/accept-invite?token=${invite.token}`;

    return NextResponse.json({
      data: {
        link,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to invite tenant" }, { status });
  }
}
