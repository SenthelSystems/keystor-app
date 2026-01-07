"use client";

import { useEffect, useMemo, useState } from "react";
import PropertyCreateModal from "@/components/modals/property-create-modal";
import UnitCreateModal from "@/components/modals/unit-create-modal";
import UnitEditModal from "@/components/modals/unit-edit-modal";
import Button from "@/components/ui/button";

type Property = {
  id: string;
  name: string;
  city: string;
  state: string;
  createdAt: string;
};

type Unit = {
  id: string;
  label: string;
  category: string;
  status: "VACANT" | "OCCUPIED";
  baseRentCents: number;
  propertyId: string;
  notes?: string | null;
};

type ActiveLease = {
  id: string;
  startDate: string;
  rentCents: number;
  tenant: { id: string; name: string | null; email: string };
} | null;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents || 0) / 100
  );
}

function statusChip(status: Unit["status"]) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "OCCUPIED") return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

export default function LeasePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const [activeLease, setActiveLease] = useState<ActiveLease>(null);

  const [showCreateProperty, setShowCreateProperty] = useState(false);
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [showEditUnit, setShowEditUnit] = useState(false);

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProperties() {
    setLoadingProps(true);
    setError(null);
    try {
      const res = await fetch("/api/properties");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load properties");

      const data: Property[] = json.data ?? [];
      setProperties(data);

      if (data.length > 0) setSelectedPropertyId((cur) => cur ?? data[0].id);
      else {
        setSelectedPropertyId(null);
        setUnits([]);
        setSelectedUnit(null);
        setActiveLease(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoadingProps(false);
    }
  }

  async function loadUnits(propertyId: string) {
    setLoadingUnits(true);
    setError(null);
    setSelectedUnit(null);
    setActiveLease(null);

    try {
      const res = await fetch(`/api/properties/${propertyId}/units`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load units");
      setUnits(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  }

  async function createUnit(payload: {
    label: string;
    category: string;
    status: "VACANT" | "OCCUPIED";
    baseRentDollars: number;
  }) {
    if (!selectedPropertyId) throw new Error("No property selected.");

    const res = await fetch(`/api/properties/${selectedPropertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to create unit");
    await loadUnits(selectedPropertyId);
  }

  async function updateUnit(
    unitId: string,
    payload: {
      label: string;
      category: string;
      status: "VACANT" | "OCCUPIED";
      baseRentDollars: number;
    }
  ) {
    const res = await fetch(`/api/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to update unit");

    if (selectedPropertyId) await loadUnits(selectedPropertyId);
    setSelectedUnit((cur) => (cur && cur.id === unitId ? json.data : cur));
  }

  async function deleteUnit(unitId: string) {
    const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Failed to delete unit");

    setShowEditUnit(false);
    setSelectedUnit(null);
    setActiveLease(null);
    if (selectedPropertyId) await loadUnits(selectedPropertyId);
  }

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPropertyId) loadUnits(selectedPropertyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId]
  );

  const counts = useMemo(() => {
    const total = units.length;
    const vacant = units.filter((u) => u.status === "VACANT").length;
    const occupied = units.filter((u) => u.status === "OCCUPIED").length;
    return { total, vacant, occupied };
  }, [units]);

  // Load active lease when unit selected
  useEffect(() => {
    if (!selectedUnit) {
      setActiveLease(null);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/leasing/unit/${selectedUnit.id}`);
        const json = await res.json();
        setActiveLease(json.data ?? null);
      } catch {
        setActiveLease(null);
      }
    })();
  }, [selectedUnit]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KeyStor Assets</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Properties and units—your operational surface for leasing.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await loadProperties();
              if (selectedPropertyId) await loadUnits(selectedPropertyId);
            }}
          >
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowCreateProperty(true)}>
            + Property
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Properties */}
        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Properties</div>
            <div className="text-xs text-zinc-500">{properties.length} total</div>
          </div>

          <div className="mt-3 space-y-2">
            {loadingProps ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : properties.length === 0 ? (
              <div className="text-sm text-zinc-300">No properties found.</div>
            ) : (
              properties.map((p) => {
                const active = p.id === selectedPropertyId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPropertyId(p.id)}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-3 transition",
                      active
                        ? "border-[#2A3566] bg-[#1A2346]"
                        : "border-[#232838] bg-[#161C2F] hover:bg-[#1C2340]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-zinc-100 truncate">{p.name}</div>
                      {active && <span className="h-2 w-2 rounded-full bg-[#5B6EE1]/80" />}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {p.city}, {p.state}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Units */}
        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Units</div>
              <div className="mt-1 text-sm text-zinc-200">
                {selectedProperty ? selectedProperty.name : "Select a property"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs items-center">
              <span className="rounded-full border border-[#232838] bg-[#0B0E14] px-3 py-1 text-zinc-200">
                Total: {counts.total}
              </span>
              <span className="rounded-full border border-[#232838] bg-[#0B0E14] px-3 py-1 text-zinc-200">
                Vacant: {counts.vacant}
              </span>
              <span className="rounded-full border border-[#232838] bg-[#0B0E14] px-3 py-1 text-zinc-200">
                Occupied: {counts.occupied}
              </span>

              <Button
                variant="primary"
                onClick={() => setShowCreateUnit(true)}
                disabled={!selectedPropertyId}
                className="!text-xs !px-3 !py-1 rounded-full"
              >
                + Unit
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
            <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
              <div className="col-span-3">Label</div>
              <div className="col-span-4">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Base Rent</div>
            </div>

            {loadingUnits ? (
              <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
            ) : !selectedPropertyId ? (
              <div className="px-3 py-4 text-sm text-zinc-300">Select a property to view units.</div>
            ) : units.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-300">No units found.</div>
            ) : (
              <div className="divide-y divide-[#232838]">
                {units.map((u, idx) => (
                  <button
                    key={u.id}
                    className={[
                      "w-full text-left grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                      idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                      "hover:bg-[#1C2340]",
                    ].join(" ")}
                    onClick={() => setSelectedUnit(u)}
                  >
                    <div className="col-span-3 text-zinc-100">{u.label}</div>
                    <div className="col-span-4 text-zinc-300">{u.category}</div>
                    <div className="col-span-2">
                      <span className={statusChip(u.status)}>{u.status}</span>
                    </div>
                    <div className="col-span-3 text-right text-zinc-200">{money(u.baseRentCents)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-zinc-500">Tip: click a unit row for details.</div>
        </section>
      </div>

      {/* Drawer */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUnit(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[#232838] bg-[#0B0E14] p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Unit</div>
                <div className="mt-1 text-xl font-semibold">{selectedUnit.label}</div>
                <div className="mt-1 text-sm text-zinc-300">{selectedProperty?.name}</div>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setShowEditUnit(true)}>
                  Edit
                </Button>

                {selectedUnit.status === "OCCUPIED" ? (
                  <Button variant="danger" disabled>
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      const ok = confirm(`Delete unit "${selectedUnit.label}"? This cannot be undone.`);
                      if (!ok) return;
                      try {
                        await deleteUnit(selectedUnit.id);
                      } catch (e: any) {
                        setError(e?.message ?? "Failed to delete unit");
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}

                <Button variant="secondary" onClick={() => setSelectedUnit(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {activeLease && (
                <div className="rounded-xl border border-[#2A3566] bg-[#1A2346]/60 p-4">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-300">Active Lease</div>
                  <div className="mt-2 text-sm text-zinc-100">
                    {activeLease.tenant.name
                      ? `${activeLease.tenant.name} (${activeLease.tenant.email})`
                      : activeLease.tenant.email}
                  </div>
                  <div className="mt-1 text-xs text-zinc-200">
                    Started {new Date(activeLease.startDate).toLocaleDateString()}
                  </div>
                  <div className="mt-1 text-xs text-zinc-200">Rent: {money(activeLease.rentCents)}</div>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={() => window.location.assign("/app/leasing")}>
                      View Lease
                    </Button>
                  </div>
                </div>
              )}

              <Card title="Category">
                <div className="text-sm text-zinc-200">{selectedUnit.category}</div>
              </Card>

              <Card title="Status">
                <span className={statusChip(selectedUnit.status)}>{selectedUnit.status}</span>
              </Card>

              <Card title="Base Rent">
                <div className="text-sm text-zinc-200">{money(selectedUnit.baseRentCents)}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Applies to future leases. Active leases are not affected.
                </div>
              </Card>

              <Card title="Notes">
                <div className="text-sm text-zinc-200 whitespace-pre-wrap">
                  {selectedUnit.notes?.trim() ? selectedUnit.notes : "—"}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PropertyCreateModal
        open={showCreateProperty}
        onClose={() => setShowCreateProperty(false)}
        onCreated={loadProperties}
      />

      <UnitCreateModal
        open={showCreateUnit}
        onClose={() => setShowCreateUnit(false)}
        propertyName={selectedProperty?.name ?? "Selected Property"}
        onSubmit={createUnit}
      />

      <UnitEditModal
        open={showEditUnit}
        onClose={() => setShowEditUnit(false)}
        unit={selectedUnit}
        onSubmit={(payload) => updateUnit(selectedUnit!.id, payload)}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
