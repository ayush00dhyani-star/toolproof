// Smoke tests for the toolproof-lock CLI shell.
//
// These only exercise the parts of `bin.mjs` that must work without the network
// or the core `src/*.mjs` modules: argument parsing, --help/--version, and the
// local lockfile errors. No sockets are opened.
//
//   node --test packages/toolproof-lock/test/smoke.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const bin = resolve(here, "..", "bin.mjs");

// Port 1 is never listening, so if a test ever reached the network it would fail
// fast instead of hanging — but every test below is designed to not get there.
const UNREACHABLE_API = "http://127.0.0.1:1";
const NO_STACK_TRACE = /\n\s+at\s+\S+\s+\(/;

function run(args, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 20000,
    ...options,
  });
}

function missingLockPath(label) {
  return join(tmpdir(), `toolproof-smoke-${label}-${process.pid}-${Date.now()}.lock`);
}

test("--help exits 0 and documents the contract", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /SYNOPSIS/);
  assert.match(result.stdout, /toolproof lock/);
  assert.match(result.stdout, /toolproof check/);
  assert.match(result.stdout, /--policy=<path>/);
  assert.match(result.stdout, /EXIT CODES/);
  assert.match(result.stdout, /3\s+usage/);
});

test("-h is an alias of --help", () => {
  const result = run(["-h"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /SYNOPSIS/);
});

test("--version exits 0 and prints the package version", () => {
  const result = run(["--version"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^toolproof-lock \d+\.\d+\.\d+\s*$/m);
});

test("-v is an alias of --version", () => {
  const result = run(["-v"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^toolproof-lock \d+\.\d+\.\d+\s*$/m);
});

test("check with a missing lockfile exits 3 without touching the network", () => {
  const lockPath = missingLockPath("absent");
  const result = run(["check", `--lock=${lockPath}`, `--api=${UNREACHABLE_API}`]);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /no lockfile at/i);
  assert.doesNotMatch(result.stderr, NO_STACK_TRACE);
  assert.equal(result.stdout, "");
});

test("check with no arguments at all still exits 3 on the default lockfile", () => {
  // Run from an empty directory so `toolproof.lock` cannot exist.
  const result = run(["check", `--api=${UNREACHABLE_API}`], { cwd: tmpdir() });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /lockfile/i);
  assert.doesNotMatch(result.stderr, NO_STACK_TRACE);
});

test("unknown flags and commands exit 3 with a hint, never a stack trace", () => {
  for (const args of [["--nope"], ["frobnicate"], ["lock"], ["check", "extra-target"]]) {
    const result = run(args);
    assert.equal(result.status, 3, `expected exit 3 for: ${args.join(" ")}`);
    assert.match(result.stderr, /^toolproof: /);
    assert.match(result.stderr, /\(try --help\)/);
    assert.doesNotMatch(result.stderr, NO_STACK_TRACE);
  }
});

test("lock without a target exits 3 before building anything", () => {
  const result = run(["lock", `--api=${UNREACHABLE_API}`]);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /needs a target/);
  assert.doesNotMatch(result.stderr, NO_STACK_TRACE);
});

test("--timeout and --kind are validated", () => {
  const bad = run(["lock", "example.com", "--timeout=soon"]);
  assert.equal(bad.status, 3);
  assert.match(bad.stderr, /--timeout/);

  const badKind = run(["lock", "example.com", "--kind=graphql"]);
  assert.equal(badKind.status, 3);
  assert.match(badKind.stderr, /--kind/);
});
