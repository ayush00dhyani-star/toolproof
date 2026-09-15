#!/usr/bin/env node
/**
 * toolproof-gate — policy enforcement for the AI tool supply chain.
 *
 * The CI-runnable control: verify every MCP server / API your project
 * depends on, against a committed baseline, with cryptographically
 * verified verdicts. Fails the build when:
 *   - a tool's model-visible surface changed since the baseline (drift)
 *   - a tool's grade fell below your minimum (policy)
 *   - a verdict could not be cryptographically verified (trust)
 *
 *   toolproof-gate --init <target>...     create a baseline
 *   toolproof-gate                        verify against baseline
 *   toolproof-gate --update               re-pin and rewrite baseline
 *   toolproof-gate --json                 machine-readable output
 *   toolproof-gate --audit audit.jsonl    append signed evidence (JSONL)
 *
 * Baseline (.toolproof-baseline.json) — commit it. Review diffs like
 * code, because that is exactly what changed: the instructions your
 * agents read. Exit codes: 0 = pass, 1 = violation, 2 = error.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";

const API = (process.env.TOOLPROOF_API ?? "https://toolproof-scan.vercel.app").replace(/\/$/, "");
const DEFAULT_BASELINE = ".toolproof-baseline.json";
const VERSION = "0.2.1";

const GRADES = ["F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
function gradeRank(g) {
  const i = GRADES.indexOf(String(g ?? "").trim().toUpperCase());
  return i === -1 ? -1 : i;
}

const log = (...a) => process.stderr.write(`[toolproof-gate] ${a.join("\n    ")}\n`);

/* ---------- args ---------- */

function parseArgs(argv) {
  const args = {
    init: false, update: false, json: false, strict: false,
    audit: null, baseline: DEFAULT_BASELINE, minGrade: null, targets: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--init") args.init = true;
    else if (a === "--update") args.update = true;
    else if (a === "--json") args.json = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "--audit") args.audit = argv[++i];
    else if (a === "--baseline") args.baseline = argv[++i];
    else if (a === "--min-grade") args.minGrade = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--version" || a === "-v") args.version = true;
    else if (!a.startsWith("--")) args.targets.push(a);
    else { log(`unknown flag: ${a}`); process.exit(2); }
  }
  return args;
}

/* ---------- deterministic JSON (mirrors the signer byte-for-byte) ---------- */

