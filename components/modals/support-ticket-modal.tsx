"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

type Category = "BUG" | "FEATURE" | "BILLING" | "SECURITY" | "OTHER";

export default function SupportTicketModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<Category>("OTHER");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset transient UI state when opening
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
  }, [open]);

  // ESC closes modal (unless saving)
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  async function submit() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = { category, subject, message };

      if (includeDiagnostics) {
        payload.pageUrl =
          typeof window !== "undefined" ? window.location.href : null;
        payload.userAgent =
          typeof navigator !== "undefined" ? navigator.userAgent : null;
      }

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to submit ticket");

      setSuccess("Submitted. Senthel Support will review your ticket.");
      setSubject("");
      setMessage("");
      setCategory("OTHER");

      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 700);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = subject.trim().length > 3 && message.trim().length > 10;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => !saving && onClose()}
      />

      {/* Modal container: top-aligned + scroll safe */}
      <div className="absolute inset-x-0 top-6 mx-auto w-[92vw] max-w-2xl">
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#232838] bg-[#0F1115] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Contact Support
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-100">
                Senthel Systems Support
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Submit a ticket for help, bugs, or security concerns.
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

          {success && (
            <div className="mt-4 rounded-xl border border-[#2A3566] bg-[#1A2346] px-4 py-3 text-sm text-zinc-100">
              {success}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Category">
              <select
                className="w-full rounded-md border border-[#232838] bg-[#141821] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                disabled={saving}
              >
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature Request</option>
                <option value="BILLING">Billing</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            <div className="md:col-span-1" />

            <div className="md:col-span-2">
              <Field label="Subject">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary"
                  disabled={saving}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Message">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Describe the issue. Include steps to reproduce if possible."
                  disabled={saving}
                />
              </Field>
            </div>

            <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  disabled={saving}
                />
                Include diagnostics (page URL & browser info)
              </label>

              <Button
                variant="primary"
                onClick={submit}
                disabled={saving || !canSubmit}
              >
                {saving ? "Submitting…" : "Submit Ticket"}
              </Button>
            </div>

            <div className="md:col-span-2 text-xs text-zinc-500">
              For emergencies, contact local services. For security issues, select{" "}
              <b>Security</b>.
            </div>
          </div>

          <div className="h-2" />
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
