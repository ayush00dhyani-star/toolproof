/**
 * toolproof-lock · lockfile core (BRIEF §2)
 *
 * Zero-dependency ESM. Node >= 18.
 *
 * Canonical `toolproof.lock` (JSON, UTF-8, 2-space indent, trailing \n):
 *   { lockVersion, generatedAt, target, kind, fingerprint, grade, score,
 *     ruleIds, policy, surface, signature, keyId, alg }
 *
 * `surface` mirrors the canonical manifest surface exactly and omits empty keys.
 * All output is key-order deterministic so a lockfile is byte-stable.
 */

import { normalizePolicy } from "./policy.mjs";

export const LOCK_VERSION = 1;

/** Deterministic top-level key order for a lockfile. */
export const LOCK_KEY_ORDER = Object.freeze([
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

/** Deterministic key order inside `surface`. */
export const SURFACE_KEY_ORDER = Object.freeze([
  "tools",
  "prompts",
  "resources",
  "instructions",
  "outboundHosts",
  "openapi",
]);

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const DEFAULT_ALG = "ed25519";
const DEFAULT_KEY_ID = "tpk-1";
const NO_GRADE = "—"; // em dash, rank -1 per BRIEF §3

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sorted, de-duplicated list of strings. Non-strings are dropped. */
export function canonicalStringList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  for (const entry of value) {
    if (typeof entry === "string" && entry.length > 0) seen.add(entry);
  }
  return [...seen].sort(cmpStr);
}

/**
 * Accepts either the canonical manifest response
 * (`{ manifest, signature, keyId, alg }`) or the inner manifest object.
 * Returns `{ manifest, signature, keyId, alg }`.
 */
export function unwrapManifest(input, who = "manifest") {
  if (!isPlainObject(input)) {
    throw new Error(`${who}: expected an object (got ${typeName(input)})`);
  }
  if (isPlainObject(input.manifest)) {
    const manifest = input.manifest;
    return {
      manifest,
      signature: input.signature ?? manifest.signature ?? null,
      keyId: input.keyId ?? manifest.keyId ?? null,
      alg: input.alg ?? manifest.alg ?? null,
    };
  }
  if (Object.prototype.hasOwnProperty.call(input, "manifestVersion")) {
    return {
      manifest: input,
      signature: input.signature ?? null,
      keyId: input.keyId ?? null,
      alg: input.alg ?? null,
    };
  }
  throw new Error(
    `${who}: not a canonical manifest (no "{ manifest }" wrapper and no "manifestVersion" field)`,
  );
}

function toolEntry(tool) {
  const out = {};
  for (const key of ["name", "description", "inputSchema", "outputSchema"]) {
    if (tool[key] !== undefined && tool[key] !== null) out[key] = cloneJson(tool[key]);
  }
  return out;
}

function promptEntry(prompt) {
  const out = {};
  for (const key of ["name", "description"]) {
    if (prompt[key] !== undefined && prompt[key] !== null) out[key] = cloneJson(prompt[key]);
  }
  return out;
}

function resourceEntry(resource) {
  const out = {};
  for (const key of ["name", "uri", "description"]) {
    if (resource[key] !== undefined && resource[key] !== null) out[key] = cloneJson(resource[key]);
  }
  return out;
}

/**
 * Mirror of the manifest surface, canonical order + canonical sorting.
 * Empty keys (undefined/null/""/[]/{}) are omitted, exactly like the manifest.
 */
export function buildSurface(manifest) {
  const surface = {};
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  if (tools.length > 0) {
    surface.tools = tools
      .filter(isPlainObject)
      .map(toolEntry)
      .sort((a, b) => cmpStr(String(a.name ?? ""), String(b.name ?? "")));
  }
  const prompts = Array.isArray(manifest.prompts) ? manifest.prompts : [];
  if (prompts.length > 0) {
    surface.prompts = prompts
      .filter(isPlainObject)
      .map(promptEntry)
      .sort((a, b) => cmpStr(String(a.name ?? ""), String(b.name ?? "")));
  }
  const resources = Array.isArray(manifest.resources) ? manifest.resources : [];
  if (resources.length > 0) {
    surface.resources = resources
      .filter(isPlainObject)
      .map(resourceEntry)
      .sort((a, b) => cmpStr(String(a.uri ?? ""), String(b.uri ?? "")));
  }
  if (typeof manifest.instructions === "string" && manifest.instructions.length > 0) {
    surface.instructions = manifest.instructions;
  }
  const hosts = canonicalStringList(manifest.outboundHosts);
  if (hosts.length > 0) surface.outboundHosts = hosts;
  if (!isEmptyValue(manifest.openapi)) surface.openapi = cloneJson(manifest.openapi);
  return surface;
}

/**
 * `buildLockfile(manifest, policy?)` -> canonical lockfile object (§2).
 *
 * @param {object} manifestLike canonical manifest response, or the inner manifest
 * @param {object|null} [policy] policy object/JSON string; stored under `policy`
 * @returns {object} lockfile
 */
export function buildLockfile(manifestLike, policy = null) {
  const { manifest, signature, keyId, alg } = unwrapManifest(manifestLike, "buildLockfile");

  if (typeof manifest.target !== "string" || manifest.target.trim() === "") {
    throw new Error("buildLockfile: manifest.target must be a non-empty string");
  }
  if (typeof manifest.kind !== "string" || manifest.kind.trim() === "") {
    throw new Error("buildLockfile: manifest.kind must be a non-empty string");
  }

  const fingerprint = manifest.fingerprint === undefined ? null : manifest.fingerprint;
  if (fingerprint !== null && (typeof fingerprint !== "string" || !SHA256_RE.test(fingerprint))) {
    throw new Error(
      `buildLockfile: manifest.fingerprint must be "sha256:<64 lowercase hex>" or null (got ${JSON.stringify(fingerprint)})`,
    );
  }

  const grade =
    typeof manifest.grade === "string" && manifest.grade.length > 0 ? manifest.grade : NO_GRADE;
  const score =
    typeof manifest.score === "number" && Number.isFinite(manifest.score)
      ? Math.trunc(manifest.score)
      : null;
  const generatedAt =
    typeof manifest.generatedAt === "string" && manifest.generatedAt.length > 0
      ? manifest.generatedAt
      : new Date().toISOString();
  const sig = typeof signature === "string" && signature.length > 0 ? signature : null;

  return {
    lockVersion: LOCK_VERSION,
    generatedAt,
    target: manifest.target,
    kind: manifest.kind,
    fingerprint,
    grade,
    score,
    ruleIds: canonicalStringList(manifest.ruleIds),
    policy: policy === null || policy === undefined ? null : normalizePolicy(policy),
    surface: buildSurface(manifest),
    signature: sig,
    keyId: keyId ?? (sig ? DEFAULT_KEY_ID : null),
    alg: alg ?? DEFAULT_ALG,
  };
}

function requireString(lock, key, { allowEmpty = false } = {}) {
  const value = lock[key];
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) {
    throw new Error(
      `parseLockfile: "${key}" must be ${allowEmpty ? "a" : "a non-empty"} string (got ${typeName(value)})`,
    );
  }
}

