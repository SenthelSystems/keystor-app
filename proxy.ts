import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(_req: NextRequest) {
  const res = NextResponse.next();

  // Always-safe headers (dev + prod)
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  const isProd = process.env.NODE_ENV === "production";

  // IMPORTANT:
  // Next.js uses inline scripts for hydration. A strict CSP without nonces/hashes
  // will break client-side JS (buttons "do nothing").
  //
  // v1 approach:
  // - In dev: allow inline scripts so the app works.
  // - In prod: keep CSP stricter (still dev-friendly until we add nonces).
  if (!isProd) {
    // Dev CSP: allow inline + eval (needed for Next dev tooling/hydration)
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "connect-src 'self' ws: http: https:",
      ].join("; ")
    );
  } else {
    // Prod CSP (still conservative; we can tighten further with nonces later)
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self' https:",
      ].join("; ")
    );
  }

  return res;
}

export const config = {
  matcher: "/:path*",
};
