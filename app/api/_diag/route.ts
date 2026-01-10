import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeHost(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "(default)"}`;
  } catch {
    const m = url.match(/@([^/]+)\//);
    return m ? m[1] : "unparseable";
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || "";

  const expected = process.env.ADMIN_INVITE_SECRET || "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbUrl = process.env.DATABASE_URL || "";
  const host = dbUrl ? safeHost(dbUrl) : "MISSING_DATABASE_URL";

  const email = "contact@senthel.com";
  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, passwordHash: true },
  });

  return NextResponse.json({
    ok: true,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "SET" : "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      DATABASE_URL_HOST: host,
      SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || "MISSING",
    },
    userCheck: user
      ? { email: user.email, role: user.role, hashLen: user.passwordHash?.length ?? 0 }
      : { exists: false },
  });
}
