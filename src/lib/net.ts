import { lookup } from "node:dns/promises";

export class TargetError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const BLOCKED_NAMES =
  /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;

function v4IsPrivate(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255))
    return true; // malformed → treat as unsafe
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function v6IsPrivate(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  if (/^f[cd]/.test(s)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(s)) return true; // fe80::/10 link-local
  const mapped = s.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return v4IsPrivate(mapped[1]);
  return false;
}

export function normalizeTarget(raw: string): URL {
  let t = raw.trim();
  if (!t) throw new TargetError("Empty target.", "empty");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) t = "https://" + t;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new TargetError("Not a valid URL.", "bad-url");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:")
    throw new TargetError("Only http(s) targets are scanned.", "scheme");
  if (BLOCKED_NAMES.test(u.hostname))
    throw new TargetError("Internal hosts are not scanned.", "private");
  return u;
}

export async function assertPublicHost(u: URL): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    if (v4IsPrivate(host))
      throw new TargetError("Private/internal hosts are not scanned.", "private");
    return;
  }
  if (host.includes(":")) {
    if (v6IsPrivate(host))
      throw new TargetError("Private/internal hosts are not scanned.", "private");
    return;
  }
  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new TargetError(`DNS lookup failed for ${host}.`, "dns");
  }
  if (!addrs.length)
    throw new TargetError(`No DNS records for ${host}.`, "dns");
  for (const { address, family } of addrs) {
    const priv = family === 6 ? v6IsPrivate(address) : v4IsPrivate(address);
    if (priv)
      throw new TargetError(
        "Target resolves to a private address — not scanned.",
        "private",
      );
  }
}

export async function fetchX(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("user-agent", "toolproof-scanner/0.1 (trust verification)");
  return fetch(url, {
    redirect: "follow",
    ...rest,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
