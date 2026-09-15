# Toolproof

**The safety check for AI tools.** AI assistants connect to tools — servers,
APIs, plugins — and those tools can hide tricks the AI obeys and humans never
see. Toolproof checks any of them and issues a letter grade with an
ed25519-signed receipt anyone can verify offline.

Live: https://toolproof-scan.vercel.app

**Nobody scans things by hand — so the AI does it.** Paste the one-line rule
into your agent's instructions (`/for-agents`) and call the signed API before
connecting to an unfamiliar tool. Machines that fetch this domain read
[`/agents.md`](public/agents.md).

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

## Automation

The hosted API is the supported public integration today — no API key,
account or local package required:

```bash
curl --get 'https://toolproof-scan.vercel.app/api/v1/verify' \
  --data-urlencode 'target=https://mcp.context7.com/mcp'
```

For pull requests, copy
[`public/toolproof-check.yml`](public/toolproof-check.yml) to
`.github/workflows/toolproof.yml` and set the `TOOLPROOF_TARGET` repository
variable. It rejects targets that are unverified or score below its threshold.

## Toolproof Lock

A committed baseline for the capability surface your agent can reach.
`toolproof lock` writes a signed `toolproof.lock`; `toolproof check` diffs the
live surface against it and fails CI when a tool, schema, description or
outbound host drifts past your policy.

```bash
# 1. write the baseline, then commit toolproof.lock
npx toolproof-lock lock https://mcp.example.com/mcp

# 2. in CI (or before you connect): diff against the baseline, apply policy
npx toolproof-lock check --policy=toolproof.policy.yml

# 3. machine-readable, for your own tooling
npx toolproof-lock check --json
```

Exit codes: `0` in sync (or informational only) · `1` review required ·
`2` blocked by policy · `3` usage, lockfile or network error. The check is
semantic, not a hash compare — tool order and JSON re-serialization do not
trip it. Free and open (MIT), no account required, and the lockfile stays
valid whether or not you run an MCP gateway. A ready-to-run GitHub Actions
workflow ships as [`public/toolproof-lock.yml`](public/toolproof-lock.yml).
Details: [toolproof-scan.vercel.app/lock](https://toolproof-scan.vercel.app/lock).

## CLI & MCP adapter

Both zero-dependency packages are now public on npm:

```bash
# Fail CI if the target is unverified or scores below 70
npx -y toolproof-scan https://mcp.example.com/mcp --fail-under 70
```

```json
{ "mcpServers": { "toolproof": { "command": "npx", "args": ["-y", "toolproof-mcp"] } } }
```

The adapter exposes `check_tool(target)` and `lookup_rule(rule_id)` to Claude
Desktop, Claude Code, Cursor, and compatible MCP clients. See
[toolproof-scan](https://www.npmjs.com/package/toolproof-scan),
[toolproof-mcp](https://www.npmjs.com/package/toolproof-mcp) and
[toolproof-lock](https://www.npmjs.com/package/toolproof-lock) (capability
baselines and the `toolproof` CI check).

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
