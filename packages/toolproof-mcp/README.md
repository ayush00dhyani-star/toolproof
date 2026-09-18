# toolproof-mcp

**Let your AI check every tool before it connects — and stop the malicious ones before it ever sees them.**

Two ways to use it, depending on how much you want to trust:

- **Check mode** (advisory): add toolproof as a tool. The AI grades any MCP
  server or API *before* connecting, and is told to ask you first if the
  grade is below B.
- **Wrap mode** (enforcement): put toolproof *in the path*. It proxies the
  real server and **removes malicious tools from the list the agent sees**,
  then injects a `toolproof_alerts` tool that reports exactly what was
  blocked and why. The agent never learns the bad tools exist.

Wrap mode is the one that *stops* an attack instead of just grading it.

## Wrap mode — the guard in the path

List toolproof-wrap instead of the real server. Whatever follows `--` is the
real server and its arguments:

```json
{ "mcpServers": { "stripe": {
    "command": "npx",
    "args": ["-y", "toolproof-mcp", "wrap", "--", "npx", "-y", "@stripe/mcp"] } } }
}
```

Works with any stdio MCP client (Claude Desktop, Claude Code, Cursor). No
harness cooperation needed — it is a transparent proxy.

**What gets blocked:** deception only. Hidden characters (TP-101), embedded
credentials (TP-104), and critical/high override, exfiltration, or
concealment phrasing (TP-102). These are removed.

**What is never blocked:** honest-but-sloppy tools. A docs URL, missing auth,
a destructive verb in a legit database tool — these are graded and passed
through untouched, reported via `toolproof_alerts`. You decide. That
two-class split is the point: stop the malicious, keep the tools people love.

**What is never forwarded at all:** a malformed entry with no usable name. MCP
requires a name, so such a tool cannot be called; inventing one would hand your
agent a phantom tool it never saw before. It is omitted from the list and
reported as omitted, not renamed and not passed through.

If the wrapped server cannot start, toolproof-wrap exits rather than pass
traffic it could not inspect. It never silently forwards what it cannot see.


## Check mode — grade before you connect

This is the Toolproof trust scanner packaged as an MCP server. Add it once
to Claude Desktop, Claude Code, Cursor, or any MCP client, and the AI gets
two tools:

- **`check_tool(target)`** — returns a letter grade (A+ … F), the
  verification state, and every finding for an MCP server or API: hidden
  instructions, exposed secrets, unsafe defaults, missing auth. The tool's
  output includes guidance for the AI: if the grade is below B, tell the
  user and ask before connecting.
- **`lookup_rule(rule_id)`** — explains a flagged rule (e.g. `TP-101`) in
  plain words your AI can repeat to you.

Zero dependencies. Talks to the hosted scanner; nothing runs locally
except the protocol.

## Install

Claude Desktop / any generic MCP config:

```json
{ "mcpServers": { "toolproof": { "command": "npx", "args": ["-y", "toolproof-mcp"] } } }
```

Claude Code:

```bash
claude mcp add toolproof -- npx -y toolproof-mcp
```

The npm package is public. Add the configuration above, and your MCP client
will run it through `npx` when needed.

## Example

> "Check mcp.context7.com/mcp before you connect to it."

The AI calls `check_tool`, then reads back:

```
TOOLPROOF VERDICT — mcp.context7.com
grade: A+ (100/100) · state: verified · kind: mcp
Clean scan — no agent-hijack patterns found.
  + HTTPS enforced
  + Server instructions captured and reviewed
review card: https://toolproof-scan.vercel.app/t?target=…
```

No install and just want the rule? See
[the one-line agent rule](https://toolproof-scan.vercel.app/for-agents).

## Published package

Install from npm with `npx -y toolproof-mcp`; no global install is required.
