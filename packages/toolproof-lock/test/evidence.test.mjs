import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendReceipt,
  verifyEvidence,
  readReceipts,
  exportEvidence,
  verifyExport,
  ensureKey,
  resolveActor,
  canonicalHash,
} from "../src/evidence.mjs";

function tmp() {
  return mkdtempSync(path.join(os.tmpdir(), "tpe-"));
}

function sampleReceipt(dir, decision = "in-sync", extra = {}) {
  return appendReceipt({
    dir,
    decision,
    exitCode: 0,
    target: "https://mcp.example.com/mcp",
    baselineFingerprint: "sha256:" + "a".repeat(64),
    observedFingerprint: "sha256:" + "b".repeat(64),
    changeSummary: { block: 0, review: 0, informational: 0 },
    policy: "built-in default",
    actor: "dev@example.com",
    ...extra,
  });
}

test("ensureKey generates a persistent pair and reuses it", () => {
  const dir = tmp();
  const a = ensureKey(dir);
  const b = ensureKey(dir);
  assert.equal(a.privateKey, b.privateKey);
  assert.ok(a.publicKey.includes("BEGIN PUBLIC KEY"));
});

test("receipts chain: each prev links to the previous hash", () => {
  const dir = tmp();
  const r0 = sampleReceipt(dir);
  const r1 = sampleReceipt(dir, "review-required");
  assert.equal(r0.prev, null);
  assert.equal(r1.prev, r0.hash);
  assert.notEqual(r0.hash, r1.hash);
});

test("receipt hash covers the stored fields", () => {
  const dir = tmp();
  const r = sampleReceipt(dir);
  const { hash, signature, ...body } = r;
  assert.equal(canonicalHash(body), hash);
});

test("verifyEvidence passes on a clean chain", () => {
  const dir = tmp();
  sampleReceipt(dir);
  sampleReceipt(dir, "review-required");
  const res = verifyEvidence(dir);
  assert.equal(res.ok, true, JSON.stringify(res.problems));
  assert.equal(res.count, 2);
});

test("tampering with a receipt is detected", () => {
  const dir = tmp();
  sampleReceipt(dir);
  sampleReceipt(dir, "blocked");
  const file = path.join(dir, "evidence.jsonl");
  const lines = readFileSync(file, "utf8").trim().split("\n");
  const tampered = JSON.parse(lines[1]);
  tampered.actor = "attacker@example.com"; // any edit lands outside the hash
  lines[1] = JSON.stringify(tampered);
  writeFileSync(file, lines.join("\n") + "\n");
  const res = verifyEvidence(dir);
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => p.includes("altered") || p.includes("chain")));
});

test("a forged signature is detected", () => {
  const dir = tmp();
  sampleReceipt(dir);
  const file = path.join(dir, "evidence.jsonl");
  const lines = readFileSync(file, "utf8").trim().split("\n");
  const rec = JSON.parse(lines[0]);
  rec.signature = "A".repeat(86); // plausible-length but invalid base64 signature
  lines[0] = JSON.stringify(rec);
  writeFileSync(file, lines.join("\n") + "\n");
  const res = verifyEvidence(dir);
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => p.includes("signature")));
});

test("export + verify roundtrip, full range", () => {
  const dir = tmp();
  sampleReceipt(dir);
  sampleReceipt(dir, "review-required");
  sampleReceipt(dir, "blocked");
  const bundle = exportEvidence({ dir, from: 0 });
  assert.equal(bundle.receipts.length, 3);
  assert.equal(verifyExport(bundle).ok, true);
});

test("export is selective: a range leaves the rest behind", () => {
  const dir = tmp();
  sampleReceipt(dir);
  sampleReceipt(dir, "review-required");
  sampleReceipt(dir, "blocked");
  const bundle = exportEvidence({ dir, from: 1, to: 2 });
  assert.equal(bundle.receipts.length, 2);
  assert.equal(bundle.receipts[0].decision, "review-required");
  const res = verifyExport(bundle);
  assert.equal(res.ok, true, JSON.stringify(res.problems));
});

test("export with an out-of-range range is rejected", () => {
  const dir = tmp();
  sampleReceipt(dir);
  assert.throws(() => exportEvidence({ dir, from: 5, to: 9 }), /bad evidence range/);
});

test("an exported receipt with swapped content fails verification", () => {
  const dir = tmp();
  sampleReceipt(dir);
  sampleReceipt(dir, "blocked");
  const bundle = exportEvidence({ dir, from: 0 });
  bundle.receipts[1].decision = "in-sync"; // downgrade the verdict
  const res = verifyExport(bundle);
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => p.includes("altered")));
});

test("receipts carry no prompt content, tool arguments or results", () => {
  const dir = tmp();
  const r = sampleReceipt(dir);
  const serialized = JSON.stringify(r);
  for (const banned of ["prompt", "arguments", "result", "content", "credential", "secret"]) {
    assert.ok(!serialized.toLowerCase().includes(banned), `receipt leaks "${banned}"`);
  }
  // The evidence directory holds only keys and the chain, nothing else.
  const names = readdirSync(dir).sort();
  assert.deepEqual(names, ["evidence-key.pem", "evidence-key.pub.pem", "evidence.jsonl"]);
});

test("resolveActor precedence: env over git identity over unknown", () => {
  assert.equal(resolveActor({ TOOLPROOF_ACTOR: "ci@example.com" }, "git@example.com"), "ci@example.com");
  assert.equal(resolveActor({}, "git@example.com"), "git@example.com");
  assert.equal(resolveActor({}, null), "unknown");
});

test("a decision can be recorded and read back", () => {
  const dir = tmp();
  sampleReceipt(dir, "blocked", { exitCode: 2 });
  const [r] = readReceipts(dir);
  assert.equal(r.decision, "blocked");
  assert.equal(r.exitCode, 2);
  assert.equal(r.kind, "toolproof.evidence");
});
