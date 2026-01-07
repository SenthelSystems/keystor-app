import { requireSessionUser } from "@/lib/org-context";
import TenantHeader from "./tenant-header";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();

  if (user.role !== "TENANT") {
    // simple, safe guardrail: block non-tenants from tenant area
    // (you can change to a redirect later if desired)
    throw new Error("Forbidden");
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-zinc-100">
      <TenantHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
