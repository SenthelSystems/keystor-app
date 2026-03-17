"use client";

import Link from "next/link";
import Button from "@/components/ui/button";

type PlanKey = "starter" | "growth" | "pro";

type Plan = {
  key: PlanKey;
  name: string;
  price: string;
  foundingPrice: string;
  units: string;
  description: string;
  features: string[];
  featured?: boolean;
};

const plans: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    price: "$9",
    foundingPrice: "$4.50",
    units: "Up to 5 units",
    description:
      "A simple starting point for independent landlords with a small portfolio.",
    features: [
      "Properties and units",
      "Tenant records",
      "Lease management",
      "Owner dashboard",
      "14-day free trial",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: "$19",
    foundingPrice: "$9.50",
    units: "Up to 25 units",
    description:
      "Built for growing landlords who want better visibility across their portfolio without enterprise complexity.",
    features: [
      "Everything in Starter",
      "Better portfolio visibility",
      "Faster rental operations",
      "Priority founding feedback channel",
      "14-day free trial",
    ],
    featured: true,
  },
  {
    key: "pro",
    name: "Professional",
    price: "$39",
    foundingPrice: "$19.50",
    units: "Up to 75 units",
    description:
      "For larger self-managed portfolios that still want simplicity over bloated property software.",
    features: [
      "Everything in Growth",
      "Best fit for larger portfolios",
      "Priority support",
      "Early access to advanced features",
      "14-day free trial",
    ],
  },
];

function signupHref(plan: PlanKey) {
  return `/signup?plan=${plan}&founding=true`;
}

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-[#0B0E14] text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <section className="rounded-3xl border border-[#232838] bg-[linear-gradient(180deg,#171F3A,#121726)] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] lg:p-8">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Founding Landlord Program
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
              Start your 14-day free trial
            </h1>

            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Choose the plan that fits your portfolio. All plans begin with a
              14-day free trial. You’ll create your KeyStor account first, then
              enter billing details securely through Stripe.
            </p>

            <div className="mt-5 inline-flex rounded-full border border-[#2A3566] bg-[#1A2346] px-4 py-2 text-sm text-zinc-100">
              First 25 landlords receive 50% off for life.
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={[
                "relative rounded-3xl border p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)]",
                plan.featured
                  ? "border-[#2A3566] bg-[linear-gradient(180deg,#1A2346,#121726)]"
                  : "border-[#232838] bg-[#121726]",
              ].join(" ")}
            >
              {plan.featured && (
                <div className="absolute right-5 top-5 rounded-full border border-[#5B6EE1]/40 bg-[#1A2346] px-3 py-1 text-xs text-zinc-100">
                  Most Popular
                </div>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {plan.name}
                </div>
                <div className="mt-2 text-sm text-zinc-300">{plan.units}</div>
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-semibold tracking-tight text-zinc-100">
                    {plan.foundingPrice}
                  </div>
                  <div className="pb-1 text-sm text-zinc-400 line-through">
                    {plan.price}/mo
                  </div>
                </div>

                <div className="mt-2 text-sm text-zinc-400">
                  Founding price for the first 25 landlords
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-zinc-300">
                {plan.description}
              </p>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 text-sm text-zinc-200"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-[#7E8CEB]" />
                    <div>{feature}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link href={signupHref(plan.key)}>
                  <Button variant={plan.featured ? "primary" : "secondary"}>
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-[#232838] bg-[#101523] px-6 py-5">
          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:justify-center md:gap-6">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Secure checkout powered by Stripe
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-[#5B6EE1]" />
              14-day free trial — no charge until trial ends
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              Cancel anytime from your billing portal
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#232838] bg-[#101523] px-6 py-5">
          <div className="text-sm font-medium text-zinc-200">What happens next?</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#232838] bg-[#121726] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                1
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                Choose your plan and create your KeyStor owner account.
              </div>
            </div>

            <div className="rounded-2xl border border-[#232838] bg-[#121726] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                2
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                Enter billing details securely through Stripe and start your trial.
              </div>
            </div>

            <div className="rounded-2xl border border-[#232838] bg-[#121726] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                3
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                Return to KeyStor and begin setting up properties, tenants, and leases.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}