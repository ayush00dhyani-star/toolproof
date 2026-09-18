# Toolproof

**A safety check for the tools your AI connects to.**

Claude Code, Codex, Cursor, Pi, Hermes â€” they all reach MCP servers and APIs now.
A tool's description goes straight into the model's context, and the model obeys
it. Some tools use that to hide instructions: *ignore your rules*, *send the
conversation to this address*. Often written in invisible Unicode characters, so
code review sees nothing.

Toolproof reads the same text your model will read â€” before it reads it â€” and
tells you what is in there.

Live: **https://toolproof-scan.vercel.app** Â· free Â· no account Â· nothing you
paste is stored.

```bash
npx -y toolproof-scan mcp.context7.com/mcp
```

```
TOOLPROOF Â· mcp.context7.com
verified Â· grade A+ Â· score 100/100
Clean scan â€” no agent-hijack patterns found.
```

---

## What it does, in three modes

| Mode | What it does | Command |
| --- | --- | --- |
| **Check** | Grades a tool and shows the evidence. Nothing is blocked â€” you decide. | `npx -y toolproof-scan <target>` |
| **Stop** | Wraps any stdio MCP server and removes deceptive tools *before* your agent sees them. | `npx -y toolproof-mcp wrap -- <real server>` |
| **Freeze** | Pins the approved capability surface; CI fails when a tool quietly gains reach. | `npx -y toolproof-lock lock\|check` |

**Check** answers "is this safe to use?" **Wrap** is the one that actually stops
an attack â€” the agent never learns the bad tool exists. **Freeze** is what keeps
an approved tool honest after it changes underneath you.

Everything is free, keyless and account-free. There is no paid tier that gets a
better verdict: a free user's receipt is exactly as verifiable as anyone's.

## Integrate it

Three paths, smallest first. None of them require an account or an API key.

**1 â€” Let your agent check every tool itself (~1 minute, nothing to install).**
Paste this into `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex, Cursor),
`.cursor/rules`, or any custom instructions / system prompt:

```
Tool safety rule:
Before connecting to any MCP server or unfamiliar API, verify it first.
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<the url>
Report the grade to the user. If the state is not "verified", or the
grade is below B, tell the user what you found and ask before connecting.
```

**2 â€” Install the MCP server (~2 minutes, one config block).** Gives the agent a
`check_tool(target)` and a `lookup_rule(rule_id)`:

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

Claude Code: `claude mcp add toolproof -- npx -y toolproof-mcp`

For enforcement rather than advice, point the config at the real server through
the guard â€” deceptive tools are stripped from `tools/list`, honest-but-sloppy
ones pass through reported but untouched:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp", "wrap", "--", "npx", "-y", "@stripe/mcp"]
    }
  }
}
```

If the wrapped server cannot start, the guard exits rather than forward traffic
it could not inspect.

**3 â€” Gate it in CI (~2 minutes, one step).** Fail the build on a bad grade:

```yaml
- name: Trust-check our MCP server
  run: npx -y toolproof-scan https://our-mcp.example.com/mcp --fail-under 70
```

Or fail on drift instead â€” pin the approved surface and let the check block any
widening:

```bash
npx -y toolproof-lock lock https://mcp.example.com/mcp       # writes toolproof.lock â€” commit it
npx -y toolproof-lock check --policy=toolproof.policy.json   # exit 1 review / 2 blocked / 3 error
```

