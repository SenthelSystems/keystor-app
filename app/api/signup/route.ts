import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string) {
  let slug = base || `org-${Date.now()}`;
  let counter = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const organizationName = String(body?.organizationName ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!name) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }

    if (!organizationName) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 400 }
      );
    }

    const baseSlug = slugify(organizationName);
    const slug = await uniqueSlug(baseSlug);

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
        users: {
          create: {
            email,
            name,
            passwordHash,
            role: "OWNER",
          },
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId: created.id,
        slug: created.slug,
      },
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to create account." },
      { status: 500 }
    );
  }
}