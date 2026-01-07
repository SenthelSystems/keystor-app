import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwnerUser } from "@/lib/org-context";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await requireOwnerUser();
    const orgId = user.organizationId;

    // Rate limit: 5 per minute per owner
    const rl = rateLimit(`owner:${user.id}:support`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many support tickets submitted. Please wait and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const category = String(body?.category ?? "OTHER").toUpperCase();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    const pageUrl = body?.pageUrl ? String(body.pageUrl) : null;
    const userAgent = body?.userAgent ? String(body.userAgent) : null;

    if (!["BUG", "FEATURE", "BILLING", "SECURITY", "OTHER"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    // Payload limits (Step 4)
    if (subject.length > 120)
      return NextResponse.json({ error: "Subject too long (max 120)" }, { status: 400 });
    if (message.length > 5000)
      return NextResponse.json({ error: "Message too long (max 5000)" }, { status: 400 });

    const created = await prisma.supportTicket.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        category: category as any,
        subject,
        message,
        status: "OPEN",
        pageUrl,
        userAgent,
      },
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    await logAudit({
      organizationId: orgId,
      userId: user.id,
      entityType: "SupportTicket",
      entityId: created.id,
      action: "CREATE",
      metadata: { category, subject },
    });

    return NextResponse.json({ data: created });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to submit ticket" },
      { status }
    );
  }
}
