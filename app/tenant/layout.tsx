import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TenantHeader from "./tenant-header";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = (session as any).user as { role: string; email: string };

  // Tenant only
  if (user.role !== "TENANT") redirect("/app");

  return (
    <div className="min-h-screen bg-[#0F1115] text-zinc-100">
      <TenantHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
