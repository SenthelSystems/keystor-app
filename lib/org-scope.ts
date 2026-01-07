// src/lib/org-scope.ts
import { requireCurrentOrgId } from "./org";

/**
 * Forces you to pass orgId to every query/mutation.
 * This is our "seatbelt."
 */
export async function withOrg<T>(
  fn: (orgId: string) => Promise<T>
): Promise<T> {
  const orgId = await requireCurrentOrgId();
  return fn(orgId);
}

/**
 * Common where clause helper for org-owned models.
 */
export function orgWhere(orgId: string) {
  return { organizationId: orgId };
}
