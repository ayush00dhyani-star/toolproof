import type { Finding, Sev } from "./types";

export interface RuleMeta {
  id: string;
  name: string;
  sev: Sev;
  group: "description" | "schema" | "transport" | "spec";
  why: string;
  fix: string;
}

/** The public rule catalog — also rendered on the landing page. */
export const FIX: Record<string, string> = {
  "TP-101": "Re-author the text without the invisible characters — paste it through a plain-text editor; the exact bytes are in the evidence.",
  "TP-102": "Remove the instruction phrases entirely. A tool description describes inputs and outputs — it never addresses the model.",
  "TP-103": "Remove the URLs, or document each one in your README. If the tool must call out, do it in code, not in text the model reads.",
  "TP-104": "Delete the credential from the text and rotate the key now — it is already burned.",
  "TP-105": "Narrow the tool to what its name promises; move anything else behind a separate, explicit tool.",
  "TP-108": "Remove the destructive verbs, or gate the action behind a separate confirm step.",
  "TP-205": "Delete it. Confirmation flows belong to the agent harness, not the tool text.",
  "TP-107": "Set default: false and require an explicit value for destructive runs.",
  "TP-304": "Take credentials out of parameters — use environment config or an auth header the harness controls.",
  "TP-201": "Serve over HTTPS. There is no reason to ship plain http.",
  "TP-202": "Add auth if the tool touches anything private; if it is public by design, say so in the description.",
  "TP-302": "Declare securitySchemes in the spec — even none, with a justification, reads better than silence.",
  "TP-303": "Update spec.servers to the https origin.",
  "TP-206": "Serve resources over https or file schemes; document anything exotic."
};

export const withFix = (f: Finding): Finding => ({ ...f, fix: FIX[f.rule] });

export const RULES: RuleMeta[] = [
  {
    id: "TP-101",
    name: "Hidden characters",
    sev: "high",
    group: "description",
    why: "Invisible characters that smuggle secret instructions past human eyes — but the AI reads them fine.",
    fix: "Re-author the text without the invisible characters — paste it through a plain-text editor; the exact bytes are in the evidence.",
  },
  {
    id: "TP-102",
    name: "Hidden instructions",
    sev: "critical",
    group: "description",
    why: "Text telling the AI to ignore its rules, change who it is, or hide things from you.",
    fix: "Remove the instruction phrases entirely. A tool description describes inputs and outputs — it never addresses the model.",
  },
  {
    id: "TP-103",
    name: "Phone-home addresses",
    sev: "medium",
    group: "description",
    why: "The tool mentions web addresses. Where do they lead, and who runs them?",
    fix: "Remove the URLs, or document each one in your README. If the tool must call out, do it in code, not in text the model reads.",
  },
  {
    id: "TP-104",
    name: "Exposed secrets",
    sev: "high",
    group: "description",
    why: "A live password or API key sitting in plain text.",
    fix: "Delete the credential from the text and rotate the key now — it is already burned.",
  },
  {
    id: "TP-105",
    name: "Reaching too far",
    sev: "low",
    group: "description",
    why: "The tool can touch your files, system or wallet — more than its job needs.",
    fix: "Narrow the tool to what its name promises; move anything else behind a separate, explicit tool.",
  },
  {
    id: "TP-108",
    name: "Wipe-out language",
    sev: "high",
    group: "description",
    why: "Talk of deleting everything, wiping disks, resetting things. One wrong call and data is gone.",
    fix: "Remove the destructive verbs, or gate the action behind a separate confirm step.",
  },
  {
    id: "TP-205",
    name: "Skips asking permission",
    sev: "high",
    group: "description",
    why: "Text that tells the AI to act without asking you first.",
    fix: "Delete it. Confirmation flows belong to the agent harness, not the tool text.",
  },
  {
    id: "TP-107",
    name: "Dangers on by default",
    sev: "high",
    group: "schema",
    why: "Risky actions happen unless you switch them off — and most people never do.",
    fix: "Set default: false and require an explicit value for destructive runs.",
  },
  {
    id: "TP-304",
    name: "Asks for raw passwords",
    sev: "medium",
    group: "schema",
    why: "The tool wants your keys or passwords directly — which end up in logs.",
    fix: "Take credentials out of parameters — use environment config or an auth header the harness controls.",
  },
  {
    id: "TP-201",
    name: "No encryption",
    sev: "critical",
    group: "transport",
    why: "Data travels unencrypted. Anyone nearby can read and change it.",
    fix: "Serve over HTTPS. There is no reason to ship plain http.",
  },
  {
    id: "TP-202",
    name: "Anyone can connect",
    sev: "info",
    group: "transport",
    why: "No login needed. Fine for public info — risky for anything private.",
    fix: "Add auth if the tool touches anything private; if it is public by design, say so in the description.",
  },
  {
    id: "TP-203",
    name: "Checks who's connecting",
    sev: "info",
    group: "transport",
    why: "A good sign: the tool refuses strangers.",
    fix: "Nothing to do — this is a positive signal.",
  },
  {
    id: "TP-302",
    name: "No login mentioned anywhere",
    sev: "medium",
    group: "spec",
    why: "The API's own manual describes no sign-in at all.",
    fix: "Declare securitySchemes in the spec — even none, with a justification, reads better than silence.",
  },
  {
    id: "TP-303",
    name: "Manual points to unsafe address",
    sev: "critical",
    group: "spec",
    why: "The API's documentation advertises an unencrypted server.",
    fix: "Update spec.servers to the https origin.",
  },
  {
    id: "TP-206",
    name: "Points to odd places",
    sev: "medium",
    group: "spec",
    why: "Lists files or feeds from unusual, non-standard sources.",
    fix: "Serve resources over https or file schemes; document anything exotic.",
  },
];