Every `check` appends a hash-chained, ed25519-signed receipt to
`.toolproof/evidence.jsonl`: the decision, the fingerprints, the policy, the
actor, the time â€” never prompt content, tool arguments, results or credentials.
Auditors verify an export **in the browser with nothing installed**:
[/evidence](https://toolproof-scan.vercel.app/evidence).

## No keyless integration works for you?

Every verdict is one GET. No key, no account, cache-friendly:

```bash
curl --get 'https://toolproof-scan.vercel.app/api/v1/verify' \
  --data-urlencode 'target=https://mcp.context7.com/mcp'
```

## What it checks

15 named rules, each citing the exact text it matched â€” so a finding can be
checked instead of trusted:

- **TP-101** hidden unicode (zero-width / bidi / tag characters) in tool text
- **TP-102** instruction override, concealment and exfiltration phrasing
- **TP-103** outbound URLs in tool descriptions
- **TP-104** embedded credentials in tool text
- **TP-105** scope creep beyond a tool's apparent purpose
- **TP-107** destructive parameter defaults
- **TP-108** delete-everything language
- **TP-201/202/203/205/206** transport, auth posture and permission-skipping (including positive controls â€” a tool that *does* check who is connecting scores better)
- **TP-302/303/304** OpenAPI/spec hygiene

Each issue lowers the score: critical âˆ’45, high âˆ’25, medium âˆ’12, low âˆ’5. The
rule catalog and the scoring rubric are both in the open, in
`src/lib/rules.ts`.

## The grade is a signed receipt, not an opinion

Every verdict ships as an **ed25519 signature over canonical JSON** â€” sort the
keys recursively, sign the bytes, publish the public key. Verify it yourself
with any crypto library and no Toolproof code:

```js
const canonical = JSON.stringify(canonicalize(passport));   // recursive key sort
const ok = verify(null, Buffer.from(canonical),
                  createPublicKey(pubkeyPem),
                  Buffer.from(signature, "base64"));        // alg === "ed25519" && ok
```

Public key: `GET /api/v1/pubkey` Â· `keyId: tpk-1`.

Nobody it scans pays for a verdict. That is the point of a trust layer: a
scanner that takes money from the tools it grades has nothing to sell but its
grading.

## API

One GET per verdict. No key. Responses are cache-friendly (`s-maxage`), and scan
routes are rate-limited to 30/min per IP.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/scan?target=` | Full report with findings + evidence |
| `GET /api/v1/verify?target=` | Signed passport (ed25519, canonical JSON) |
| `GET /api/v1/manifest?target=` | Canonical capability surface (for lockfiles) |
| `GET /api/v1/registry` | Starter registry, scanned live |
| `GET /api/v1/feed` | Per-node, in-memory verdict view (resets on cold start; per-bundle on Vercel). Cross-user ledger ships with v1 |
| `GET /api/v1/badge?target=&style=grade\|flat` | SVG badge |
| `GET /api/v1/og?target=` | 1200Ã—630 social share card |
| `GET /api/v1/pubkey` | Signing public key (PEM) |

Full contract: [/docs](https://toolproof-scan.vercel.app/docs). Machines that
fetch this domain read [/agents.md](https://toolproof-scan.vercel.app/agents.md).

## toolproof.txt â€” the owner's off switch

Tool owners control scanning. Toolproof fetches `/.well-known/toolproof.txt`
from the target's origin before any probe: a path-prefix `Deny:` line matching
the requested path ends the scan immediately with state `opted-out` â€” respected,
never penalized. `/` or `*` matches the whole site. `Allow:` and `Canary:` lines
are reserved for v1.

```
# /.well-known/toolproof.txt
Deny: /admin
Allow: /
Canary: 9f2e4d1c7b
```

Worked example: [docs](https://toolproof-scan.vercel.app/docs#toolproof-txt).

## Honest limits

- Scans are **point-in-time** and **static**. A passport speaks for its
  `scannedAt`, not for the tool's next deploy.
- It is **not a sandbox** and it does not observe runtime behaviour â€” it reads
  the surface the model is about to read.
- A passing grade is a **receipt, not a guarantee**, and not a certification.
  Wrap mode and lock mode exist precisely because a scan cannot cover the future.
- Rate limit is 30 scans/min/IP. Cache; responses carry `s-maxage`.

Stating this plainly is a product requirement, not a courtesy: a rule that
overstates its coverage damages the whole catalog.
## Repository layout

```
src/app/            the site + API routes (Next.js)
src/lib/rules.ts    the rule catalog â€” the product's core, in the open
src/lib/scan.ts     the scanner
packages/toolproof-scan   CLI: npx toolproof-scan <target>
packages/toolproof-mcp    MCP server, wrap guard (toolproof-wrap) and CI gate (toolproof-gate)
packages/toolproof-lock   lockfile + policy + signed evidence trail (bin: toolproof)
tests/              vitest suites for the app; node --test for each package
public/             agents.md, llms.txt, toolproof.txt docs, workflow templates
```

## Local development

```bash
npm install
npm run dev        # needs .env.local (signing keys) for signed passports
npx tsx scripts/probe.mts [targets...]   # CLI probe, no server needed

npm test                                  # app suites (vitest)
cd packages/toolproof-lock && npm test    # lock CLI
cd packages/toolproof-mcp  && node --test # mcp + wrap + gate
```

Distribution has its own check, because the ways this product breaks are not
code failures â€” they are a published version behind the repo, a registry
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

## Contributing

The rule catalog, the detection logic and the evidence formats are open so that
a finding can be checked rather than trusted. See
[CONTRIBUTING.md](CONTRIBUTING.md) â€” in short: a new rule must catch a real
hijack vector, must have a test that fires on an affected target and passes on a
clean one, and must state what it cannot detect. False-positive fixes matter
more than new rules. Every contribution is under the
[CLA](CLA.md).

## Licence and attribution

MIT for the code (see [LICENSE](LICENSE)); the name, the proofmark, the
grade-scale presentation and the rule identifiers as a branded set stay
reserved, so a fork cannot rebrand the same verdicts as its own certification.

Toolproof is built and maintained by the **Toolproof maintainers**. No personal
name or address is published anywhere in this project â€” attribution is the
project, not a person â€” and who holds the rights, and how that identity stays
private, is set out in the [Terms of Service](https://toolproof-scan.vercel.app/terms).

## Roadmap (v1)

- Canaries: honeypot credentials + tripwire instructions planted in registered
  tools, with exfiltration alerting â€” the paid tier.
- Registry claiming + continuous re-scans.
- DNS rebinding protections in the scanner's own fetch layer.