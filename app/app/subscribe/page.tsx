"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";

type PlanKey = "starter" | "growth" | "pro";

function nicePlanName(plan: PlanKey) {
  if (plan === "starter") return "Starter";
  if (plan === "growth") return "Growth";
  return "Professional";
}

export default function AppSubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = (searchParams.get("plan") || "growth") as PlanKey;
  const founding = searchParams.get("founding") === "true";
  const startCheckout = searchParams.get("startCheckout") === "true";

  const [loading, setLoading] = useState(startCheckout);
  const [error, setError] = useState<string | null>(null);

  const startedRef = useRef(false);

  const heading = useMemo(() => {
    return `Continue to ${nicePlanName(plan)} billing`;
  }, [plan]);

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
    if (startedRef.current) return;

    startedRef.current = true;
    void beginCheckout();
  }, [startCheckout]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Billing Setup
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">{heading}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your owner account has been created. Complete secure Stripe checkout to
          activate your trial and unlock KeyStor.
        </p>
      </div>

      <div className="rounded-2xl border border-[#232838] bg-[#0F1626] p-6">
        <div className="text-sm text-zinc-300">
          Selected plan:{" "}
          <span className="font-medium text-zinc-100">{nicePlanName(plan)}</span>
          {founding ? (
            <span className="ml-2 rounded-full border border-[#2A3566] bg-[#1A2346] px-2 py-0.5 text-[11px] text-zinc-100">
              Founding pricing
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={beginCheckout} disabled={loading}>
            {loading ? "Opening Stripe…" : "Go to Billing"}
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
  );
}