#!/usr/bin/env node
// toolproof-lock — versioned, human-approved baselines for agent capabilities.
//
//   toolproof lock <target>   fetch the capability manifest, write a signed baseline
//   toolproof check           diff the live surface against the baseline, apply policy
//   toolproof evidence        verify or export the signed decision history
//                             (subcommands: verify, export, show)
//
// Every check decision is appended to .toolproof/evidence.jsonl — a signed,
// hash-chained record of what was decided, by whom, and when. Receipts carry
// fingerprints and decisions only, never prompt content or tool arguments.
//
// Zero runtime dependencies. Node >= 18 (global fetch, AbortSignal.timeout).
// The core logic lives in ./src/*.mjs (lockfile, policy, diff, decision); this file
// is only the shell: argv, HTTP, rendering, exit codes.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const DEFAULT_API = "https://toolproof-scan.vercel.app";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_LOCK = "toolproof.lock";
const DEFAULT_EVIDENCE_DIR = ".toolproof";
const KINDS = ["auto", "mcp", "api"];

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = readVersion();

const HELP = `toolproof-lock — versioned, human-approved baselines for agent capabilities.

Write a baseline of an MCP server (or API) capability surface once, approve it, and
let CI fail when that surface drifts past your policy.

SYNOPSIS
  toolproof lock <target> [--kind=auto|mcp|api] [--out=${DEFAULT_LOCK}]
                          [--policy=<path>] [--api=<url>] [--timeout=<ms>]
  toolproof check [--lock=${DEFAULT_LOCK}] [--policy=<path>] [--api=<url>]
                          [--timeout=<ms>] [--json] [--quiet] [--no-evidence]
  toolproof evidence [verify|show|export] [--from <n>] [--to <n>] [--out <f>]
  toolproof --help | -h | --version | -v

COMMANDS
  lock <target>   Fetch the capability manifest and write a baseline lockfile.
  check           Fetch the manifest, diff it against the lockfile, apply policy,
                  and append a signed evidence receipt of the decision.
  evidence        Inspect the signed decision history:
                    verify   re-check the chain and every signature (default)
                    show     list recorded decisions
                    export   write a signed, offline-verifiable bundle

FLAGS
  --kind=auto|mcp|api   Target kind for lock (default: auto)
  --out=<path>          Lockfile to write (default: ${DEFAULT_LOCK})
  --lock=<path>         Lockfile to read for check (default: ${DEFAULT_LOCK})
  --policy=<path>       Policy file (JSON or flat YAML). Default: built-in policy
  --api=<url>           Manifest API base URL (default: ${DEFAULT_API})
  --timeout=<ms>        Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  --json                Print a machine-readable result object
  --quiet               Print a single verdict line
  --no-evidence         Do not append an evidence receipt for this check
  --evidence-dir <path> Evidence store (default: .toolproof)
  --from <n>            First receipt to export (evidence export, default 0)
  --to <n>              Last receipt to export (evidence export, default: all)
  -h, --help            Show this help
  -v, --version         Show the version

EXAMPLES
  npx toolproof-lock lock https://mcp.example.com/mcp
  npx toolproof-lock check
  npx toolproof-lock check --json

EXIT CODES
  0  in sync — informational changes only
  1  review required — a human should approve the drift
  2  blocked — the drift violates policy
  3  usage, lockfile, or network error`;

class UsageError extends Error {}
class CoreError extends Error {}
class ApiError extends Error {
  constructor(message, api) {
    super(message);
    this.api = api;
  }
}

// ---------------------------------------------------------------------------
// Rendering helpers — color only when stdout is a TTY and NO_COLOR is unset.
// ---------------------------------------------------------------------------

const colored = () => !process.env.NO_COLOR && process.stdout.isTTY === true;
const paint = (code, s) => (colored() ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => paint("1", s);
const dim = (s) => paint("90", s);
const green = (s) => paint("92", s);
const red = (s) => paint("91", s);
const amber = (s) => paint("38;5;208", s);

const ACTION_ORDER = { block: 0, review: 1, informational: 2 };

function shortHash(fingerprint) {
  if (!fingerprint) return "no fingerprint";
  return fingerprint.length <= 15 ? fingerprint : `${fingerprint.slice(0, 15)}…`;
}

function hostOf(url) {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return String(url);
  }
}

