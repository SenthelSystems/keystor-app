"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-[#1A2346] text-zinc-100 border border-[#2A3566]"
          : "text-zinc-300 hover:bg-[#12182A] hover:text-zinc-100 border border-transparent",
      ].join(" ")}
    >
      {/* accent bar */}
      <span
        className={[
          "h-4 w-1 rounded-full transition",
          active ? "bg-[#5B6EE1]" : "bg-transparent group-hover:bg-[#5B6EE1]/40",
        ].join(" ")}
      />
      <span className="flex-1">{label}</span>

      {/* subtle active dot */}
      {active && <span className="h-2 w-2 rounded-full bg-[#5B6EE1]/80" />}
    </Link>
  );
}
