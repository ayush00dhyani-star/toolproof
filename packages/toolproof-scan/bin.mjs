#!/usr/bin/env node
// toolproof-scan — zero-dependency CLI for the Toolproof verify API.
// Fetches a signed trust passport for one or more targets and prints the verdict.

const DEFAULT_API = "https://toolproof-scan.vercel.app";
const DEFAULT_TIMEOUT = 30000;
const KINDS = ["auto", "mcp", "api"];

const HELP = `toolproof-scan — Trust grades for MCP servers and APIs — the verify step for the agent economy.

SYNOPSIS
  npx toolproof-scan <target>... [flags]

FLAGS
  --json                Print the raw signed passport JSON
  --kind=auto|mcp|api   Target kind (default: auto)
  --fail-under=<0-100>  Exit 1 when verified with score below N, or when unverified
  --api=<url>           Verify API base URL (default: ${DEFAULT_API})
  --timeout=<ms>        Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  -h, --help            Show this help

EXAMPLES
  npx toolproof-scan mcp.context7.com/mcp
  npx toolproof-scan https://our-mcp.example.com/mcp --fail-under 70
  npx toolproof-scan mcp.context7.com/mcp --json

EXIT CODES
  0  verified and score meets --fail-under
  1  unverified, or verified with score below --fail-under
  2  usage or network error`;

class UsageError extends Error {}
class ApiError extends Error {
  constructor(message, api) {
    super(message);
    this.api = api;
  }
}

// Colors are enabled only when stdout is a TTY and NO_COLOR is unset.
const colored = () => !process.env.NO_COLOR && process.stdout.isTTY;
const paint = (code, s) => (colored() ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => paint("1", s);
const dim = (s) => paint("90", s);
const green = (s) => paint("92", s);
const red = (s) => paint("91", s);
const amber = (s) => paint("38;5;208", s);

function parseArgs(argv) {
  const opts = {
    targets: [],
    json: false,
    kind: "auto",
    failUnder: null,
    api: DEFAULT_API,
    timeout: DEFAULT_TIMEOUT,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      opts.targets.push(arg);
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
      if (next === undefined || next.startsWith("-")) {
        throw new UsageError(`${name} expects a value`);
      }
      i += 1;
      return next;
    };
    switch (name) {
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "--json":
        if (inline !== undefined) throw new UsageError("--json does not take a value");
        opts.json = true;
        break;
      case "--kind": {
        const v = takeValue();
        if (!KINDS.includes(v)) {
          throw new UsageError(`--kind must be one of: ${KINDS.join(", ")}`);
        }
        opts.kind = v;
        break;
      }
      case "--fail-under": {
        const n = Number(takeValue());
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          throw new UsageError("--fail-under expects an integer between 0 and 100");
        }
        opts.failUnder = n;
        break;
      }
      case "--api": {
        const v = takeValue().replace(/\/+$/, "");
        let url;
        try {
          url = new URL(v);
        } catch {
          throw new UsageError("--api must be a valid URL");
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new UsageError("--api must be an http(s) URL");
        }
        opts.api = v;
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
  return opts;
}

async function fetchPassport(api, target, kind, timeoutMs) {
  const url = `${api}/api/v1/verify?target=${encodeURIComponent(target)}&kind=${kind}`;
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json" },
    });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    const message = timedOut
      ? `request timed out after ${timeoutMs}ms`
      : (err?.message ?? "request failed");
    throw new ApiError(message, api);
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the HTTP status line */
    }
    throw new ApiError(message, api);
  }
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError("invalid JSON response", api);
  }
  if (!body?.passport) throw new ApiError("malformed response: missing passport", api);
  return { text, passport: body.passport };
}

const stateColor = (state) => (state === "verified" ? green(state) : dim(state));
const gradeColor = (grade) => {
  if (grade.startsWith("A")) return green(grade);
  if (grade.startsWith("B")) return amber(grade);
  return red(grade);
};

function renderHuman(passport, api, rawTarget) {
  const lines = [];
  lines.push(bold(`TOOLPROOF · ${passport.host}`));
  const grade = passport.grade ?? "—";
  const second =
    passport.state === "verified"
      ? `${stateColor(passport.state)} · grade ${gradeColor(grade)} · score ${passport.score}/100`
      : `${stateColor(passport.state)} · grade ${gradeColor(grade)}`;
  lines.push(second);
  lines.push(passport.summary ?? "");
  const counts = new Map();
  for (const id of passport.ruleIds ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  const seen = new Set();
  for (const id of passport.ruleIds ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const n = counts.get(id);
    lines.push(n > 1 ? `  [${dim(id)}] · ×${n}` : `  [${dim(id)}]`);
  }
  for (const positive of passport.positives ?? []) {
    lines.push(`  ${dim("+")} ${positive}`);
  }
  lines.push(`card: ${api}/t?target=${encodeURIComponent(rawTarget)}&kind=${passport.kind}`);
  return lines.join("\n");
}

function failUnderExit(passport, failUnder) {
  if (passport.state === "unverified") return 1;
  if (passport.state === "verified" && failUnder !== null && passport.score < failUnder) return 1;
  return 0;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`toolproof: ${err.message} (try --help)\n`);
    process.exitCode = 2;
    return;
  }
  if (opts.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (opts.targets.length === 0) {
    process.stderr.write("toolproof: no target given (try --help)\n");
    process.exitCode = 2;
    return;
  }
  let exit = 0;
  for (let i = 0; i < opts.targets.length; i++) {
    const target = opts.targets[i];
    if (i > 0) process.stdout.write("\n");
    let result;
    try {
      result = await fetchPassport(opts.api, target, opts.kind, opts.timeout);
    } catch (err) {
      process.stderr.write(dim(`toolproof: ${err.message} (api: ${err.api ?? opts.api})`) + "\n");
      exit = Math.max(exit, 2);
      continue;
    }
    if (opts.json) {
      process.stdout.write(result.text + "\n");
    } else {
      process.stdout.write(renderHuman(result.passport, opts.api, target) + "\n");
    }
    exit = Math.max(exit, failUnderExit(result.passport, opts.failUnder));
  }
  process.exitCode = exit;
}

main();
