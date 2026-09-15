/**
 * toolproof-lock · decision helpers (BRIEF §5 exit codes)
 *
 * Zero-dependency ESM. Node >= 18.
 *
 *   in-sync         -> 0
 *   review-required -> 1
 *   blocked         -> 2
 *   usage/network   -> 3 (EXIT_CODES.ERROR; not produced here)
 */

export const EXIT_CODES = Object.freeze({
  OK: 0,
  REVIEW: 1,
  BLOCK: 2,
  ERROR: 3,
});

const DECISION_EXIT = Object.freeze({
  "in-sync": EXIT_CODES.OK,
  "review-required": EXIT_CODES.REVIEW,
  blocked: EXIT_CODES.BLOCK,
});

/** `exitCodeFor(decision)` -> 0 | 1 | 2. Throws on an unknown decision string. */
export function exitCodeFor(decision) {
  if (typeof decision !== "string" || !(decision in DECISION_EXIT)) {
    throw new Error(
      `exitCodeFor: unknown decision ${JSON.stringify(decision)} (expected "in-sync", "review-required" or "blocked")`,
    );
  }
  return DECISION_EXIT[decision];
}

function countByAction(changes) {
  const counts = { informational: 0, review: 0, block: 0 };
  for (const entry of changes) {
    if (counts[entry?.action] !== undefined) counts[entry.action] += 1;
  }
  return counts;
}

/**
 * `summarizeDecision(decision, changes)` -> one short human verdict line
 * (no trailing newline, no ANSI).
 */
export function summarizeDecision(decision, changes = []) {
  const list = Array.isArray(changes) ? changes : [];
  const counts = countByAction(list);
  const total = list.length;

  if (decision === "blocked") {
    const blocking = list.filter((entry) => entry?.action === "block");
    const named = [...new Set(blocking.map((entry) => `${entry.category} (${entry.where})`))];
    const shown = named.slice(0, 3).join(", ");
    const more = named.length > 3 ? `, +${named.length - 3} more` : "";
    return `blocked — ${counts.block} blocking change${counts.block === 1 ? "" : "s"}: ${shown}${more}`;
  }

  if (decision === "review-required") {
    const parts = [`${total} change${total === 1 ? "" : "s"}`];
    if (counts.block > 0) parts.push(`${counts.block} blocked`);
    if (counts.review > 0) parts.push(`${counts.review} need review`);
    if (counts.informational > 0) parts.push(`${counts.informational} informational`);
    return `review required — ${parts.join(", ")}`;
  }

  if (decision === "in-sync") {
    if (counts.informational > 0) {
      return `in sync — ${counts.informational} informational change${counts.informational === 1 ? "" : "s"}, nothing to act on`;
    }
    return "in sync — no capability drift detected";
  }

  throw new Error(
    `summarizeDecision: unknown decision ${JSON.stringify(decision)} (expected "in-sync", "review-required" or "blocked")`,
  );
}