const UNICODE_CHECKS: { re: RegExp; label: string }[] = [
  {
    re: /[\u200B-\u200F\u2060-\u2064\uFEFF]/,
    label: "zero-width characters",
  },
  {
    re: /[\u202A-\u202E\u2066-\u2069]/,
    label: "bidirectional control characters",
  },
  {
    re: /[\u{E0000}-\u{E007F}]/u,
    label: "unicode tag characters",
  },
];

const TEXT_PATTERNS: {
  rule: string;
  sev: Sev;
  title: string;
  re: RegExp;
  why: string;
}[] = [
  {
    rule: "TP-102",
    sev: "critical",
    title: "Instruction override phrasing",
    re:
      /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,60}\b(?:previous|prior|above|earlier|all|any|system|developer)\b[^.\n]{0,40}\b(?:instruction|prompt|rule|message|context)/i,
    why: "Tells the model to discard prior instructions. Legitimate tools never need this.",
  },
  {
    rule: "TP-102",
    sev: "critical",
    title: "Exfiltration instruction",
    re:
      /\b(?:send|post|forward|upload|transmit|exfiltrate)\b[^.\n]{0,80}\b(?:results?|output|data|context|conversation|history|secrets?|credentials?|tokens?)\b[^.\n]{0,80}\b(?:to|into)\b/i,
    why: "The text moves the conversation's data somewhere. That is exfiltration, not tooling.",
  },
  {
    rule: "TP-102",
    sev: "high",
    title: "Concealment phrasing",
    re:
      /\b(?:do\s?not|don'?t|never)\b[^.\n]{0,40}\b(?:tell|inform|reveal|mention|disclose|show)\b[^.\n]{0,40}\b(?:user|human|owner)/i,
    why: "Hiding behavior from the operator is the definition of a malicious tool.",
  },
  {
    rule: "TP-102",
    sev: "medium",
    title: "Identity-override phrasing",
    re: /\byou are (?:now|actually)\b/i,
    why: "Re-roleplay text is usually harmless, occasionally hijack. Review in context.",
  },
  {
    rule: "TP-102",
    sev: "low",
    title: "Pre-response directive",
    re: /\bbefore (?:you )?(?:respond|reply|answer|call|calling|using)\b/i,
    why: "Pre-response directives are where hijacks hide. Check what it asks the agent to do first.",
  },
  {
    rule: "TP-102",
    sev: "low",
    title: "Covert-action language",
    re: /\b(?:secretly|covertly|stealthily|undetected)\b/i,
    why: "Adverbs of concealment deserve a human look.",
  },
  {
    rule: "TP-104",
    sev: "high",
    title: "Embedded credential",
    re:
      /\b(?:api[_\s-]?key|secret|password|bearer|token)\b\s*[:=]\s*["']?[A-Za-z0-9+/_-]{16,}/i,
    why: "A literal credential in tool text is compromised by definition.",
  },
  {
    rule: "TP-105",
    sev: "low",
    title: "Out-of-band capability claim",
    re:
      /\b(?:environment variables?|env vars?|file ?system|execute shell|arbitrary code|wallet|seed phrase|private key)\b/i,
    why: "The text claims reach beyond the tool's apparent purpose. Confirm the scope is intentional.",
  },
  {
    rule: "TP-108",
    sev: "high",
    title: "Destructive verbs",
    re:
      /\b(?:delete all|drop (?:all )?tables?|truncate|rm -rf|wipe (?:the )?(?:disk|drive|database)|factory reset)\b/i,
    why: "Delete-all-scale verbs in tool text can turn a narrow tool into a data destroyer. Confirm the blast radius is intended.",
  },
  {
    rule: "TP-205",
    sev: "high",
    title: "Safety-bypass phrasing",
    re:
      /\b(?:skip|bypass|without)\s+(?:the\s+)?(?:user\s+)?(?:confirmation|approval|consent|asking)\b/i,
    why: "Skipping user confirmation removes the human from consequential actions. Verify this is intentional and narrowly scoped.",
  },
  {
    rule: "TP-205",
    sev: "high",
    title: "Safety-bypass phrasing",
    re: /\bdon'?t ask (?:the user|for (?:confirmation|permission))\b/i,
    why: "Skipping user confirmation removes the human from consequential actions. Verify this is intentional and narrowly scoped.",
  },
];

/**
 * Benign input-validation boilerplate that superficially resembles hijack
 * phrasing. Stripped before the TP-102/TP-105/TP-108/TP-205 patterns run;
 * TP-101, TP-103 and TP-104 still scan the original text.
 */
const BENIGN_PHRASES: RegExp[] = [
  /\bignore (?:invalid|unknown|malformed|empty|duplicate|missing|optional|the (?:leading|trailing|whitespace))[^.\n]{0,30}/gi,
  /\b(?:disregard|forget) (?:invalid|unknown|malformed|empty|duplicate|missing|optional)[^.\n]{0,30}/gi,
];

const BENIGN_GUARDED_RULES = new Set(["TP-102", "TP-105", "TP-108", "TP-205"]);

function stripBenignPhrases(text: string): string {
  let out = text;
  for (const re of BENIGN_PHRASES) out = out.replace(re, " ");
  return out;
}

const CONTROL_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

function snippet(text: string): string {
  return text
    .replace(CONTROL_RE, "·")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/** Scan one piece of human-readable text (tool description, instruction, spec blurb). */
export function scanText(where: string, text: string): Finding[] {
  const out: Finding[] = [];
  if (!text || !text.trim()) return out;

  const benignStripped = stripBenignPhrases(text);

  for (const { re, label } of UNICODE_CHECKS) {
    if (re.test(text)) {
      out.push({
        rule: "TP-101",
        sev: "high",
        title: `Hidden characters — ${label}`,
        where,
        evidence: snippet(text),
        why: "Invisible-to-humans characters are the standard channel for smuggled instructions. The tool text must be re-authored without them.",
      });
      break;
    }
  }

  for (const p of TEXT_PATTERNS) {
    const hay = BENIGN_GUARDED_RULES.has(p.rule) ? benignStripped : text;
    const m = hay.match(p.re);
    if (m) {
      out.push({
        rule: p.rule,
        sev: p.sev,
        title: p.title,
        where,
        evidence: snippet(m[0]),
        why: p.why,
      });
    }
  }

  const urls = text.match(/https?:\/\/[^\s)"'`<>]+/g) ?? [];
  if (urls.length) {
    out.push({
      rule: "TP-103",
      sev: "medium",
      title: "Outbound URL in tool text",
      where,
      evidence: urls.slice(0, 3).map((u) => snippet(u)).join("  ·  "),
      why: "Verify every URL: tool text that names endpoints can steer agents into contacting attacker infrastructure.",
    });
  }

  return out.map(withFix);
}

interface SchemaProp {
  description?: string;
  default?: unknown;
}

/** Scan a tool's JSON-Schema input shape. */
export function scanSchema(where: string, schema: unknown): Finding[] {
  const out: Finding[] = [];
  const s = schema as
    | { properties?: Record<string, SchemaProp>; required?: string[] }
    | null
    | undefined;
  if (!s?.properties || typeof s.properties !== "object") return out;
  for (const [name, prop] of Object.entries(s.properties)) {
    if (!prop || typeof prop !== "object") continue;
    if (prop.description) {
      out.push(...scanText(`${where} → param ${name}`, prop.description));
    }
    const lname = name.toLowerCase();
    if (
      /(confirm|force|delete|overwrite|approve|drop)/.test(lname) &&
      prop.default === true
    ) {
      out.push({
        rule: "TP-107",
        sev: "high",
        title: "Destructive default",
        where: `${where} → param ${name}`,
        evidence: `${name} defaults to true`,
        why: "Destructive actions must require explicit opt-in. A default of true lets an agent trigger them by omission.",
      });
    }
    if (/^(api[_\s-]?key|token|secret|password|access[_\s-]?token)$/.test(lname)) {
      out.push({
        rule: "TP-304",
        sev: "medium",
        title: "Credential-shaped tool parameter",
        where: `${where} → param ${name}`,
        why: "Asking a tool for raw credentials invites them into transcripts and logs.",
      });
    }
  }
  return out.map(withFix);
}
