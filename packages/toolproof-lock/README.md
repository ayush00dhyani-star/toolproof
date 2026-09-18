# toolproof-lock

**Versioned, human-approved baselines for agent capabilities — fail CI when an MCP/API capability surface changes.**

Agents connect to tools that quietly change underneath them. A tool gains a
parameter, a resource starts pointing at a new origin, the server instructions
get rewritten. Nothing in the code you wrote changed — but the surface your
agent can reach did.

`toolproof-lock` gives you a lockfile for that surface, exactly like
`package-lock.json` gives you one for your dependencies:

- `toolproof lock <target>` writes a signed `toolproof.lock` baseline of the
  capability surface (tools, prompts, resources, instructions, outbound hosts,
  OpenAPI paths).
- `toolproof check` re-fetches the surface, computes a **semantic** diff against
  the baseline, applies a policy, and exits non-zero when drift needs a human.
- Every `check` decision is appended to a signed, tamper-evident **evidence
  trail**, so a team can later prove what was approved, when, and that the
  record was never rewritten.
- Policy decides what is allowed to change on its own: a new tool is a review,
  a new outbound host is a block, a schema that *gained* a field is a block.

It is not a hash comparison. A reordering of tools or a re-serialization of a
schema does not trip it; a capability that actually widened does.

Zero runtime dependencies. Node >= 18.

## Quickstart

```bash
# write a baseline (commit the file)
npx toolproof-lock lock https://mcp.example.com/mcp

# in CI, or before you connect
npx toolproof-lock check
```

```
$ npx toolproof-lock lock https://mcp.example.com/mcp
TOOLPROOF LOCK · mcp.example.com
wrote toolproof.lock
kind mcp · grade A+ · score 100 · sha256:9f2c41a0b7e3…
tools 6 · prompts 2 · resources 1 · outbound 2
policy built-in default
```

```
$ npx toolproof-lock check
TOOLPROOF LOCK · mcp.example.com

baseline  sha256:9f2c41a0b7e3…  grade A+
observed  sha256:4b81de0c9af2…  grade B
state     verified · kind mcp · policy toolproof.policy.json

  [BLOCKED] schema expanded: search_email gained property "attachments" (tool search_email)
  [BLOCKED] new outbound host api.attachments.example.net (tool fetch_attachment)
  [REVIEW] tool added: send_sms
  [INFO] description changed: list_inbox

BLOCKED · 2 blocking, 1 review, 1 info · exit 2
```

## Install

```bash
npx toolproof-lock --help          # no install
npm i -D toolproof-lock            # or pin it in devDependencies
```

## Evidence: the signed decision history

A verdict that disappears when the terminal closes is not an audit trail. Every
`check` appends a receipt to `.toolproof/evidence.jsonl`:

```
$ toolproof evidence show
2026-09-15T07:58:30.046Z  blocked  exit 2  actor dev@example.com
  baseline sha256:cd65c5f9…  observed sha256:af719268…  policy toolproof.policy.json

$ toolproof evidence verify
evidence OK — 3 receipts, chain intact, signatures verified
```

Each receipt is hash-chained to the one before it and signed with a
project-local ed25519 key (`.toolproof/evidence-key.pem`, with the public key
published beside it). `verify` re-derives every hash and checks every signature,
so a rewritten decision is detected; reordering or dropping receipts breaks the
chain.

**Privacy by construction.** A receipt carries fingerprints, the decision, a
policy reference, the actor and a timestamp. It never carries prompt content,
tool arguments, tool results or credentials — so an evidence store is safe to
keep, export and hand over.

**Selective disclosure.** Export a range as a self-contained bundle an auditor
verifies offline, with no key and no network:

```bash
toolproof evidence export --from 0 --out audit.json
```

`audit.json` carries its own issuer key and a signature over the full range, so
its contents cannot be swapped after the fact. The rest of the history stays in
your repository.

## Commands

```
toolproof lock <target> [--kind=auto|mcp|api] [--out=toolproof.lock]
                        [--policy=<path>] [--api=<url>] [--timeout=<ms>]
toolproof check [--lock=toolproof.lock] [--policy=<path>] [--api=<url>]
                        [--timeout=<ms>] [--json] [--quiet] [--no-evidence]
toolproof evidence [verify|show|export] [--from <n>] [--to <n>] [--out <f>]
toolproof --help | -h | --version | -v
```

| flag | meaning |
| --- | --- |
| `--kind=auto\|mcp\|api` | target kind for `lock` (default `auto`) |
| `--out=<path>` | lockfile to write (default `toolproof.lock`) |
| `--lock=<path>` | lockfile to read for `check` (default `toolproof.lock`) |
| `--policy=<path>` | policy file, JSON or flat YAML (default: built-in policy) |
| `--api=<url>` | manifest API base URL (default the hosted Toolproof scan) |
| `--timeout=<ms>` | request timeout (default `30000`) |
| `--json` | print `{ decision, exitCode, changes, manifest }` |
| `--quiet` | print a single verdict line |
| `--no-evidence` | do not append a receipt for this `check` |
| `--evidence-dir <path>` | evidence store (default `.toolproof`) |
| `--from <n>` / `--to <n>` | receipt range for `evidence export` |

`NO_COLOR=1` disables color; color is auto-disabled when stdout is not a TTY.

## Exit codes

| code | meaning | CI behaviour |
| --- | --- | --- |
| `0` | in sync, or informational changes only | pass |
| `1` | review required — a human should approve the drift | fail (soft) |
| `2` | blocked by policy | fail |
| `3` | usage, lockfile, or network error | fail |

