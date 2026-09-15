import { NextRequest, NextResponse } from "next/server";
import { limited, tierFor } from "@/lib/rate-limit";

// The tier table and the sliding-window counter live in src/lib/rate-limit.ts:
// pure, import-free logic (no node: builtins, no Next imports) that the unit
// suite exercises directly, since this file only runs inside the Edge runtime.

// The renderer stamps its bootstrap scripts with the nonce it parses from
// the request CSP header (app-render.js reads headers["content-security-policy"]).
// Next 16 may execute middleware more than once per request; each run must
// produce the SAME nonce or the response header won't match the stamped
// scripts and strict-dynamic blocks them (the page renders but never
// hydrates — every button is dead). So the nonce is derived from
// x-vercel-id, which is unique per request but stable across middleware
// passes. An incoming nonce is reused when present.
function nonceFor(req: NextRequest, path: string): string {
  const incoming = req.headers.get("content-security-policy");
  const existing = incoming?.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
  if (existing) return existing;
  const vid = req.headers.get("x-vercel-id");
  if (vid) return btoa(`${vid}|${path}`);
  return btoa(crypto.randomUUID());
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const method = req.method.toUpperCase();

  const tier = tierFor(method, path);
  if (tier) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (limited(tier.name, ip, tier.limit)) {
      const body =
        path.startsWith("/api/")
          ? JSON.stringify({
              error: "rate limited — responses are cache-friendly, retry shortly",
            })
          : "rate limited — retry in a minute\n";
      return new NextResponse(body, {
        status: 429,
        headers: {
          "retry-after": "60",
          "content-type": path.startsWith("/api/")
            ? "application/json"
            : "text/plain",
        },
      });
    }
  }

  const nonce = nonceFor(req, path);
  const isDev = process.env.NODE_ENV === "development";
  const isEmbed = path === "/embed" || path.startsWith("/embed");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    ...(isEmbed ? [] : [`frame-ancestors 'none'`]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
