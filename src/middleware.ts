import { NextRequest, NextResponse } from "next/server";

const WINDOW = 60_000;

// Every surface here triggers a server-side scan, so each gets a rate limit
// tier. Scan-triggering paths share one 30/min/IP bucket; /embed gets its own
// 120/min bucket (embed-heavy pages behind one NAT address must not trip the
// scan limit). POST /api/v1/scan (and /api/v1/verify, for symmetry — it has
// no POST handler today) is an unauthenticated scan trigger too, so it lands
// in the same 30/min bucket. Keys are per-tier + per-IP — query strings are
// irrelevant. Per-instance in-memory: best effort is accepted.
const TIERS: {
  name: string;
  limit: number;
  match: (method: string, path: string) => boolean;
}[] = [
  {
    name: "scan",
    limit: 30,
    match: (m, p) =>
      m === "GET"
        ? p === "/api/v1/scan" ||
          p === "/api/v1/verify" ||
          p === "/api/v1/og" ||
          p === "/t"
        : m === "POST" && (p === "/api/v1/scan" || p === "/api/v1/verify"),
  },
  {
    name: "embed",
    limit: 120,
    match: (m, p) => m === "GET" && (p === "/embed" || p.startsWith("/embed/")),
  },
];

const HITS = new Map<string, number[]>();

function limited(key: string, limit: number): boolean {
  const now = Date.now();
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(key, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > limit;
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const tier = TIERS.find((t) => t.match(req.method, path));
  if (tier) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (limited(`${tier.name}:${ip}`, tier.limit)) {
      if (path.startsWith("/api/"))
        return NextResponse.json(
          { error: "rate limited (30/min) — responses are cache-friendly, retry shortly" },
          { status: 429, headers: { "retry-after": "60" } },
        );
      return new NextResponse("rate limited — retry in a minute\n", {
        status: 429,
        headers: { "retry-after": "60", "content-type": "text/plain" },
      });
    }
  }

  const nonce = btoa(crypto.randomUUID());
  // Carve-out: /embed is the one surface allowed to be framed (it is the
  // embeddable verdict widget), so its CSP omits frame-ancestors entirely.
  // Every other path keeps frame-ancestors 'none'. Query strings are
  // irrelevant — the decision is pathname-only.
  const isEmbed = path === "/embed" || path.startsWith("/embed");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
  requestHeaders.set("x-nonce", nonce);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