/**
 * `parseLockfile(text)` -> validated, canonicalized lockfile.
 * Throws a descriptive `Error` on malformed input.
 */
export function parseLockfile(text) {
  let raw = text;
  if (typeof raw !== "string") {
    if (raw !== null && typeof raw === "object" && typeof raw.toString === "function") {
      const asString = String(raw);
      if (asString === "" && !(typeof Buffer !== "undefined" && Buffer.isBuffer(raw))) {
        throw new Error(`parseLockfile: expected a JSON string (got ${typeName(raw)})`);
      }
      raw = asString;
    } else {
      throw new Error(`parseLockfile: expected a JSON string (got ${typeName(raw)})`);
    }
  }
  raw = raw.replace(/^\uFEFF/, "");
  if (raw.trim() === "") throw new Error("parseLockfile: input is empty");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`parseLockfile: invalid JSON — ${err.message}`);
  }
  if (!isPlainObject(parsed)) {
    throw new Error(`parseLockfile: top level must be a JSON object (got ${typeName(parsed)})`);
  }

  if (parsed.lockVersion !== LOCK_VERSION) {
    throw new Error(
      `parseLockfile: unsupported lockVersion ${JSON.stringify(parsed.lockVersion)} (expected ${LOCK_VERSION})`,
    );
  }
  requireString(parsed, "target");
  requireString(parsed, "kind");

  if (parsed.generatedAt !== undefined && parsed.generatedAt !== null) {
    requireString(parsed, "generatedAt");
  }
  if (
    parsed.fingerprint !== undefined &&
    parsed.fingerprint !== null &&
    (typeof parsed.fingerprint !== "string" || !SHA256_RE.test(parsed.fingerprint))
  ) {
    throw new Error(
      `parseLockfile: "fingerprint" must be "sha256:<64 lowercase hex>" or null (got ${JSON.stringify(parsed.fingerprint)})`,
    );
  }
  if (parsed.grade !== undefined && parsed.grade !== null && typeof parsed.grade !== "string") {
    throw new Error(`parseLockfile: "grade" must be a string (got ${typeName(parsed.grade)})`);
  }
  if (
    parsed.score !== undefined &&
    parsed.score !== null &&
    (typeof parsed.score !== "number" || !Number.isFinite(parsed.score))
  ) {
    throw new Error(`parseLockfile: "score" must be a finite number or null (got ${typeName(parsed.score)})`);
  }
  if (parsed.ruleIds !== undefined && parsed.ruleIds !== null && !Array.isArray(parsed.ruleIds)) {
    throw new Error(`parseLockfile: "ruleIds" must be an array of strings (got ${typeName(parsed.ruleIds)})`);
  }
  if (Array.isArray(parsed.ruleIds)) {
    for (const id of parsed.ruleIds) {
      if (typeof id !== "string") {
        throw new Error(`parseLockfile: "ruleIds" must contain only strings (got ${typeName(id)})`);
      }
    }
  }
  if (parsed.policy !== undefined && parsed.policy !== null && !isPlainObject(parsed.policy)) {
    throw new Error(`parseLockfile: "policy" must be an object or null (got ${typeName(parsed.policy)})`);
  }
  if (parsed.surface !== undefined && parsed.surface !== null && !isPlainObject(parsed.surface)) {
    throw new Error(`parseLockfile: "surface" must be an object (got ${typeName(parsed.surface)})`);
  }
  if (parsed.signature !== undefined && parsed.signature !== null && typeof parsed.signature !== "string") {
    throw new Error(`parseLockfile: "signature" must be a string or null (got ${typeName(parsed.signature)})`);
  }
  if (parsed.keyId !== undefined && parsed.keyId !== null && typeof parsed.keyId !== "string") {
    throw new Error(`parseLockfile: "keyId" must be a string or null (got ${typeName(parsed.keyId)})`);
  }
  if (parsed.alg !== undefined && parsed.alg !== null && typeof parsed.alg !== "string") {
    throw new Error(`parseLockfile: "alg" must be a string or null (got ${typeName(parsed.alg)})`);
  }

  const surface = cloneJson(parsed.surface ?? {}) ?? {};
  for (const key of ["tools", "prompts", "resources"]) {
    if (surface[key] !== undefined) {
      if (!Array.isArray(surface[key])) {
        throw new Error(`parseLockfile: "surface.${key}" must be an array (got ${typeName(surface[key])})`);
      }
      const sortKey = key === "resources" ? "uri" : "name";
      surface[key] = surface[key]
        .filter(isPlainObject)
        .sort((a, b) => cmpStr(String(a[sortKey] ?? ""), String(b[sortKey] ?? "")));
    }
  }
  if (surface.outboundHosts !== undefined) {
    if (!Array.isArray(surface.outboundHosts)) {
      throw new Error(
        `parseLockfile: "surface.outboundHosts" must be an array of strings (got ${typeName(surface.outboundHosts)})`,
      );
    }
    surface.outboundHosts = canonicalStringList(surface.outboundHosts);
  }
  if (surface.instructions !== undefined && typeof surface.instructions !== "string") {
    throw new Error(`parseLockfile: "surface.instructions" must be a string (got ${typeName(surface.instructions)})`);
  }
  if (surface.openapi !== undefined && !isPlainObject(surface.openapi)) {
    throw new Error(`parseLockfile: "surface.openapi" must be an object (got ${typeName(surface.openapi)})`);
  }

  // Rebuild in canonical key order so JSON output is byte-stable.
  const ordered = {};
  for (const key of LOCK_KEY_ORDER) {
    if (key === "surface") {
      ordered.surface = surface;
      continue;
    }
    if (key === "lockVersion") {
      ordered.lockVersion = LOCK_VERSION;
      continue;
    }
    if (key === "grade") {
      ordered.grade = parsed.grade ?? NO_GRADE;
      continue;
    }
    if (key === "ruleIds") {
      ordered.ruleIds = canonicalStringList(parsed.ruleIds);
      continue;
    }
    if (key === "alg") {
      ordered.alg = parsed.alg ?? DEFAULT_ALG;
      continue;
    }
    ordered[key] = parsed[key] === undefined ? null : parsed[key];
  }
  return ordered;
}

function canonicalize(value, order) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry, null));
  if (isPlainObject(value)) {
    let keys;
    if (order) {
      keys = [
        ...order.filter((k) => Object.prototype.hasOwnProperty.call(value, k)),
        ...Object.keys(value)
          .filter((k) => !order.includes(k))
          .sort(cmpStr),
      ];
    } else {
      keys = Object.keys(value).sort(cmpStr);
    }
    const out = {};
    for (const key of keys) {
      const childOrder = order && key === "surface" ? SURFACE_KEY_ORDER : null;
      out[key] = canonicalize(value[key], childOrder);
    }
    return out;
  }
  return value;
}

/** Stable, pretty JSON: 2-space indent, trailing newline, deterministic key order. */
export function stringifyLockfile(lock) {
  if (!isPlainObject(lock)) {
    throw new Error(`stringifyLockfile: expected a lockfile object (got ${typeName(lock)})`);
  }
  return `${JSON.stringify(canonicalize(lock, LOCK_KEY_ORDER), null, 2)}\n`;
}
