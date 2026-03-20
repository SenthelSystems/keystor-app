import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// NOTE: this is intentionally permissive for v1 to avoid breaking Next.js runtime.
// v2 hardening: replace unsafe-inline/unsafe-eval with nonce-based CSP.
function buildCsp() {
  const csp = [
    "default-src 'self'",
    // Next.js needs inline scripts in some cases (especially auth + hydration)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Tailwind / inline styles and component libs often require this
    "style-src 'self' 'unsafe-inline'",
    // images and icons
    "img-src 'self' data: blob: https:",
    // media uploads/previews
    "media-src 'self' blob: https:",
    // Supabase + NextAuth + Vercel + general API access
    "connect-src 'self' https: wss:",
    // iframes (keep tight)
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return csp.join("; ");
}

export const config = {
  matcher: [
    /*
      Apply to all routes except:
      - Next.js internals/assets
      - Stripe webhook endpoint
    */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Core security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // CSP (v1 compatible)
  res.headers.set("Content-Security-Policy", buildCsp());

  // (Optional) HSTS only if you are confident you will always serve HTTPS on this domain.
  // res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  return res;
}