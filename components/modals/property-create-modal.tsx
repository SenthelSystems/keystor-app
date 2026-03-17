"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

const DEFAULT_TYPE = "RESIDENTIAL";

export default function PropertyCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState(DEFAULT_TYPE);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setName("");
    setType(DEFAULT_TYPE);
    setAddress("");
    setCity("");
    setState("");
    setPostalCode("");
    setNotes("");
    setError(null);
    setSaving(false);
  }, [open]);

  if (!open) return null;

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      const trimmedName = name.trim();
      const trimmedType = type.trim() || DEFAULT_TYPE;
      const trimmedAddress = address.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim().toUpperCase().slice(0, 2);
      const trimmedPostalCode = postalCode.trim();
      const trimmedNotes = notes.trim();

      if (!trimmedName) throw new Error("Property name is required.");
      if (!trimmedAddress) throw new Error("Address is required.");
      if (!trimmedCity) throw new Error("City is required.");
      if (!trimmedState) throw new Error("State is required.");
      if (!trimmedPostalCode) throw new Error("Postal code is required.");

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          type: trimmedType,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedState,
          postalCode: trimmedPostalCode,
          notes: trimmedNotes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create property");

      onCreated();
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
                Create Property
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-100">
                New Property
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Add a property to your organization.
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
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Oak Street Duplex"
                disabled={saving}
                autoFocus
              />
            </Field>

            <Field label="Type">
              <Input
                value={type}
                onChange={(e) => setType(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="RESIDENTIAL"
                disabled={saving}
              />
            </Field>

            <Field label="Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
                disabled={saving}
              />
            </Field>

            <Field label="City">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Tampa"
                disabled={saving}
              />
            </Field>

            <Field label="State">
              <Input
                value={state}
                onChange={(e) =>
                  setState(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2))
                }
                placeholder="FL"
                maxLength={2}
                disabled={saving}
              />
            </Field>

            <Field label="Postal Code">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="33602"
                disabled={saving}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes (optional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything helpful to remember about this property."
                  disabled={saving}
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create Property"}
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