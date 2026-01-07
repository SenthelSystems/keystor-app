"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { signIn } from "next-auth/react";

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

export default function AcceptInvitePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any | null>(null);

  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInvite() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/onboarding/invite/${token}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Invalid invite");
      setInvite(json.data);
    } catch (e: any) {
      setError(e?.message ?? "Invalid invite");
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isOwnerInvite = invite?.role === "OWNER";

  async function accept() {
    setSaving(true);
    setError(null);

    try {
      const payload: any = { password };

      if (isOwnerInvite) {
        payload.ownerName = ownerName;
        payload.organizationName = organizationName;
      }

      const res = await fetch(`/api/onboarding/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to accept invite");

      // auto sign-in
      const login = await signIn("credentials", {
        email: json.email,
        password,
        redirect: false,
      });

      if (!login || login.error) {
        router.push("/login");
        return;
      }

      router.push(isOwnerInvite ? "/app" : "/tenant");
    } catch (e: any) {
      setError(e?.message ?? "Failed to accept invite");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F1115] text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* LEFT: premium context panel */}
        <section className="relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#232838]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 520px at 20% 10%, rgba(91,110,225,0.22), transparent 60%), radial-gradient(700px 480px at 80% 30%, rgba(91,110,225,0.10), transparent 60%)",
            }}
          />
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
                {isOwnerInvite ? "You’ve been invited to create an organization." : "You’ve been invited to the tenant portal."}
              </h1>

              <p className="mt-4 text-sm text-zinc-300 max-w-md">
                {isOwnerInvite
                  ? "SentryCor is the platform. KeyStor is the product suite for assets, leasing, service workflows, and operational visibility—built for operators who value clarity and security."
                  : "Access your lease details and submit service requests through a secure tenant portal."}
              </p>

              <div className="mt-8 grid gap-3 text-sm text-zinc-200 max-w-md">
                <div className="rounded-xl border border-[#232838] bg-[#141821]/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    Security-first posture
                  </div>
                  <div className="mt-1">
                    Role-based access, audit trails, and tenant isolation by design.
                  </div>
                </div>
                <div className="rounded-xl border border-[#232838] bg-[#141821]/70 p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    Built to scale
                  </div>
                  <div className="mt-1">
                    Designed for real operations—calm surfaces with decisive control.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-zinc-500">
              © {new Date().getFullYear()} SentryCor • Powered by Senthel Systems
            </div>
          </div>
        </section>

        {/* RIGHT: acceptance form */}
        <section className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-2xl border border-[#232838] bg-[#141821] p-6">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Accept Invite
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-zinc-400">Loading…</div>
            ) : error ? (
              <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : (
              <>
                <div className="mt-2 text-2xl font-semibold">
                  {isOwnerInvite ? "Create your organization" : "Create your account"}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Email: <span className="text-zinc-200">{invite.email}</span>
                </div>

                <div className="mt-6 space-y-4">
                  {isOwnerInvite && (
                    <>
                      <div>
                        <div className="text-xs text-zinc-500">Your Name</div>
                        <div className="mt-1">
                          <Input
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            placeholder="Dan McKeon"
                            disabled={saving}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-zinc-500">Organization Name</div>
                        <div className="mt-1">
                          <Input
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder="Freedom Reserve Storage"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <div className="text-xs text-zinc-500">Create Password</div>
                    <div className="mt-1">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={accept}
                    disabled={
                      saving ||
                      password.length < 8 ||
                      (isOwnerInvite && (!ownerName.trim() || !organizationName.trim()))
                    }
                  >
                    {saving
                      ? "Creating…"
                      : isOwnerInvite
                      ? "Create Organization & Enter SentryCor"
                      : "Create Account & Continue"}
                  </Button>

                  <div className="text-xs text-zinc-500">
                    By continuing, you agree to operate under your organization’s policies.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