`--json` prints the exact machine shape for tooling:

```json
{
  "decision": "block",
  "exitCode": 2,
  "changes": [{ "category": "outbound-host-added", "action": "block", "message": "new outbound host api.example.net", "where": "tool fetch_attachment" }],
  "manifest": { "host": "mcp.example.com", "fingerprint": "sha256:…", "grade": "B", "state": "verified" }
}
```

## Lockfile format — `toolproof.lock`

UTF-8 JSON, 2-space indent, trailing newline. Commit it next to `package.json`.

```json
{
  "lockVersion": 1,
  "generatedAt": "2026-09-14T00:00:00.000Z",
  "target": "https://mcp.example.com/mcp",
  "kind": "mcp",
  "fingerprint": "sha256:9f2c41a0…",
  "grade": "A+",
  "score": 100,
  "ruleIds": ["TP-202"],
  "policy": null,
  "surface": {
    "tools": [{ "name": "list_inbox", "description": "…", "inputSchema": {} }],
    "prompts": [],
    "resources": [],
    "instructions": "…",
    "outboundHosts": ["api.example.net"],
    "openapi": null
  },
  "signature": "base64-or-null",
  "keyId": "tpk-1",
  "alg": "ed25519"
}
```

`surface` mirrors the manifest surface exactly; empty keys are omitted. The
`fingerprint` is the server's `sha256:` digest of the canonical surface — treat
it as opaque and let the semantic diff, not the hash, decide what matters.

## Policy format

Default policy, used when no `--policy` is passed:

```yaml
minimumGrade: B
requireVerified: true
# Scoped, time-boxed approvals. All three default to null (unbounded), so a
# policy written before these keys existed behaves exactly as it did.
maxAgeHours: null        # e.g. 72 — an approval older than this fails closed
allowTools: null         # e.g. search_email, list_inbox — only these may run
denyTools: null          # e.g. send_email — never run these
onToolAdded: review
onToolRemoved: review
onDescriptionChanged: review
onSchemaExpanded: block
onNewOutboundHost: block
onHighSeverityFinding: block
```

### Scoped, time-boxed approvals

Approving a server is not the same as approving every tool on it, and a clean
scan from last quarter is not evidence about today's surface:

- **`allowTools`** — a permit list. Any tool outside it is `tool-not-allowed`,
  a hard block. Use it to hand an agent a narrow grant instead of the whole API.
- **`denyTools`** — a block list. A named tool is `tool-denied`, a hard block,
  no matter what the diff finds.
- **`maxAgeHours`** — bounds how long a baseline counts as approval. Once the
  lockfile is older than the window, `grant-expired` blocks and the surface has
  to be re-locked deliberately. A stale approval fails closed; it never passes
  quietly.

All three are hard-blocked categories with no policy key, so no other setting
can downgrade them.

JSON works too, and a flat YAML subset (`key: value` lines, `#` comments, blank
lines ignored). Actions are `informational`, `review`, or `block`.

| category | trigger | key | default |
| --- | --- | --- | --- |
| `tool-added` | tool present now, absent in baseline | `onToolAdded` | review |
| `tool-removed` | tool in baseline, absent now | `onToolRemoved` | review |
| `description-changed` | tool/prompt/resource description text differs | `onDescriptionChanged` | review |
| `schema-expanded` | a tool schema gained a property or required field (or went absent → present) | `onSchemaExpanded` | block |
| `schema-changed` | any other schema difference | `onDescriptionChanged` | review |
| `outbound-host-added` | new host in `outboundHosts` | `onNewOutboundHost` | block |
| `high-severity-finding` | a new high-severity ruleId vs baseline | `onHighSeverityFinding` | block |
| `grade-below-minimum` | observed grade below `minimumGrade` | — | block |
| `not-verified` | `requireVerified` is set and the target is not verified | — | block |
| `instruction-changed` | `instructions` text differs | `onDescriptionChanged` | review |
| `tool-not-allowed` | a tool is outside `allowTools` | — | block |
| `tool-denied` | a tool is named in `denyTools` | — | block |
| `grant-expired` | the baseline is older than `maxAgeHours` | — | block |

Grade ranks: `A+` 5, `A` 4, `B` 3, `C` 2, `D` 1, `F` 0, `—`/empty −1.

For v1, high-severity is approximated: any ruleId newly present in the observed
manifest that starts with `TP-1` is treated as high severity. This is a
documented simplification — the server's finding severities are authoritative and
will replace it.

A minimal policy that is strict about new reach:

```yaml
minimumGrade: B
requireVerified: true
onSchemaExpanded: block
onNewOutboundHost: block
onToolAdded: review
onDescriptionChanged: informational
```

## GitHub Actions

```yaml
name: toolproof-lock
on: [push, pull_request]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Lock the agent capability surface
        run: npx -y toolproof-lock check --policy=toolproof.policy.json
```

Exit `1` fails the job as a review, `2` as a block, `3` as an error. Use
`continue-on-error` on a separate step if you want review-required drift to
annotate rather than fail.

## Publishing

The package is structured for npm (`"type": "module"`, `bin.toolproof`,
`files: [bin.mjs, src, README.md]`, zero dependencies, `node >= 18`). Inspect
exactly what ships before a release:

```bash
npm pack ./packages/toolproof-lock --dry-run
npm publish ./packages/toolproof-lock
```

## License

MIT
