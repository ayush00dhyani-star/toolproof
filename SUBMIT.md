# Toolproof — MCP server & API trust grading

**One line:** Trust grades for MCP servers and APIs — check a tool before your agent connects to it.

**Tagline:** A grade is a receipt, not a guarantee.

## What it does

Toolproof scans the model-visible surface of an MCP server or API — the tool names,
descriptions, schemas, prompts, resources, server instructions, outbound hosts — and
returns a letter grade with the evidence behind it: 16 rules covering hidden instructions,
invisible characters, exposed secrets, unsafe defaults, and missing auth.

Every verdict is an ed25519-signed passport over canonical JSON, verifiable offline with
the published public key. No accounts, no API keys, no payment.

## Why an agent should use it

Your agent is the one connecting to tools, so your agent is the one that should check
them. One keyless GET before connecting returns a signed verdict the agent can report to
the user:

```
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<url>
```

Or install the MCP guard directly:

```json
{
  "mcpServers": {
    "toolproof": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp"]
    }
  }
}
```

## Categories

security, mcp, ai-agents, developer-tools, open-source

## Links

- Website: https://toolproof-scan.vercel.app
- Scan a tool: https://toolproof-scan.vercel.app/
- API docs: https://toolproof-scan.vercel.app/docs
- Machine contract (for agents): https://toolproof-scan.vercel.app/agents.md
- GitHub: https://github.com/ayush00dhyani-star/toolproof
- npm: https://www.npmjs.com/package/toolproof-mcp

## Pricing

Free. Forever, no account. The scan API, the CLI, the MCP server, signed verdicts, and
the evidence trail are all open and keyless. Teams pay only for hosted monitoring and
shared policy — never for a verdict.

## Author

Ayush Sharma — security researcher (Bugcrowd). Built by nobody who is paid by anybody
we scan; that is the entire point of a trust layer.