function stableStringify(value) {
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

/* ---------- remote verdict with signature verification ---------- */

let cachedPubkey = null;
async function getPubkeyPem() {
  if (cachedPubkey !== null) return cachedPubkey;
  const res = await fetch(`${API}/api/v1/pubkey`, { signal: AbortSignal.timeout(15_000) });
  const pem = (await res.text()).trim();
  cachedPubkey = pem === "unconfigured" || !pem.startsWith("-----BEGIN") ? null : pem;
  return cachedPubkey;
}

async function verdictOf(target, kind = "auto") {
  const res = await fetch(
    `${API}/api/v1/verify?target=${encodeURIComponent(target)}&kind=${kind}`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  const passport = body.passport;
  if (!passport) throw new Error("response missing passport");
  let signatureVerified = false;
  const pem = await getPubkeyPem();
  if (pem && body.signature && body.alg === "ed25519") {
    try {
      const key = createPublicKey(pem);
      signatureVerified = cryptoVerify(
        null,
        Buffer.from(stableStringify(passport), "utf8"),
        key,
        Buffer.from(body.signature, "base64"),
      );
    } catch {
      signatureVerified = false;
    }
  }
  return { passport, signature: body.signature ?? null, keyId: body.keyId ?? null, signatureVerified };
}

/* ---------- baseline I/O ---------- */

function loadBaseline(path) {
  if (!existsSync(path)) return { version: 1, updated: null, policy: {}, targets: {} };
  try {
    return { version: 1, policy: {}, targets: {}, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    log(`baseline ${path} is not valid JSON: ${e.message}`);
    process.exit(2);
  }
}

function saveBaseline(path, b) {
  b.updated = new Date().toISOString();
  writeFileSync(path, JSON.stringify(b, null, 2) + "\n");
}

/* ---------- audit evidence (JSONL) ---------- */

function auditLine(path, entry) {
  if (!path) return;
  try {
    appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  } catch (e) {
    log(`audit write failed (${e.message}) — continuing`);
  }
}

/* ---------- policy checks ---------- */

function checkTarget(name, verdict, base, policy) {
  const p = verdict.passport;
  const issues = [];
  const minGrade = policy.minGrade ?? null;

  if (!verdict.signatureVerified) {
    issues.push({
      code: "TRUST",
      detail:
        verdict.keyId === "dev-unsigned"
          ? "scanner is running unsigned — verdict cannot be trusted"
          : "signature missing or invalid for this verdict",
    });
  }
  if (p.state !== "verified") {
    issues.push({ code: "UNVERIFIED", detail: `state is "${p.state}" — surface could not be verified` });
  } else if (base?.toolTextHash && p.toolTextHash && p.toolTextHash !== base.toolTextHash) {
    issues.push({
      code: "DRIFT",
      detail: `model-visible text changed since baseline (was ${base.toolTextHash.slice(0, 12)}…, now ${p.toolTextHash.slice(0, 12)}…) — review the diff, then re-pin with --update`,
    });
  }
  if (minGrade) {
    const rank = gradeRank(p.grade);
    if (rank < gradeRank(minGrade)) {
      issues.push({ code: "GRADE", detail: `grade ${p.grade} is below policy minimum ${minGrade}` });
    }
  }
  return { name, passport: p, signature: verdict.signature, signatureVerified: verdict.signatureVerified, keyId: verdict.keyId, issues };
}

/* ---------- main ---------- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      `toolproof-gate v${VERSION} — policy gate for the AI tool supply chain\n\n` +
      `  toolproof-gate --init <target>...   create baseline from fresh verified scans\n` +
      `  toolproof-gate                      verify all baseline targets (fails on drift/grade/trust)\n` +
      `  toolproof-gate --update             re-pin every target to current state\n` +
      `  --min-grade B                       fail when a grade is below B (stored in baseline policy)\n` +
      `  --baseline <path>                   baseline file (default .toolproof-baseline.json)\n` +
      `  --audit <file.jsonl>                append one signed-evidence JSONL line per check\n` +
      `  --json                              machine-readable result on stdout\n\n` +
      `Exit codes: 0 pass · 1 violation · 2 error. API: ${API}\n`,
    );
    return 0;
  }
  if (args.version) { process.stdout.write(`${VERSION}\n`); return 0; }

  const baseline = loadBaseline(args.baseline);
  if (args.minGrade) baseline.policy.minGrade = args.minGrade;

  const names = [...new Set([...args.targets, ...Object.keys(baseline.targets)])];
  if (names.length === 0) {
    log(`no targets. Init one first:  toolproof-gate --init https://mcp.example.com/mcp`);
    return 2;
  }

  const results = [];
  for (const name of names) {
    const kind = baseline.targets[name]?.kind ?? "auto";
    let verdict;
    try {
      verdict = await verdictOf(name, kind);
    } catch (e) {
      results.push({ name, error: e.message, issues: [{ code: "ERROR", detail: e.message }] });
      continue;
    }
    const p = verdict.passport;
    if (args.init || args.update) {
      baseline.targets[name] = {
        kind: p.kind === "openapi" ? "api" : p.kind,
        grade: p.grade,
        state: p.state,
        scannedAt: p.scannedAt,
        toolTextHash: p.toolTextHash ?? null,
      };
    }
    results.push(checkTarget(name, verdict, baseline.targets[name], baseline.policy));
  }

  if (args.init || args.update) saveBaseline(args.baseline, baseline);

  for (const r of results) {
    auditLine(args.audit, {
      event: r.error ? "gate-error" : r.issues.length ? "gate-violation" : "gate-pass",
      target: r.name,
      grade: r.passport?.grade,
      score: r.passport?.score,
      state: r.passport?.state,
      toolTextHash: r.passport?.toolTextHash,
      signatureVerified: r.signatureVerified ?? false,
      keyId: r.keyId,
      policy: baseline.policy,
      issues: r.issues?.map((i) => i.code) ?? [],
      // Full signed passport + signature — replayable, third-party-checkable evidence.
      passport: r.passport,
      signature: r.signature,
    });
  }

  const violations = results.filter((r) => (r.issues ?? []).length > 0);

  if (args.json) {
    process.stdout.write(
      JSON.stringify({
        toolproof: "gate", version: VERSION, api: API,
        policy: baseline.policy,
        passed: results.length - violations.length, failed: violations.length,
        results: results.map(({ name, passport, signatureVerified, keyId, issues, error }) => ({
          target: name, grade: passport?.grade, score: passport?.score, state: passport?.state,
          toolTextHash: passport?.toolTextHash, signatureVerified, keyId, issues, error,
        })),
      }, null, 2) + "\n",
    );
  } else {
    const line = (s) => process.stderr.write(s + "\n");
    line(`toolproof-gate v${VERSION} — ${results.length} target(s), policy: ${JSON.stringify(baseline.policy)}`);
    for (const r of results) {
      if (r.error) { line(`  ✗ ${r.name} — ERROR: ${r.error}`); continue; }
      const sig = r.signatureVerified ? "sig✓" : "sig✗";
      if (r.issues.length === 0) {
        line(`  ✓ ${r.name} — ${r.passport.grade} (${r.passport.score}/100) · ${sig}`);
      } else {
        line(`  ✗ ${r.name} — ${r.passport.grade} · ${sig}`);
        for (const i of r.issues) line(`      ${i.code}: ${i.detail}`);
        line(`      review: ${API}/t?target=${encodeURIComponent(r.name)}`);
      }
    }
    line(violations.length === 0
      ? `  all ${results.length - violations.length} target(s) passed policy`
      : `  ${violations.length} of ${results.length} target(s) FAILED policy`);
  }

  return violations.length === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    log(`fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  });
