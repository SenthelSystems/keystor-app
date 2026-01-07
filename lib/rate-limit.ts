type Record = { count: number; ts: number };

const hits = new Map<string, Record>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(key);

  // reset window
  if (!rec || now - rec.ts > windowMs) {
    hits.set(key, { count: 1, ts: now });
    return { ok: true, remaining: limit - 1 };
  }

  if (rec.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  rec.count += 1;
  return { ok: true, remaining: Math.max(0, limit - rec.count) };
}
