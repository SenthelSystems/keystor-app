"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

type Unit = {
  id: string;
  label: string;
  category: string;
  propertyName: string;
};

type Lease = {
  id: string;
  status: "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string | null;
  rentCents: number;
  unit: { id: string; label: string; category: string };
};

type Req = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED";
  createdAt: string;
  unitId: string | null;
};

type Attachment = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_TOTAL_UPLOAD_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_FILE_COUNT = 6;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusChip(status: Req["status"]) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "IN_PROGRESS") {
    return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  }
  if (status === "COMPLETE") {
    return `${base} border-[#23382F] bg-[#101A14] text-zinc-200`;
  }
  if (status === "CANCELLED") {
    return `${base} border-[#3A2A2A] bg-[#1A1010] text-zinc-200`;
  }
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

function priorityChip(priority: string) {
  const p = (priority || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (p === "HIGH") return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  if (p === "MEDIUM") return `${base} border-[#232838] bg-[#161C2F] text-zinc-200`;
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

function leaseStatusChip(status: Lease["status"]) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "ACTIVE") return `${base} border-[#2A3566] bg-[#1A2346] text-zinc-100`;
  return `${base} border-[#232838] bg-[#0B0E14] text-zinc-200`;
}

function validateSelectedFiles(files: File[]) {
  if (files.length === 0) {
    return { ok: true as const };
  }

  if (files.length > MAX_FILE_COUNT) {
    return {
      ok: false as const,
      error: `Please upload no more than ${MAX_FILE_COUNT} files at a time.`,
    };
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false as const,
        error: `${file.name} is too large. Each file must be ${formatFileSize(
          MAX_FILE_SIZE_BYTES
        )} or smaller.`,
      };
    }
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return {
      ok: false as const,
      error: `Selected files are too large together. Total upload size must be ${formatFileSize(
        MAX_TOTAL_UPLOAD_BYTES
      )} or less.`,
    };
  }

  return { ok: true as const };
}

