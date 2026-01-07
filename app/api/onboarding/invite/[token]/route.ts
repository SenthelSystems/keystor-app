import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { token } = await params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "ACCEPTED" || invite.acceptedAt) {
      return NextResponse.json(
        { error: "Invite already accepted" },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await prisma.invite
        .update({ where: { token }, data: { status: "EXPIRED" } })
        .catch(() => {});
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    return NextResponse.json({ data: invite });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load invite" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;

    const body = await req.json().catch(() => ({}));
    const password = String(body?.password ?? "");

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        expiresAt: true,
        organizationId: true, // nullable because OWNER invites start without org
        acceptedAt: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status === "ACCEPTED" || invite.acceptedAt) {
      return NextResponse.json(
        { error: "Invite already accepted" },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await prisma.invite
        .update({ where: { token }, data: { status: "EXPIRED" } })
        .catch(() => {});
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // OWNER acceptance: create new organization + owner user
    if (invite.role === "OWNER") {
      const ownerName = String(body?.ownerName ?? "").trim();
      const organizationName = String(body?.organizationName ?? "").trim();

      if (!ownerName) {
        return NextResponse.json(
          { error: "Your name is required" },
          { status: 400 }
        );
      }
      if (!organizationName) {
        return NextResponse.json(
          { error: "Organization name is required" },
          { status: 400 }
        );
      }

      // v1 rule: owner email must not already exist
      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              "This email already has a SentryCor account. Owner reuse across orgs is supported in v2.",
          },
          { status: 400 }
        );
      }

      // create org with unique slug
      let baseSlug = slugify(organizationName);
      if (!baseSlug) baseSlug = "org";
      let slug = baseSlug;

      for (let i = 0; i < 10; i++) {
        const exists = await prisma.organization.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!exists) break;
        slug = `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
      }

      const created = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: organizationName, slug },
          select: { id: true, name: true },
        });

        await tx.user.create({
          data: {
            email: invite.email,
            name: ownerName,
            passwordHash,
            role: "OWNER",
            organizationId: org.id,
          },
        });

        await tx.invite.update({
          where: { token },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            organizationId: org.id, // bind invite to created org
          },
        });

        return org;
      });

      return NextResponse.json({
        ok: true,
        email: invite.email,
        role: "OWNER",
        org: created.name,
      });
    }

    // TENANT acceptance — tenant invites MUST have an orgId
    if (!invite.organizationId) {
      return NextResponse.json(
        { error: "Invite is missing organization context." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true, organizationId: true },
    });

    // v1 tenant rule: cannot reuse email across orgs yet
    if (existing && existing.organizationId !== invite.organizationId) {
      return NextResponse.json(
        {
          error:
            "This email belongs to a tenant under another owner. Cross-owner tenants are supported in v2.",
        },
        { status: 400 }
      );
    }

    if (!existing) {
      await prisma.user.create({
        data: {
          email: invite.email,
          name: invite.name ?? undefined,
          passwordHash,
          role: "TENANT",
          organizationId: invite.organizationId, // guaranteed string
          tenantProfile: { create: {} },
        },
      });
    } else {
      await prisma.user.update({
        where: { email: invite.email },
        data: {
          passwordHash,
          role: "TENANT",
          organizationId: invite.organizationId, // guaranteed string
        },
      });
    }

    await prisma.invite.update({
      where: { token },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return NextResponse.json({ ok: true, email: invite.email, role: "TENANT" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to accept invite" },
      { status: 500 }
    );
  }
}
