"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";

type PlanKey = "starter" | "growth" | "pro";

function nicePlanName(plan: PlanKey) {
  if (plan === "starter") return "Starter";
  if (plan === "growth") return "Growth";
  return "Professional";
}

export default function AppSubscribePage() {
  const searchParams = useSearchParams();

  const plan = (searchParams.get("plan") || "growth") as PlanKey;
  const founding = searchParams.get("founding") === "true";
  const startCheckout = searchParams.get("startCheckout") === "true";
  const cancelled = searchParams.get("cancelled") === "true";

  const [loading, setLoading] = useState(startCheckout);
  const [error, setError] = useState<string | null>(null);

  const startedRef = useRef(false);

  const heading = useMemo(() => {
    if (cancelled) {
      return "Checkout cancelled";
    }
    return `Continue to ${nicePlanName(plan)} billing`;
  }, [cancelled, plan]);

  async function beginCheckout() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          founding,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to start billing.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Unable to start billing.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!startCheckout) return;
    if (cancelled) return;
    if (startedRef.current) return;

    startedRef.current = true;
    void beginCheckout();
  }, [startCheckout, cancelled]);

  return (
    <main className="min-h-screen bg-[#0B0E14] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
        <div className="w-full rounded-3xl border border-[#232838] bg-[#121726] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Billing Setup
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
            {heading}
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-300">
            {cancelled
              ? "Your account was created, but billing was not completed. To activate your trial and unlock KeyStor, return to secure checkout."
              : "Your owner account has been created. Complete secure Stripe checkout to activate your trial and unlock KeyStor."}
          </p>

          <div className="mt-6 rounded-2xl border border-[#232838] bg-[#101523] px-5 py-4">
            <div className="text-sm text-zinc-300">
              Selected plan:{" "}
              <span className="font-medium text-zinc-100">{nicePlanName(plan)}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#2A3566] bg-[#1A2346] px-3 py-1.5 text-zinc-100">
                14-day free trial
              </span>

              {founding ? (
                <span className="rounded-full border border-[#2A3566] bg-[#1A2346] px-3 py-1.5 text-zinc-100">
                  Founding pricing
                </span>
              ) : null}

              {cancelled ? (
                <span className="rounded-full border border-amber-700/40 bg-amber-950/30 px-3 py-1.5 text-amber-200">
                  Checkout was cancelled
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" onClick={beginCheckout} disabled={loading}>
              {loading ? "Opening Stripe…" : cancelled ? "Return to Billing" : "Go to Billing"}
            </Button>

            <Link href="/subscribe">
              <Button variant="secondary" disabled={loading}>
                Compare Plans
              </Button>
            </Link>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-[#232838] bg-[#101523] px-4 py-3 text-xs leading-6 text-zinc-500">
            Secure checkout is powered by Stripe. Your 14-day trial begins after billing
            is successfully created.
          </div>
        </div>
      </div>
    </main>
  );
}