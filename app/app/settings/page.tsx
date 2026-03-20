import Link from "next/link";

function SettingsCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[#232838] bg-[#0F1626] p-5 transition hover:border-[#2A3566] hover:bg-[#111A2D]"
    >
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Account
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage your account settings, billing access, and support options.
        </p>
      </div>

      <div className="grid gap-4">
        <SettingsCard
          href="/app/settings/billing"
          title="Billing"
          description="Manage your subscription, payment method, invoices, and cancellation."
        />

        <SettingsCard
          href="/app/settings/support"
          title="Support"
          description="Contact support or submit an issue if you need help with KeyStor."
        />
      </div>
    </div>
  );
}