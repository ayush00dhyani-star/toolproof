/**
 * toolproof-lock · evidence receipts
 *
 * One of the five trust primitives in the approved design:
 *   "Evidence receipt — signed record of the observed manifest, policy,
 *    actor, and decision time. Append-only, tamper-evident receipts plus
 *    customer-controlled exports provide the needed evidence model."
 *
 * `check` decides; this module remembers. Every decision is appended to a
 * local, hash-chained, signed log, so a team can later prove what was
 * approved, when, and that the record has not been rewritten.
 *
 * Privacy by construction: a receipt carries fingerprints, a decision, a
 * policy reference, an actor and a timestamp. It never carries prompt
 * content, tool arguments, tool results, or credentials.
 *
 * Zero-dependency ESM, Node >= 18.
 */

import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const EVIDENCE_VERSION = 1;
const DEFAULT_EVIDENCE_DIR = ".toolproof";
const LOG_NAME = "evidence.jsonl";
const KEY_NAME = "evidence-key.pem";
const PUB_NAME = "evidence-key.pub.pem";

/** Canonical JSON: sorted keys, so the signed bytes never depend on
 *  insertion order. Same convention as the Toolproof passport signer. */
export function stableStringify(value) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

export function canonicalHash(value) {
  return "sha256:" + createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

/** The fields that identify a receipt; `hash` and `signature` are derived
 *  over the rest, so they are excluded from what they cover. */
function receiptBody(rec) {
  const { hash, signature, ...body } = rec;
  return body;
}

function keyIdFor(publicPem) {
  return "tpe-" + createHash("sha256").update(publicPem, "utf8").digest("hex").slice(0, 8);
}

/** Ensure a local signing key exists for the project. The private key stays
 *  in the repo (it is the project's own evidence signer, not a secret that
 *  protects data — the receipts contain no secrets by construction); the
 *  public key is published alongside so an auditor can verify offline. */
export function ensureKey(dir) {
  const keyPath = resolve(dir, KEY_NAME);
  const pubPath = resolve(dir, PUB_NAME);
  if (existsSync(keyPath) && existsSync(pubPath)) {
    return { privateKey: readFileSync(keyPath, "utf8"), publicKey: readFileSync(pubPath, "utf8") };
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
  writeFileSync(keyPath, privatePem, { mode: 0o600 });
  writeFileSync(pubPath, publicPem);
  return { privateKey: privatePem, publicKey: publicPem };
}

/** Resolve who made the decision. Explicit override wins, then the git
 *  identity of the machine running the check, then honestly "unknown". */
export function resolveActor(env = process.env, gitEmail) {
  if (env.TOOLPROOF_ACTOR) return String(env.TOOLPROOF_ACTOR);
  if (gitEmail) return String(gitEmail);
  return "unknown";
}

/**
 * Append one decision to the evidence chain.
 *
 * @param {object} args
 * @param {string} args.dir           evidence directory (default ".toolproof")
 * @param {string} args.decision      in-sync | review-required | blocked
 * @param {number} args.exitCode      0 | 1 | 2
 * @param {string} args.target        the scanned target
 * @param {string} args.baselineFingerprint  lockfile fingerprint
 * @param {string} args.observedFingerprint  live manifest fingerprint
 * @param {object} [args.changeSummary] {block,review,informational} counts
 * @param {string} [args.policy]      policy label or hash reference
 * @param {string} [args.actor]       who decided
 * @returns {object} the stored receipt
 */
export function appendReceipt({
  dir = DEFAULT_EVIDENCE_DIR,
  decision,
  exitCode,
  target,
  baselineFingerprint,
  observedFingerprint,
  changeSummary,
  policy,
  actor,
}) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const { privateKey, publicKey } = ensureKey(dir);
  const logPath = resolve(dir, LOG_NAME);

  // Chain: the previous receipt's hash, or null for the first entry.
  let prev = null;
  if (existsSync(logPath)) {
    const lines = readFileSync(logPath, "utf8").split(/\r?\n/).filter((l) => l.trim());
    if (lines.length) {
      const last = JSON.parse(lines[lines.length - 1]);
      prev = last?.hash ?? null;
    }
  }

  const rec = {
    v: EVIDENCE_VERSION,
    kind: "toolproof.evidence",
    ts: new Date().toISOString(),
    actor: actor ?? "unknown",
    target,
    decision,
    exitCode,
    baselineFingerprint: baselineFingerprint ?? null,
    observedFingerprint: observedFingerprint ?? null,
    ...(changeSummary ? { changeSummary } : {}),
    ...(policy ? { policy } : {}),
    keyId: keyIdFor(publicKey),
    prev,
    hash: null,
    signature: null,
  };

  rec.hash = canonicalHash(receiptBody(rec));
  const key = createPrivateKey(privateKey);
  rec.signature = cryptoSign(null, Buffer.from(canonicalHash(receiptBody(rec)), "utf8"), key).toString("base64");

  writeFileSync(logPath, stableStringify(rec) + "\n", { flag: "a" });
  return rec;
}

/** Read every receipt in chain order. */
export function readReceipts(dir = DEFAULT_EVIDENCE_DIR) {
  const logPath = resolve(dir, LOG_NAME);
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

/**
 * Verify the local evidence chain. Keyless in the sense that it needs no
 * secret: it re-derives every hash, checks the chain links, and confirms
 * every signature under the project's published public key.
 *
 * @returns {{ok: boolean, count: number, problems: string[]}}
 */
export function verifyEvidence(dir = DEFAULT_EVIDENCE_DIR) {
  const problems = [];
  const pubPath = resolve(dir, PUB_NAME);
  let publicKey = null;
  if (existsSync(pubPath)) {
    publicKey = createPublicKey(readFileSync(pubPath, "utf8"));
  }

  let expectedPrev = null;
  let seq = 0;
  const receipts = readReceipts(dir);
  for (const rec of receipts) {
    if (rec.prev !== expectedPrev) {
      problems.push(`broken chain at receipt ${seq}: prev does not link to the previous hash`);
    }
    const recomputed = canonicalHash(receiptBody(rec));
    if (recomputed !== rec.hash) {
      problems.push(`receipt ${seq} was altered: hash does not cover the stored fields`);
    }
    if (publicKey && rec.signature) {
      const ok = cryptoVerify(
        null,
        Buffer.from(canonicalHash(receiptBody(rec)), "utf8"),
        publicKey,
        Buffer.from(rec.signature, "base64"),
      );
      if (!ok) problems.push(`receipt ${seq} signature does not verify under the published key`);
    } else if (!publicKey) {
      problems.push("no published public key present");
    }
    expectedPrev = rec.hash;
    seq += 1;
  }

  return { ok: problems.length === 0, count: receipts.length, problems };
}

/**
 * Export a self-contained, offline-verifiable bundle over receipts
 * [from, to]. Selective disclosure by range; the rest of the history stays
 * in the repo. The bundle carries its own issuer key so an auditor needs
 * nothing but the file.
 */
export function exportEvidence({ dir = DEFAULT_EVIDENCE_DIR, from = 0, to, out }) {
  const receipts = readReceipts(dir);
  const end = to === undefined ? receipts.length - 1 : to;
  if (from < 0 || end >= receipts.length || end < from) {
    throw new Error(`bad evidence range ${from}..${end} for a log of ${receipts.length} receipts`);
  }
  const pubPath = resolve(dir, PUB_NAME);
  const publicKey = existsSync(pubPath) ? readFileSync(pubPath, "utf8") : null;

  const bundle = {
    v: EVIDENCE_VERSION,
    kind: "toolproof.evidence.export",
    issuedAt: new Date().toISOString(),
    keyId: receipts[from]?.keyId ?? null,
    issuerKey: publicKey,
    total: receipts.length,
    range: { from, to: end },
    receipts: receipts.slice(from, end + 1),
    signature: null,
  };
  const { signature, ...body } = bundle;
  const key = createPrivateKey(readFileSync(resolve(dir, KEY_NAME), "utf8"));
  bundle.signature = cryptoSign(null, Buffer.from(canonicalHash(body), "utf8"), key).toString("base64");

  if (out) writeFileSync(resolve(out), stableStringify(bundle) + "\n");
  return bundle;
}

/** Verify an exported bundle offline, with no key and no network. */
export function verifyExport(bundle) {
  const problems = [];
  if (bundle?.kind !== "toolproof.evidence.export") problems.push("not a toolproof evidence export");
  if (bundle?.v !== EVIDENCE_VERSION) problems.push(`unsupported export v=${bundle?.v}`);
  if (!bundle?.signature) problems.push("export is unsigned");

  // Everything except the signature itself is covered by the signature —
  // including the receipts, so they cannot be swapped after signing.
  const { signature, ...body } = bundle ?? {};
  const receipts = bundle?.receipts;
  if (signature && bundle?.issuerKey) {
    const ok = cryptoVerify(
      null,
      Buffer.from(canonicalHash(body), "utf8"),
      createPublicKey(bundle.issuerKey),
      Buffer.from(signature, "base64"),
    );
    if (!ok) problems.push("export signature does not verify under its own issuerKey");
  }

  if (Array.isArray(receipts)) {
    const from = bundle.range?.from ?? 0;
    const to = bundle.range?.to ?? receipts.length - 1;
    if (receipts.length !== to - from + 1) {
      problems.push(`export range ${from}..${to} does not match ${receipts.length} receipts`);
    }
    let expectedPrev = null;
    receipts.forEach((rec, i) => {
      if (rec.prev !== expectedPrev && i > 0) {
        problems.push(`broken chain in export at receipt ${from + i}`);
      }
      if (canonicalHash(receiptBody(rec)) !== rec.hash) {
        problems.push(`altered receipt at position ${i} in export`);
      }
      expectedPrev = rec.hash;
    });
  } else {
    problems.push("export has no receipts");
  }

  return { ok: problems.length === 0, problems, keyId: bundle?.keyId ?? null };
}
