"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

function HeaderActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border border-[#2A3566] bg-[#1A2346] px-3 py-2 text-sm text-zinc-100 transition hover:bg-[#1C2340]"
    >
      {label}
    </Link>
  );
}

function HeaderActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-xl border border-[#2A3566] bg-[#1A2346] px-3 py-2 text-sm text-zinc-100 transition hover:bg-[#1C2340]"
    >
      {label}
    </button>
  );
}

export default function UserMenu({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right md:block">
        <div className="text-sm leading-tight text-zinc-200">{email}</div>
        <div className="text-xs text-zinc-500">{role}</div>
      </div>

      <HeaderActionLink href="/app/subscribe" label="Subscription" />

      <HeaderActionButton
        label="Sign Out"
        onClick={() => signOut({ callbackUrl: "/login" })}
      />
    </div>
  );
}