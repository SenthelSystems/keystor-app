"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

type Overview = {
  snapshot: {
    propertiesCount: number;
    unitsTotal: number;
    vacant: number;
    occupied: number;
    baseRentMonthlyCents: number;
  };
  attention: {
    openCount: number;
    highPriorityCount: number;
    agingCount: number;
    repeatTenantFlag?: boolean;
    top: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      createdAt: string;
    }>;
  };
  activity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
};

type OnboardingStatus = {
  hasProperty: boolean;
  hasUnit: boolean;
  hasTenant: boolean;
  hasActiveLease: boolean;
  counts: {
    propertiesCount: number;
    unitsCount: number;
    tenantsCount: number;
    activeLeaseCount: number;
  };
};

type InviteHealth = {
  pendingCount: number;
  expiringSoonCount: number;
  topExpiring: Array<{
    id: string;
    email: string;
    name: string | null;
    expiresAt: string;
    link: string;
  }>;
};

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#232838] bg-[#0B0E14] px-2 py-0.5 text-xs text-zinc-200">
      {text}
    </span>
  );
}

/** Aging badge helpers (Smart Updates Session 2) */
function ageInDays(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function ageBadgeClass(days: number) {
  if (days >= 14)
    return "inline-flex rounded-full border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-[10px] text-red-200";
  if (days >= 7)
    return "inline-flex rounded-full border border-[#2A3566] bg-[#1A2346] px-2 py-0.5 text-[10px] text-zinc-100";
  return null;
}

function StepRow({
  done,
  label,
  hint,
  href,
}: {
  done: boolean;
  label: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition",
        done
          ? "border-[#23382F] bg-[#101A14]"
          : "border-[#232838] bg-[#161C2F] hover:bg-[#1C2340]",
      ].join(" ")}
    >
      <div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs",
              done
                ? "border-[#23382F] bg-[#101A14] text-zinc-200"
                : "border-[#232838] bg-[#0B0E14] text-zinc-400",
            ].join(" ")}
          >
            {done ? "✓" : "•"}
          </span>
          <div className="text-sm text-zinc-100">{label}</div>
        </div>
        <div className="mt-1 text-xs text-zinc-500">{hint}</div>
      </div>

      <div className="text-xs text-zinc-400 mt-0.5">{done ? "Done" : "Go"}</div>
    </Link>
  );
}

