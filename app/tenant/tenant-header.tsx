"use client";

import { signOut } from "next-auth/react";
import Button from "@/components/ui/button";

function KeyStorMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="10"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <path
        d="M22 42V22h9c6 0 10 3 10 8 0 3-1.6 5.2-4.6 6.6L42 42h-7.5l-4.8-4.4H28V42h-6Zm6-10h2.8c2.8 0 4.2-1.2 4.2-3.3 0-2.2-1.4-3.3-4.2-3.3H28V32Z"
        fill="rgba(91,110,225,0.96)"
      />
    </svg>
  );
}

export default function TenantHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#232838] bg-[#0B0E14]/92 backdrop-blur">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#5B6EE1]/70 to-transparent" />

      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#232838] bg-[#121726] px-3 py-2">
            <KeyStorMark size={24} />
            <div>
              <div className="text-sm font-semibold tracking-wide text-zinc-100">KeyStor</div>
              <div className="text-[11px] text-zinc-500">Tenant Portal</div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-xs tracking-wide text-zinc-300">
              Secure access to your lease and service requests
            </div>
            <div className="text-[11px] text-zinc-500">{email}</div>
          </div>
        </div>

        <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
