/**
 * Policy core tests (BRIEF §3). node:test + node:assert/strict only.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_VALUES,
  DEFAULT_POLICY,
  GRADE_RANKS,
  gradeRank,
  normalizePolicy,
  parsePolicy,
} from "../src/policy.mjs";

const DEFAULT_YAML = `# toolproof policy (BRIEF §3 default)
minimumGrade: B
requireVerified: true
onToolAdded: review
onToolRemoved: review
onDescriptionChanged: review
onSchemaExpanded: block
onNewOutboundHost: block
onHighSeverityFinding: block
`;

test("DEFAULT_POLICY matches BRIEF §3", () => {
  assert.deepEqual(DEFAULT_POLICY, {
    minimumGrade: "B",
    requireVerified: true,
    // Scoped, time-boxed approvals. Null = unbounded, the historical default,
    // so every lockfile written before these keys existed keeps working.
    maxAgeHours: null,
    allowTools: null,
    denyTools: null,
    onToolAdded: "review",
    onToolRemoved: "review",
    onDescriptionChanged: "review",
    onSchemaExpanded: "block",
    onNewOutboundHost: "block",
    onHighSeverityFinding: "block",
  });
  assert.deepEqual(ACTION_VALUES, ["informational", "review", "block"]);
});

test("gradeRank maps grades exactly as specified", () => {
  assert.equal(gradeRank("A+"), 5);
  assert.equal(gradeRank("A"), 4);
  assert.equal(gradeRank("B"), 3);
  assert.equal(gradeRank("C"), 2);
  assert.equal(gradeRank("D"), 1);
  assert.equal(gradeRank("F"), 0);
  assert.equal(gradeRank("—"), -1);
  assert.equal(gradeRank(""), -1);
  assert.equal(gradeRank("b"), 3);
  assert.equal(gradeRank("Z"), -1);
  assert.equal(gradeRank(undefined), -1);
  assert.deepEqual(Object.keys(GRADE_RANKS), ["A+", "A", "B", "C", "D", "F"]);
});

test("parsePolicy reads the flat-YAML subset", () => {
  const policy = parsePolicy(DEFAULT_YAML);
  assert.deepEqual(policy, { ...DEFAULT_POLICY });
  // comments, blank lines, quotes and bare strings all work
  const mixed = parsePolicy(
    [
      "",
      "# leading comment",
      "minimumGrade: 'A+'  # inline comment",
      "requireVerified: false",
      "onToolAdded: informational",
      "",
    ].join("\n"),
  );
  assert.equal(mixed.minimumGrade, "A+");
  assert.equal(mixed.requireVerified, false);
  assert.equal(mixed.onToolAdded, "informational");
  assert.equal(mixed.onSchemaExpanded, "block");
});

test("parsePolicy accepts pure JSON and empty/comment-only input", () => {
  const fromJson = parsePolicy('{"minimumGrade":"C","onToolAdded":"block"}');
  assert.equal(fromJson.minimumGrade, "C");
  assert.equal(fromJson.onToolAdded, "block");
  assert.equal(fromJson.onNewOutboundHost, "block");
  assert.deepEqual(parsePolicy(""), { ...DEFAULT_POLICY });
  assert.deepEqual(parsePolicy("# nothing here\n\n"), { ...DEFAULT_POLICY });
  assert.throws(() => parsePolicy("{ nope }"), /invalid JSON/);
});

test("parsePolicy rejects malformed YAML", () => {
  assert.throws(() => parsePolicy("minimumGrade"), /not "key: value"/);
  assert.throws(() => parsePolicy("  minimumGrade: B"), /indented; the YAML subset is flat/);
  assert.throws(() => parsePolicy("minimumGrade: B\nminimumGrade: C"), /duplicate key "minimumGrade"/);
  assert.throws(() => parsePolicy("1bad: review"), /invalid key/);
  assert.throws(() => parsePolicy(null), /expected a string/);
});

test("normalizePolicy fills defaults and validates values", () => {
  assert.deepEqual(normalizePolicy(undefined), { ...DEFAULT_POLICY });
  assert.deepEqual(normalizePolicy(null), { ...DEFAULT_POLICY });
  assert.deepEqual(normalizePolicy({}), { ...DEFAULT_POLICY });
  assert.equal(normalizePolicy({ onToolRemoved: "informational" }).onToolRemoved, "informational");
  assert.equal(normalizePolicy({ requireVerified: "false" }).requireVerified, false);
});

test("normalizePolicy throws on unknown keys and bad action values", () => {
  assert.throws(
    () => normalizePolicy({ onSchemaChanged: "block" }),
    /unknown policy key "onSchemaChanged"/,
  );
  assert.throws(() => normalizePolicy({ minimumGrade: "Z" }), /minimumGrade must be one of/);
  assert.throws(() => normalizePolicy({ minimumGrade: 9 }), /integer rank 0-5/);
  assert.throws(() => normalizePolicy({ requireVerified: "yes" }), /requireVerified must be a boolean/);
  assert.throws(() => normalizePolicy({ onToolAdded: "warn" }), /onToolAdded must be one of informational\|review\|block/);
  assert.throws(() => normalizePolicy("minimumGrade: B"), /expected an object/);
});

test("normalizePolicy handles minimumGrade aliases and numeric ranks", () => {
  assert.equal(normalizePolicy({ minimumGrade: "" }).minimumGrade, "—");
  assert.equal(normalizePolicy({ minimumGrade: "—" }).minimumGrade, "—");
  assert.equal(normalizePolicy({ minimumGrade: 3 }).minimumGrade, "B");
  assert.equal(normalizePolicy({ minimumGrade: 5 }).minimumGrade, "A+");
  assert.equal(normalizePolicy({ minimumGrade: 0 }).minimumGrade, "F");
  assert.equal(gradeRank(normalizePolicy({ minimumGrade: 0 }).minimumGrade), 0);
  assert.equal(gradeRank(normalizePolicy({ minimumGrade: "—" }).minimumGrade), -1);
});

test("normalizePolicy accepts scoped, time-boxed grants", () => {
  // The flat-YAML subset has no numbers and no arrays, so "24" and "a, b"
  // must both be accepted exactly as a policy author would type them.
  const yamlish = normalizePolicy({
    maxAgeHours: "24",
    allowTools: "search_email, list_inbox",
    denyTools: "send_email",
  });
  assert.equal(yamlish.maxAgeHours, 24);
  assert.deepEqual(yamlish.allowTools, ["list_inbox", "search_email"]);
  assert.deepEqual(yamlish.denyTools, ["send_email"]);

  // Real arrays (inline JSON) work too, and duplicates collapse.
  assert.deepEqual(normalizePolicy({ allowTools: ["b", "a", "b"] }).allowTools, ["a", "b"]);

  // Unset means unbounded/null — every lockfile written before these keys
  // existed must keep behaving exactly as it did.
  const unset = normalizePolicy({});
  assert.equal(unset.maxAgeHours, null);
  assert.equal(unset.allowTools, null);
  assert.equal(unset.denyTools, null);
  assert.equal(normalizePolicy({ maxAgeHours: "null" }).maxAgeHours, null);
  assert.equal(normalizePolicy({ allowTools: "" }).allowTools, null);
});

test("normalizePolicy rejects a nonsense window and non-tool names", () => {
  assert.throws(() => normalizePolicy({ maxAgeHours: "0" }), /positive integer of hours/);
  assert.throws(() => normalizePolicy({ maxAgeHours: "soon" }), /positive integer of hours/);
  assert.throws(() => normalizePolicy({ maxAgeHours: "1.5" }), /positive integer of hours/);
  assert.throws(() => normalizePolicy({ denyTools: "not a tool name!" }), /must be tool names/);
});