export default function AppHome() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [inviteHealth, setInviteHealth] = useState<InviteHealth | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite panel state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Remember last generated invite so Regenerate can work without retyping
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [lastInvitedName, setLastInvitedName] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [oRes, sRes, hRes] = await Promise.all([
        fetch("/api/overview"),
        fetch("/api/onboarding/status"),
        fetch("/api/onboarding/invite-health"),
      ]);

      const oJson = await oRes.json();
      const sJson = await sRes.json();
      const hJson = await hRes.json();

      if (!oRes.ok) throw new Error(oJson?.error ?? "Failed to load overview");
      if (!sRes.ok) throw new Error(sJson?.error ?? "Failed to load onboarding status");
      if (!hRes.ok) throw new Error(hJson?.error ?? "Failed to load invite health");

      setOverview(oJson);
      setOnboarding(sJson.data);
      setInviteHealth(hJson.data);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const onboardingComplete = useMemo(() => {
    if (!onboarding) return false;
    return (
      onboarding.hasProperty &&
      onboarding.hasUnit &&
      onboarding.hasTenant &&
      onboarding.hasActiveLease
    );
  }, [onboarding]);

  async function sendInvite(payload?: { email: string; name: string | null }) {
    setInviteLoading(true);
    setInviteError(null);
    setCopied(false);

    try {
      const emailToUse = (payload?.email ?? inviteEmail).trim();
      const nameToUse = payload?.name ?? (inviteName ? inviteName.trim() : null);

      if (!emailToUse) throw new Error("Tenant email is required.");

      const res = await fetch("/api/onboarding/invite-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          name: nameToUse,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to invite tenant");

      setInviteLink(json.data.link);
      setInviteExpiresAt(json.data.expiresAt);

      setLastInvitedEmail(emailToUse);
      setLastInvitedName(nameToUse);

      setInviteEmail("");
      setInviteName("");

      await loadAll();
    } catch (e: any) {
      setInviteError(e?.message ?? "Unknown error");
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyLink(link?: string) {
    const toCopy = link ?? inviteLink;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  async function regenerateLink(emailOverride?: string, nameOverride?: string | null) {
    const emailToUse = (emailOverride ?? lastInvitedEmail ?? inviteEmail).trim();
    const nameToUse =
      nameOverride ?? lastInvitedName ?? (inviteName ? inviteName.trim() : null);

    if (!emailToUse) {
      setInviteError("Enter an email (or generate one invite first) to regenerate.");
      return;
    }

    await sendInvite({ email: emailToUse, name: nameToUse });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mission Control</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Today’s overview: what needs attention, what’s stable, and what changed.
          </p>
        </div>

        <Button variant="secondary" onClick={loadAll} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Onboarding + Invite */}
      <div className="grid gap-4 lg:grid-cols-3">
        {onboarding && !onboardingComplete && (
          <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                  Get Started
                </div>
                <div className="mt-1 text-sm text-zinc-200">
                  Your first steps: create assets, invite a tenant, and start your first lease.
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                {`${onboarding.counts.propertiesCount} properties • ${onboarding.counts.unitsCount} units • ${onboarding.counts.tenantsCount} tenants • ${onboarding.counts.activeLeaseCount} active leases`}
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <StepRow
                done={onboarding.hasProperty}
                label="Create your first Property"
                hint="Define a rentable collection (e.g., Nature Coast Connex Boxes)."
                href="/app/lease"
              />
              <StepRow
                done={onboarding.hasUnit}
                label="Add your first Unit"
                hint="Create rentable items (20ft/40ft boxes, pads, bays, etc.)."
                href="/app/lease"
              />
              <StepRow
                done={onboarding.hasTenant}
                label="Invite your first Tenant"
                hint="Send a secure invite link to your tenant."
                href="/app"
              />
              <StepRow
                done={onboarding.hasActiveLease}
                label="Create your first Lease"
                hint="Assign a tenant to a vacant unit with terms."
                href="/app/leasing"
              />
            </div>
          </section>
        )}

        {/* Invite Tenant panel */}
        <section
          className={[
            "rounded-2xl border border-[#232838] bg-[#121726] p-4",
            onboarding && !onboardingComplete ? "" : "lg:col-span-3",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Invite a Tenant
              </div>
              <div className="mt-1 text-sm text-zinc-200">
                Generate an invite link to onboard a tenant.
              </div>
            </div>

            {inviteHealth && (
              <div className="text-xs text-zinc-500 text-right">
                Pending: <span className="text-zinc-200">{inviteHealth.pendingCount}</span>
                <br />
                Expiring ≤2d:{" "}
                <span className="text-zinc-200">{inviteHealth.expiringSoonCount}</span>
              </div>
            )}
          </div>

          {inviteError && (
            <div className="mt-3 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {inviteError}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">Tenant Email</div>
              <div className="mt-1">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="tenant@email.com"
                  disabled={inviteLoading}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">Tenant Name (optional)</div>
              <div className="mt-1">
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={inviteLoading}
                />
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button
                variant="primary"
                onClick={() => sendInvite()}
                disabled={inviteLoading || inviteEmail.trim().length < 5}
              >
                {inviteLoading ? "Creating link…" : "Generate Invite Link"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => regenerateLink()}
                disabled={inviteLoading}
                title="Regenerate the most recently created invite link"
              >
                Regenerate
              </Button>
            </div>

            {inviteLink && (
              <div className="md:col-span-2 rounded-xl border border-[#232838] bg-[#161C2F] p-3">
                <div className="text-xs text-zinc-500">Invite Link</div>
                <div className="mt-1 text-xs text-zinc-200 break-all">{inviteLink}</div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-zinc-500">
                    Expires{" "}
                    {inviteExpiresAt ? new Date(inviteExpiresAt).toLocaleDateString() : "—"}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(inviteLink, "_blank", "noopener,noreferrer")
                      }
                    >
                      Open
                    </Button>

                    <Button variant="secondary" onClick={() => copyLink()}>
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {inviteHealth && inviteHealth.topExpiring.length > 0 && (
              <div className="md:col-span-2 mt-2 rounded-xl border border-[#232838] bg-[#161C2F] p-3">
                <div className="text-xs text-zinc-500">Invite Health (Top Expiring)</div>
                <div className="mt-2 space-y-2">
                  {inviteHealth.topExpiring.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[#232838] bg-[#121726] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-200 truncate">
                          {i.name ? `${i.name} — ${i.email}` : i.email}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Expires {new Date(i.expiresAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => window.open(i.link, "_blank", "noopener,noreferrer")}
                        >
                          Open
                        </Button>
                        <Button variant="secondary" onClick={() => copyLink(i.link)}>
                          Copy
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => regenerateLink(i.email, i.name)}
                          title="Regenerate a fresh invite for this tenant"
                        >
                          Regen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2 text-xs text-zinc-500">
              v1 note: Cross-owner tenant reuse will be supported in v2.
            </div>
          </div>
        </section>
      </div>

      {/* Attention Required */}
      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Attention Required
            </div>

            {overview?.attention.repeatTenantFlag && (
              <div className="mt-1 text-xs text-zinc-500">
                Multiple requests from the same tenant this week.
              </div>
            )}

            <div className="mt-1 text-sm text-zinc-200">
              {loading
                ? "Loading…"
                : `${overview?.attention.openCount ?? 0} open • ${
                    overview?.attention.highPriorityCount ?? 0
                  } high priority • ${overview?.attention.agingCount ?? 0} aging (7+ days)`}
            </div>
          </div>

          <Link
            href="/app/service"
            className="rounded-md border border-[#2A3566] bg-[#1A2346] px-3 py-2 text-xs text-zinc-100 hover:bg-[#1C2340]"
          >
            View Service
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-6">Item</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : (overview?.attention.top?.length ?? 0) === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">
              No active maintenance items. System is stable.
            </div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {overview!.attention.top.map((r, idx) => {
                const days = ageInDays(r.createdAt);
                const cls = ageBadgeClass(days);
                const showAge =
                  (r.status === "OPEN" || r.status === "IN_PROGRESS") && cls;

                return (
                  <Link
                    key={r.id}
                    href={`/app/service?focus=${encodeURIComponent(r.id)}`}
                    className={[
                      "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                      idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                      "hover:bg-[#1C2340]",
                      "cursor-pointer",
                    ].join(" ")}
                    title="Open in Service"
                  >
                    <div className="col-span-6 text-zinc-100 truncate">{r.title}</div>
                    <div className="col-span-2">{chip(String(r.priority ?? "—"))}</div>
                    <div className="col-span-2">{chip(String(r.status ?? "—"))}</div>
                    <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-300">
                      {new Date(r.createdAt).toLocaleDateString()}
                      {showAge && <span className={cls!}>{days}d</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
