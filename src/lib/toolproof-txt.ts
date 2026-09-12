import { fetchX } from "./net";

export interface ParsedToolproofTxt {
  deny: string[];
  allow: string[];
  canary?: string;
}

/**
 * Parse a toolproof.txt body: `Deny: <path>`, `Allow: <path>`,
 * `Canary: <token>` lines, `#` comments, blank lines ignored.
 * Keys are case-insensitive; lines and values are trimmed.
 */
export function parseToolproofTxt(text: string): ParsedToolproofTxt {
  const deny: string[] = [];
  const allow: string[] = [];
  let canary: string | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (!value) continue;
    if (key === "deny") deny.push(value);
    else if (key === "allow") allow.push(value);
    else if (key === "canary") canary = value;
  }
  return canary === undefined ? { deny, allow } : { deny, allow, canary };
}

/**
 * Does a toolproof.txt path pattern cover `pathname`?
 * `/` and `*` match everything; anything else is a plain prefix match.
 */
export function matchesPath(pattern: string, pathname: string): boolean {
  if (pattern === "/" || pattern === "*") return true;
  return pathname.startsWith(pattern);
}

/**
 * Fetch `${origin}/.well-known/toolproof.txt`. Returns null on any
 * error, non-200 status, or unparseable body. The body is parsed
 * regardless of content-type — a site serving the file as
 * `application/octet-stream` still gets its Deny lines honored; only a
 * fetch failure, non-200, or unparseable body means "no policy".
 */
export async function fetchToolproofTxt(
  origin: string,
): Promise<ParsedToolproofTxt | null> {
  try {
    const res = await fetchX(`${origin}/.well-known/toolproof.txt`, {
      timeoutMs: 4000,
    });
    if (res.status !== 200) return null;
    return parseToolproofTxt(await res.text());
  } catch {
    return null;
  }
}
