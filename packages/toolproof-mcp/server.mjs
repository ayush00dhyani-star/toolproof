#!/usr/bin/env node
/**
 * Toolproof MCP server — stdio, zero dependencies.
 *
 * Exposes two tools to any MCP client (Claude Desktop, Claude Code, Cursor, …):
 *   check_tool(target)  → trust grade + findings for an MCP server or API
 *   lookup_rule(rule_id) → plain-words explanation of a Toolproof rule
 *
 * All heavy lifting is done by the hosted API; this process only speaks
 * MCP over stdio. NOTHING except JSON-RPC responses may be written to
 * stdout — logs go to stderr.
 */
import { createInterface } from "node:readline";

const API = (process.env.TOOLPROOF_API ?? "https://toolproof-scan.vercel.app").replace(/\/$/, "");
const PROTOCOL = "2025-06-18";

const RULES = {
  "TP-101": ["Hidden characters", "Invisible characters that smuggle secret instructions past human eyes — but the AI reads them fine."],
  "TP-102": ["Hidden instructions", "Text telling the AI to ignore its rules, change who it is, or hide things from you."],
  "TP-103": ["Phone-home addresses", "The tool mentions web addresses. Where do they lead, and who runs them?"],
  "TP-104": ["Exposed secrets", "A live password or API key sitting in plain text."],
  "TP-105": ["Reaching too far", "The tool can touch your files, system or wallet — more than its job needs."],
  "TP-108": ["Wipe-out language", "Talk of deleting everything, wiping disks, resetting things."],
  "TP-205": ["Skips asking permission", "Text that tells the AI to act without asking the user first."],
  "TP-107": ["Dangers on by default", "Risky actions happen unless you switch them off."],
  "TP-304": ["Asks for raw passwords", "The tool wants raw keys or passwords — which end up in logs."],
  "TP-201": ["No encryption", "Data travels unencrypted. Anyone nearby can read and change it."],
  "TP-202": ["Anyone can connect", "No login needed. Fine for public info — risky for anything private."],
  "TP-203": ["Checks who's connecting", "A good sign: the tool refuses strangers."],
  "TP-302": ["No login mentioned anywhere", "The API's own manual describes no sign-in at all."],
  "TP-303": ["Manual points to unsafe address", "The API's documentation advertises an unencrypted server."],
  "TP-206": ["Points to odd places", "Lists files or feeds from unusual, non-standard sources."],
};

const TOOLS = [
  {
    name: "check_tool",
    description:
      "Check whether an MCP server or API is safe to connect to, BEFORE connecting. Returns a letter grade (A+ to F), the verification state, and any findings — hidden instructions, exposed secrets, unsafe defaults. Accepts full URLs or bare hosts like mcp.example.com/mcp.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The MCP endpoint or API base URL to check (e.g. https://mcp.example.com/mcp)",
        },
        kind: {
          type: "string",
          enum: ["auto", "mcp", "api"],
          description: "Optional hint: mcp = MCP endpoint, api = API base URL, auto = detect",
        },
      },
      required: ["target"],
    },
  },
  {
    name: "lookup_rule",
    description:
      "Explain what a Toolproof rule id means (e.g. TP-101) in plain words, so you can tell your user exactly what was flagged.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: { type: "string", description: "Rule id like TP-101" },
      },
      required: ["rule_id"],
    },
  },
];

const log = (...a) => process.stderr.write(`[toolproof-mcp] ${a.join(" ")}\n`);

function result(id, payload) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: payload }) + "\n");
}
function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}
function toolText(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function checkTool(args) {
  const target = String(args?.target ?? "").trim();
  if (!target) return toolText("Missing `target` — give me the MCP endpoint or API base URL.", true);
  const kind = ["auto", "mcp", "api"].includes(args?.kind) ? args.kind : "auto";
  let res, body;
  try {
    res = await fetch(`${API}/api/v1/scan?target=${encodeURIComponent(target)}&kind=${kind}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(45_000),
    });
    body = await res.json();
  } catch (e) {
    return toolText(`Scan failed: ${e instanceof Error ? e.message : String(e)}`, true);
  }
  if (!res.ok) {
    return toolText(body?.error ? `Scan rejected: ${body.error}` : `Scan failed: HTTP ${res.status}`, true);
  }
  const r = body.report;
  const lines = [`TOOLPROOF VERDICT — ${r.host}`];
  lines.push(`grade: ${r.grade} (${r.score}/100) · state: ${r.state} · kind: ${r.kind}`);
  lines.push(r.summary);
  if (Array.isArray(r.findings) && r.findings.length) {
    lines.push("findings:");
    for (const f of r.findings.slice(0, 10)) lines.push(`  [${f.sev}] ${f.rule} ${f.title} — ${f.where}`);
    if (r.findings.length > 10) lines.push(`  + ${r.findings.length - 10} more on the card`);
  }
  for (const p of r.positives ?? []) lines.push(`  + ${p}`);
  lines.push(`review card: ${API}/t?target=${encodeURIComponent(r.target)}&kind=${kind}`);
  lines.push(
    'Guidance: if the state is not "verified", or the grade is below B, tell your user what you found and ask before connecting.',
  );
  return toolText(lines.join("\n"));
}

function lookupRule(args) {
  const id = String(args?.rule_id ?? "").trim().toUpperCase();
  const rule = RULES[id];
  if (!rule) {
    return toolText(
      `Unknown rule id "${id}". Known ids: ${Object.keys(RULES).join(", ")}.`,
      true,
    );
  }
  return toolText(`${id} · ${rule[0]} — ${rule[1]}`);
}

async function dispatch(name, args) {
  if (name === "check_tool") return checkTool(args);
  if (name === "lookup_rule") return lookupRule(args);
  return toolText(`Unknown tool: ${name}`, true);
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification — no reply
  switch (method) {
    case "initialize":
      result(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
      serverInfo: { name: "toolproof", version: "0.2.1" },
      });
      return;
    case "ping":
      result(id, {});
      return;
    case "tools/list":
      result(id, { tools: TOOLS });
      return;
    case "tools/call": {
      const name = String(params?.name ?? "");
      const out = await dispatch(name, params?.arguments);
      result(id, out);
      return;
    }
    default:
      error(id, -32601, `Method not found: ${method}`);
  }
}

log(`toolproof-mcp 0.2.1 — api: ${API} — tools: check_tool, lookup_rule`);
const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    log(`ignoring non-JSON line (${trimmed.length} chars)`);
    return;
  }
  void handle(msg).catch((e) => {
    log(`handler error: ${e instanceof Error ? e.message : String(e)}`);
    if (msg && msg.id !== undefined && msg.id !== null) {
      error(msg.id, -32603, "Internal error");
    }
  });
});
