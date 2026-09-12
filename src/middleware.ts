import { NextRequest, NextResponse } from "next/server";

const WINDOW = 60_000;
const LIMIT = 30;
const HITS = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > LIMIT;
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    (path === "/api/v1/scan" || path === "/api/v1/verify") &&
    (req.method === "GET" || req.method === "POST")
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (limited(ip))
      return NextResponse.json(
        { error: "rate limited (30/min) — responses are cache-friendly, retry shortly" },
        { status: 429, headers: { "retry-after": "60" } },
      );
  }

  const nonce = btoa(crypto.randomUUID());
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
    `frame-ancestors 'none'`,
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
