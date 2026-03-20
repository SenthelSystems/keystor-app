import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Settings
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Support</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Get help with KeyStor, report issues, or contact support.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#232838] bg-[#0F1626] p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            Contact Support
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Use the support tools already available in KeyStor to report bugs,
            request help, or submit account questions.
          </p>

          <div className="mt-5">
            <Link
              href="/app/settings/billing"
              className="inline-flex items-center rounded-xl border border-[#232838] bg-[#121726] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-[#161D30]"
            >
              Go to Billing
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#232838] bg-[#0F1626] p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            Billing Help
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            For subscription changes, payment methods, invoices, or cancellation,
            use the Billing page.
          </p>
        </div>
      </div>
    </div>
  );
}