import { requireOwnerUser } from "@/lib/org-context";
import AdminInvitesClient from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const user = await requireOwnerUser();

  const superAdmin = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!superAdmin) {
    throw new Error("SUPER_ADMIN_EMAIL is not configured");
  }

  if (String(user.email).toLowerCase() !== superAdmin) {
    throw new Error("Forbidden");
  }

  return <AdminInvitesClient />;
}