function tagFor(action) {
  if (action === "block") return red("[BLOCKED]");
  if (action === "review") return amber("[REVIEW]");
  return dim("[INFO]");
}

function verdictLabel(decision) {
  const d = String(decision ?? "").toLowerCase();
  if (d.includes("block")) return "BLOCKED";
  if (d.includes("review")) return "REVIEW";
  return "IN SYNC";
}

function colorizeVerdict(decision, label) {
  const d = String(decision ?? "").toLowerCase();
  if (d.includes("block")) return red(label);
  if (d.includes("review")) return amber(label);
  return green(label);
}

function countByAction(changes) {
  const counts = { block: 0, review: 0, informational: 0 };
  for (const change of changes) {
    const action = change?.action;
    if (action === "block" || action === "review" || action === "informational") {
      counts[action] += 1;
    } else {
      counts.informational += 1;
    }
  }
  return counts;
}

function localSummary(changes) {
  const counts = countByAction(changes);
  const parts = [];
  if (counts.block) parts.push(`${counts.block} blocking`);
  if (counts.review) parts.push(`${counts.review} review`);
  if (counts.informational) parts.push(`${counts.informational} info`);
  if (parts.length === 0) return "no changes";
  return parts.join(", ");
}

function verdictLine(decision, changes, code) {
  return `toolproof: ${verdictLabel(decision)} (${localSummary(changes)}) · exit ${code}`;
}

function sortedChanges(changes) {
  return [...changes].sort(
    (a, b) =>
      (ACTION_ORDER[a?.action] ?? 3) - (ACTION_ORDER[b?.action] ?? 3) ||
      String(a?.category ?? "").localeCompare(String(b?.category ?? "")) ||
      String(a?.message ?? "").localeCompare(String(b?.message ?? "")),
  );
}

// ---------------------------------------------------------------------------
// argv
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    command: null,
    target: null,
    extra: [],
    kind: "auto",
    out: DEFAULT_LOCK,
    lock: DEFAULT_LOCK,
    policy: null,
    api: DEFAULT_API,
    timeout: DEFAULT_TIMEOUT,
    json: false,
    quiet: false,
    noEvidence: false,
    evidenceDir: DEFAULT_EVIDENCE_DIR,
    help: false,
    version: false,
  };
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-") || arg === "-") {
      positionals.push(arg);
      continue;
    }
    let name = arg;
    let inline;
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        name = arg.slice(0, eq);
        inline = arg.slice(eq + 1);
      }
    }
    const takeValue = () => {
      if (inline !== undefined) return inline;
      const next = argv[i + 1];
      if (next === undefined || (next.startsWith("-") && next !== "-")) {
        throw new UsageError(`${name} expects a value`);
      }
      i += 1;
      return next;
    };
    const noValue = () => {
      if (inline !== undefined) throw new UsageError(`${name} does not take a value`);
    };

    switch (name) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-v":
      case "--version":
        opts.version = true;
        break;
      case "--json":
        noValue();
        opts.json = true;
        break;
      case "--quiet":
        noValue();
        opts.quiet = true;
        break;
      case "--no-evidence":
        noValue();
        opts.noEvidence = true;
        break;
      case "--evidence-dir":
        opts.evidenceDir = takeValue();
        break;
      case "--from":
        opts.from = takeValue();
        break;
      case "--to":
        opts.to = takeValue();
        break;
      case "--kind": {
        const value = takeValue();
        if (!KINDS.includes(value)) {
          throw new UsageError(`--kind must be one of: ${KINDS.join(", ")}`);
        }
        opts.kind = value;
        break;
      }
      case "--out":
        opts.out = takeValue();
        break;
      case "--lock":
        opts.lock = takeValue();
        break;
      case "--policy":
        opts.policy = takeValue();
        break;
      case "--api": {
        const value = takeValue().replace(/\/+$/, "");
        let url;
        try {
          url = new URL(value);
        } catch {
          throw new UsageError("--api must be a valid URL");
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new UsageError("--api must be an http(s) URL");
        }
        opts.api = value;
        break;
      }
      case "--timeout": {
        const n = Number(takeValue());
        if (!Number.isInteger(n) || n <= 0) {
          throw new UsageError("--timeout expects a positive integer (milliseconds)");
        }
        opts.timeout = n;
        break;
      }
      default:
        throw new UsageError(`unknown flag '${name}'`);
    }
  }

  opts.command = positionals[0] ?? null;
  opts.target = positionals[1] ?? null;
  opts.extra = positionals.slice(2);
  return opts;
}

