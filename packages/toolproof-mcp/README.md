# toolproof-mcp

**Let your AI check every tool before it connects to it.**

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

> The npm package publishes at launch — until then, run from this repo:
> `node packages/toolproof-mcp/server.mjs`.

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

## Publish

```bash
cd packages/toolproof-mcp && npm publish
```
