import { NextRequest, NextResponse } from "next/server";

const WINDOW = 60_000;
const HITS = new Map<string, number[]>();

// Tier table: GET on scan/verify/og and the /t page scan at 30/min;
// GET /embed at 120/min (embed-heavy pages behind NAT). POST scan/verify
// shares the scan tier. Query strings are irrelevant — buckets key on IP.
const TIERS: { name: string; limit: number; methods: string[]; match: (p: string) => boolean }[] = [
  {
    name: "scan",
    limit: 30,
    methods: ["GET", "POST"],
    match: (p) =>
      p === "/api/v1/scan" ||
      p === "/api/v1/verify" ||
      p === "/api/v1/og" ||
      p === "/t",
  },
  {
    name: "embed",
    limit: 120,
    methods: ["GET"],
    match: (p) => p === "/embed" || p.startsWith("/embed/"),
  },
];

function limited(tierName: string, ip: string, limit: number): boolean {
  const key = `${tierName}:${ip}`;
  const now = Date.now();
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(key, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > limit;
}

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
  if (method === "GET" || method === "POST") {
    for (const tier of TIERS) {
      if (!tier.methods.includes(method) || !tier.match(path)) continue;
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
