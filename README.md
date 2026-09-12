# Toolproof

**The safety check for AI tools.** AI assistants connect to tools — servers,
APIs, plugins — and those tools can hide tricks the AI obeys and humans never
see. Toolproof checks any of them and issues a letter grade with an
ed25519-signed receipt anyone can verify offline.

Live: https://toolproof-scan.vercel.app

**Nobody scans things by hand — so the AI does it.** Paste the one-line rule
into your agent's instructions (`/for-agents`), or install the
`toolproof-mcp` server so any MCP client gets `check_tool` natively.
Machines that fetch this domain read [`/agents.md`](public/agents.md).

## What it checks

- **TP-101** hidden unicode (zero-width / bidi / tag characters) in tool text
- **TP-102** instruction override, concealment and exfiltration phrasing
- **TP-103** outbound URLs in tool descriptions
- **TP-104** embedded credentials in tool text
- **TP-105** scope creep beyond a tool's apparent purpose
- **TP-107** destructive parameter defaults
- **TP-201/202/203** transport + auth posture (positive controls included)
- **TP-302/303/304** OpenAPI spec hygiene

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/scan?target=` | Full report with findings + evidence |
| `GET /api/v1/verify?target=` | Signed passport (ed25519, canonical JSON) |
| `GET /api/v1/registry` | Starter registry, scanned live |
| `GET /api/v1/feed` | Per-node, in-memory verdict view (resets on cold start; per-bundle on Vercel). Cross-user ledger ships with v1 |
| `GET /api/v1/badge?target=&style=grade\|flat` | SVG badge |
| `GET /api/v1/og?target=` | 1200×630 social share card |
| `GET /api/v1/pubkey` | Signing public key (PEM) |

## CLI

Scan from any terminal — zero dependencies, no install:

```bash
npx toolproof-scan mcp.context7.com/mcp --fail-under 70
```

Flags: `--json` (raw signed passport), `--kind=auto|mcp|api`,
`--fail-under=<0-100>`, `--api=<url>`, `--timeout=<ms>`, `-h`.
Exit `0` verified — or a respected opt-out — and the score meets
`--fail-under`; `1` unverified, or verified with score below
`--fail-under`; `2` usage/network error.
See [`packages/toolproof-scan`](packages/toolproof-scan/README.md).

## MCP server

`packages/toolproof-mcp` — the scanner as an MCP tool. Add it to Claude
Desktop / Cursor / Claude Code once and the AI checks every tool before
connecting:

```json
{ "mcpServers": { "toolproof": { "command": "npx", "args": ["-y", "toolproof-mcp"] } } }
```

Zero dependencies; smoke-tested over stdio (`node scripts/mcp-smoke.mjs`).

## toolproof.txt

Tool owners control scanning. Toolproof fetches
`/.well-known/toolproof.txt` from the target's origin before any probe:
a path-prefix `Deny:` line matching the requested path ends the scan
immediately with state `opted-out` — respected, never penalized.
`/` or `*` matches the whole site; `Allow:` and `Canary:` lines are
reserved for v1. Details and a worked example:
[docs](https://toolproof-scan.vercel.app/docs#toolproof-txt).

## Local development

```bash
npm install
npm run dev        # needs .env.local (signing keys) for signed passports
npx tsx scripts/probe.mts [targets...]   # CLI probe, no server needed
```

## Deploy

```bash
vercel deploy . --prod -y --no-wait --scope barito4762-3231s-projects
```

Keys live in Vercel env: `TOOLPROOF_SIGNING_KEY` (private, PKCS8 PEM),
`TOOLPROOF_PUBLIC_KEY`, `NEXT_PUBLIC_TOOLPROOF_PUBLIC_KEY`.

## Roadmap (v1)

- Canaries: honeypot credentials + tripwire instructions planted in
  registered tools, with exfiltration alerting — the paid tier.
- Registry claiming + continuous re-scans.
- DNS rebinding protections in the scanner's own fetch layer.
