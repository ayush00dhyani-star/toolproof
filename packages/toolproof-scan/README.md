# toolproof-scan

Trust grades for MCP servers and APIs — the verify step for the agent economy.

Zero-dependency CLI that asks the [Toolproof](https://toolproof-scan.vercel.app)
verify API for a signed trust passport (ed25519) and prints the verdict.
Works from any terminal and from CI.

## Usage

```bash
npx toolproof-scan mcp.context7.com/mcp
```

Example output:

```
TOOLPROOF · mcp.context7.com
verified · grade A+ · score 100/100
Clean scan — no agent-hijack patterns found.
  [TP-202]
  + HTTPS enforced
  + Server instructions captured and reviewed
  + MCP surface verified — 2 tool(s) inspected
card: https://toolproof-scan.vercel.app/t?target=mcp.context7.com%2Fmcp&kind=mcp
```

Multiple targets are scanned sequentially with a blank line between blocks.

## Flags

| Flag | Meaning |
| --- | --- |
| `--json` | Print the raw signed passport JSON |
| `--kind=auto\|mcp\|api` | Target kind (default `auto`) |
| `--fail-under=<0-100>` | Exit 1 when verified with score below N, or when unverified |
| `--api=<url>` | Verify API base URL (default `https://toolproof-scan.vercel.app`) |
| `--timeout=<ms>` | Request timeout in milliseconds (default `30000`) |
| `-h`, `--help` | Show help |

Colors are disabled automatically when `NO_COLOR` is set or stdout is not a TTY.

## Exit codes

- `0` — verified — or a respected opt-out — and the score meets `--fail-under`
- `1` — unverified, or verified with score below `--fail-under`
- `2` — usage or network error

## CI (GitHub Actions)

```yaml
- name: Trust-check our MCP server
  run: npx toolproof-scan https://our-mcp.example.com/mcp --fail-under 70
```

A non-passing grade fails the step via exit code `1`; usage or network
problems fail with exit code `2`.

## Published package

`toolproof-scan` is public on npm. Run it without a global install:

```bash
npx -y toolproof-scan https://mcp.example.com/mcp --fail-under 70
```
