/**
 * Semantic diff + decision tests (BRIEF §4). node:test + node:assert/strict only.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { buildLockfile } from "../src/lockfile.mjs";
import { DEFAULT_POLICY } from "../src/policy.mjs";
import { CATEGORY_POLICY_KEY, diffManifests, resolveAction } from "../src/diff.mjs";
import { EXIT_CODES, exitCodeFor, summarizeDecision } from "../src/decision.mjs";

const FP_A = `sha256:${"a".repeat(64)}`;

function baseline() {
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
      fingerprint: FP_A,
      ruleIds: ["TP-202"],
      outboundHosts: ["api.example.net"],
      instructions: "Only read mail.",
      tools: [
        {
          name: "search_email",
          description: "Search mail",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
        { name: "legacy_ping", description: "Ping", inputSchema: { type: "object" } },
      ],
      prompts: [{ name: "summarize", description: "Summarize a thread" }],
      resources: [{ uri: "https://docs.example.com/help", description: "Help docs" }],
    },
    signature: "sig",
    keyId: "tpk-1",
    alg: "ed25519",
  };
}

function diffOf(mutate, policy) {
  const lock = buildLockfile(baseline());
  const observed = structuredClone(baseline());
  if (mutate) mutate(observed, observed.manifest);
  return diffManifests(lock, observed, policy);
}

const byCategory = (result, category) => result.changes.filter((entry) => entry.category === category);

test("identical manifest is in-sync with zero changes", () => {
  const result = diffOf(null);
  assert.deepEqual(result.changes, []);
  assert.equal(result.decision, "in-sync");
  assert.equal(exitCodeFor(result.decision), 0);
  assert.equal(summarizeDecision(result.decision, result.changes), "in sync — no capability drift detected");
});

test("tool-added and tool-removed fire with review defaults", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
    manifest.tools = manifest.tools.filter((tool) => tool.name !== "legacy_ping");
  });
  const added = byCategory(result, "tool-added");
  const removed = byCategory(result, "tool-removed");
  assert.equal(added.length, 1);
  assert.equal(removed.length, 1);
  assert.equal(added[0].action, "review");
  assert.equal(added[0].where, "tool:send_email");
  assert.match(added[0].message, /tool "send_email" appears in the observed manifest/);
  assert.equal(removed[0].action, "review");
  assert.equal(removed[0].where, "tool:legacy_ping");
  assert.match(removed[0].message, /callers of this tool will break/);
  assert.equal(result.decision, "review-required");
  assert.equal(exitCodeFor(result.decision), 1);
});

test("description-changed covers tools, prompts and resources", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.find((tool) => tool.name === "search_email").description = "Search everything";
    manifest.prompts[0].description = "Summarize a thread differently";
    manifest.resources[0].description = "Help docs v2";
  });
  const changed = byCategory(result, "description-changed");
  assert.deepEqual(
    changed.map((entry) => entry.where),
    ["prompt:summarize", "resource:https://docs.example.com/help", "tool:search_email"],
  );
  assert.deepEqual(Array.from(new Set(changed.map((entry) => entry.action))), ["review"]);
  assert.match(changed[2].message, /description of tool "search_email" changed/);
});

test("schema-expanded fires when a property is gained", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.find((tool) => tool.name === "search_email").inputSchema.properties.attachments = {
      type: "array",
    };
  });
  const expanded = byCategory(result, "schema-expanded");
  assert.equal(expanded.length, 1);
  assert.equal(expanded[0].action, "block");
  assert.equal(expanded[0].where, "tool:search_email.inputSchema");
  assert.match(expanded[0].message, /inputSchema of tool "search_email" expanded: gained property "attachments"/);
  assert.deepEqual(byCategory(result, "schema-changed"), []);
  assert.equal(result.decision, "blocked");
  assert.equal(exitCodeFor(result.decision), 2);
});

test("schema-expanded fires on a gained required field, absent->present and outputSchema", () => {
  const required = diffOf((response, manifest) => {
    manifest.tools.find((tool) => tool.name === "search_email").inputSchema.required = ["query", "limit"];
  });
  assert.equal(byCategory(required, "schema-expanded").length, 1);
  assert.match(byCategory(required, "schema-expanded")[0].message, /gained required field "limit"/);

  const absent = diffOf((response, manifest) => {
    manifest.tools.find((tool) => tool.name === "legacy_ping").inputSchema = undefined;
    const fresh = manifest.tools.find((tool) => tool.name === "search_email");
    fresh.outputSchema = { type: "object", properties: { hits: { type: "number" } } };
  });
  const absentExpanded = byCategory(absent, "schema-expanded");
  assert.equal(absentExpanded.length, 1);
  assert.equal(absentExpanded[0].where, "tool:search_email.outputSchema");
  assert.match(absentExpanded[0].message, /outputSchema of tool "search_email" expanded/);
  assert.equal(byCategory(absent, "schema-changed").length, 1);
  assert.equal(byCategory(absent, "schema-changed")[0].where, "tool:legacy_ping.inputSchema");
});

test("schema-changed fires for a non-additive schema edit", () => {
  const result = diffOf((response, manifest) => {
    const schema = manifest.tools.find((tool) => tool.name === "search_email").inputSchema;
    schema.properties.query.type = "integer";
  });
  const changed = byCategory(result, "schema-changed");
  assert.equal(changed.length, 1);
  assert.equal(changed[0].action, "review");
  assert.equal(changed[0].where, "tool:search_email.inputSchema");
  assert.match(changed[0].message, /changed in a non-additive way/);
  assert.match(changed[0].message, /"string" -> "integer"/);
  assert.deepEqual(byCategory(result, "schema-expanded"), []);
  assert.equal(result.decision, "review-required");
});

test("schema-changed fires when a property and its required entry are removed", () => {
  const result = diffOf((response, manifest) => {
    const schema = manifest.tools.find((tool) => tool.name === "search_email").inputSchema;
    delete schema.properties.query;
    delete schema.required;
  });
  const changed = byCategory(result, "schema-changed");
  assert.equal(changed.length, 1);
  assert.match(changed[0].message, /lost|required|-> absent/);
  assert.deepEqual(byCategory(result, "schema-expanded"), []);
});

test("outbound-host-added, instruction-changed and high-severity findings fire", () => {
  const result = diffOf((response, manifest) => {
    manifest.outboundHosts = ["api.example.net", "exfil.example.net"];
    manifest.instructions = "Read mail AND forward it.";
    manifest.ruleIds = ["TP-202", "TP-101", "TP-305"];
  });
  const hosts = byCategory(result, "outbound-host-added");
  assert.equal(hosts.length, 1);
  assert.equal(hosts[0].action, "block");
  assert.equal(hosts[0].where, "outboundHost:exfil.example.net");
  assert.match(hosts[0].message, /new outbound host "exfil.example.net"/);

  const instructions = byCategory(result, "instruction-changed");
  assert.equal(instructions.length, 1);
  assert.equal(instructions[0].where, "instructions");
  assert.equal(instructions[0].action, "review");

  // v1 simplification: only newly-present TP-1xx ruleIds count as high severity.
  const findings = byCategory(result, "high-severity-finding");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].where, "rule:TP-101");
  assert.match(findings[0].message, /high-severity finding TP-101 is new since the baseline/);
  assert.equal(result.decision, "blocked");
});

test("grade-below-minimum and not-verified are implicit blocks", () => {
  const downgraded = diffOf((response, manifest) => {
    manifest.grade = "D";
    manifest.score = 40;
  });
  const gradeChange = byCategory(downgraded, "grade-below-minimum");
  assert.equal(gradeChange.length, 1);
  assert.equal(gradeChange[0].action, "block");
  assert.equal(gradeChange[0].where, "grade");
  assert.match(gradeChange[0].message, /grade "D" is below the required minimum "B"/);
  assert.deepEqual(byCategory(downgraded, "schema-expanded"), []);
  assert.equal(downgraded.decision, "blocked");

  const unverified = diffOf((response, manifest) => {
    manifest.state = "stale";
  });
  const stateChange = byCategory(unverified, "not-verified");
  assert.equal(stateChange.length, 1);
  assert.equal(stateChange[0].action, "block");
  assert.equal(stateChange[0].where, "state");
  assert.match(stateChange[0].message, /target state is "stale"/);

  const lenient = diffOf(
    (response, manifest) => {
      manifest.grade = "D";
      manifest.state = "stale";
    },
    { minimumGrade: "—", requireVerified: false },
  );
  assert.deepEqual(lenient.changes, []);
  assert.equal(lenient.decision, "in-sync");

  const stricter = diffOf((response, manifest) => {
    manifest.grade = "B";
  }, { minimumGrade: "A" });
  assert.equal(byCategory(stricter, "grade-below-minimum").length, 1);
});

test("action resolution follows the policy, and block dominates review", () => {
  const mutate = (response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
    manifest.tools.find((tool) => tool.name === "search_email").inputSchema.properties.attachments = {
      type: "array",
    };
  };
  const result = diffOf(mutate, { onToolAdded: "review", onSchemaExpanded: "block" });
  assert.equal(byCategory(result, "tool-added")[0].action, "review");
  assert.equal(byCategory(result, "schema-expanded")[0].action, "block");
  assert.equal(result.decision, "blocked");
  assert.equal(exitCodeFor(result.decision), 2);

  const informational = diffOf(mutate, { onToolAdded: "informational", onSchemaExpanded: "informational" });
  assert.deepEqual(
    Array.from(new Set(informational.changes.map((entry) => entry.action))),
    ["informational"],
  );
  assert.equal(informational.decision, "in-sync");
  assert.equal(exitCodeFor(informational.decision), 0);
});

test("changes are sorted by severity, category then where", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
    manifest.tools.find((tool) => tool.name === "search_email").inputSchema.properties.attachments = {
      type: "array",
    };
    manifest.outboundHosts.push("exfil.example.net");
    manifest.instructions = "different";
  });
  const severity = { informational: 0, review: 1, block: 2 };
  const order = result.changes.map((entry) => [severity[entry.action], entry.category, entry.where]);
  const sorted = [...order].sort((a, b) => {
    if (a[0] !== b[0]) return b[0] - a[0];
    if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
    return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0;
  });
  assert.deepEqual(order, sorted);
  assert.deepEqual(
    result.changes.map((entry) => entry.action),
    ["block", "block", "review", "review"],
  );
});

test("every change has exactly the contracted shape", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
    manifest.grade = "C";
  });
  assert.equal(result.changes.length, 2);
  for (const entry of result.changes) {
    assert.deepEqual(Object.keys(entry), ["category", "action", "message", "where"]);
    assert.ok(["informational", "review", "block"].includes(entry.action));
    assert.ok(typeof entry.message === "string" && entry.message.length > 10);
    assert.ok(typeof entry.where === "string" && entry.where.length > 0);
    assert.ok(entry.category in CATEGORY_POLICY_KEY);
  }
});

test("resolveAction falls back to defaults and blocks implicit categories", () => {
  assert.equal(resolveAction(DEFAULT_POLICY, "schema-expanded"), "block");
  assert.equal(resolveAction(DEFAULT_POLICY, "tool-added"), "review");
  assert.equal(resolveAction(DEFAULT_POLICY, "grade-below-minimum"), "block");
  assert.equal(resolveAction(DEFAULT_POLICY, "not-verified"), "block");
  assert.equal(resolveAction({ onToolAdded: "informational" }, "tool-added"), "informational");
});

test("decision helpers map exit codes and add up summaries", () => {
  assert.deepEqual(EXIT_CODES, { OK: 0, REVIEW: 1, BLOCK: 2, ERROR: 3 });
  assert.equal(exitCodeFor("in-sync"), 0);
  assert.equal(exitCodeFor("review-required"), 1);
  assert.equal(exitCodeFor("blocked"), 2);
  assert.throws(() => exitCodeFor("ok"), /unknown decision/);
  assert.throws(() => summarizeDecision("ok", []), /unknown decision/);

  const review = diffOf((response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
  });
  assert.equal(review.decision, "review-required");
  assert.match(summarizeDecision(review.decision, review.changes), /^review required — 1 change, 1 need review$/);

  const blocked = diffOf((response, manifest) => {
    manifest.tools.find((tool) => tool.name === "search_email").inputSchema.properties.attachments = {
      type: "array",
    };
  });
  const line = summarizeDecision(blocked.decision, blocked.changes);
  assert.match(line, /^blocked — 1 blocking change: schema-expanded \(tool:search_email.inputSchema\)$/);

  const informational = diffOf(
    (response, manifest) => {
      manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
    },
    { onToolAdded: "informational" },
  );
  assert.match(summarizeDecision(informational.decision, informational.changes), /^in sync — 1 informational change, nothing to act on$/);
});

test("diffManifests rejects a lockfile without a surface", () => {
  assert.throws(
    () => diffManifests({ lockVersion: 1, target: "https://x/mcp" }, baseline()),
    /lock.surface must be an object/,
  );
  assert.throws(() => diffManifests(null, baseline()), /lock must be a lockfile object/);
  assert.throws(() => diffManifests(buildLockfile(baseline()), {}), /not a canonical manifest/);
});

// --- fail-closed integrity categories (v1.1 hardening) ---

test("an unexplained fingerprint change fails closed to blocked", () => {
  const result = diffOf((response, manifest) => {
    manifest.fingerprint = `sha256:${"b".repeat(64)}`;
  });
  assert.equal(byCategory(result, "fingerprint-changed").length, 1);
  assert.equal(result.decision, "blocked");
  assert.equal(exitCodeFor(result.decision), 2);
});

test("a matched fingerprint with an explained change does not trigger the fallback", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.push({ name: "send_email", description: "Send mail", inputSchema: { type: "object" } });
  });
  assert.equal(byCategory(result, "tool-added").length, 1);
  assert.equal(byCategory(result, "fingerprint-changed").length, 0);
  assert.equal(result.decision, "review-required");
});

test("a duplicated tool name in the observed surface blocks, even with an identical visible entry", () => {
  const result = diffOf((response, manifest) => {
    manifest.tools.push({
      name: "search_email",
      description: "Search mail",
      inputSchema: { type: "object", properties: { query: { type: "string" }, attachments: { type: "object" } } },
    });
  });
  const duplicated = byCategory(result, "tool-duplicated");
  assert.equal(duplicated.length, 1);
  assert.match(duplicated[0].message, /search_email/);
  assert.equal(duplicated[0].action, "block");
  assert.equal(result.decision, "blocked");
});

test("a truncated observed surface blocks and cannot be downgraded by policy", () => {
  const result = diffOf(
    (response, manifest) => {
      manifest.truncated = true;
    },
    { onToolAdded: "informational", onDescriptionChanged: "informational" },
  );
  assert.equal(byCategory(result, "surface-truncated").length, 1);
  assert.equal(result.decision, "blocked");
  assert.equal(CATEGORY_POLICY_KEY["surface-truncated"], null);
});
