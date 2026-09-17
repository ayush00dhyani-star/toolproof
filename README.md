# Toolproof

**Your AI agent connects to tools it has never been checked against.** Claude
Code, Codex, Cursor, Pi, Hermes — they all reach MCP servers and APIs now, and
some of those tools hide instructions that steal credentials without the agent
or you ever noticing. The tool description *is* the instruction your model
obeys, and nobody reads it.

**Toolproof stops it.** Paste a URL, get a letter grade and the exact rules
that produced it. Free, no account.

Live: https://toolproof-scan.vercel.app

```
npx -y toolproof-scan https://mcp.example.com/mcp --fail-under 70
```

Every verdict is an **ed25519-signed receipt** over canonical JSON that anyone
can verify offline with the published public key — a grade is evidence, not an
opinion. Nobody it scans pays for the verdict; that neutrality is the product,
not a promise.

## Two ways it protects you

**Before you connect — check it.** Paste an MCP server or API, or let your
agent check it itself:

```json
{ "mcpServers": { "toolproof": { "command": "npx", "args": ["-y", "toolproof-mcp"] } } }
```

The adapter exposes `check_tool(target)` and `lookup_rule(rule_id)` to Claude
Desktop, Claude Code, Cursor and compatible MCP clients. One keyless GET works
too — `/api/v1/verify?target=<url>` returns the signed passport.

**In CI — pin it, and fail on drift.** Lock the approved capability surface;
the check blocks when it changes, so a tool that quietly adds an exfil
endpoint never reaches your pipeline:

```bash
npx -y toolproof-lock lock  https://mcp.example.com/mcp   # pin the baseline
npx -y toolproof-lock check                             # CI gate — blocks on drift
```

Every decision appends a hash-chained signed receipt, so your team can later
prove what was approved, when, and that the record was never rewritten.
Auditors verify an export in the browser with nothing installed:
[/evidence](https://toolproof-scan.vercel.app/evidence)

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

## CLI & MCP adapter

Both zero-dependency packages are public on npm:

- **[toolproof-scan](https://www.npmjs.com/package/toolproof-scan)** — the
  scanner. `npx -y toolproof-scan <target> --fail-under 70` exits non-zero when
  a target is unverified or falls below the chosen score.
- **[toolproof-mcp](https://www.npmjs.com/package/toolproof-mcp)** — the guard
  for your agent, above.
- **toolproof-lock** — the drift gate. `lock` pins a signed baseline, `check`
  fails closed in CI when it changes.

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

Distribution has its own check, because the ways this product breaks are not
code failures — they are a published version behind the repo, a registry
manifest naming a package that does not exist, live metadata disagreeing with
the committed file, or an inflated claim in the launch copy:

```bash
npm run check:distribution:offline   # repo-only invariants, no network
npm run check:distribution           # also npm, the live API, and deploy drift
```

It exits non-zero on a real inconsistency, runs on every push in
`.github/workflows/distribution.yml`, and its `deploy` lines are the only
reliable way to tell whether `main` is actually live.

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
