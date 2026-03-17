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

function ageInDays(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function ageBadgeClass(days: number) {
  if (days >= 14) {
    return "inline-flex rounded-full border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-[10px] text-red-200";
  }
  if (days >= 7) {
    return "inline-flex rounded-full border border-[#2A3566] bg-[#1A2346] px-2 py-0.5 text-[10px] text-zinc-100";
  }
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
  href?: string;
}) {
  const className = [
    "flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition",
    done
      ? "border-[#23382F] bg-[#101A14]"
      : "border-[#232838] bg-[#161C2F] hover:bg-[#1C2340]",
  ].join(" ");

  const content = (
    <>
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

      <div className="mt-0.5 shrink-0 text-xs text-zinc-400">{done ? "Done" : "Go"}</div>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[#232838] bg-[#161C2F] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export default function AppHome() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [inviteHealth, setInviteHealth] = useState<InviteHealth | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

      const [oJson, sJson, hJson] = await Promise.all([
        oRes.json(),
        sRes.json(),
        hRes.json(),
      ]);

      if (!oRes.ok) throw new Error(oJson?.error ?? "Failed to load dashboard overview.");
      if (!sRes.ok) {
        throw new Error(sJson?.error ?? "Failed to load onboarding status.");
      }
      if (!hRes.ok) {
        throw new Error(hJson?.error ?? "Failed to load invite activity.");
      }

      setOverview(oJson);
      setOnboarding(sJson.data);
      setInviteHealth(hJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading the dashboard.");
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

  const canInviteTenant = useMemo(() => {
    if (!onboarding) return false;
    return onboarding.hasProperty && onboarding.hasUnit;
  }, [onboarding]);

  const inviteSectionLabel = onboarding?.hasTenant ? "Tenant Invites" : "First Tenant";
  const inviteSectionTitle = onboarding?.hasTenant
    ? "Invite a Tenant"
    : "Invite Your First Tenant";

  const inviteButtonLabel = onboarding?.hasTenant
    ? "Generate Invite Link"
    : "Send First Invite";

  const inviteSectionDescription = useMemo(() => {
    if (!onboarding) return "Generate a secure invite link to onboard a tenant.";

    if (!canInviteTenant) {
      return "Create at least one property and one unit before inviting a tenant.";
    }

    if (!onboarding.hasTenant) {
      return "Send your first secure invite link to onboard a tenant.";
    }

    return "Generate and manage secure invite links for tenants.";
  }, [onboarding, canInviteTenant]);

  async function sendInvite(payload?: { email: string; name: string | null }) {
    if (!canInviteTenant) {
      setInviteError("Create a property and unit before inviting a tenant.");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    setCopied(false);

    try {
      const emailToUse = (payload?.email ?? inviteEmail).trim();
      const nameToUse = payload?.name ?? (inviteName ? inviteName.trim() : null);

      if (!emailToUse) {
        throw new Error("Tenant email is required.");
      }

      const res = await fetch("/api/onboarding/invite-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          name: nameToUse,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create invite.");
      }

      setInviteLink(json.data.link);
      setInviteExpiresAt(json.data.expiresAt);
      setLastInvitedEmail(emailToUse);
      setLastInvitedName(nameToUse);

      setInviteEmail("");
      setInviteName("");

      await loadAll();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Unable to create invite.");
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
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  }

  async function regenerateLink(emailOverride?: string, nameOverride?: string | null) {
    const emailToUse = (emailOverride ?? lastInvitedEmail ?? inviteEmail).trim();
    const nameToUse =
      nameOverride ?? lastInvitedName ?? (inviteName ? inviteName.trim() : null);

    if (!emailToUse) {
      setInviteError("Enter an email first, or generate an invite before using regenerate.");
      return;
    }

    await sendInvite({ email: emailToUse, name: nameToUse });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mission Control</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Your operational snapshot for leasing, tenants, and service activity.
          </p>
        </div>

        <Button variant="secondary" onClick={loadAll} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {onboarding && !onboardingComplete ? (
        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Get Started
              </div>
              <div className="mt-1 text-sm text-zinc-200">
                Complete the core setup steps to begin leasing and tenant operations.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <SummaryStat label="Properties" value={onboarding.counts.propertiesCount} />
              <SummaryStat label="Units" value={onboarding.counts.unitsCount} />
              <SummaryStat label="Tenants" value={onboarding.counts.tenantsCount} />
              <SummaryStat label="Active Leases" value={onboarding.counts.activeLeaseCount} />
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <StepRow
              done={onboarding.hasProperty}
              label="Create Your First Property"
              hint="Set up a property, site, yard, building, or other rentable location."
              href="/app/lease"
            />
            <StepRow
              done={onboarding.hasUnit}
              label="Add Your First Unit"
              hint="Create the individual rentable space, home, bay, box, pad, or slip."
              href="/app/lease"
            />
            <StepRow
              done={onboarding.hasTenant}
              label="Invite Your First Tenant"
              hint="Use the invite section below to send a secure tenant onboarding link."
            />
            <StepRow
              done={onboarding.hasActiveLease}
              label="Create Your First Lease"
              hint="Assign a tenant to a vacant unit and set the lease terms."
              href="/app/leasing"
            />
          </div>
        </section>
      ) : null}

      <section
        className={[
          "rounded-2xl border border-[#232838] bg-[#121726] p-5",
          !onboarding?.hasTenant ? "ring-1 ring-[#2A3566]" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              {inviteSectionLabel}
            </div>
            <div className="mt-1 text-lg font-medium text-zinc-100">{inviteSectionTitle}</div>
            <div className="mt-1 text-sm text-zinc-400">{inviteSectionDescription}</div>
          </div>

          {inviteHealth ? (
            <div className="grid grid-cols-2 gap-3 lg:min-w-[240px]">
              <SummaryStat label="Pending" value={inviteHealth.pendingCount} />
              <SummaryStat label="Expiring ≤2d" value={inviteHealth.expiringSoonCount} />
            </div>
          ) : null}
        </div>

        {inviteError ? (
          <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {inviteError}
          </div>
        ) : null}

        {!canInviteTenant ? (
          <div className="mt-4 rounded-xl border border-[#232838] bg-[#161C2F] p-4">
            <div className="text-sm text-zinc-200">
              Before you can invite a tenant, create at least one property and one unit.
            </div>
            <div className="mt-3">
              <Link href="/app/lease">
                <Button variant="secondary">Go to Property &amp; Unit Setup</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="text-xs text-zinc-500">Tenant Email</div>
                <div className="mt-1">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="tenant@email.com"
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="text-xs text-zinc-500">Tenant Name (Optional)</div>
                <div className="mt-1">
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Jane Doe"
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="flex items-end gap-2 lg:col-span-1">
                <Button
                  variant="primary"
                  onClick={() => sendInvite()}
                  disabled={inviteLoading || inviteEmail.trim().length < 5}
                >
                  {inviteLoading ? "Creating Link…" : inviteButtonLabel}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => regenerateLink()}
                  disabled={inviteLoading}
                  title="Generate a fresh invite for the most recent tenant email"
                >
                  Regenerate
                </Button>
              </div>
            </div>

            {inviteLink ? (
              <div className="mt-4 rounded-xl border border-[#232838] bg-[#161C2F] p-4">
                <div className="text-xs text-zinc-500">Latest Invite Link</div>
                <div className="mt-2 break-all text-sm text-zinc-200">{inviteLink}</div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-zinc-500">
                    Expires{" "}
                    {inviteExpiresAt ? new Date(inviteExpiresAt).toLocaleDateString() : "—"}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => window.open(inviteLink, "_blank", "noopener,noreferrer")}
                    >
                      Open
                    </Button>
                    <Button variant="secondary" onClick={() => copyLink()}>
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {inviteHealth && inviteHealth.topExpiring.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[#232838] bg-[#161C2F] p-4">
                <div className="text-xs text-zinc-500">Top Expiring Invites</div>

                <div className="mt-3 space-y-3">
                  {inviteHealth.topExpiring.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-xl border border-[#232838] bg-[#121726] p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-zinc-200">
                            {invite.name ? `${invite.name} — ${invite.email}` : invite.email}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              window.open(invite.link, "_blank", "noopener,noreferrer")
                            }
                          >
                            Open
                          </Button>
                          <Button variant="secondary" onClick={() => copyLink(invite.link)}>
                            Copy
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => regenerateLink(invite.email, invite.name)}
                            title="Generate a fresh invite for this tenant"
                          >
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 text-xs text-zinc-500">
              Invite links let tenants create access securely before a lease becomes active.
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Attention Required
            </div>

            {overview?.attention.repeatTenantFlag ? (
              <div className="mt-1 text-xs text-zinc-500">
                Multiple requests were submitted by the same tenant this week.
              </div>
            ) : null}

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
              No active maintenance items right now.
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
                      "cursor-pointer hover:bg-[#1C2340]",
                    ].join(" ")}
                    title="Open in Service"
                  >
                    <div className="col-span-6 truncate text-zinc-100">{r.title}</div>
                    <div className="col-span-2">{chip(String(r.priority ?? "—"))}</div>
                    <div className="col-span-2">{chip(String(r.status ?? "—"))}</div>
                    <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-300">
                      {new Date(r.createdAt).toLocaleDateString()}
                      {showAge ? <span className={cls}>{days}d</span> : null}
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