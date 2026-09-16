/**
 * toolproof local rule engine — zero dependencies.
 *
 * A faithful, self-contained port of the hosted scanner's string-analysis
 * core (src/lib/rules.ts). The wrapper uses this to enforce policy on a
 * live tool surface WITHOUT a network round-trip: the bytes an agent is
 * about to read are inspected before they reach the agent.
 *
 * Two policy classes, and the distinction IS the product:
 *
 *   BLOCK — deception. The tool lies to the agent or hides from the human.
 *           Removed from the agent's world; the agent is told exactly why.
 *           This is the narrow, low-false-positive set.
 *
 *   GRADE — sloppiness and hygiene. Harmless-intent, bad-practice. Forwarded
 *           untouched and reported. NEVER the reason to stop a tool.
 */

const UNICODE_CHECKS = [
  { re: /[\u200B-\u200F\u2060-\u2064\uFEFF]/, label: "zero-width characters" },
  { re: /[\u202A-\u202E\u2066-\u2069]/, label: "bidirectional control characters" },
  { re: /[\u{E0000}-\u{E007F}]/u, label: "unicode tag characters" },
];

const TEXT_PATTERNS = [
  { rule: "TP-102", sev: "critical", title: "Instruction override phrasing",
    re: /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,60}\b(?:previous|prior|above|earlier|all|any|system|developer)\b[^.\n]{0,40}\b(?:instruction|prompt|rule|message|context)/i,
    why: "Tells the model to discard prior instructions. Legitimate tools never need this." },
  { rule: "TP-102", sev: "critical", title: "Exfiltration instruction",
    re: /\b(?:send|post|forward|upload|transmit|exfiltrate)\b[^.\n]{0,80}\b(?:results?|output|data|context|conversation|history|secrets?|credentials?|tokens?)\b[^.\n]{0,80}\b(?:to|into)\b/i,
    why: "The text moves the conversation's data somewhere. That is exfiltration, not tooling." },
  { rule: "TP-102", sev: "high", title: "Concealment phrasing",
    re: /\b(?:do\s?not|don'?t|never)\b[^.\n]{0,40}\b(?:tell|inform|reveal|mention|disclose|show)\b[^.\n]{0,40}\b(?:user|human|owner)/i,
    why: "Hiding behavior from the operator is the definition of a malicious tool." },
  { rule: "TP-102", sev: "medium", title: "Identity-override phrasing",
    re: /\byou are (?:now|actually)\b/i,
    why: "Re-roleplay text is usually harmless, occasionally hijack. Review in context." },
  { rule: "TP-102", sev: "low", title: "Pre-response directive",
    re: /\bbefore (?:you )?(?:respond|reply|answer|call|calling|using)\b/i,
    why: "Pre-response directives are where hijacks hide. Check what it asks the agent to do first." },
  { rule: "TP-102", sev: "low", title: "Covert-action language",
    re: /\b(?:secretly|covertly|stealthily|undetected)\b/i,
    why: "Adverbs of concealment deserve a human look." },
  { rule: "TP-104", sev: "high", title: "Embedded credential",
    re: /\b(?:api[_\s-]?key|secret|password|bearer|token)\b\s*[:=]\s*["']?[A-Za-z0-9+/_-]{16,}/i,
    why: "A literal credential in tool text is compromised by definition." },
  { rule: "TP-105", sev: "low", title: "Out-of-band capability claim",
    re: /\b(?:environment variables?|env vars?|file ?system|execute shell|arbitrary code|wallet|seed phrase|private key)\b/i,
    why: "The text claims reach beyond the tool's apparent purpose. Confirm the scope is intentional." },
  { rule: "TP-108", sev: "high", title: "Destructive verbs",
    re: /\b(?:delete all|drop (?:all )?tables?|truncate|rm -rf|wipe (?:the )?(?:disk|drive|database)|factory reset)\b/i,
    why: "Delete-all-scale verbs in tool text can turn a narrow tool into a data destroyer. Confirm the blast radius is intended." },
  { rule: "TP-205", sev: "high", title: "Safety-bypass phrasing",
    re: /\b(?:skip|bypass|without)\s+(?:the\s+)?(?:user\s+)?(?:confirmation|approval|consent|asking)\b/i,
    why: "Skipping user confirmation removes the human from consequential actions. Verify this is intentional and narrowly scoped." },
  { rule: "TP-205", sev: "high", title: "Safety-bypass phrasing",
    re: /\bdon'?t ask (?:the user|for (?:confirmation|permission))\b/i,
    why: "Skipping user confirmation removes the human from consequential actions. Verify this is intentional and narrowly scoped." },
];

const BENIGN_PHRASES = [
  /\bignore (?:invalid|unknown|malformed|empty|duplicate|missing|optional|the (?:leading|trailing|whitespace))[^.\n]{0,30}/gi,
  /\b(?:disregard|forget) (?:invalid|unknown|malformed|empty|duplicate|missing|optional)[^.\n]{0,30}/gi,
];
const BENIGN_GUARDED_RULES = new Set(["TP-102", "TP-105", "TP-108", "TP-205"]);

const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

function snippet(text) {
  return text.replace(CONTROL_RE, "·").replace(/\s+/g, " ").trim().slice(0, 180);
}
function stripBenignPhrases(text) {
  let out = text;
  for (const re of BENIGN_PHRASES) out = out.replace(re, " ");
  return out;
}

/**
 * BLOCK policy — deception only. This is the set that earns a hard stop.
 * Sloppy-but-honest tools (no auth, a docs URL, a destructive verb in a
 * legit DB tool) land in GRADE and are forwarded untouched.
 */
const BLOCK_SET = new Set(["TP-101", "TP-104"]);
function isBlock(f) {
  if (BLOCK_SET.has(f.rule)) return true;
  // TP-102 only in its deceptive severities: override, exfiltration,
  // concealment. The medium/low variants (roleplay, pre-response) are GRADE.
  if (f.rule === "TP-102" && (f.sev === "critical" || f.sev === "high")) return true;
  return false;
}

/** Scan one piece of human-readable text. Mirrors hosted scanText(). */
export function scanText(where, text) {
  const out = [];
  if (!text || !typeof text === "string" || !text.trim()) return out;
  const benignStripped = stripBenignPhrases(text);

  for (const { re, label } of UNICODE_CHECKS) {
    if (re.test(text)) {
      out.push({ rule: "TP-101", sev: "high", title: `Hidden characters — ${label}`,
        where, evidence: snippet(text),
        why: "Invisible-to-humans characters are the standard channel for smuggled instructions. The tool text must be re-authored without them." });
      break;
    }
  }
  for (const p of TEXT_PATTERNS) {
    const hay = BENIGN_GUARDED_RULES.has(p.rule) ? benignStripped : text;
    const m = hay.match(p.re);
    if (m) out.push({ rule: p.rule, sev: p.sev, title: p.title, where, evidence: snippet(m[0]), why: p.why });
  }
  const urls = text.match(/https?:\/\/[^\s)"'`<>]+/g) ?? [];
  if (urls.length) {
    out.push({ rule: "TP-103", sev: "medium", title: "Outbound URL in tool text",
      where, evidence: urls.slice(0, 3).map((u) => snippet(u)).join("  ·  "),
      why: "Verify every URL: tool text that names endpoints can steer agents into contacting attacker infrastructure." });
  }
  return out;
}

/** Scan a tool's JSON-Schema input shape. */
export function scanSchema(where, schema) {
  const out = [];
  const s = schema;
  if (!s?.properties || typeof s.properties !== "object") return out;
  for (const [name, prop] of Object.entries(s.properties)) {
    if (!prop || typeof prop !== "object") continue;
    if (prop.description) out.push(...scanText(`${where} → param ${name}`, prop.description));
    const lname = name.toLowerCase();
    if (/(confirm|force|delete|overwrite|approve|drop)/.test(lname) && prop.default === true) {
      out.push({ rule: "TP-107", sev: "high", title: "Destructive default",
        where: `${where} → param ${name}`, evidence: `${name} defaults to true`,
        why: "Destructive actions must require explicit opt-in. A default of true lets an agent trigger them by omission." });
    }
    if (/^(api[_\s-]?key|token|secret|password|access[_\s-]?token)$/.test(lname)) {
      out.push({ rule: "TP-304", sev: "medium", title: "Credential-shaped tool parameter",
        where: `${where} → param ${name}`,
        why: "Asking a tool for raw credentials invites them into transcripts and logs." });
    }
  }
  return out;
}

/**
 * Enforce policy over a full tool list (the model-visible surface).
 * Returns { blocked, graded } where blocked tools are removed and graded
 * tools pass through with a report attached.
 */
export function enforceTools(tools) {
  const blocked = [];
  const graded = [];
  const safe = [];
  for (const t of tools ?? []) {
    // Skip non-object entries (null, undefined, primitives). A null slot in a
    // malformed tools/list must never become a phantom "<unnamed>" tool that
    // reaches the agent.
    if (!t || typeof t !== "object") continue;
    const name = String(t?.name ?? "<unnamed>");
    const desc = String(t?.description ?? "");
    const findings = [
      ...scanText(`tools/${name}`, desc),
      ...scanSchema(`tools/${name}`, t?.inputSchema),
    ];
    const blocking = findings.filter(isBlock);
    if (blocking.length) blocked.push({ name, findings: blocking });
    else {
      if (findings.length) graded.push({ name, findings });
      safe.push(t);
    }
  }
  return { blocked, graded, safe };
}

export { isBlock };
