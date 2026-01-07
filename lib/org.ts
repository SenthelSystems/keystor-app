import { prisma } from "./db";
import { requireOrgIdFromSession } from "./org-context";

export async function requireCurrentOrgId(): Promise<string> {
  return await requireOrgIdFromSession();
}

export async function requireCurrentOrg() {
  const orgId = await requireCurrentOrgId();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, name: true },
  });

  if (!org) {
    throw new Error("Organization not found for session organizationId.");
  }

  return org;
}
