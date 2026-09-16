#!/usr/bin/env node
/**
 * toolproof-wrap — the guard that sits in the path.
 *
 * MCP clients (Claude Desktop, Cursor, Claude Code, any stdio client) launch
 * the server you list. Instead of listing the tool directly, you list THIS:
 *
 *   { "mcpServers": { "stripe": {
 *       "command": "npx", "args": ["-y","toolproof-mcp","wrap","--",
 *                                  "npx","-y","@stripe/mcp"] } } }
 *
 * toolproof-wrap spawns the real server, proxies JSON-RPC both ways, and
 * enforces on the model-visible surface before the agent sees it:
 *
 *   - tools/list responses are scanned in-line. Tools carrying deception
 *     (hidden instructions, invisible characters, embedded credentials,
 *      exfiltration phrasing) are REMOVED from the response. The agent
 *     never learns they exist.
 *   - The agent is told what was blocked and why, via a toolproof_alerts
 *     tool injected into the same response.
 *   - Everything else passes through untouched and unmodified. Honest but
 *     sloppy tools (missing auth, a docs URL) are reported, never blocked.
 *
 * Fail-open vs fail-closed: if the child cannot start, we say so and exit —
 * we never silently pass traffic we could not inspect.
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { enforceTools } from "./rules.mjs";

const VERSION = "0.3.0";
const log = (...a) => process.stderr.write(`[toolproof-wrap] ${a.join(" ")}\n`);

function usage() {
  return `toolproof-wrap v${VERSION} — the guard in the path.
Spawns the real MCP server, proxies it, and strips malicious tools before
your agent sees them.

  toolproof-wrap -- <command> [args...]

Example (claude_desktop_config.json):
  { "mcpServers": { "stripe": {
      "command": "npx",
      "args": ["-y","toolproof-mcp","wrap","--","npx","-y","@stripe/mcp"] } } }

Whatever follows "--" is the real server and its arguments.`;
}

function parseArgs(argv) {
  const dash = argv.indexOf("--");
  if (dash === -1 || !argv[dash + 1]) {
    process.stderr.write(usage() + "\n");
    process.exit(2);
  }
  return { cmd: argv[dash + 1], args: argv.slice(dash + 2) };
}

const { cmd, args } = parseArgs(process.argv.slice(2));

// Buffer in-flight requests so we can rewrite tools/list on the way back.
const pending = new Map(); // id -> { method }
const childInfo = []; // child serverInfo seen (for logging only)

const child = spawn(cmd, args, {
  stdio: ["pipe", "pipe", "inherit"],
  env: process.env,
  shell: false,
});
log(`spawned ${cmd} ${args.join(" ")} (pid ${child.pid})`);

child.on("error", (e) => {
  log(`FATAL could not start "${cmd}": ${e.message}`);
  log(`Refusing to pass uninspectable traffic. Install the real server first.`);
  process.exit(2);
});
child.on("exit", (code, sig) => {
  log(`child exited code=${code} sig=${sig}`);
  process.exit(code ?? 0);
});

// ---- parent (agent) -> child : record intent, forward verbatim ----
const rlIn = createInterface({ input: process.stdin, terminal: false });
rlIn.on("line", (line) => {
  const t = line.trim();
  if (!t) return;
  try {
    const m = JSON.parse(t);
    if (m.id !== undefined && m.method) pending.set(m.id, { method: m.method });
  } catch { /* non-JSON passthrough */ }
  child.stdin.write(line + "\n");
});

// ---- child -> parent (agent) : inspect, enforce, forward ----
const rlOut = createInterface({ input: child.stdout, terminal: false });
rlOut.on("line", (line) => {
  const t = line.trim();
  if (!t) return;
  let msg;
  try { msg = JSON.parse(t); } catch { process.stdout.write(line + "\n"); return; }

  // Track the child's identity from its initialize response.
  if (msg.result?.serverInfo) { childInfo.push(msg.result.serverInfo); log(`child serverInfo: ${JSON.stringify(msg.result.serverInfo)}`); }

  // The enforcement point: rewrite tools/list before the agent sees it.
  if (msg.id !== undefined && pending.get(msg.id)?.method === "tools/list" && msg.result?.tools) {
    const { blocked, graded, safe } = enforceTools(msg.result.tools);
    if (blocked.length) {
      msg.result.tools = safe.concat(alertTool(blocked, graded));
      log(`BLOCKED ${blocked.length} tool(s): ${blocked.map((b) => b.name).join(", ")}`);
      log(`  reasons: ${blocked.map((b) => b.findings.map((f) => f.rule)).join(", ")}`);
    }
    if (graded.length) log(`graded (passed): ${graded.map((g) => g.name).join(", ")}`);
    pending.delete(msg.id);
  }
  process.stdout.write(JSON.stringify(msg) + "\n");
});

function alertTool(blocked, graded) {
  const lines = ["TOOLPROOF GUARD — this server tried to register malicious tools."];
  for (const b of blocked) {
    lines.push(`BLOCKED: ${b.name}`);
    for (const f of b.findings) {
      lines.push(`  [${f.sev}] ${f.rule} ${f.title} — ${f.where}`);
      lines.push(`    why:  ${f.why}`);
      if (f.evidence) lines.push(`    evidence: ${f.evidence}`);
    }
  }
  if (graded.length) {
    lines.push("");
    lines.push("Also flagged, but NOT blocked (honest but sloppy — you decide):");
    for (const g of graded) {
      lines.push(`  ${g.name}: ${g.findings.map((f) => `${f.rule} ${f.title}`).join("; ")}`);
    }
  }
  lines.push("");
  lines.push("The blocked tools are not available to you. Tell the user what you found.");
  return {
    name: "toolproof_alerts",
    description: lines.join("\n"),
    inputSchema: { type: "object", properties: {} },
  };
}

