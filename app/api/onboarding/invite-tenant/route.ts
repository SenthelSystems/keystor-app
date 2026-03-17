import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    const rl = rateLimit(`owner:${user.id}:invite-tenant`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many invites. Please wait and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

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

    const now = new Date();
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const priorActiveInvites = await tx.invite.findMany({
        where: {
          organizationId: orgId,
          email,
          role: "TENANT",
          status: "PENDING",
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
          token: true,
          expiresAt: true,
        },
      });

      if (priorActiveInvites.length > 0) {
        await tx.invite.updateMany({
          where: {
            id: {
              in: priorActiveInvites.map((invite) => invite.id),
            },
          },
          data: {
            status: "INVALIDATED",
          },
        });
      }

      const invite = await tx.invite.create({
        data: {
          organizationId: orgId,
          email,
          name,
          role: "TENANT",
          status: "PENDING",
          token,
          expiresAt,
        },
        select: {
          id: true,
          token: true,
          expiresAt: true,
        },
      });

      return {
        invite,
        priorActiveInvites,
      };
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "Invite",
      entityId: result.invite.id,
      action: "CREATE",
      metadata: {
        email,
        role: "TENANT",
        replacedInviteIds: result.priorActiveInvites.map((invite) => invite.id),
      },
    });

    if (result.priorActiveInvites.length > 0) {
      for (const priorInvite of result.priorActiveInvites) {
        await logAudit({
          organizationId: orgId,
          userId: user.id,
          entityType: "Invite",
          entityId: priorInvite.id,
          action: "UPDATE",
          metadata: {
            email,
            role: "TENANT",
            updateType: "INVALIDATED",
            replacedByToken: result.invite.token,
          },
        });
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/accept-invite?token=${result.invite.token}`;

    return NextResponse.json({
      data: {
        link,
        expiresAt: result.invite.expiresAt,
      },
    });
  } catch (e: unknown) {
    const error =
      e instanceof Error ? e : new Error("Failed to invite tenant");

    const status =
      typeof (e as { code?: string })?.code === "string" &&
      (e as { code?: string }).code === "FORBIDDEN"
        ? 403
        : 500;

    return NextResponse.json(
      { error: error.message },
      { status }
    );
  }
}