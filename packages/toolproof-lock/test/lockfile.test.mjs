/**
 * Lockfile core tests (BRIEF §2). node:test + node:assert/strict only.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  LOCK_VERSION,
  buildLockfile,
  parseLockfile,
  stringifyLockfile,
} from "../src/lockfile.mjs";

const FP = `sha256:${"a".repeat(64)}`;

function manifestFixture(overrides = {}) {
  return {
    manifest: {
      manifestVersion: 1,
      target: "https://mcp.example.com/mcp",
      host: "mcp.example.com",
      kind: "mcp",
      state: "verified",
      grade: "A+",
      score: 100,
      generatedAt: "2026-09-14T00:00:00.000Z",
      fingerprint: FP,
      ruleIds: ["TP-202", "TP-101", "TP-202"],
      outboundHosts: ["z.example.net", "api.example.net"],
      tools: [
        { name: "z_tool", description: "z" },
        { name: "a_tool", description: "a", inputSchema: { type: "object" } },
      ],
      prompts: [{ name: "p2" }, { name: "p1" }],
      resources: [{ uri: "https://b.example.com/r" }, { uri: "https://a.example.com/r" }],
      instructions: "be nice",
      openapi: { specUrl: "https://api.example.net/openapi.json" },
      ...overrides,
    },
    signature: "c2ln",
    keyId: "tpk-1",
    alg: "ed25519",
  };
}

test("buildLockfile produces the canonical §2 shape", () => {
  const lock = buildLockfile(manifestFixture());
  assert.equal(lock.lockVersion, LOCK_VERSION);
  assert.equal(lock.lockVersion, 1);
  assert.equal(lock.generatedAt, "2026-09-14T00:00:00.000Z");
  assert.equal(lock.target, "https://mcp.example.com/mcp");
  assert.equal(lock.kind, "mcp");
  assert.equal(lock.fingerprint, FP);
  assert.equal(lock.grade, "A+");
  assert.equal(lock.score, 100);
  assert.equal(lock.policy, null);
  assert.equal(lock.signature, "c2ln");
  assert.equal(lock.keyId, "tpk-1");
  assert.equal(lock.alg, "ed25519");
  assert.deepEqual(Object.keys(lock), [
    "lockVersion",
    "generatedAt",
    "target",
    "kind",
    "fingerprint",
    "grade",
    "score",
    "ruleIds",
    "policy",
    "surface",
    "signature",
    "keyId",
    "alg",
  ]);
});

test("buildLockfile canonicalizes arrays (sorted, unique)", () => {
  const lock = buildLockfile(manifestFixture());
  assert.deepEqual(lock.ruleIds, ["TP-101", "TP-202"]);
  assert.deepEqual(lock.surface.outboundHosts, ["api.example.net", "z.example.net"]);
  assert.deepEqual(
    lock.surface.tools.map((tool) => tool.name),
    ["a_tool", "z_tool"],
  );
  assert.deepEqual(
    lock.surface.prompts.map((prompt) => prompt.name),
    ["p1", "p2"],
  );
  assert.deepEqual(
    lock.surface.resources.map((resource) => resource.uri),
    ["https://a.example.com/r", "https://b.example.com/r"],
  );
});

test("surface mirrors the manifest and omits empty keys", () => {
  const lock = buildLockfile(
    manifestFixture({
      tools: undefined,
      prompts: [],
      resources: undefined,
      instructions: "",
      outboundHosts: [],
      openapi: {},
    }),
  );
  assert.deepEqual(lock.surface, {});
  assert.deepEqual(lock.ruleIds, ["TP-101", "TP-202"]);
});

test("buildLockfile accepts the inner manifest and stores a normalized policy", () => {
  const fixture = manifestFixture();
  const lock = buildLockfile(fixture.manifest, { onToolAdded: "informational" });
  assert.equal(lock.signature, null);
  assert.equal(lock.keyId, null);
  assert.equal(lock.policy.onToolAdded, "informational");
  assert.equal(lock.policy.onSchemaExpanded, "block");
  assert.equal(lock.policy.minimumGrade, "B");
  assert.equal(lock.policy.requireVerified, true);
});

test("buildLockfile rejects malformed manifests and policies", () => {
  assert.throws(
    () => buildLockfile(manifestFixture({ target: "" })),
    /target must be a non-empty string/,
  );
  assert.throws(
    () => buildLockfile(manifestFixture({ fingerprint: "sha256:ABC" })),
    /fingerprint must be/,
  );
  assert.throws(() => buildLockfile({}), /not a canonical manifest/);
  assert.throws(() => buildLockfile(manifestFixture(), { onToolAdded: "warn" }), /onToolAdded must be one of/);
});

test("stringifyLockfile is 2-space indented, newline terminated and deterministic", () => {
  const lock = buildLockfile(manifestFixture());
  const first = stringifyLockfile(lock);
  const second = stringifyLockfile(buildLockfile(manifestFixture()));
  assert.equal(first, second);
  assert.ok(first.endsWith("}\n"));
  assert.match(first, /\n {2}"lockVersion": 1,/);
  assert.ok(first.indexOf('"lockVersion"') < first.indexOf('"alg"'));
  assert.ok(first.indexOf('"policy"') < first.indexOf('"surface"'));
  assert.ok(!first.includes("\r"));
});

test("lockfile round-trips through parseLockfile(stringifyLockfile(lock))", () => {
  const lock = buildLockfile(manifestFixture());
  const text = stringifyLockfile(lock);
  const reparsed = parseLockfile(text);
  assert.deepEqual(reparsed, lock);
  assert.equal(stringifyLockfile(reparsed), text);
});

test("parseLockfile accepts a minimal lockfile and fills defaults", () => {
  const minimal = JSON.stringify({ lockVersion: 1, target: "https://x.example/mcp", kind: "mcp" });
  const lock = parseLockfile(minimal);
  assert.equal(lock.lockVersion, 1);
  assert.equal(lock.target, "https://x.example/mcp");
  assert.equal(lock.grade, "—");
  assert.equal(lock.score, null);
  assert.deepEqual(lock.ruleIds, []);
  assert.deepEqual(lock.surface, {});
  assert.equal(lock.policy, null);
  assert.equal(lock.alg, "ed25519");
});

test("parseLockfile throws descriptive errors on malformed input", () => {
  assert.throws(() => parseLockfile(""), /input is empty/);
  assert.throws(() => parseLockfile("{ not json"), /invalid JSON/);
  assert.throws(() => parseLockfile("[]"), /top level must be a JSON object/);
  assert.throws(() => parseLockfile('{"target":"x","kind":"mcp"}'), /unsupported lockVersion/);
  assert.throws(() => parseLockfile('{"lockVersion":2,"target":"x","kind":"mcp"}'), /unsupported lockVersion 2/);
  assert.throws(() => parseLockfile('{"lockVersion":1,"kind":"mcp"}'), /"target" must be/);
  assert.throws(() => parseLockfile('{"lockVersion":1,"target":"x"}'), /"kind" must be/);
  assert.throws(
    () => parseLockfile(`{"lockVersion":1,"target":"x","kind":"mcp","fingerprint":"nope"}`),
    /"fingerprint" must be/,
  );
  assert.throws(
    () => parseLockfile('{"lockVersion":1,"target":"x","kind":"mcp","ruleIds":"TP-101"}'),
    /"ruleIds" must be an array/,
  );
  assert.throws(
    () => parseLockfile('{"lockVersion":1,"target":"x","kind":"mcp","surface":[]}'),
    /"surface" must be an object/,
  );
  assert.throws(
    () => parseLockfile('{"lockVersion":1,"target":"x","kind":"mcp","surface":{"tools":{}}}'),
    /"surface.tools" must be an array/,
  );
  assert.throws(() => parseLockfile(null), /expected a JSON string/);
});

test("parseLockfile re-sorts surface arrays so output is byte-stable", () => {
  const input = JSON.stringify({
    lockVersion: 1,
    target: "https://x.example/mcp",
    kind: "mcp",
    ruleIds: ["TP-202", "TP-101", "TP-101"],
    surface: {
      outboundHosts: ["z.example.net", "api.example.net"],
      tools: [{ name: "z_tool" }, { name: "a_tool" }],
    },
  });
  const lock = parseLockfile(input);
  assert.deepEqual(lock.ruleIds, ["TP-101", "TP-202"]);
  assert.deepEqual(lock.surface.outboundHosts, ["api.example.net", "z.example.net"]);
  assert.deepEqual(
    lock.surface.tools.map((tool) => tool.name),
    ["a_tool", "z_tool"],
  );
});
