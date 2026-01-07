"use client";

import { signOut } from "next-auth/react";
import Button from "@/components/ui/button";

function SentryCorMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 4 L54 14 V34 C54 46 45 56 32 60 C19 56 10 46 10 34 V14 L32 4Z"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
      />
      <path
        d="M42 18H26c-4 0-7 3-7 7 0 3 2 6 5 7l16 5c3 1 5 4 5 7 0 4-3 7-7 7H22"
        stroke="rgba(91,110,225,0.95)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TenantHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#232838] bg-[#0B0E14]/92 backdrop-blur">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#5B6EE1]/70 to-transparent" />

      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#232838] bg-[#121726] px-3 py-2">
            <SentryCorMark size={24} />
            <div className="text-sm font-semibold tracking-wide text-zinc-100">SentryCor</div>
          </div>

          <div className="hidden md:block">
            <div className="text-xs tracking-wide text-zinc-300">
              Calm. Control. Confidence.
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
