"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

type LeaseRow = {
  id: string;
  status: "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string | null;
  rentCents: number;
  unit: { id: string; label: string; category: string };
  tenant: { id: string; email: string; name: string | null };
};

type UnitOption = {
  id: string;
  label: string;
  category: string;
  baseRentCents: number;
};

type TenantOption = {
  id: string;
  email: string;
  name: string | null;
};

const TENANT_CREATE_ENDPOINT = "/api/tenants";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents || 0) / 100
  );
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LeasingPage() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openAddTenant, setOpenAddTenant] = useState(false);

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);

  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [rentDollars, setRentDollars] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);

  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantModalError, setTenantModalError] = useState<string | null>(null);

  async function loadLeases() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leasing/leases");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load leases");
      setLeases(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadCreateOptions() {
    setError(null);
    try {
      const optRes = await fetch("/api/leasing/options");
      const optJson = await optRes.json();
      if (!optRes.ok) throw new Error(optJson?.error ?? "Failed to load leasing options");
      setUnits(optJson.units ?? []);
      setTenants(optJson.tenants ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load lease options");
    }
  }

  useEffect(() => {
    loadLeases();
  }, []);

  useEffect(() => {
    if (!openCreate) return;

    setUnitId("");
    setTenantId("");
    setStartDate(toDateInputValue(new Date()));
    setRentDollars("");
    setSuccess(null);

    loadCreateOptions();
  }, [openCreate]);

  useEffect(() => {
    if (!openCreate) return;
    if (!unitId) return;
    const u = units.find((x) => x.id === unitId);
    if (!u) return;
    if (!rentDollars) setRentDollars(String(Math.round((u.baseRentCents || 0) / 100)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, openCreate, units]);

  const activeLeases = useMemo(() => leases.filter((l) => l.status === "ACTIVE"), [leases]);
  const endedLeases = useMemo(() => leases.filter((l) => l.status === "ENDED"), [leases]);

  async function createLease() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!unitId) throw new Error("Select a vacant unit.");
      if (!tenantId) throw new Error("Select a tenant.");
      if (!startDate) throw new Error("Start date is required.");
      const rentNum = Number(rentDollars);
      if (!Number.isFinite(rentNum) || rentNum < 0) throw new Error("Invalid rent.");

      const res = await fetch("/api/leasing/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, tenantId, startDate, rentDollars: rentNum }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create lease");

      setOpenCreate(false);
      await loadLeases();
      setSuccess("Lease created. Unit is now occupied.");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function endLease(leaseId: string) {
    setError(null);
    setSuccess(null);

    try {
      const ok = confirm("End this lease now? The unit will return to VACANT.");
      if (!ok) return;

      const res = await fetch(`/api/leasing/leases/${leaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "END", endDate: toDateInputValue(new Date()) }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to end lease");

      await loadLeases();
      setSuccess("Lease ended. Unit returned to vacant.");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    }
  }

  function openTenantModal() {
    setTenantName("");
    setTenantEmail("");
    setTenantModalError(null);
    setOpenAddTenant(true);
  }

  async function createTenant() {
    setSavingTenant(true);
    setTenantModalError(null);
    setError(null);

    try {
      const name = tenantName.trim();
      const email = tenantEmail.trim().toLowerCase();

      if (!name) throw new Error("Tenant name is required.");
      if (!email) throw new Error("Tenant email is required.");

      const res = await fetch(TENANT_CREATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create tenant.");

      const createdTenant: TenantOption | undefined = json?.data;
      if (!createdTenant?.id) {
        throw new Error("Tenant created, but response did not include a tenant id.");
      }

      await loadCreateOptions();
      setTenantId(createdTenant.id);
      setOpenAddTenant(false);
      setSuccess("Tenant added and selected for lease.");
    } catch (e: any) {
      setTenantModalError(e?.message ?? "Failed to create tenant.");
    } finally {
      setSavingTenant(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KeyStor Lease</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Assign tenants to vacant units and manage active leases.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadLeases} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button variant="secondary" onClick={openTenantModal}>
            + Add Tenant
          </Button>
          <Button variant="primary" onClick={() => setOpenCreate(true)}>
            + Create Lease
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#2A3566] bg-[#1A2346] px-4 py-3 text-sm text-zinc-100">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            Active Leases
          </div>
          <div className="text-xs text-zinc-500">{activeLeases.length} active</div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-3">Unit</div>
            <div className="col-span-4">Tenant</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-2 text-right">Rent</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : activeLeases.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">
              No active leases. Create one to assign a tenant to a unit.
            </div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {activeLeases.map((l, idx) => (
                <div
                  key={l.id}
                  className={[
                    "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    "hover:bg-[#1C2340]",
                  ].join(" ")}
                >
                  <div className="col-span-3 text-zinc-100">
                    <div className="font-medium">{l.unit.label}</div>
                    <div className="text-xs text-zinc-400">{l.unit.category}</div>
                  </div>

                  <div className="col-span-4 text-zinc-200 truncate">
                    {l.tenant.name ? `${l.tenant.name} — ${l.tenant.email}` : l.tenant.email}
                  </div>

                  <div className="col-span-2 text-zinc-300">
                    {new Date(l.startDate).toLocaleDateString()}
                  </div>

                  <div className="col-span-2 text-right text-zinc-200">
                    {money(l.rentCents)}
                  </div>

                  <div className="col-span-1 text-right">
                    <button className="text-xs text-red-200 hover:underline" onClick={() => endLease(l.id)}>
                      End
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            Ended Leases
          </div>
          <div className="text-xs text-zinc-500">{endedLeases.length} ended</div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-3">Unit</div>
            <div className="col-span-4">Tenant</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-2">End</div>
            <div className="col-span-1 text-right">Rent</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : endedLeases.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">No ended leases yet.</div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {endedLeases.map((l, idx) => (
                <div
                  key={l.id}
                  className={[
                    "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    "hover:bg-[#1C2340]",
                  ].join(" ")}
                >
                  <div className="col-span-3 text-zinc-100">
                    <div className="font-medium">{l.unit.label}</div>
                    <div className="text-xs text-zinc-400">{l.unit.category}</div>
                  </div>

                  <div className="col-span-4 text-zinc-200 truncate">
                    {l.tenant.name ? `${l.tenant.name} — ${l.tenant.email}` : l.tenant.email}
                  </div>

                  <div className="col-span-2 text-zinc-300">
                    {new Date(l.startDate).toLocaleDateString()}
                  </div>

                  <div className="col-span-2 text-zinc-300">
                    {l.endDate ? new Date(l.endDate).toLocaleDateString() : "—"}
                  </div>

                  <div className="col-span-1 text-right text-zinc-200">
                    {money(l.rentCents)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {openCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setOpenCreate(false)} />

          <div className="absolute inset-x-0 top-6 mx-auto w-[92vw] max-w-2xl">
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#232838] bg-[#0B0E14] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Create Lease</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-100">Assign Tenant to Unit</div>
                  <div className="mt-1 text-sm text-zinc-300">Only vacant units can be leased.</div>
                </div>

                <Button variant="secondary" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Close
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-zinc-500">Vacant Unit</div>
                  <select
                    className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select a unit…</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label} ({u.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zinc-500">Tenant</div>
                    <button
                      type="button"
                      className="text-xs text-[#9FB0FF] hover:underline"
                      onClick={openTenantModal}
                      disabled={saving}
                    >
                      + Add Tenant
                    </button>
                  </div>
                  <select
                    className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select a tenant…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name ? `${t.name} — ${t.email}` : t.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-zinc-500">Start Date</div>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={saving} />
                </div>

                <div>
                  <div className="text-xs text-zinc-500">Rent (monthly, $)</div>
                  <Input type="number" value={rentDollars} onChange={(e) => setRentDollars(e.target.value)} disabled={saving} />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={createLease} disabled={saving}>
                  {saving ? "Creating…" : "Create Lease"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openAddTenant && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !savingTenant && setOpenAddTenant(false)}
          />

          <div className="absolute inset-x-0 top-12 mx-auto w-[92vw] max-w-xl">
            <div className="rounded-2xl border border-[#232838] bg-[#0B0E14] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500">Add Tenant</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-100">Create Tenant Record</div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Add the tenant once, then select them in the lease flow.
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setOpenAddTenant(false)}
                  disabled={savingTenant}
                >
                  Close
                </Button>
              </div>

              {tenantModalError && (
                <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {tenantModalError}
                </div>
              )}

              <div className="mt-6 grid gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Tenant Name</div>
                  <Input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    disabled={savingTenant}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-500">Tenant Email</div>
                  <Input
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    disabled={savingTenant}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setOpenAddTenant(false)}
                  disabled={savingTenant}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={createTenant} disabled={savingTenant}>
                  {savingTenant ? "Saving…" : "Save Tenant"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}