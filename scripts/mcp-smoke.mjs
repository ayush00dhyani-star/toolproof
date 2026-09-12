/**
 * Smoke test for packages/toolproof-mcp — speaks real stdio JSON-RPC to the
 * server and asserts the MCP handshake, tools/list and a live check_tool
 * call against the hosted API. Zero deps.
 */
import { spawn } from "node:child_process";

const server = spawn(process.execPath, ["packages/toolproof-mcp/server.mjs"], {
  stdio: ["pipe", "pipe", "pipe"],
});

const lines = [];
server.stdout.on("data", (d) => {
  for (const l of d.toString().split("\n")) if (l.trim()) lines.push(JSON.parse(l));
});
const stderr = [];
server.stderr.on("data", (d) => stderr.push(d.toString()));

const send = (obj) => server.stdin.write(JSON.stringify(obj) + "\n");

function waitFor(pred, ms = 60_000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const hit = lines.find(pred);
      if (hit) {
        clearInterval(iv);
        resolve(hit);
      } else if (Date.now() - t0 > ms) {
        clearInterval(iv);
        reject(new Error(`timeout waiting for response; got ${lines.length} lines`));
      }
    }, 100);
  });
}

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "0.0.1" } } });
const init = await waitFor((m) => m.id === 1);
console.log("initialize →", init.result.serverInfo, "proto", init.result.protocolVersion);

send({ jsonrpc: "2.0", method: "notifications/initialized" });
send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
const tools = await waitFor((m) => m.id === 2);
const names = tools.result.tools.map((t) => t.name);
console.log("tools/list →", names.join(", "));
if (!names.includes("check_tool") || !names.includes("lookup_rule")) {
  console.error("FAIL: expected both tools");
  process.exit(1);
}

send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "check_tool", arguments: { target: "https://mcp.context7.com/mcp" } } });
const verdict = await waitFor((m) => m.id === 3, 60_000);
const text = verdict.result.content[0].text;
console.log("check_tool →\n" + text.split("\n").slice(0, 4).join("\n"));
if (!text.includes("TOOLPROOF VERDICT") || !text.includes("grade:")) {
  console.error("FAIL: verdict text malformed");
  process.exit(1);
}

send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "lookup_rule", arguments: { rule_id: "TP-101" } } });
const rule = await waitFor((m) => m.id === 4);
console.log("lookup_rule →", rule.result.content[0].text.slice(0, 80) + "…");

send({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "check_tool", arguments: { target: "https://api.githubcopilot.com/mcp" } } });
const unverified = await waitFor((m) => m.id === 5);
console.log("auth-gated target →", unverified.result.content[0].text.split("\n")[1]);

server.kill();
console.log("\nMCP smoke test: ALL PASS ✅");
process.exit(0);
