import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = (session as any).user as {
    email: string;
    role: string;
    organizationId: string;
  };

  // OWNER/STAFF only
  if (user.role === "TENANT") {
    redirect("/tenant");
  }

  return <AppShell user={{ email: user.email, role: user.role }}>{children}</AppShell>;
}
