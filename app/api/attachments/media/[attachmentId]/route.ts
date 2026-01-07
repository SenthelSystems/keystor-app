import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/org-context";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ attachmentId: string }> };

const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || "service-attachments";

export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await requireSessionUser();
    const { attachmentId } = await params;

    const att = await prisma.serviceAttachment.findFirst({
      where:
        String(user.role).toUpperCase() === "TENANT"
          ? {
              id: attachmentId,
              organizationId: user.organizationId,
              request: { tenantId: user.id },
            }
          : {
              id: attachmentId,
              organizationId: user.organizationId,
            },
      select: {
        id: true,
        mimeType: true,
        storagePath: true,
      },
    });

    if (!att) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supa = supabaseAdmin();
    const { data, error } = await supa.storage.from(BUCKET).download(att.storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: `Download failed: ${error?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());
    const total = buf.length;

    // Handle Range (video streaming)
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d+)?$/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 4 * 1024 * 1024, total - 1);

        const s = Math.max(0, Math.min(start, total - 1));
        const e = Math.max(s, Math.min(end, total - 1));

        const chunk = buf.subarray(s, e + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": att.mimeType || "application/octet-stream",
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${s}-${e}/${total}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=60",
          },
        });
      }
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": att.mimeType || "application/octet-stream",
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: e?.message ?? "Failed to load media" }, { status });
  }
}
