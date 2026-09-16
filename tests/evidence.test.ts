/**
 * Cross-implementation check: the browser verifier must accept bundles the
 * CLI mints. The CLI signs with node:crypto; verifyBundle verifies with Web
 * Crypto. If either side drifts on canonical form, digest, or signature
 * framing, these fail.
 */
import { describe, expect, it } from "vitest";
import {
  appendReceipt,
  exportEvidence,
  verifyExport,
} from "../packages/toolproof-lock/src/evidence.mjs";
import { stableStringify, verifyBundle, canonicalHash } from "../src/lib/evidence";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function tmpDir() {
  return mkdtempSync(join(tmpdir(), "tp-evidence-"));
}

/**
 * The CLI package is untyped ESM, so TS infers `to`/`out` as required even
 * though both are optional at runtime. `to: undefined` means "to the end",
 * `out: undefined` means "return the bundle, don't write a file".
 */
function exportOf(opts: { dir: string; from: number; to?: number }) {
  return exportEvidence({
    dir: opts.dir,
    from: opts.from,
    to: opts.to ?? undefined,
    out: undefined,
  });
}

/** Mint a realistic chain in a temp evidence dir. */
function mint(dir: string, n = 3) {
  for (let i = 0; i < n; i++) {
    appendReceipt({
      dir,
      decision: i === 1 ? "blocked" : "in-sync",
      exitCode: i === 1 ? 2 : 0,
      target: "https://mcp.example.com/mcp",
      baselineFingerprint: "sha256:aaaa",
      observedFingerprint: `sha256:${i}`,
      changeSummary: { block: i === 1 ? 1 : 0, review: 0, informational: 0 },
      policy: "built-in default",
      actor: "dev@example.com",
    });
  }
}

describe("canonical form parity", () => {
  it("stableStringify sorts keys exactly as the CLI does", () => {
    const input = { b: 1, a: { d: 4, c: 3 }, z: [1, 2] };
    expect(stableStringify(input)).toBe(
      JSON.stringify({ a: { c: 3, d: 4 }, b: 1, z: [1, 2] }),
    );
  });

  it("canonicalHash matches the CLI byte for byte", async () => {
    const value = { target: "https://x", n: 1, list: ["b", "a"] };
    const cli = (await import("../packages/toolproof-lock/src/evidence.mjs"))
      .canonicalHash(value);
    expect(await canonicalHash(value)).toBe(cli);
  });
});

describe("browser verifier accepts CLI-minted bundles", () => {
  it("verifies a full-range export", async () => {
    const dir = tmpDir();
    mint(dir, 3);
    const bundle = exportOf({ dir, from: 0 });
    expect(verifyExport(bundle).ok).toBe(true);

    const r = await verifyBundle(bundle);
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.count).toBe(3);
    expect(r.total).toBe(3);
    expect(r.keyId).toBe(bundle.keyId);
  });

  it("verifies a selective range", async () => {
    const dir = tmpDir();
    mint(dir, 5);
    const bundle = exportOf({ dir, from: 2, to: 4 });
    const r = await verifyBundle(bundle);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(3);
    expect(r.range).toEqual({ from: 2, to: 4 });
    expect(r.total).toBe(5);
  });

  it("reads the decision history out of the bundle", async () => {
    const dir = tmpDir();
    mint(dir, 3);
    const bundle = exportOf({ dir, from: 0 });
    const r = await verifyBundle(bundle);
    expect(r.bundle?.receipts[1].decision).toBe("blocked");
    expect(r.bundle?.receipts[0].actor).toBe("dev@example.com");
  });
});

describe("browser verifier detects tampering", () => {
  it("rejects a decision rewritten after signing", async () => {
    const dir = tmpDir();
    mint(dir, 3);
    const bundle = exportOf({ dir, from: 0 });
    bundle.receipts[1].decision = "in-sync" as never;
    const r = await verifyBundle(bundle);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(/altered receipt|signature does not verify/);
  });

  it("rejects a receipt swapped in from another chain", async () => {
    const a = tmpDir();
    const b = tmpDir();
    mint(a, 3);
    mint(b, 3);
    const bundle = exportOf({ dir: a, from: 0 });
    const other = exportOf({ dir: b, from: 0 });
    bundle.receipts[1] = other.receipts[1];
    const r = await verifyBundle(bundle);
    expect(r.ok).toBe(false);
  });

  it("rejects a forged signature over modified contents", async () => {
    const dir = tmpDir();
    mint(dir, 2);
    const bundle = exportOf({ dir, from: 0 });
    bundle.range = { from: 0, to: 9 }; // lies about the range
    const r = await verifyBundle(bundle);
    expect(r.ok).toBe(false);
  });

  it("rejects a bundle that is not an evidence export", async () => {
    const r = await verifyBundle({ kind: "something.else", v: 1 });
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toMatch(/not a toolproof evidence export/);
  });

  it("rejects a bundle with no receipts", async () => {
    const r = await verifyBundle({
      kind: "toolproof.evidence.export",
      v: 1,
      signature: "x",
      issuerKey: "x",
      receipts: [],
      range: { from: 0, to: 0 },
    });
    expect(r.ok).toBe(false);
  });
});