// ---------------------------------------------------------------------------
// Core module loading (dynamic, so --help/--version work without a full build)
// ---------------------------------------------------------------------------

const moduleCache = new Map();

async function loadCore(rel) {
  if (moduleCache.has(rel)) return moduleCache.get(rel);
  let mod;
  try {
    mod = await import(new URL(rel, import.meta.url));
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND") {
      throw new CoreError(`core module ${rel} is not installed (package build is incomplete)`);
    }
    throw new CoreError(`core module ${rel} failed to load: ${err?.message ?? err}`);
  }
  moduleCache.set(rel, mod);
  return mod;
}

function requireFn(mod, name, rel) {
  const fn = mod?.[name];
  if (typeof fn !== "function") {
    throw new CoreError(`${rel} does not export ${name}() (package build is incomplete)`);
  }
  return fn;
}

// ---------------------------------------------------------------------------
// Files + HTTP
// ---------------------------------------------------------------------------

function readPolicyFile(path, parsePolicy) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new UsageError(`cannot read policy ${path}: ${err.message}`);
  }
  try {
    return parsePolicy(text);
  } catch (err) {
    throw new UsageError(`invalid policy ${path}: ${err?.message ?? err}`);
  }
}

function readLockFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      throw new UsageError(`no lockfile at ${path} — run \`toolproof lock <target>\` first`);
    }
    throw new UsageError(`cannot read lockfile ${path}: ${err.message}`);
  }
}

// Fetches `GET /api/v1/manifest` and returns the response envelope
// `{ manifest, signature, keyId, alg }`. The signature lives on the envelope, not
// inside `manifest`, so callers that write a lockfile must carry it across.
async function fetchManifest(api, target, kind, timeoutMs) {
  const url = `${api}/api/v1/manifest?target=${encodeURIComponent(target)}&kind=${encodeURIComponent(kind)}`;
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json" },
    });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    const message = timedOut ? `request timed out after ${timeoutMs}ms` : (err?.message ?? "request failed");
    throw new ApiError(message, api);
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* non-JSON error body — keep the HTTP status line */
    }
    throw new ApiError(message, api);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    throw new ApiError("invalid JSON response", api);
  }
  if (!body?.manifest) throw new ApiError("malformed response: missing manifest", api);
  return {
    manifest: body.manifest,
    signature: body.signature,
    keyId: body.keyId,
    alg: body.alg,
  };
}

// The lockfile format carries `signature`/`keyId`/`alg`, which the server returns
// on the envelope. Copy them onto the manifest handed to buildLockfile() unless the
// manifest already carries its own.
function withProvenance(manifest, envelope) {
  const out = { ...manifest };
  for (const key of ["signature", "keyId", "alg"]) {
    if (envelope[key] !== undefined && out[key] === undefined) out[key] = envelope[key];
  }
  return out;
}

// ---------------------------------------------------------------------------
// lock
// ---------------------------------------------------------------------------

function renderLock(lock, manifest, opts) {
  const surface = lock?.surface ?? {};
  const host = manifest.host || hostOf(lock?.target ?? "");
  const grade = manifest.grade ?? lock?.grade ?? "—";
  const score = manifest.score ?? lock?.score ?? "—";
  return [
    bold(`TOOLPROOF LOCK · ${host || "?"}`),
    `${dim("wrote")} ${opts.out}`,
    `kind ${manifest.kind ?? lock?.kind ?? "?"} · grade ${grade} · score ${score} · ${shortHash(lock?.fingerprint ?? manifest.fingerprint)}`,
    `tools ${(surface.tools ?? []).length} · prompts ${(surface.prompts ?? []).length} · resources ${(surface.resources ?? []).length} · outbound ${(surface.outboundHosts ?? []).length}`,
    `policy ${opts.policy ? opts.policy : dim("built-in default")}`,
  ].join("\n");
}