export default function TenantPortal() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [selected, setSelected] = useState<Req | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [unitId, setUnitId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attUploading, setAttUploading] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingUploadMsg, setPendingUploadMsg] = useState<string | null>(null);
  const [pendingFilesError, setPendingFilesError] = useState<string | null>(null);

  async function load(mode: "initial" | "refresh" = "initial") {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const [uRes, lRes, rRes] = await Promise.all([
        fetch("/api/tenant/units"),
        fetch("/api/tenant/leases"),
        fetch("/api/tenant/requests"),
      ]);

      const uJson = await uRes.json();
      const lJson = await lRes.json();
      const rJson = await rRes.json();

      if (!uRes.ok) throw new Error(uJson?.error ?? "Failed to load units");
      if (!lRes.ok) throw new Error(lJson?.error ?? "Failed to load leases");
      if (!rRes.ok) throw new Error(rJson?.error ?? "Failed to load requests");

      const unitData: Unit[] = uJson.data ?? [];
      const leaseData: Lease[] = lJson.data ?? [];
      const requestData: Req[] = rJson.data ?? [];

      setUnits(unitData);
      setLeases(leaseData);
      setRequests(requestData);

      if (unitData.length === 1) {
        setUnitId(unitData[0].id);
      } else if (unitData.length > 1) {
        const stillValid = unitData.some((u) => u.id === unitId);
        if (!unitId || !stillValid) setUnitId(unitData[0].id);
      } else {
        setUnitId("");
      }

      setLastRefreshedAt(new Date().toLocaleString());
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Unknown error";
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setAttachments([]);
      setAttError(null);
      return;
    }

    loadAttachments(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function loadAttachments(requestId: string) {
    setAttLoading(true);
    setAttError(null);

    try {
      const res = await fetch(`/api/attachments/${requestId}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? "Failed to load attachments");

      setAttachments(json.data ?? []);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Failed to load attachments";
      setAttError(err);
      setAttachments([]);
    } finally {
      setAttLoading(false);
    }
  }

  async function uploadFilesToRequest(requestId: string, files: File[]) {
    if (!files || files.length === 0) return;

    const validation = validateSelectedFiles(files);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    setPendingUploadMsg(`Uploading ${files.length} file(s)…`);

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/attachments/${requestId}`, {
        method: "POST",
        body: fd,
      });

      let json: any = {};
      try {
        json = await res.json();
      } catch {}

      if (!res.ok) {
        throw new Error(json?.error ?? "Attachment upload failed");
      }
    }

    setPendingUploadMsg(null);
  }

  async function uploadFiles(requestId: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const validation = validateSelectedFiles(selectedFiles);

    if (!validation.ok) {
      setAttError(validation.error);
      return;
    }

    setAttUploading(true);
    setAttError(null);

    try {
      await uploadFilesToRequest(requestId, selectedFiles);
      await loadAttachments(requestId);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Upload failed";
      setAttError(err);
    } finally {
      setAttUploading(false);
    }
  }

  function handlePendingFilesChange(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      setPendingFiles([]);
      setPendingFilesError(null);
      return;
    }

    const validation = validateSelectedFiles(selectedFiles);

    if (!validation.ok) {
      setPendingFiles([]);
      setPendingFilesError(validation.error);
      return;
    }

    setPendingFiles(selectedFiles);
    setPendingFilesError(null);
  }

  const selectedUnitLabel = useMemo(() => {
    if (!selected?.unitId) return "—";
    const u = units.find((x) => x.id === selected.unitId);
    return u ? `${u.propertyName} • ${u.label}` : "—";
  }, [units, selected]);

  const canSubmit = useMemo(() => {
    return title.trim().length > 3 && description.trim().length > 10;
  }, [title, description]);

  const unitCount = units.length;
  const singleUnit = unitCount === 1 ? units[0] : null;

  const activeLeases = useMemo(
    () => leases.filter((l) => l.status === "ACTIVE"),
    [leases]
  );

  const openRequests = useMemo(
    () => requests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS"),
    [requests]
  );

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setPendingUploadMsg(null);

    try {
      if (pendingFiles.length > 0) {
        const validation = validateSelectedFiles(pendingFiles);
        if (!validation.ok) {
          throw new Error(validation.error);
        }
      }

      const res = await fetch("/api/tenant/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          unitId: unitId || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? "Failed to submit request");

      const createdId = json?.data?.id ?? json?.id;
      if (!createdId) {
        throw new Error("Request created, but ID was not returned.");
      }

      if (pendingFiles.length > 0) {
        try {
          await uploadFilesToRequest(createdId, pendingFiles);
          setSuccess("Request submitted with attachments.");
        } finally {
          setPendingFiles([]);
          setPendingFilesError(null);
          setPendingUploadMsg(null);
        }
      } else {
        setSuccess("Request submitted. You can track status updates below.");
      }

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");

      await load("refresh");
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Unknown error";
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              KeyStor Tenant Portal
            </div>
            <h1 className="mt-1 text-3xl font-semibold">Welcome back</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              View your lease details, submit service requests, and track updates in one
              place. For urgent safety issues, contact the property owner directly.
            </p>
            {lastRefreshedAt ? (
              <div className="mt-3 text-xs text-zinc-500">
                Last refreshed: {lastRefreshedAt}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => load("refresh")}
              disabled={loading || refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SummaryCard label="Active Leases" value={String(activeLeases.length)} />
          <SummaryCard label="Open Requests" value={String(openRequests.length)} />
          <SummaryCard label="Units" value={String(units.length)} />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-[#2A3566] bg-[#1A2346] px-4 py-3 text-sm text-zinc-100">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                My Leases
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                View your current lease information and monthly rent.
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              {loading ? "Loading…" : `${activeLeases.length} active`}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
            <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
              <div className="col-span-4">Unit</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3">Start</div>
              <div className="col-span-2 text-right">Rent</div>
            </div>

            {loading ? (
              <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
            ) : leases.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-300">
                No lease records found. If you believe this is an error, contact the
                property owner.
              </div>
            ) : (
              <div className="divide-y divide-[#232838]">
                {leases.map((lease, idx) => (
                  <div
                    key={lease.id}
                    className={[
                      "grid grid-cols-12 items-center px-3 py-3 text-sm transition",
                      idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    ].join(" ")}
                  >
                    <div className="col-span-4 text-zinc-100">
                      <div className="font-medium">{lease.unit.label}</div>
                      <div className="text-xs text-zinc-400">{lease.unit.category}</div>
                    </div>
                    <div className="col-span-3">
                      <span className={leaseStatusChip(lease.status)}>{lease.status}</span>
                    </div>
                    <div className="col-span-3 text-zinc-300">
                      {fmtDateShort(lease.startDate)}
                    </div>
                    <div className="col-span-2 text-right text-zinc-200">
                      {money(lease.rentCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Submit a Service Request
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                Keep the request specific so the owner can respond faster.
              </div>
            </div>
            <div className="text-xs text-zinc-500">Tenant support</div>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <div className="text-xs text-zinc-500">Unit</div>

              {unitCount === 0 ? (
                <div className="mt-2 text-sm text-zinc-300">
                  No leased units found. Submit the request without selecting a unit and
                  describe the location clearly.
                </div>
              ) : unitCount === 1 && singleUnit ? (
                <div className="mt-2 rounded-xl border border-[#232838] bg-[#161C2F] px-4 py-3">
                  <div className="text-sm text-zinc-100">
                    {singleUnit.propertyName} • {singleUnit.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{singleUnit.category}</div>
                </div>
              ) : (
                <select
                  className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  disabled={loading || submitting || units.length === 0}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.propertyName} • {u.label} ({u.category})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="text-xs text-zinc-500">Priority</div>
              <select
                className="mt-1 w-full rounded-md border border-[#232838] bg-[#161C2F] px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-[#5B6EE1]/30 disabled:opacity-60"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                disabled={submitting}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-zinc-500">Title</div>
              <div className="mt-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Describe the issue clearly"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">Description</div>
              <div className="mt-1">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Include location, timing, and anything that would help resolve the issue."
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">Photos / Video (optional)</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime"
                  multiple
                  disabled={submitting}
                  onChange={(e) => handlePendingFilesChange(e.target.files)}
                  className="text-xs text-zinc-300"
                />

                {pendingFiles.length > 0 ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPendingFiles([]);
                      setPendingFilesError(null);
                    }}
                    disabled={submitting}
                  >
                    Clear ({pendingFiles.length})
                  </Button>
                ) : null}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Add photos or video to help the owner diagnose the issue. Max{" "}
                {MAX_FILE_COUNT} files, {formatFileSize(MAX_FILE_SIZE_BYTES)} per file,{" "}
                {formatFileSize(MAX_TOTAL_UPLOAD_BYTES)} total.
              </div>

              {pendingFiles.length > 0 ? (
                <div className="mt-2 text-xs text-zinc-400">
                  Selected:{" "}
                  {pendingFiles.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(", ")}
                </div>
              ) : null}

              {pendingFilesError ? (
                <div className="mt-2 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {pendingFilesError}
                </div>
              ) : null}

              {pendingUploadMsg ? (
                <div className="mt-2 text-sm text-zinc-300">{pendingUploadMsg}</div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={submit}
                disabled={!canSubmit || submitting || loading}
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#232838] bg-[#121726] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              My Requests
            </div>
            <div className="mt-1 text-sm text-zinc-300">
              Track the status of issues you have already reported.
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {loading ? "Loading…" : `${requests.length} request(s)`}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#232838] bg-[#161C2F]">
          <div className="grid grid-cols-12 bg-[#0B0E14] px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Created</div>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-sm text-zinc-400">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-300">
              No requests yet. Submit your first request above.
            </div>
          ) : (
            <div className="divide-y divide-[#232838]">
              {requests.map((request, idx) => (
                <button
                  key={request.id}
                  className={[
                    "grid w-full grid-cols-12 items-center px-3 py-3 text-left text-sm transition",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[#141A2E]",
                    "hover:bg-[#1C2340]",
                  ].join(" ")}
                  onClick={() => setSelected(request)}
                >
                  <div className="col-span-5 truncate text-zinc-100">{request.title}</div>
                  <div className="col-span-2">
                    <span className={priorityChip(request.priority)}>{request.priority}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={statusChip(request.status)}>{request.status}</span>
                  </div>
                  <div className="col-span-3 text-zinc-300">
                    {fmtDate(request.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[#232838] bg-[#0B0E14] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                  Service Request
                </div>
                <div className="mt-1 text-xl font-semibold">{selected.title}</div>
                <div className="mt-2 flex gap-2">
                  <span className={priorityChip(selected.priority)}>{selected.priority}</span>
                  <span className={statusChip(selected.status)}>{selected.status}</span>
                </div>
              </div>

              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <Card title="Created">
                <div className="text-sm text-zinc-200">{fmtDate(selected.createdAt)}</div>
              </Card>

              <Card title="Unit">
                <div className="text-sm text-zinc-200">{selectedUnitLabel}</div>
              </Card>

              <Card title="Description">
                <div className="whitespace-pre-wrap text-sm text-zinc-200">
                  {selected.description}
                </div>
              </Card>

              <Card
                title="Attachments"
                right={
                  <Button
                    variant="secondary"
                    onClick={() => loadAttachments(selected.id)}
                    disabled={attLoading}
                  >
                    {attLoading ? "Loading…" : "Refresh"}
                  </Button>
                }
              >
                {attError ? (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                    {attError}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime"
                    multiple
                    disabled={attUploading}
                    onChange={(e) => uploadFiles(selected.id, e.target.files)}
                    className="text-xs text-zinc-300"
                  />
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Max {MAX_FILE_COUNT} files, {formatFileSize(MAX_FILE_SIZE_BYTES)} per
                  file, {formatFileSize(MAX_TOTAL_UPLOAD_BYTES)} total.
                </div>

                {attUploading ? (
                  <div className="mt-3 text-sm text-zinc-300">Uploading…</div>
                ) : null}

                {attLoading ? (
                  <div className="mt-3 text-sm text-zinc-400">Loading…</div>
                ) : attachments.length === 0 ? (
                  <div className="mt-3 text-sm text-zinc-300">No attachments yet.</div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {attachments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-[#232838] bg-[#161C2F] p-2"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {a.kind}
                        </div>
                        <div className="mt-2">
                          {a.url ? (
                            a.kind === "IMAGE" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.url}
                                alt="Attachment"
                                className="h-32 w-full rounded-md object-cover"
                              />
                            ) : (
                              <video
                                controls
                                className="h-32 w-full rounded-md object-cover"
                                src={a.url}
                              />
                            )
                          ) : (
                            <div className="text-xs text-zinc-400">
                              URL unavailable. Refresh to try again.
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">
                          {Math.round((a.sizeBytes || 0) / 1024)} KB •{" "}
                          {fmtDateShort(a.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-10 border-t border-[#232838] pt-4 text-center text-xs text-zinc-500">
        <div>
          <span className="font-medium text-zinc-400">Emergency?</span> This portal is
          not monitored for urgent safety issues. Contact the property owner or emergency
          services directly.
        </div>

        <div className="mt-2 text-zinc-600">
          Tenant access powered by <span className="font-medium text-zinc-400">KeyStor</span>
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#232838] bg-[#161C2F] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
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