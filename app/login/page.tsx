"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

function SentryCorMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 4 L54 14 V34 C54 46 45 56 32 60 C19 56 10 46 10 34 V14 L32 4Z"
        stroke="rgba(255,255,255,0.28)"
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("owner@keystor.com");
  const [password, setPassword] = useState("test123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res) {
        setError("Login failed (no response).");
        setLoading(false);
        return;
      }

      if (res.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      const sessRes = await fetch("/api/auth/session");
      const sess = await sessRes.json();
      const role = sess?.user?.role;

      if (role === "TENANT") router.push("/tenant");
      else router.push("/app");
    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F1115] text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* LEFT: brand/marketing panel */}
        <section className="relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#232838]">
          {/* Background glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 520px at 20% 10%, rgba(91,110,225,0.22), transparent 60%), radial-gradient(700px 480px at 80% 30%, rgba(91,110,225,0.10), transparent 60%)",
            }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative p-8 lg:p-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <SentryCorMark />
                <div>
                  <div className="text-xl font-semibold tracking-wide">SentryCor</div>
                  <div className="text-sm text-zinc-300 mt-1">
                    Calm. Control. Confidence.
                  </div>
                </div>
              </div>
              <div className="mt-4 sentrycor-gradient-line" />

              <h1 className="mt-10 text-4xl font-semibold leading-tight">
                Take control of your rental assets.
              </h1>

              <p className="mt-4 text-sm text-zinc-300 max-w-md">
                SentryCor is the platform. KeyStor is the product suite for assets, service workflows, and financial visibility, with leasing built to scale.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[#2A3566] bg-[#1A2346] px-3 py-1 text-zinc-100">
                  KeyStor Assets
                </span>
                <span className="rounded-full border border-[#232838] bg-[#141821] px-3 py-1 text-zinc-200">
                  KeyStor Lease
                </span>
                <span className="rounded-full border border-[#232838] bg-[#141821] px-3 py-1 text-zinc-200">
                  KeyStor Service
                </span>
                <span className="rounded-full border border-[#232838] bg-[#141821] px-3 py-1 text-zinc-200">
                  KeyStor Ledger
                </span>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-zinc-200 max-w-md">
                <div className="rounded-xl border border-[#232838] bg-[#141821]/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Designed for operators</div>
                  <div className="mt-1">
                    Just the tools you want. Nothing you don't. Choose only the modules you need. Scale when you’re ready.
                  </div>
                </div>
                <div className="rounded-xl border border-[#232838] bg-[#141821]/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Lifecycle asset control</div>
                  <div className="mt-1">
                    Clarity, control, and confidence in your asset operations at your fingertips.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-zinc-500">
              © {new Date().getFullYear()} SentryCor • Powered by Senthel Systems
            </div>
          </div>
        </section>

        {/* RIGHT: login form panel */}
        <section className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-2xl border border-[#232838] bg-[#141821] p-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Sign in
            </div>
            <div className="mt-2 text-2xl font-semibold">Welcome back</div>
            <div className="mt-1 text-sm text-zinc-400">
              Access your dashboard securely.
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <div className="text-xs text-zinc-500">Email</div>
                <div className="mt-1">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Password</div>
                <div className="mt-1">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <div className="text-xs text-zinc-500">
                By signing in, you agree to operate under your organization’s policies.
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
