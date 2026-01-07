import { prisma } from "@/lib/db";

export async function logAudit({
  organizationId,
  userId,
  entityType,
  entityId,
  action,
  metadata,
}: {
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        entityType,
        entityId,
        action,
        metadata,
      },
    });
  } catch {
    // audit logging should never break primary flows
  }
}
