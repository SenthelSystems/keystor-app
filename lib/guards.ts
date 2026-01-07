// src/lib/guards.ts
export function requireId(value: string | null | undefined, label: string) {
  if (!value) throw new Error(`Missing required ${label}`);
  return value;
}
