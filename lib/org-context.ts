import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user;

  if (!session || !user) {
    throw new Error("Not authenticated. No session user found.");
  }

  return user as {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

export async function requireOrgIdFromSession(): Promise<string> {
  const user = await requireSessionUser();
  if (!user.organizationId) {
    throw new Error("Session user missing organizationId.");
  }
  return user.organizationId;
}

/**
 * OWNER/STAFF only (TENANT forbidden)
 */
export async function requireOwnerUser() {
  const user = await requireSessionUser();
  if (user.role === "TENANT") {
    const err: any = new Error("Forbidden");
    err.code = "FORBIDDEN";
    throw err;
  }
  return user;
}

