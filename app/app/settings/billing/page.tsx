"use client";

import { useState } from "react";
import Link from "next/link";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openBillingPortal() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Settings
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">Billing</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage your subscription, payment method, invoices, and cancellation.
        </p>
      </div>

      <div className="rounded-2xl border border-[#232838] bg-[#0F1626] p-6">
        <h2 className="text-base font-semibold text-zinc-100">Account Billing</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Open the secure billing portal to update your payment method, review
          invoices, or cancel service.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={loading}
            className="inline-flex items-center rounded-xl border border-[#2A3566] bg-[#1A2346] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-[#1C2340] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Opening..." : "Manage Billing"}
          </button>

          <Link
            href="/app/settings"
            className="inline-flex items-center rounded-xl border border-[#232838] bg-[#121726] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-[#161D30]"
          >
            Back to Settings
          </Link>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}