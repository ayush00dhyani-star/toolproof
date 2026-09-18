/**
 * toolproof-lock · policy core (BRIEF §3)
 *
 * Zero-dependency ESM. Node >= 18.
 *
 * Accepts pure JSON or the flat-YAML subset used by `toolproof.policy.yml`:
 * flat `key: value` lines, `#` comments, blank lines ignored, bare string values
 * (quotes optional). Nested/indented mappings are rejected on purpose.
 */

export const ACTION_VALUES = Object.freeze(["informational", "review", "block"]);

/** Category -> policy key mapping lives in diff.mjs; these are the policy's own keys. */
export const POLICY_KEYS = Object.freeze([
  "minimumGrade",
  "requireVerified",
  "maxAgeHours",
  "allowTools",
  "denyTools",
  "onToolAdded",
  "onToolRemoved",
  "onDescriptionChanged",
  "onSchemaExpanded",
  "onNewOutboundHost",
  "onHighSeverityFinding",
]);

/** Default policy (BRIEF §3) — used when no policy file/inline policy is given. */
export const DEFAULT_POLICY = Object.freeze({
  minimumGrade: "B",
  requireVerified: true,
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

/** Grade ranks (BRIEF §3). `—`/empty/unknown => -1. */
export const GRADE_RANKS = Object.freeze({ "A+": 5, A: 4, B: 3, C: 2, D: 1, F: 0 });

const RANK_TO_GRADE = Object.freeze(["F", "D", "C", "B", "A", "A+"]);
const NO_GRADE = "—";

const KEY_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const INT_RE = /^-?\d+$/;

/**
 * Normalizes a permit/deny tool list to a sorted array of names, or null when
 * unset. Flat-YAML gives every value as a string, so "a, b" and "a" are both
 * accepted, as is a real array from inline JSON.
 */
function normalizeToolList(value, key) {
  if (value === undefined || value === null || value === "" || value === "null") return null;
  const items = Array.isArray(value) ? value : String(value).split(",");
  const seen = new Set();
  for (const item of items) {
    const name = String(item).trim();
    if (name.length === 0) continue;
    seen.add(name);
  }
  const sorted = [...seen].sort();
  if (sorted.length === 0) return null;
  if (sorted.some((name) => !KEY_RE.test(name))) {
    throw new Error(
      `normalizePolicy: ${key} entries must be tool names matching [A-Za-z][A-Za-z0-9_-]* (got ${JSON.stringify(sorted)})`,
    );
  }
  return sorted;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isAction(value) {
  return typeof value === "string" && ACTION_VALUES.includes(value);
}

/**
 * `gradeRank(grade)` -> 0..5, or -1 for `—`/empty/unknown (and for any unknown string).
 * Lowercase letters are accepted ("b" -> 3). Integer ranks 0..5 pass through.
 */
export function gradeRank(grade) {
  if (typeof grade === "number" && Number.isInteger(grade) && grade >= 0 && grade <= 5) {
    return grade;
  }
  if (typeof grade !== "string") return -1;
  const key = grade.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(GRADE_RANKS, key)) return GRADE_RANKS[key];
  return -1;
}

function coerceScalar(value) {
  const text = value.trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (INT_RE.test(text)) return Number(text);
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function stripComment(line) {
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/**
 * Parses the flat-YAML subset or pure JSON into a normalized policy object.
 * Empty/comment-only input yields DEFAULT_POLICY.
 */
export function parsePolicy(text) {
  if (typeof text !== "string") {
    throw new Error(`parsePolicy: expected a string (got ${typeName(text)})`);
  }
  const source = text.replace(/^\uFEFF/, "");
  const trimmed = source.trim();
  if (trimmed === "") return normalizePolicy(undefined);

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`parsePolicy: invalid JSON — ${err.message}`);
    }
    return normalizePolicy(parsed);
  }

  const raw = {};
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index];
    const line = stripComment(original);
    if (line.trim() === "") continue;
    if (/^\s/.test(original) && line.trim() !== "") {
      throw new Error(
        `parsePolicy: line ${index + 1} is indented; the YAML subset is flat (nested mappings are not supported)`,
      );
    }
    const separator = line.indexOf(":");
    if (separator < 0) {
      throw new Error(`parsePolicy: line ${index + 1} is not "key: value" (${JSON.stringify(line.trim())})`);
    }
    const key = line.slice(0, separator).trim();
    const valueText = line.slice(separator + 1).trim();
    if (!KEY_RE.test(key)) {
      throw new Error(`parsePolicy: line ${index + 1} has an invalid key (${JSON.stringify(key)})`);
    }
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      throw new Error(`parsePolicy: duplicate key ${JSON.stringify(key)} on line ${index + 1}`);
    }
    raw[key] = coerceScalar(valueText);
  }
  return normalizePolicy(raw);
}

