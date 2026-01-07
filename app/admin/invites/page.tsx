"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function AdminInvitesPage() {
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setLink(null);
    setExpiresAt(null);
    setCopied(false);

    try {
      const res = await fetch("/api/onboarding/invite-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          email,
          name: name || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create owner invite");

      setLink(json.data.link);
      setExpiresAt(json.data.expiresAt);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Admin • Owner Invites</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Generate invite-only owner onboarding links for SentryCor.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#232838] bg-[#141821] p-4">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Create Owner Invite
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="text-xs text-zinc-500">Admin Invite Secret</div>
            <div className="mt-1">
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Paste ADMIN_INVITE_SECRET"
                disabled={loading}
              />
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              This is required to generate owner invites. It is not stored.
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Owner Email</div>
            <div className="mt-1">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="newowner@example.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500">Owner Name (optional)</div>
            <div className="mt-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Owner"
                disabled={loading}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Button
              variant="primary"
              onClick={generate}
              disabled={loading || !secret.trim() || !email.trim()}
            >
              {loading ? "Generating…" : "Generate Owner Invite Link"}
            </Button>
          </div>
        </div>

        {link && (
          <div className="mt-4 rounded-xl border border-[#232838] bg-[#0F1115] p-4">
            <div className="text-xs text-zinc-500">Invite Link</div>
            <div className="mt-1 text-xs text-zinc-200 break-all">{link}</div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">
                Expires {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                >
                  Open
                </Button>
                <Button variant="secondary" onClick={copy}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="text-xs text-zinc-500">
        Tip: Open the invite link in an incognito window to test the premium owner acceptance flow.
      </div>
    </div>
  );
}
