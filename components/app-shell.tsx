import NavLink from "@/components/nav-link";
import UserMenu from "@/components/user-menu";
import SupportButton from "@/components/support-button";

function SentryCorMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 4 L54 14 V34 C54 46 45 56 32 60 C19 56 10 46 10 34 V14 L32 4Z"
        stroke="rgba(255,255,255,0.22)"
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

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; role: string };
}) {
  return (
    <div className="min-h-screen text-zinc-100 bg-[#0B0E14]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#232838] bg-[#0B0E14]/92 backdrop-blur">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#5B6EE1]/70 to-transparent" />

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* Brand */}
          <div className="flex items-center gap-4">
            {/* Logo plate (intentionally consistent surface) */}
            <div className="flex items-center gap-3 rounded-xl border border-[#232838] bg-[#121726] px-3 py-2">
              <SentryCorMark size={26} />
              <div className="text-sm font-semibold tracking-wide text-zinc-100">
                SentryCor
              </div>
            </div>

            <div className="hidden md:block text-xs tracking-wide text-zinc-300">
              Calm. Control. Confidence.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <SupportButton />
            <UserMenu email={user.email} role={user.role} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-[#232838] bg-[#121726] p-3">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
            Modules
          </div>

          <nav className="space-y-1">
            <NavLink href="/app" label="Overview" />
            <NavLink href="/app/lease" label="KeyStor Assets" />
            <NavLink href="/app/leasing" label="KeyStor Lease" />
            <NavLink href="/app/service" label="KeyStor Service" />
            <NavLink href="/app/ledger" label="KeyStor Ledger" />
          </nav>

          <div className="mt-4 px-3 py-3 text-xs text-zinc-500 border-t border-[#232838]">
            One platform. Total control.
          </div>
        </aside>

        {/* Main */}
        <main className="rounded-2xl border border-[#232838] bg-[#121726] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
