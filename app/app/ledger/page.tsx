"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";

type Summary = {
  propertiesTotal: number;
  unitsTotal: number;
  vacant: number;
  occupied: number;
  baseRentMonthlyCents: number;
};

type PropertyRollup = {
  propertyId: string;
  name: string;
  location: string;
  unitsTotal: number;
  vacant: number;
  occupied: number;
  baseRentMonthlyCents: number;
};

type UnitRow = {
  id: string;
  label: string;
  category: string;
  status: "VACANT" | "OCCUPIED";
  baseRentCents: number;
  propertyId: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

export default function LedgerPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byProperty, setByProperty] = useState<PropertyRollup[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ledger/snapshot");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load ledger snapshot");

      setSummary(json.summary);
      setByProperty(json.byProperty ?? []);
      setUnits(json.units ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const estimatedAnnualCents = useMemo(() => {
    if (!summary) return 0;
    return summary.baseRentMonthlyCents * 12;
  }, [summary]);

  const hasProperties = (summary?.propertiesTotal ?? 0) > 0;
  const hasUnits = (summary?.unitsTotal ?? 0) > 0;
  const hasOccupied = (summary?.occupied ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KeyStor Ledger</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Financial visibility—read-only snapshots from operational data.
          </p>
        </div>

        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Smart guidance banner */}
      {!loading && (
        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            Ledger Guidance
          </div>

          {!hasProperties ? (
            <div className="mt-2 text-sm text-zinc-200">
              No assets found yet. Create your first property and units to generate ledger visibility.
              <div className="mt-3">
                <Link
                  href="/app/lease"
                  className="rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-sm text-zinc-200 hover:bg-[#1C2340]"
                >
                  Go to KeyStor Assets
                </Link>
              </div>
            </div>
          ) : !hasUnits ? (
            <div className="mt-2 text-sm text-zinc-200">
              You have a property but no units yet. Add rentable units to see base rent totals here.
              <div className="mt-3">
                <Link
                  href="/app/lease"
                  className="rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-sm text-zinc-200 hover:bg-[#1C2340]"
                >
                  Add Units in KeyStor Assets
                </Link>
              </div>
            </div>
          ) : !hasOccupied ? (
            <div className="mt-2 text-sm text-zinc-200">
              You have units configured, but none are currently occupied.
              <div className="mt-1 text-sm text-zinc-300">
                In v1, Ledger is driven by unit base rent and occupancy. Create a lease to begin tracking revenue potential.
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/app/leasing"
                  className="rounded-md border border-[#2A3566] bg-[#1A2346] px-3 py-2 text-sm text-zinc-100 hover:bg-[#1C2340]"
                >
                  Create a Lease
                </Link>
                <Link
                  href="/app/lease"
                  className="rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-sm text-zinc-200 hover:bg-[#1C2340]"
                >
                  Review Assets
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-200">
              Ledger is populated from configured base rent and current occupancy.
              <div className="mt-1 text-sm text-zinc-300">
                v2 will introduce deeper financial tracking (expenses, cash flow, forecasting). v1 is designed for calm operational visibility.
              </div>
            </div>
          )}
        </section>
      )}

      {/* Summary tiles */}
      <div className="grid gap-4 md:grid-cols-4">
        <Tile label="Properties" value={loading ? "—" : String(summary?.propertiesTotal ?? 0)} />
        <Tile
          label="Units"
          value={loading ? "—" : String(summary?.unitsTotal ?? 0)}
          sub={
            loading
              ? undefined
              : `Vacant ${summary?.vacant ?? 0} • Occupied ${summary?.occupied ?? 0}`
          }
        />
        <Tile
          label="Est. Monthly Base Rent"
          value={loading ? "—" : money(summary?.baseRentMonthlyCents ?? 0)}
          sub="From unit base rent fields"
        />
        <Tile
          label="Est. Annual Base Rent"
          value={loading ? "—" : money(estimatedAnnualCents)}
          sub="Monthly × 12"
        />
      </div>

      {/* Property rollups */}
      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Property Rollups
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-6">Property</div>
            <div className="col-span-2 text-right">Units</div>
            <div className="col-span-2 text-right">Vacant</div>
            <div className="col-span-2 text-right">Monthly</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : byProperty.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">
              No properties yet.
            </div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {byProperty.map((p, idx) => (
                <div
                  key={p.propertyId}
                  className={[
                    "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    "hover:bg-[#1C2340]",
                  ].join(" ")}
                >
                  <div className="col-span-6">
                    <div className="text-zinc-100 font-medium">{p.name}</div>
                    <div className="text-xs text-zinc-400">{p.location}</div>
                  </div>
                  <div className="col-span-2 text-right text-zinc-200">{p.unitsTotal}</div>
                  <div className="col-span-2 text-right text-zinc-200">{p.vacant}</div>
                  <div className="col-span-2 text-right text-zinc-200">
                    {money(p.baseRentMonthlyCents)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Note: This is operational visibility, not accounting.
        </div>
      </section>

      {/* Unit rollup table */}
      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Unit Rollup
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-3">Unit</div>
            <div className="col-span-4">Category</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Base Rent</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : units.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">No units yet.</div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {units.map((u, idx) => (
                <div
                  key={u.id}
                  className={[
                    "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    "hover:bg-[#1C2340]",
                  ].join(" ")}
                >
                  <div className="col-span-3 text-zinc-100">{u.label}</div>
                  <div className="col-span-4 text-zinc-300">{u.category}</div>
                  <div className="col-span-2 text-zinc-300">{u.status}</div>
                  <div className="col-span-3 text-right text-zinc-200">
                    {money(u.baseRentCents)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
