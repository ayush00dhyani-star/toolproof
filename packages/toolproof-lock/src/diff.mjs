/**
 * toolproof-lock · semantic diff + policy evaluation (BRIEF §4)
 *
 * Zero-dependency ESM. Node >= 18.
 *
 * `diffManifests(lock, manifest, policy)` -> `{ changes, decision }` where every
 * change is exactly `{ category, action, message, where }` and `decision` is one of
 * `"in-sync" | "review-required" | "blocked"`.
 *
 * Action resolution: each category maps to one policy key (see CATEGORY_POLICY_KEY);
 * `grade-below-minimum` and `not-verified` are always `block`. The decision applies
 * precedence block > review > informational (informational-only stays "in-sync",
 * matching the exit-code contract: 0 in-sync/informational, 1 review, 2 block).
 */

import { DEFAULT_POLICY, gradeRank, normalizePolicy } from "./policy.mjs";
import { unwrapManifest } from "./lockfile.mjs";

/** change category -> policy key from BRIEF §4 */
export const CATEGORY_POLICY_KEY = Object.freeze({
  "tool-added": "onToolAdded",
  "tool-removed": "onToolRemoved",
  "description-changed": "onDescriptionChanged",
  "schema-expanded": "onSchemaExpanded",
  "schema-changed": "onDescriptionChanged",
  "outbound-host-added": "onNewOutboundHost",
  "high-severity-finding": "onHighSeverityFinding",
  "instruction-changed": "onDescriptionChanged",
  "grade-below-minimum": null,
  "not-verified": null,
  // Fail-closed integrity categories: no policy key can downgrade them.
  "surface-truncated": null,
  "tool-duplicated": null,
  "fingerprint-changed": null,
  "tool-not-allowed": null,
  "tool-denied": null,
  "grant-expired": null,
});

/** Categories that are hard-blocked by design (no policy key). */
export const IMPLICIT_BLOCK_CATEGORIES = Object.freeze([
  "grade-below-minimum",
  "not-verified",
  "surface-truncated",
  "tool-duplicated",
  "fingerprint-changed",
  "tool-not-allowed",
  "tool-denied",
  "grant-expired",
]);

export const ACTION_SEVERITY = Object.freeze({ informational: 0, review: 1, block: 2 });

