"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/button";

type Attachment = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
};

type Req = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED";
  createdAt: string;

  tenantId: string;
  tenant: null | { name: string | null; email: string };

  unitId: string | null;
  unit: null | { label: string; category: string; property: { name: string } };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function ageInDays(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function ageBadgeClass(days: number) {
  if (days >= 14)
    return "inline-flex rounded-full border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-[10px] text-red-200";
  if (days >= 7)
    return "inline-flex rounded-full border border-[#2A3566] bg-[#1A2346] px-2 py-0.5 text-[10px] text-zinc-100";
  return null;
}

function statusChipClass(status: Req["status"]) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "IN_PROGRESS") return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  if (status === "COMPLETE") return `${base} border-[#23382F] bg-[#101A14] text-zinc-200`;
  if (status === "CANCELLED") return `${base} border-[#3A2A2A] bg-[#1A1010] text-zinc-200`;
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

function priorityChipClass(priority: string) {
  const p = (priority || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (p === "HIGH") return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  if (p === "MEDIUM") return `${base} border-[#232838] bg-[#161C2F] text-zinc-200`;
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

function unitLabel(r: Req) {
  if (!r.unit) return null;
  return `${r.unit.property.name} • ${r.unit.label}`;
}

function tenantLabel(r: Req) {
  if (!r.tenant) return "Tenant: —";
  return r.tenant.name
    ? `Tenant: ${r.tenant.name} (${r.tenant.email})`
    : `Tenant: ${r.tenant.email}`;
}

export default function ServicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const focusId = searchParams.get("focus");

  const [requests, setRequests] = useState<Req[]>([]);
  const [selected, setSelected] = useState<Req | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<Req["status"]>("OPEN");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [saving, setSaving] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);

  // Lightbox
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/service/requests");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load requests");
      setRequests(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadAttachments(requestId: string) {
    setAttLoading(true);
    setAttError(null);
    try {
      const res = await fetch(`/api/attachments/${requestId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load attachments");
      setAttachments(json.data ?? []);
    } catch (e: any) {
      setAttError(e?.message ?? "Failed to load attachments");
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-open focused request
  useEffect(() => {
    if (!focusId) return;
    if (loading) return;
    if (requests.length === 0) return;

    const match = requests.find((r) => r.id === focusId);
    if (match) {
      setSelected(match);
      router.replace("/app/service");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, requests.length]);

  // When selected changes: load attachments + set edit defaults
  useEffect(() => {
    if (!selected) {
      setAttachments([]);
      setAttError(null);
      setPreview(null);
      setMediaError(null);
      return;
    }
    setEditStatus(selected.status);
    setEditPriority((selected.priority?.toUpperCase() as any) ?? "MEDIUM");
    loadAttachments(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function saveUpdates() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/service/requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, priority: editPriority }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update request");

      await load();
      setSelected(null); // auto-close
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KeyStor Service</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Maintenance requests—operational control without the chaos.
          </p>
        </div>

        <Button variant="secondary" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-5">Request</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Created</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">No requests found.</div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {requests.map((r, idx) => {
                const days = ageInDays(r.createdAt);
                const showAge =
                  (r.status === "OPEN" || r.status === "IN_PROGRESS") && days >= 7;
                const cls = showAge ? ageBadgeClass(days) : null;

                const uLabel = unitLabel(r);

                return (
                  <button
                    key={r.id}
                    className={[
                      "w-full text-left grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                      idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                      "hover:bg-[#1C2340]",
                    ].join(" ")}
                    onClick={() => setSelected(r)}
                  >
                    <div className="col-span-5">
                      <div className="text-zinc-100 truncate">{r.title}</div>
                      <div className="mt-1 text-xs text-zinc-400 truncate">{tenantLabel(r)}</div>
                      <div className="mt-1 text-xs text-zinc-400 truncate">
                        Unit: {uLabel ? uLabel : "Not specified"}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span className={priorityChipClass(r.priority)}>
                        {String(r.priority ?? "—").toUpperCase()}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className={statusChipClass(r.status)}>{r.status}</span>
                    </div>

                    <div className="col-span-3 flex items-center gap-2 text-zinc-300">
                      {fmtDate(r.createdAt)}
                      {cls && <span className={cls}>{days}d</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[#232838] bg-[#0B0E14] p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Request</div>
                <div className="mt-1 text-xl font-semibold">{selected.title}</div>

                <div className="mt-2 flex gap-2">
                  <span className={priorityChipClass(selected.priority)}>
                    {String(selected.priority ?? "—").toUpperCase()}
                  </span>
                  <span className={statusChipClass(selected.status)}>{selected.status}</span>
                </div>
              </div>

              <Button variant="secondary" onClick={() => setSelected(null)} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <Card title="Tenant">
                <div className="text-sm text-zinc-200">
                  {selected.tenant
                    ? selected.tenant.name
                      ? `${selected.tenant.name} (${selected.tenant.email})`
                      : selected.tenant.email
                    : "—"}
                </div>
              </Card>

              <Card title="Unit">
                {selected.unit ? (
                  <>
                    <div className="text-sm text-zinc-200">{unitLabel(selected)}</div>
                    <div className="mt-1 text-xs text-zinc-400">{selected.unit.category}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-zinc-200">Not specified</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Tenant did not select a unit. Use the description to locate the issue.
                    </div>
                  </>
                )}
              </Card>

              <Card title="Description">
                <div className="text-sm text-zinc-200 whitespace-pre-wrap">{selected.description}</div>
              </Card>

              <Card title="Attachments" right={
                <Button variant="secondary" onClick={() => loadAttachments(selected.id)} disabled={attLoading}>
                  {attLoading ? "Loading…" : "Refresh"}
                </Button>
              }>
                {attError && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                    {attError}
                  </div>
                )}

                {attLoading ? (
                  <div className="text-sm text-zinc-400">Loading…</div>
                ) : attachments.length === 0 ? (
                  <div className="text-sm text-zinc-400">No attachments.</div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {attachments.map((a) => (
                      <button
                        key={a.id}
                        className="rounded-xl border border-[#232838] bg-[#0B0E14] p-2 text-left hover:bg-[#1C2340] transition"
                        onClick={() => {
                          setMediaError(null);
                          if (a.url) setPreview(a);
                        }}
                        title={a.url ? "Click to view" : "Refresh to generate URL"}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                            {a.kind}
                          </div>
                          {a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-zinc-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open
                            </a>
                          )}
                        </div>

                        <div className="mt-2">
                          {a.url ? (
                            a.kind === "IMAGE" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.url} alt="Attachment" className="h-28 w-full rounded-md object-cover" />
                            ) : (
                              <div className="h-28 w-full rounded-md bg-black/40 flex items-center justify-center text-xs text-zinc-300">
                                Video • click to play
                              </div>
                            )
                          ) : (
                            <div className="text-xs text-zinc-400">URL unavailable (refresh)</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Update">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-zinc-500">Status</div>
                    <select
                      className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      disabled={saving}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETE">COMPLETE</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs text-zinc-500">Priority</div>
                    <select
                      className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      disabled={saving}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    onClick={saveUpdates}
                    disabled={
                      saving ||
                      (editStatus === selected.status &&
                        editPriority === selected.priority?.toUpperCase())
                    }
                  >
                    {saving ? "Saving…" : "Save Updates"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Lightbox */}
          {preview && preview.url && (
            <div className="fixed inset-0 z-[60]">
              <div className="absolute inset-0 bg-black/80" onClick={() => setPreview(null)} />
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full max-w-4xl rounded-2xl border border-[#232838] bg-[#0B0E14] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-200">
                      {preview.kind} • {Math.round((preview.sizeBytes || 0) / 1024)} KB
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={preview.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-sm text-zinc-200 hover:bg-[#1C2340]"
                      >
                        Open in new tab
                      </a>
                      <Button variant="secondary" onClick={() => setPreview(null)}>
                        Close
                      </Button>
                    </div>
                  </div>

                  {mediaError && (
                    <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                      {mediaError}
                    </div>
                  )}

                  <div className="mt-4">
                    {preview.kind === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={preview.url}
                        src={preview.url}
                        alt="Attachment"
                        className="max-h-[70vh] w-full rounded-xl object-contain bg-black/40"
                        onError={() => setMediaError("Unable to load image. Try Refresh or Open in new tab.")}
                      />
                    ) : (
                      <video
                        key={preview.url}
                        controls
                        playsInline
                        preload="metadata"
                        autoPlay
                        className="max-h-[70vh] w-full rounded-xl bg-black/40"
                        src={preview.url}
                        onError={() => setMediaError("Unable to load video. Try Refresh or Open in new tab.")}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
