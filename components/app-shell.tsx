"use client";

import { signOut } from "next-auth/react";
import NavLink from "@/components/nav-link";
import SupportButton from "@/components/support-button";

function KeyStorMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="ks-shell-metal-a"
          x1="12"
          y1="10"
          x2="54"
          y2="54"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E5E7EB" />
          <stop offset="0.45" stopColor="#B8BEC8" />
          <stop offset="1" stopColor="#7C8492" />
        </linearGradient>
        <linearGradient
          id="ks-shell-metal-b"
          x1="18"
          y1="14"
          x2="52"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#AAB2BF" />
          <stop offset="1" stopColor="#626A78" />
        </linearGradient>
      </defs>

      <path
        d="M20 14H31V20H26V24H31V31L24 38V50L16 44V14H20Z"
        fill="url(#ks-shell-metal-a)"
      />

      <path
        d="M35 29L50 14H58L43 29L58 50H49L36 32V50H28V14H36V26L35 29Z"
        fill="url(#ks-shell-metal-b)"
      />

      <path
        d="M20 14H31V20H26V24H31V31L24 38V50"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 29L50 14H58L43 29L58 50H49L36 32V50"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; role: string };
}) {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-[#232838] bg-[#0B0E14]/92 backdrop-blur-xl">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0F1626]/70 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
              <KeyStorMark size={26} />
              <div>
                <div className="text-sm font-semibold tracking-[0.03em] text-zinc-100">
                  KeyStor
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Property Management
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                Built for independent landlords
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm leading-tight text-zinc-200">{user.email}</div>
              <div className="text-xs text-zinc-500">{user.role}</div>
            </div>

            <SupportButton />

            <HeaderActionButton
              label="Sign Out"
              onClick={() => signOut({ callbackUrl: "/login" })}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[270px_1fr]">
        <aside className="h-fit rounded-3xl border border-[#232838] bg-[#121726] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Workspace
          </div>

          <nav className="space-y-1">
            <NavLink href="/app" label="Overview" />
            <NavLink href="/app/lease" label="KeyStor Assets" />
            <NavLink href="/app/leasing" label="KeyStor Lease" />
            <NavLink href="/app/service" label="KeyStor Service" />
            <NavLink href="/app/ledger" label="KeyStor Ledger" />
          </nav>

          <div className="mt-4 border-t border-[#232838] px-3 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Built for owners
            </div>
            <div className="mt-2 text-xs leading-6 text-zinc-400">
              Manage properties, tenants, leases, and operations in one place.
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <main className="rounded-3xl border border-[#232838] bg-[#121726] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
            {children}
          </main>

          <footer className="rounded-3xl border border-[#232838] bg-[#101523] px-6 py-4 text-sm text-zinc-400">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-medium text-zinc-200">KeyStor</span>{" "}
                <span className="text-zinc-500">by Senthel Systems</span>
              </div>
              <div className="text-xs text-zinc-500">
                Built for landlords managing small and growing portfolios.
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}