/**
 * `normalizePolicy(obj)` -> full policy with defaults filled.
 * Throws on unknown keys, bad action values, or a bad `minimumGrade`/`requireVerified`.
 */
export function normalizePolicy(obj) {
  if (obj === undefined || obj === null) return { ...DEFAULT_POLICY };
  if (!isPlainObject(obj)) {
    throw new Error(`normalizePolicy: expected an object (got ${typeName(obj)})`);
  }

  for (const key of Object.keys(obj)) {
    if (!POLICY_KEYS.includes(key)) {
      throw new Error(
        `normalizePolicy: unknown policy key ${JSON.stringify(key)} (allowed: ${POLICY_KEYS.join(", ")})`,
      );
    }
  }

  const out = {};

  const minimumRaw = obj.minimumGrade === undefined ? DEFAULT_POLICY.minimumGrade : obj.minimumGrade;
  if (typeof minimumRaw === "number") {
    if (!Number.isInteger(minimumRaw) || minimumRaw < 0 || minimumRaw > 5) {
      throw new Error(
        `normalizePolicy: minimumGrade must be one of A+,A,B,C,D,F or an integer rank 0-5 (got ${JSON.stringify(minimumRaw)})`,
      );
    }
    out.minimumGrade = RANK_TO_GRADE[minimumRaw];
  } else if (typeof minimumRaw === "string") {
    const asIs = minimumRaw.trim();
    if (asIs === "" || asIs === NO_GRADE || asIs === "-" || asIs === "none") {
      out.minimumGrade = NO_GRADE; // rank -1 => no minimum enforced
    } else if (gradeRank(asIs) >= 0) {
      out.minimumGrade = asIs.toUpperCase();
    } else {
      throw new Error(
        `normalizePolicy: minimumGrade must be one of A+,A,B,C,D,F (got ${JSON.stringify(minimumRaw)})`,
      );
    }
  } else {
    throw new Error(
      `normalizePolicy: minimumGrade must be a string or integer rank (got ${typeName(minimumRaw)})`,
    );
  }

  const verifiedRaw = obj.requireVerified === undefined ? DEFAULT_POLICY.requireVerified : obj.requireVerified;
  if (typeof verifiedRaw === "boolean") {
    out.requireVerified = verifiedRaw;
  } else if (verifiedRaw === "true" || verifiedRaw === "false") {
    out.requireVerified = verifiedRaw === "true";
  } else {
    throw new Error(
      `normalizePolicy: requireVerified must be a boolean (got ${JSON.stringify(verifiedRaw)})`,
    );
  }

  // Short-lived grants: maxAgeHours bounds how long an approval stays valid.
  // Null/absent means unbounded (the historical default, so existing lockfiles
  // keep working). A string like "24" is accepted because the flat-YAML subset
  // has no numbers — every value arrives as text.
  const ageRaw = obj.maxAgeHours === undefined ? DEFAULT_POLICY.maxAgeHours : obj.maxAgeHours;
  if (ageRaw === null || ageRaw === undefined || ageRaw === "" || ageRaw === "null") {
    out.maxAgeHours = null;
  } else {
    const age = typeof ageRaw === "number" ? ageRaw : Number(String(ageRaw).trim());
    if (!Number.isFinite(age) || age <= 0 || !Number.isInteger(age)) {
      throw new Error(
        `normalizePolicy: maxAgeHours must be a positive integer of hours (got ${JSON.stringify(ageRaw)})`,
      );
    }
    out.maxAgeHours = age;
  }

  // Scoped grants: restrict the approval to a subset of the surface. allowTools
  // is a permit-list (only these may run); denyTools is a block-list. Both are
  // accepted as comma-separated strings, single strings, or arrays.
  out.allowTools = normalizeToolList(obj.allowTools, "allowTools");
  out.denyTools = normalizeToolList(obj.denyTools, "denyTools");

  for (const key of POLICY_KEYS) {
    if (!key.startsWith("on")) continue;
    const value = obj[key] === undefined ? DEFAULT_POLICY[key] : obj[key];
    if (!isAction(value)) {
      throw new Error(
        `normalizePolicy: ${key} must be one of ${ACTION_VALUES.join("|")} (got ${JSON.stringify(value)})`,
      );
    }
    out[key] = value;
  }

  const ordered = {};
  for (const key of POLICY_KEYS) ordered[key] = out[key];
  return ordered;
}
