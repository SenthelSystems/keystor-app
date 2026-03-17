"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

type UnitStatus = "VACANT" | "OCCUPIED";

type UnitCreatePayload = {
  label: string;
  category: string;
  status: UnitStatus;
  baseRentDollars: number;
};

type UnitCreateModalProps = {
  open: boolean;
  onClose: () => void;
  propertyName: string;
  onSubmit: (payload: UnitCreatePayload) => Promise<void>;
};

const INITIAL_FORM: UnitCreatePayload = {
  label: "",
  category: "SFR",
  status: "VACANT",
  baseRentDollars: 1800,
};

export default function UnitCreateModal({
  open,
  onClose,
  propertyName,
  onSubmit,
}: UnitCreateModalProps) {
  const [form, setForm] = useState<UnitCreatePayload>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setSaving(false);
      setError(null);
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return form.label.trim().length > 0 && form.category.trim().length > 0;
  }, [form.label, form.category]);

  function updateField<K extends keyof UnitCreatePayload>(
    field: K,
    value: UnitCreatePayload[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (saving || !canSubmit) return;

    setSaving(true);
    setError(null);

    try {
      await onSubmit({
        label: form.label.trim(),
        category: form.category.trim(),
        status: form.status,
        baseRentDollars: Number.isFinite(form.baseRentDollars)
          ? form.baseRentDollars
          : 0,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      <div className="absolute inset-x-0 top-6 mx-auto w-[92vw] max-w-2xl">
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#232838] bg-[#0F1115] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Create Unit
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-100">
                New Unit
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Property: {propertyName}
              </div>
            </div>

            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Close
            </Button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Label">
              <Input
                value={form.label}
                onChange={(e) => updateField("label", e.target.value)}
                disabled={saving}
                placeholder="Unit A1"
              />
            </Field>

            <Field label="Category">
              <Input
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                disabled={saving}
                placeholder="SFR"
              />
            </Field>

            <Field label="Status">
              <select
                className="w-full rounded-md border border-[#232838] bg-[#141821] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as UnitStatus)
                }
                disabled={saving}
              >
                <option value="VACANT">VACANT</option>
                <option value="OCCUPIED">OCCUPIED</option>
              </select>
            </Field>

            <Field label="Base Rent (monthly, $)">
              <Input
                type="number"
                min="0"
                step="1"
                value={String(form.baseRentDollars)}
                onChange={(e) =>
                  updateField("baseRentDollars", Number(e.target.value) || 0)
                }
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
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
            >
              {saving ? "Creating…" : "Create Unit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}