async function runLock(opts) {
  if (!opts.target) throw new UsageError("lock needs a target: toolproof lock <target>");
  if (opts.extra.length) throw new UsageError(`unexpected argument '${opts.extra[0]}'`);

  const lockfileMod = await loadCore("./src/lockfile.mjs");
  const buildLockfile = requireFn(lockfileMod, "buildLockfile", "./src/lockfile.mjs");
  const stringifyLockfile = requireFn(lockfileMod, "stringifyLockfile", "./src/lockfile.mjs");

  let policy;
  if (opts.policy) {
    const policyMod = await loadCore("./src/policy.mjs");
    const parsePolicy = requireFn(policyMod, "parsePolicy", "./src/policy.mjs");
    policy = readPolicyFile(opts.policy, parsePolicy);
  }

  const envelope = await fetchManifest(opts.api, opts.target, opts.kind, opts.timeout);
  const manifest = envelope.manifest;

  let lock;
  let text;
  try {
    lock = buildLockfile(withProvenance(manifest, envelope), policy);
    text = stringifyLockfile(lock);
  } catch (err) {
    throw new CoreError(`could not build lockfile: ${err?.message ?? err}`);
  }
  if (typeof text !== "string" || !text.trim()) {
    throw new CoreError("could not build lockfile: stringifyLockfile() returned nothing");
  }

  try {
    writeFileSync(resolve(opts.out), text);
  } catch (err) {
    throw new UsageError(`cannot write ${opts.out}: ${err.message}`);
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(lock, null, 2)}\n`);
  } else if (opts.quiet) {
    process.stdout.write(`toolproof: wrote ${opts.out} · ${shortHash(lock?.fingerprint ?? manifest.fingerprint)}\n`);
  } else {
    process.stdout.write(`${renderLock(lock, manifest, opts)}\n`);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

function deriveDecision(changes) {
  let decision = "informational";
  for (const change of changes) {
    if (change?.action === "block") return "block";
    if (change?.action === "review") decision = "review";
  }
  return decision;
}

function fallbackExitCode(decision) {
  const d = String(decision ?? "").toLowerCase();
  if (d.includes("block")) return 2;
  if (d.includes("review")) return 1;
  return 0;
}

function resolveExitCode(exitCodeFor, decision) {
  if (typeof exitCodeFor === "function") {
    try {
      const code = exitCodeFor(decision);
      if (Number.isInteger(code)) return code;
    } catch {
      /* fall through to the local mapping below */
    }
  }
  return fallbackExitCode(decision);
}

function safeSummarize(summarizeDecision, decision, changes) {
  if (typeof summarizeDecision !== "function") return null;
  try {
    const summary = summarizeDecision(decision, changes);
    return typeof summary === "string" && summary.trim() ? summary.trim() : null;
  } catch {
    return null;
  }
}

function renderCheck({ lock, manifest, changes, decision, code, policyLabel, summarizeDecision }) {
  const host = manifest.host || hostOf(manifest.target ?? lock?.target ?? "");
  const lines = [];
  lines.push(bold(`TOOLPROOF LOCK · ${host || "?"}`));
  lines.push("");

  const baselineGrade = lock?.grade ?? "—";
  const observedGrade = manifest.grade ?? "—";
  const moved = observedGrade !== baselineGrade;
  lines.push(`${dim("baseline")}  ${shortHash(lock?.fingerprint)}  grade ${baselineGrade}`);
  lines.push(`${dim("observed")}  ${shortHash(manifest.fingerprint)}  grade ${moved ? amber(observedGrade) : observedGrade}`);
  lines.push(`${dim("state")}     ${manifest.state ?? "unknown"} · kind ${manifest.kind ?? lock?.kind ?? "?"} · policy ${policyLabel}`);
  lines.push("");

  if (changes.length === 0) {
    lines.push(`${green("IN SYNC")} — the live capability surface matches the baseline`);
  } else {
    for (const change of sortedChanges(changes)) {
      const where = change?.where ? dim(` (${change.where})`) : "";
      lines.push(`  ${tagFor(change?.action)} ${change?.message ?? change?.category ?? "change"}${where}`);
    }
  }
  lines.push("");

  const summary = safeSummarize(summarizeDecision, decision, changes) ?? localSummary(changes);
  lines.push(`${colorizeVerdict(decision, verdictLabel(decision))} · ${summary} · exit ${code}`);
  return lines.join("\n");
}

async function runCheck(opts) {
  if (opts.target || opts.extra.length) {
    throw new UsageError(`check takes no positional arguments (got '${opts.target ?? opts.extra[0]}')`);
  }

  // Read the baseline before touching the network: a missing or unreadable
  // lockfile is a local error and must not depend on API reachability.
  const lockText = readLockFile(opts.lock);

  const lockfileMod = await loadCore("./src/lockfile.mjs");
  const policyMod = await loadCore("./src/policy.mjs");
  const diffMod = await loadCore("./src/diff.mjs");
  const decisionMod = await loadCore("./src/decision.mjs");

  const parseLockfile = requireFn(lockfileMod, "parseLockfile", "./src/lockfile.mjs");
  const parsePolicy = requireFn(policyMod, "parsePolicy", "./src/policy.mjs");
  const diffManifests = requireFn(diffMod, "diffManifests", "./src/diff.mjs");
  const exitCodeFor = requireFn(decisionMod, "exitCodeFor", "./src/decision.mjs");

  let lock;
  try {
    lock = parseLockfile(lockText);
  } catch (err) {
    throw new UsageError(`invalid lockfile ${opts.lock}: ${err?.message ?? err}`);
  }
  if (!lock?.target) {
    throw new UsageError(`${opts.lock} has no target — re-run \`toolproof lock <target>\``);
  }

  let policy = policyMod.DEFAULT_POLICY ?? {};
  let policyLabel = "built-in default";
  if (opts.policy) {
    policy = readPolicyFile(opts.policy, parsePolicy);
    policyLabel = opts.policy;
  }

  const envelope = await fetchManifest(opts.api, lock.target, lock.kind ?? "auto", opts.timeout);
  const manifest = envelope.manifest;

  let changes = [];
  let decision;
  try {
    const raw = await diffManifests(lock, manifest, policy);
    if (Array.isArray(raw)) {
      changes = raw;
    } else if (raw && typeof raw === "object") {
      changes = Array.isArray(raw.changes) ? raw.changes : [];
      if (typeof raw.decision === "string") decision = raw.decision;
    }
  } catch (err) {
    throw new CoreError(`could not diff manifests: ${err?.message ?? err}`);
  }
  if (decision === undefined) decision = deriveDecision(changes);

  const code = resolveExitCode(exitCodeFor, decision);

  // Record the decision as evidence. This must never change the exit code or
  // the printed verdict — a failure to record is reported but never fatal.
  if (!opts.noEvidence) {
    recordEvidence({ opts, lock, manifest, decision, changes, code }).catch((err) => {
      process.stderr.write(`toolproof: could not record evidence: ${err?.message ?? err}\n`);
    });
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          decision,
          exitCode: code,
          changes,
          manifest: {
            host: manifest.host ?? hostOf(manifest.target ?? lock.target),
            fingerprint: manifest.fingerprint ?? null,
            grade: manifest.grade ?? null,
            state: manifest.state ?? null,
          },
        },
        null,
        2,
      )}\n`,
    );
  } else if (opts.quiet) {
    process.stdout.write(`${verdictLine(decision, changes, code)}\n`);
  } else {
    process.stdout.write(
      `${renderCheck({
        lock,
        manifest,
        changes,
        decision,
        code,
        policyLabel,
        summarizeDecision: decisionMod.summarizeDecision,
      })}\n`,
    );
  }
  return code;
}

// ---------------------------------------------------------------------------
// evidence — the signed decision history
// ---------------------------------------------------------------------------

// The decision strings used inside a receipt, per the design's vocabulary.
function receiptDecision(decision) {
  const d = String(decision ?? "").toLowerCase();
  if (d.includes("block")) return "blocked";
  if (d.includes("review")) return "review-required";
  return "in-sync";
}

function gitIdentityEmail() {
  try {
    return execSync("git config user.email", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

async function recordEvidence({ opts, lock, manifest, decision, changes, code }) {
  const evidenceMod = await loadCore("./src/evidence.mjs");
  const appendReceipt = requireFn(evidenceMod, "appendReceipt", "./src/evidence.mjs");
  appendReceipt({
    dir: opts.evidenceDir,
    decision: receiptDecision(decision),
    exitCode: code,
    target: lock.target,
    baselineFingerprint: lock.fingerprint ?? null,
    observedFingerprint: manifest.fingerprint ?? null,
    changeSummary: countByAction(changes),
    policy: opts.policy ?? "built-in default",
    actor: evidenceMod.resolveActor(undefined, gitIdentityEmail()),
  });
}

async function runEvidence(opts) {
  const sub = opts.target; // `evidence <sub>` lands in the first positional
  const evidenceMod = await loadCore("./src/evidence.mjs");
  const dir = opts.evidenceDir;

  if (sub === "verify" || sub === undefined) {
    const res = requireFn(evidenceMod, "verifyEvidence", "./src/evidence.mjs")(dir);
    if (res.ok) {
      process.stdout.write(`evidence OK — ${res.count} receipt${res.count === 1 ? "" : "s"}, chain intact, signatures verified\n`);
      return 0;
    }
    process.stderr.write(`evidence FAIL — ${res.problems.length} problem(s):\n`);
    for (const p of res.problems) process.stderr.write(`  - ${p}\n`);
    return 1;
  }

  if (sub === "show") {
    const receipts = requireFn(evidenceMod, "readReceipts", "./src/evidence.mjs")(dir);
    if (!receipts.length) {
      process.stdout.write("no evidence recorded yet — run `toolproof check`\n");
      return 0;
    }
    for (const r of receipts) {
      process.stdout.write(
        `${r.ts}  ${r.decision}  exit ${r.exitCode}  actor ${r.actor}  baseline ${shortHash(r.baselineFingerprint)}  observed ${shortHash(r.observedFingerprint)}  policy ${r.policy ?? "default"}\n`,
      );
    }
    return 0;
  }

  if (sub === "export") {
    const from = Number(opts.from ?? 0);
    const to = opts.to === undefined ? undefined : Number(opts.to);
    const out = opts.out;
    const bundle = requireFn(evidenceMod, "exportEvidence", "./src/evidence.mjs")({ dir, from, to, out });
    const msg = `exported ${bundle.receipts.length} receipt${bundle.receipts.length === 1 ? "" : "s"} (${bundle.range.from}..${bundle.range.to} of ${bundle.total})`;
    if (out) process.stdout.write(`evidence ${msg} to ${out}\n`);
    else process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
    return 0;
  }

  throw new UsageError(`unknown evidence subcommand '${sub}' (try: verify, show, export)`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));

    if (opts.help) {
      process.stdout.write(`${HELP}\n`);
      return;
    }
    if (opts.version) {
      process.stdout.write(`toolproof-lock ${VERSION}\n`);
      return;
    }
    if (!opts.command) throw new UsageError("no command given");

    if (opts.command === "lock") {
      process.exitCode = await runLock(opts);
      return;
    }
    if (opts.command === "check") {
      process.exitCode = await runCheck(opts);
      return;
    }
    if (opts.command === "evidence") {
      process.exitCode = await runEvidence(opts);
      return;
    }
    throw new UsageError(`unknown command '${opts.command}'`);
  } catch (err) {
    const suffix = err instanceof ApiError && err.api ? ` (api: ${err.api})` : "";
    process.stderr.write(`toolproof: ${err?.message ?? err}${suffix} (try --help)\n`);
    process.exitCode = 3;
  }
}

main();
