"use client";

import { signOut } from "next-auth/react";
import Button from "@/components/ui/button";

export default function UserMenu({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden md:block">
        <div className="text-sm text-zinc-200">{email}</div>
        <div className="text-xs text-zinc-500">{role}</div>
      </div>

      <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </Button>
    </div>
  );
}