const HIGH_SEVERITY_RULE_RE = /^TP-1/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function jsonEq(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function fmt(value) {
  if (value === undefined) return "absent";
  const asJson = JSON.stringify(value);
  if (asJson === undefined) return String(value);
  return asJson.length > 60 ? `${asJson.slice(0, 57)}...` : asJson;
}

function change(category, action, where, message) {
  return { category, action, message, where };
}

function indexBy(list, key) {
  const map = new Map();
  if (!Array.isArray(list)) return map;
  for (const entry of list) {
    if (!isPlainObject(entry)) continue;
    const id = entry[key];
    if (typeof id !== "string" || id.length === 0) continue;
    if (!map.has(id)) map.set(id, entry);
  }
  return map;
}

/** Resolve the policy action for a category. */
export function resolveAction(policy, category) {
  const key = CATEGORY_POLICY_KEY[category];
  if (!key) return "block"; // implicit-block categories
  const action = policy?.[key];
  if (action === "informational" || action === "review" || action === "block") return action;
  return DEFAULT_POLICY[key];
}

/** Aggregate change severities into a decision (block > review > informational). */
export function decide(changes) {
  let highest = -1;
  for (const entry of changes) {
    const severity = ACTION_SEVERITY[entry.action] ?? 0;
    if (severity > highest) highest = severity;
  }
  if (highest >= ACTION_SEVERITY.block) return "blocked";
  if (highest >= ACTION_SEVERITY.review) return "review-required";
  return "in-sync";
}

/** Sort by (action severity desc, category, where, message). */
export function sortChanges(changes) {
  return [...changes].sort((a, b) => {
    const severity = (ACTION_SEVERITY[b.action] ?? 0) - (ACTION_SEVERITY[a.action] ?? 0);
    if (severity !== 0) return severity;
    const byCategory = cmpStr(a.category, b.category);
    if (byCategory !== 0) return byCategory;
    const byWhere = cmpStr(a.where, b.where);
    if (byWhere !== 0) return byWhere;
    return cmpStr(a.message, b.message);
  });
}

function listWrapped(items) {
  return items.map((item) => `"${item}"`).join(", ");
}

/**
 * Schema delta between two tool schemas.
 *
 * - expansion: a new key under `properties`, a new entry in `required`,
 *   or the whole schema going from absent -> present
 * - everything else that differs (removed property/required entry, type/enum/
 *   format/additionalProperties/description change) is reported as a difference
 */
export function analyzeSchemaDelta(before, after) {
  const gainedProps = [];
  const gainedRequired = [];
  const lost = [];
  const absentToPresent = (before === undefined || before === null) && after !== undefined && after !== null;
  const presentToAbsent = before !== undefined && before !== null && (after === undefined || after === null);

  if (absentToPresent) {
    return {
      expanded: true,
      changed: false,
      gainedProps,
      gainedRequired: [],
      lost: [],
      differences: [],
    };
  }
  if (presentToAbsent) {
    return {
      expanded: false,
      changed: true,
      gainedProps,
      gainedRequired,
      lost: [],
      differences: ["schema present -> absent"],
    };
  }
  if (before === undefined || before === null) {
    return {
      expanded: false,
      changed: false,
      gainedProps,
      gainedRequired,
      lost: [],
      differences: [],
    };
  }

  const differences = [];

  const walk = (b, a, schemaPath, propPath) => {
    if (jsonEq(b, a)) return;
    const bObj = isPlainObject(b);
    const aObj = isPlainObject(a);
    if (!bObj || !aObj) {
      differences.push(`${schemaPath}: ${fmt(b)} -> ${fmt(a)}`);
      return;
    }
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort(cmpStr);
    for (const key of keys) {
      const inB = Object.prototype.hasOwnProperty.call(b, key);
      const inA = Object.prototype.hasOwnProperty.call(a, key);
      const childSchemaPath = schemaPath ? `${schemaPath}.${key}` : key;

      if (!inB && inA) {
        if (key === "properties" && isPlainObject(a[key])) {
          for (const prop of Object.keys(a[key]).sort(cmpStr)) {
            gainedProps.push(propPath ? `${propPath}.${prop}` : prop);
          }
        } else if (key === "required" && Array.isArray(a[key])) {
          for (const field of a[key]) {
            gainedRequired.push(propPath ? `${propPath}.${field}` : field);
          }
        } else {
          differences.push(`${childSchemaPath}: absent -> ${fmt(a[key])}`);
        }
        continue;
      }

      if (inB && !inA) {
        if (key === "properties" && isPlainObject(b[key])) {
          for (const prop of Object.keys(b[key]).sort(cmpStr)) {
            lost.push(`property "${propPath ? `${propPath}.${prop}` : prop}"`);
          }
        } else if (key === "required" && Array.isArray(b[key])) {
          for (const field of b[key]) {
            lost.push(`required "${propPath ? `${propPath}.${field}` : field}"`);
          }
        } else {
          differences.push(`${childSchemaPath}: ${fmt(b[key])} -> absent`);
        }
        continue;
      }

      if (key === "properties") {
        const bProps = isPlainObject(b[key]) ? b[key] : {};
        const aProps = isPlainObject(a[key]) ? a[key] : {};
        for (const prop of [...new Set([...Object.keys(bProps), ...Object.keys(aProps)])].sort(cmpStr)) {
          const inBP = Object.prototype.hasOwnProperty.call(bProps, prop);
          const inAP = Object.prototype.hasOwnProperty.call(aProps, prop);
          const childPropPath = propPath ? `${propPath}.${prop}` : prop;
          if (!inBP && inAP) {
            gainedProps.push(childPropPath);
          } else if (inBP && !inAP) {
            lost.push(`property "${childPropPath}"`);
          } else if (isPlainObject(bProps[prop]) && isPlainObject(aProps[prop])) {
            walk(bProps[prop], aProps[prop], `${childSchemaPath}.${prop}`, childPropPath);
          } else if (!jsonEq(bProps[prop], aProps[prop])) {
            differences.push(
              `${childSchemaPath}.${prop}: ${fmt(bProps[prop])} -> ${fmt(aProps[prop])}`,
            );
          }
        }
        continue;
      }

      if (key === "required") {
        const bReq = Array.isArray(b[key]) ? b[key] : [];
        const aReq = Array.isArray(a[key]) ? a[key] : [];
        const bSet = new Set(bReq);
        const aSet = new Set(aReq);
        for (const field of [...aSet].sort(cmpStr)) {
          if (!bSet.has(field)) gainedRequired.push(propPath ? `${propPath}.${field}` : field);
        }
        for (const field of [...bSet].sort(cmpStr)) {
          if (!aSet.has(field)) lost.push(`required "${propPath ? `${propPath}.${field}` : field}"`);
        }
        continue;
      }

      if (isPlainObject(b[key]) && isPlainObject(a[key])) {
        walk(b[key], a[key], childSchemaPath, propPath);
      } else if (!jsonEq(b[key], a[key])) {
        differences.push(`${childSchemaPath}: ${fmt(b[key])} -> ${fmt(a[key])}`);
      }
    }
  };

  walk(before, after, "", "");
  return {
    expanded: gainedProps.length > 0 || gainedRequired.length > 0,
    changed: lost.length > 0 || differences.length > 0,
    gainedProps,
    gainedRequired,
    lost,
    differences,
  };
}

function describeSurfaceDelta(side, toolName, delta) {
  const tool = `tool "${toolName}"`;
  const parts = [];
  if (delta.gainedProps.length > 0) {
    parts.push(`gained ${delta.gainedProps.length === 1 ? "property" : "properties"} ${listWrapped(delta.gainedProps)}`);
  }
  if (delta.gainedRequired.length > 0) {
    parts.push(`gained required field${delta.gainedRequired.length === 1 ? "" : "s"} ${listWrapped(delta.gainedRequired)}`);
  }
  const consequence =
    side === "outputSchema"
      ? "the target now returns data that was not described in the baseline"
      : "the target now accepts input that was not described in the baseline";
  const summary =
    parts.length > 0 ? parts.join(" and ") : "the schema went from absent to present";
  return `${side} of ${tool} expanded: ${summary} — ${consequence}`;
}

function describeSchemaChange(side, toolName, delta) {
  const detail = [...delta.lost, ...delta.differences].slice(0, 4).join("; ");
  return `${side} of tool "${toolName}" changed in a non-additive way (${detail}) — existing callers may send payloads the target no longer accepts`;
}

/**
 * `diffManifests(lock, manifest, policy)` -> `{ changes, decision }`.
 *
 * @param {object} lock parsed or built lockfile
 * @param {object} manifestLike canonical manifest response or inner manifest
 * @param {object} [policy] policy object/JSON string; defaults to DEFAULT_POLICY
 */
export function diffManifests(lock, manifestLike, policy = DEFAULT_POLICY) {
  if (!isPlainObject(lock)) throw new Error("diffManifests: lock must be a lockfile object");
  if (!isPlainObject(lock.surface)) throw new Error("diffManifests: lock.surface must be an object");
  if (typeof lock.target !== "string" || lock.target.length === 0) {
    throw new Error("diffManifests: lock.target must be a non-empty string");
  }
  const observed = unwrapManifest(manifestLike, "diffManifests").manifest;
  const active = normalizePolicy(policy ?? DEFAULT_POLICY);
  const lockSurface = lock.surface;
  const changes = [];

  const lockTools = indexBy(lockSurface.tools, "name");
  const observedTools = indexBy(observed.tools, "name");

  for (const name of [...observedTools.keys()].sort(cmpStr)) {
    if (lockTools.has(name)) continue;
    changes.push(
      change(
        "tool-added",
        resolveAction(active, "tool-added"),
        `tool:${name}`,
        `tool "${name}" appears in the observed manifest — the target now exposes a capability that was not in the baseline`,
      ),
    );
  }
  for (const name of [...lockTools.keys()].sort(cmpStr)) {
    if (observedTools.has(name)) continue;
    changes.push(
      change(
        "tool-removed",
        resolveAction(active, "tool-removed"),
        `tool:${name}`,
        `tool "${name}" disappeared from the observed manifest — callers of this tool will break`,
      ),
    );
  }

  for (const name of [...observedTools.keys()].sort(cmpStr)) {
    const before = lockTools.get(name);
    const after = observedTools.get(name);
    if (!before || !after) continue;
    if (text(before.description) !== text(after.description)) {
      changes.push(
        change(
          "description-changed",
          resolveAction(active, "description-changed"),
          `tool:${name}`,
          `description of tool "${name}" changed — the text the model reads differs from the baseline`,
        ),
      );
    }
    for (const side of ["inputSchema", "outputSchema"]) {
      const delta = analyzeSchemaDelta(before[side], after[side]);
      if (delta.expanded) {
        changes.push(
          change(
            "schema-expanded",
            resolveAction(active, "schema-expanded"),
            `tool:${name}.${side}`,
            describeSurfaceDelta(side, name, delta),
          ),
        );
      }
      if (delta.changed) {
        changes.push(
          change(
            "schema-changed",
            resolveAction(active, "schema-changed"),
            `tool:${name}.${side}`,
            describeSchemaChange(side, name, delta),
          ),
        );
      }
    }
  }

  const lockPrompts = indexBy(lockSurface.prompts, "name");
  const observedPrompts = indexBy(observed.prompts, "name");
  for (const name of [...observedPrompts.keys()].sort(cmpStr)) {
    const before = lockPrompts.get(name);
    const after = observedPrompts.get(name);
    if (!before || !after) continue;
    if (text(before.description) !== text(after.description)) {
      changes.push(
        change(
          "description-changed",
          resolveAction(active, "description-changed"),
          `prompt:${name}`,
          `description of prompt "${name}" changed — the text the model reads differs from the baseline`,
        ),
      );
    }
  }

  const lockResources = indexBy(lockSurface.resources, "uri");
  const observedResources = indexBy(observed.resources, "uri");
  for (const uri of [...observedResources.keys()].sort(cmpStr)) {
    const before = lockResources.get(uri);
    const after = observedResources.get(uri);
    if (!before || !after) continue;
    if (text(before.description) !== text(after.description)) {
      changes.push(
        change(
          "description-changed",
          resolveAction(active, "description-changed"),
          `resource:${uri}`,
          `description of resource "${uri}" changed — the text the model reads differs from the baseline`,
        ),
      );
    }
  }

  const lockHosts = new Set(Array.isArray(lockSurface.outboundHosts) ? lockSurface.outboundHosts : []);
  const observedHosts = Array.isArray(observed.outboundHosts) ? observed.outboundHosts : [];
  for (const host of [...new Set(observedHosts)].sort(cmpStr)) {
    if (lockHosts.has(host)) continue;
    changes.push(
      change(
        "outbound-host-added",
        resolveAction(active, "outbound-host-added"),
        `outboundHost:${host}`,
        `new outbound host "${host}" appears in the observed manifest — the target now sends data to a host that was not in the baseline`,
      ),
    );
  }

  const lockRules = new Set(Array.isArray(lock.ruleIds) ? lock.ruleIds : []);
  for (const ruleId of [...new Set(Array.isArray(observed.ruleIds) ? observed.ruleIds : [])].sort(cmpStr)) {
    if (lockRules.has(ruleId)) continue;
    if (!HIGH_SEVERITY_RULE_RE.test(ruleId)) continue; // v1 simplification: only TP-1xx is high severity
    changes.push(
      change(
        "high-severity-finding",
        resolveAction(active, "high-severity-finding"),
        `rule:${ruleId}`,
        `high-severity finding ${ruleId} is new since the baseline — the target currently fails a critical/high rule`,
      ),
    );
  }

  if (text(lockSurface.instructions) !== text(observed.instructions)) {
    changes.push(
      change(
        "instruction-changed",
        resolveAction(active, "instruction-changed"),
        "instructions",
        "instructions text changed — the guidance served to agents differs from the baseline",
      ),
    );
  }

  const minimumRank = gradeRank(active.minimumGrade);
  const observedRank = gradeRank(observed.grade);
  if (minimumRank >= 0 && observedRank < minimumRank) {
    changes.push(
      change(
        "grade-below-minimum",
        "block",
        "grade",
        `grade "${text(observed.grade) || "—"}" is below the required minimum "${active.minimumGrade}" — the target sits below the trust grade this policy requires`,
      ),
    );
  }

  if (active.requireVerified && text(observed.state) !== "verified") {
    changes.push(
      change(
        "not-verified",
        "block",
        "state",
        `target state is "${text(observed.state) || "unknown"}" but the policy requires "verified" — an unverified target cannot be gated against`,
      ),
    );
  }

  // --- scoped grants: a tool outside the permit-list is not approved -----
  // The lockfile pins the whole surface; allowTools narrows what the agent may
  // actually call. Anything outside it blocks rather than passing silently —
  // "approved the server" must not mean "approved every tool on it."
  const allowed = Array.isArray(active.allowTools) ? active.allowTools : null;
  if (allowed) {
    const allowedSet = new Set(allowed);
    for (const name of [...observedTools.keys()].sort(cmpStr)) {
      if (allowedSet.has(name)) continue;
      changes.push(
        change(
          "tool-not-allowed",
          "block",
          `tool:${name}`,
          `tool "${name}" is not on the policy's allow list — this grant covers only ${listWrapped(allowed)}, so the rest of the surface must be enabled deliberately`,
        ),
      );
    }
  }
  const denied = Array.isArray(active.denyTools) ? active.denyTools : null;
  if (denied) {
    const deniedSet = new Set(denied);
    for (const name of [...observedTools.keys()].sort(cmpStr)) {
      if (!deniedSet.has(name)) continue;
      changes.push(
        change(
          "tool-denied",
          "block",
          `tool:${name}`,
          `tool "${name}" is on the policy's deny list — this tool was excluded from the grant`,
        ),
      );
    }
  }

  // --- short-lived grants: an approval older than the policy is stale -----
  // The boundary the commenter named: a clean scan today must not authorise a
  // newly added side effect indefinitely. If the baseline aged past maxAgeHours
  // it is no longer evidence about the current surface, so it fails closed.
  if (typeof active.maxAgeHours === "number" && active.maxAgeHours > 0) {
    const stamped = typeof lock.generatedAt === "string" ? Date.parse(lock.generatedAt) : NaN;
    if (Number.isFinite(stamped)) {
      const ageMs = Date.now() - stamped;
      const limitMs = active.maxAgeHours * 3_600_000;
      if (ageMs > limitMs) {
        changes.push(
          change(
            "grant-expired",
            "block",
            "policy",
            `the baseline is ${Math.round(ageMs / 3_600_000)}h old but the policy bounds approvals to ${active.maxAgeHours}h — the approval no longer describes the current surface, so it must be re-locked deliberately`,
          ),
        );
      }
    }
  }

  // --- fail-closed integrity checks -------------------------------------

  // The scanner caps each surface list; an incomplete enumeration cannot be
  // approved in full, so a truncated observed surface always blocks.
  if (observed.truncated === true) {
    changes.push(
      change(
        "surface-truncated",
        "block",
        "surface",
        "the observed surface was truncated at the scanner's per-list cap — the target advertises more capabilities than could be enumerated, so the baseline cannot cover it",
      ),
    );
  }

  // A tool name declared twice can shadow a real definition: the first entry
  // is what a reviewer reads, but behavior may follow the second.
  const observedToolNames = Array.isArray(observed.tools)
    ? observed.tools
        .map((t) => (isPlainObject(t) ? t.name : undefined))
        .filter((n) => typeof n === "string" && n.length > 0)
    : [];
  const seenNames = new Set();
  const duplicateNames = new Set();
  for (const name of observedToolNames) {
    if (seenNames.has(name)) duplicateNames.add(name);
    else seenNames.add(name);
  }
  for (const name of [...duplicateNames].sort(cmpStr)) {
    changes.push(
      change(
        "tool-duplicated",
        "block",
        `tool:${name}`,
        `tool "${name}" is declared more than once in the observed surface — a shadowed definition can change behaviour while the first entry looks unchanged`,
      ),
    );
  }

  // Last-resort fail-safe: the manifest fingerprint covers the whole surface,
  // including fields without a dedicated category (serverInfo, openapi). If
  // it moved and nothing above explained why, refuse to call it in-sync.
  const lockFingerprint =
    typeof lock.fingerprint === "string" && lock.fingerprint.length > 0
      ? lock.fingerprint
      : null;
  const observedFingerprint =
    typeof observed.fingerprint === "string" && observed.fingerprint.length > 0
      ? observed.fingerprint
      : null;
  if (
    lockFingerprint &&
    observedFingerprint &&
    lockFingerprint !== observedFingerprint &&
    changes.length === 0
  ) {
    changes.push(
      change(
        "fingerprint-changed",
        "block",
        "fingerprint",
        `the capability fingerprint changed (${lockFingerprint.slice(0, 19)}… -> ${observedFingerprint.slice(0, 19)}…) but no specific change was identified — treat as unapproved drift and re-lock deliberately only after review`,
      ),
    );
  }

  const sorted = sortChanges(changes);
  return { changes: sorted, decision: decide(sorted) };
}
