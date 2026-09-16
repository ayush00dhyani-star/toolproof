/**
 * Evidence verification — the browser side of the export primitive.
 *
 * `toolproof-lock` writes and signs evidence receipts with Node's crypto; this
 * module re-verifies an exported bundle with the Web Crypto API, so an auditor
 * needs nothing but a browser. The bundle never leaves their machine.
 *
 * Byte-compatible with packages/toolproof-lock/src/evidence.mjs:
 *  - stableStringify sorts keys exactly as the CLI does
 *  - canonicalHash is "sha256:" + utf8-hex of the canonical form
 *  - ed25519 signatures are raw 64 bytes on both sides (no ASN.1 wrap)
 *  - the signature covers every field except `signature` itself
 */
import type { EvidenceBundle, EvidenceReceipt } from "./evidence-types";

/** Canonical JSON — same ordering rule as the CLI signer. */
export function stableStringify(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj).sort()) out[k] = walk(obj[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

const te = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Same digest the CLI computes with node:crypto. */
export async function canonicalHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(stableStringify(value)));
  return "sha256:" + toHex(digest);
}

function b64ToBytes(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Strip PEM armor to the raw SPKI DER Web Crypto imports. */
function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export interface VerifyResult {
  ok: boolean;
  problems: string[];
  bundle: EvidenceBundle | null;
  count: number;
  keyId: string | null;
  issuedAt: string | null;
  range: { from: number; to: number } | null;
  total: number | null;
}

const EMPTY: VerifyResult = {
  ok: false,
  problems: [],
  bundle: null,
  count: 0,
  keyId: null,
  issuedAt: null,
  range: null,
  total: null,
};

/**
 * Verify an exported evidence bundle in the browser. Mirrors verifyExport in
 * the CLI: signature over everything but itself, plus a hash and chain check
 * on every receipt in range.
 */
export async function verifyBundle(input: unknown): Promise<VerifyResult> {
  const problems: string[] = [];
  const b = input as Partial<EvidenceBundle> | null;

  if (!b || typeof b !== "object") {
    return { ...EMPTY, problems: ["not a JSON object"] };
  }
  if (b.kind !== "toolproof.evidence.export")
    problems.push("not a toolproof evidence export (kind mismatch)");
  if (b.v !== 1) problems.push(`unsupported export v=${b.v ?? "?"}`);
  if (!b.signature) problems.push("export is unsigned");

  // The signature covers every field except itself — receipts included, so
  // they cannot be swapped after signing.
  const { signature, ...body } = b;
  const receipts = Array.isArray(b.receipts) ? (b.receipts as EvidenceReceipt[]) : null;

  if (signature && b.issuerKey) {
    try {
      const key = await crypto.subtle.importKey(
        "spki",
        pemToDer(b.issuerKey),
        { name: "Ed25519" },
        false,
        ["verify"],
      );
      const expected = await canonicalHash(body);
      const valid = await crypto.subtle.verify(
        "Ed25519",
        key,
        b64ToBytes(signature),
        te.encode(expected),
      );
      if (!valid)
        problems.push("export signature does not verify under its own issuerKey");
    } catch (e) {
      problems.push(
        `could not verify the signature: ${(e as Error).message ?? "bad key"}`,
      );
    }
  } else if (!b.issuerKey) {
    problems.push("export carries no issuer key");
  }

  if (receipts) {
    const from = b.range?.from ?? 0;
    const to = b.range?.to ?? receipts.length - 1;
    if (receipts.length !== to - from + 1)
      problems.push(`export range ${from}..${to} does not match ${receipts.length} receipts`);

    let expectedPrev: string | null = null;
    for (let i = 0; i < receipts.length; i++) {
      const rec = receipts[i];
      // Every receipt links to the one before it; the first links to null.
      if (rec.prev !== expectedPrev && i > 0)
        problems.push(`broken chain in export at receipt ${from + i}`);
      const recomputed = await canonicalHash(restOf(rec));
      if (recomputed !== rec.hash)
        problems.push(`altered receipt at position ${i} in export`);
      expectedPrev = rec.hash;
    }
  } else {
    problems.push("export has no receipts");
  }

  return {
    ok: problems.length === 0,
    problems,
    bundle: b as EvidenceBundle,
    count: receipts?.length ?? 0,
    keyId: b.keyId ?? null,
    issuedAt: b.issuedAt ?? null,
    range: b.range ?? null,
    total: b.total ?? null,
  };
}

/** A receipt minus its derived fields — exactly what its hash covers. */
function restOf(rec: EvidenceReceipt): Omit<EvidenceReceipt, "hash" | "signature"> {
  const rest = { ...rec };
  delete (rest as { hash?: unknown }).hash;
  delete (rest as { signature?: unknown }).signature;
  return rest;
}
