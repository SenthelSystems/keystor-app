import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/org-context";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

type Ctx = { params: Promise<{ requestId: string }> };

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime"];

function kindFromMime(mime: string) {
  if (ALLOWED_IMAGE.includes(mime)) return "IMAGE";
  if (ALLOWED_VIDEO.includes(mime)) return "VIDEO";
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireSessionUser();
    const { requestId } = await params;

    // enforce access
    const reqRow = await prisma.maintenanceRequest.findFirst({
      where:
        user.role === "TENANT"
          ? { id: requestId, tenantId: user.id, organizationId: user.organizationId }
          : { id: requestId, organizationId: user.organizationId },
      select: { id: true, organizationId: true },
    });

    if (!reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const rows = await prisma.serviceAttachment.findMany({
      where: { requestId: reqRow.id, organizationId: reqRow.organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        kind: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    // Return SAME-ORIGIN proxy URLs (no CORS issues)
    const data = rows.map((r) => ({
      ...r,
      url: `/api/attachments/media/${r.id}`,
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    const status = e?.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: e?.message ?? "Failed to load attachments" },
      { status }
    );
  }
}

// Tenant upload only (v1)
export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireSessionUser();
    if (String(user.role).toUpperCase() !== "TENANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId } = await params;

    const reqRow = await prisma.maintenanceRequest.findFirst({
      where: { id: requestId, tenantId: user.id, organizationId: user.organizationId },
      select: { id: true, organizationId: true },
    });

    if (!reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // @ts-ignore
    const f: File = file;

    const mime = f.type || "";
    const kind = kindFromMime(mime);
    if (!kind) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPG/PNG/WEBP or MP4/MOV." },
        { status: 400 }
      );
    }

    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    const bucket = process.env.SUPABASE_ATTACHMENTS_BUCKET || "service-attachments";
    const supa = supabaseAdmin();

    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const safeExt = ext && ext.length <= 6 ? ext : kind === "IMAGE" ? "jpg" : "mp4";

    const rand = crypto.randomBytes(8).toString("hex");
    const path = `${reqRow.organizationId}/${reqRow.id}/${rand}.${safeExt}`;

    const bytes = new Uint8Array(await f.arrayBuffer());

    const { error: upErr } = await supa.storage
      .from(bucket)
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (upErr) {
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    const created = await prisma.serviceAttachment.create({
      data: {
        organizationId: reqRow.organizationId,
        requestId: reqRow.id,
        uploadedByUserId: user.id,
        kind: kind as any,
        mimeType: mime,
        sizeBytes: f.size,
        storagePath: path,
      },
      select: {
        id: true,
        kind: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    // IMPORTANT: return JSON so client res.json() never fails
    return NextResponse.json({ data: created });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to upload attachment" },
      { status: 500 }
    );
  }
}
