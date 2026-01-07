"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function UnitEditModal({
  open,
  onClose,
  unit,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  unit: {
    id: string;
    label: string;
    category: string;
    status: "VACANT" | "OCCUPIED";
    baseRentCents: number;
  } | null;
  onSubmit: (payload: {
    label: string;
    category: string;
    status: "VACANT" | "OCCUPIED";
    baseRentDollars: number;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"VACANT" | "OCCUPIED">("VACANT");
  const [baseRentDollars, setBaseRentDollars] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unit) return;
    setLabel(unit.label);
    setCategory(unit.category);
    setStatus(unit.status);
    setBaseRentDollars(Math.round((unit.baseRentCents || 0) / 100));
  }, [unit]);

  if (!open || !unit) return null;

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      await onSubmit({ label, category, status, baseRentDollars });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => !saving && onClose()} />
      <div className="absolute inset-x-0 top-6 mx-auto w-[92vw] max-w-2xl">
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#232838] bg-[#0F1115] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Edit Unit
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-100">
                {unit.label}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Update unit details and operational status.
              </div>
            </div>

            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Close
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={saving} />
            </Field>

            <Field label="Category">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} disabled={saving} />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded-md border border-[#232838] bg-[#141821] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                disabled={saving}
              >
                <option value="VACANT">VACANT</option>
                <option value="OCCUPIED">OCCUPIED</option>
              </select>
            </Field>

            <Field label="Base Rent (monthly, $)">
              <Input
                type="number"
                value={String(baseRentDollars)}
                onChange={(e) => setBaseRentDollars(Number(e.target.value))}
                disabled={saving}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={saving || !label.trim() || !category.trim()}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
