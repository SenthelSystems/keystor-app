"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function AdminInvitesClient() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setBusy(true);
    setError(null);
    setLink(null);
    setExpiresAt(null);
    setCopied(false);

    try {
      const res = await fetch("/api/onboarding/invite-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() ? name.trim() : null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to create invite");

      setLink(json.data.link);
      setExpiresAt(json.data.expiresAt);
      setEmail("");
      setName("");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Admin Invites</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Create v1 OWNER invites (super-admin only).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">Owner Email</div>
            <div className="mt-1">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" />
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Owner Name (optional)</div>
            <div className="mt-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Owner" />
            </div>
          </div>

          <div className="md:col-span-2">
            <Button variant="primary" onClick={createInvite} disabled={busy || email.trim().length < 5}>
              {busy ? "Creating…" : "Create Owner Invite"}
            </Button>
          </div>
        </div>

        {link && (
          <div className="mt-4 rounded-xl border border-[#232838] bg-[#161C2F] p-3">
            <div className="text-xs text-zinc-500">Invite Link</div>
            <div className="mt-1 text-xs text-zinc-200 break-all">{link}</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">
                Expires {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => window.open(link, "_blank")}>Open</Button>
                <Button variant="secondary" onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
