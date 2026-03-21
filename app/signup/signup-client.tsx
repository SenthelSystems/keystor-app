"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

type PlanKey = "starter" | "growth" | "pro";

function KeyStorMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ks-signup-a" x1="12" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E5E7EB" />
          <stop offset="0.45" stopColor="#B8BEC8" />
          <stop offset="1" stopColor="#7C8492" />
        </linearGradient>
        <linearGradient id="ks-signup-b" x1="18" y1="14" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AAB2BF" />
          <stop offset="1" stopColor="#626A78" />
        </linearGradient>
      </defs>

      <path
        d="M20 14H31V20H26V24H31V31L24 38V50L16 44V14H20Z"
        fill="url(#ks-signup-a)"
      />
      <path
        d="M35 29L50 14H58L43 29L58 50H49L36 32V50H28V14H36V26L35 29Z"
        fill="url(#ks-signup-b)"
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

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 12C4.8 8.5 8 6 12 6C16 6 19.2 8.5 21 12C19.2 15.5 16 18 12 18C8 18 4.8 15.5 3 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.7 6.3C11.12 6.1 11.55 6 12 6C16 6 19.2 8.5 21 12C20.27 13.42 19.34 14.66 18.24 15.64"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.03 9.88C5 10.88 4.14 12.08 3.5 13.4C5.3 16.5 8.3 18.5 12 18.5C13.21 18.5 14.36 18.29 15.43 17.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.88 9.88C9.36 10.39 9.04 11.1 9.04 11.88C9.04 13.43 10.29 14.68 11.84 14.68C12.62 14.68 13.33 14.36 13.84 13.84"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function nicePlanName(plan: PlanKey) {
  if (plan === "starter") return "Starter";
  if (plan === "growth") return "Growth";
  return "Professional";
}

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = (searchParams.get("plan") || "growth") as PlanKey;
  const founding = searchParams.get("founding") === "true";

  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = useMemo(() => new Date().getFullYear(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          organizationName,
          email,
          password,
        }),
      });

      const signupJson = await signupRes.json();

      if (!signupRes.ok) {
        throw new Error(signupJson?.error ?? "Unable to create account.");
      }

      const login = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!login || login.error) {
        throw new Error(
          "Account created, but automatic sign-in failed. Please sign in manually."
        );
      }

      const nextUrl = `/app/subscribe?startCheckout=true&plan=${encodeURIComponent(
        plan
      )}&founding=${founding ? "true" : "false"}`;

      router.push(nextUrl);
    } catch (err: any) {
      setError(err?.message ?? "Unable to start trial.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0E14] text-zinc-100">
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 520px at 18% 12%, rgba(91,110,225,0.18), transparent 60%), radial-gradient(720px 480px at 78% 22%, rgba(91,110,225,0.10), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          }}
        />

        <section className="relative overflow-hidden border-b border-[#232838] lg:border-b-0 lg:border-r">
          <div className="relative flex h-full flex-col justify-between p-8 lg:p-12">
            <div>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-white/8 bg-[#0F1626]/70 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <KeyStorMark />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-[0.02em]">KeyStor</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Start your owner account
                  </div>
                </div>
              </div>

              <div className="mt-6 h-px w-32 bg-gradient-to-r from-[#8B93A3] via-[#D0D5DD] to-transparent opacity-70" />

              <h1 className="mt-10 max-w-xl text-2xl font-semibold leading-tight tracking-tight text-zinc-100 lg:text-3xl">
                Create your account and start your trial.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
                You’re signing up for the{" "}
                <span className="font-medium text-zinc-100">{nicePlanName(plan)}</span> plan.
                After your account is created, we’ll take you straight into setup and billing.
              </p>

              <div className="mt-8 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[#2A3566] bg-[#1A2346] px-3 py-1.5 text-zinc-100">
                  14-day free trial
                </span>
                {founding && (
                  <span className="rounded-full border border-[#2A3566] bg-[#1A2346] px-3 py-1.5 text-zinc-100">
                    Founding pricing selected
                  </span>
                )}
                <span className="rounded-full border border-[#232838] bg-[#121726] px-3 py-1.5 text-zinc-200">
                  Secure checkout powered by Stripe
                </span>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <div>© {year} KeyStor</div>
              <div>Built by Senthel Systems</div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">
            <div className="rounded-[28px] border border-[#232838] bg-[linear-gradient(180deg,rgba(20,24,33,0.96),rgba(14,17,24,0.96))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-8">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                New Owner Signup
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                Create your KeyStor account
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Once your account is created, we’ll sign you in and continue to billing automatically.
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-4">
                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Your Name
                  </div>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Owner"
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Organization Name
                  </div>
                  <Input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Oak Street Rentals"
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Email
                  </div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                      Password
                    </div>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 transition hover:text-zinc-300"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loading}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                      onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                      placeholder="At least 8 characters"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500">
                      <EyeIcon open={showPassword} />
                    </div>
                  </div>

                  {capsLockOn && (
                    <div className="mt-2 text-xs text-amber-300">
                      Caps Lock appears to be on.
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Creating account…" : "Continue to Billing"}
                </Button>

                <div className="rounded-2xl border border-[#232838] bg-[#101523] px-4 py-3 text-xs leading-6 text-zinc-500">
                  By continuing, you’ll create your owner account first, then securely complete checkout through Stripe.
                </div>
              </form>

              <div className="mt-6 border-t border-[#232838] pt-6">
                <div className="text-sm text-zinc-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-zinc-200 underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </div>

                <div className="mt-3 text-sm text-zinc-400">
                  Want to compare plans again?{" "}
                  <Link href="/subscribe" className="text-zinc-200 underline-offset-4 hover:underline">
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}