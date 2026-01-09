import { redirect } from "next/navigation";
import AdminInvitesClient from "./ui";
import { requireSessionUser } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const superAdmin = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

  if (!superAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-100">
        <div className="rounded-2xl border border-[#232838] bg-[#121726] p-6">
          <div className="text-xl font-semibold">Admin Invites</div>
          <div className="mt-2 text-sm text-zinc-300">
            SUPER_ADMIN_EMAIL is not configured in Vercel Environment Variables.
          </div>
        </div>
      </div>
    );
  }

  let user: { id: string; email: string; role: string; organizationId: string };
  try {
    user = await requireSessionUser();
  } catch {
    redirect("/login");
  }

  if (user.role !== "OWNER" && user.role !== "STAFF") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-100">
        <div className="rounded-2xl border border-[#232838] bg-[#121726] p-6">
          <div className="text-xl font-semibold">Forbidden</div>
          <div className="mt-2 text-sm text-zinc-300">
            This page is available to owners only.
          </div>
        </div>
      </div>
    );
  }

  if (String(user.email).toLowerCase() !== superAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-100">
        <div className="rounded-2xl border border-[#232838] bg-[#121726] p-6">
          <div className="text-xl font-semibold">Forbidden</div>
          <div className="mt-2 text-sm text-zinc-300">
            Your account ({user.email}) is not authorized for v1 admin invites.
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            SUPER_ADMIN_EMAIL is set to: {superAdmin}
          </div>
        </div>
      </div>
    );
  }

  return <AdminInvitesClient />;
}
