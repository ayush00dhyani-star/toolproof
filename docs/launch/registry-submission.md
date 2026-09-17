# Registry and directory submission — the manual half of distribution

Everything that can be automated is. Two steps cannot be, because both need a
credential that lives on one machine and nowhere else: **npm login** and the
**MCP Registry device-code login**. This is the runbook for those two, in order.

Do them in this order. The registry publish *fails* if the npm publish is skipped,
and the reason is not obvious from the error.

---

## 0. Why this matters

The official MCP Registry (`registry.modelcontextprotocol.io`) is the upstream
source that a large share of MCP directories and clients read from. Toolproof is
not listed there, because of a hard requirement that was not met:

> The MCP Registry verifies ownership of npm packages by checking `mcpName` in
> `package.json`. The `mcpName` property **MUST** match the server name in
> `server.json`.

That field did not exist in `toolproof-mcp`, so a publish attempt would have been
rejected as unowned. It has been added, and `server.json` now matches it:

```
mcpName (packages/toolproof-mcp/package.json) = io.github.ayush00dhyani-star/toolproof
name    (server.json)                         = io.github.ayush00dhyani-star/toolproof
```

`node scripts/distribution-check.mjs --offline` asserts that this stays true, so
the two can never silently drift apart again.

---

## 1. npm auth (the blocking prerequisite)

There is currently **no npm token on this machine** — `~/.npmrc` is 0 bytes and
`npm whoami` fails with `ENEEDAUTH`. The packages are published under the npm user
`diorpetss`.

```bash
npm login          # or: npm adduser
npm whoami         # must print the publishing account, not an error
```

If you prefer a token over an interactive login, create a granular access token
with publish rights for the `toolproof-*` packages and put it in `~/.npmrc`:

```
//registry.npmjs.org/:_authToken=<token>
```

Never commit that file. The repo has no `.npmrc`, and should not gain one.

---

## 2. Publish the packages that are ahead of npm

`node scripts/distribution-check.mjs` currently reports:

| Package | Repo | npm latest | Meaning |
| --- | --- | --- | --- |
| `toolproof-scan` | 0.1.1 | 0.1.1 | in sync |
| `toolproof-lock` | 0.2.0 | 0.2.0 | in sync |
| `toolproof-mcp` | **0.3.0** | **0.2.1** | **enforcement (wrap mode) is not shipped** |

So `toolproof-mcp@0.3.0` is the one that matters — it contains wrap mode, the
product that *stops* an attack rather than grading it, and it is the version that
carries `mcpName`.

Inspect before publishing, then publish:

```bash
npm pack ./packages/toolproof-mcp --dry-run      # confirm the file list
npm publish ./packages/toolproof-mcp --access public
```

`npm pack --dry-run` must list `server.mjs`, `gate.mjs`, `wrap.mjs`, `rules.mjs`,
`README.md` and `package.json`. `package.json` is included automatically and is
what the server reads its version from at runtime — if it is ever missing from the
tarball, the server reports `0.0.0`.

If `toolproof-lock`'s scoped-grant work has landed by then, it needs its own
version bump and publish; `distribution-check` will say so.

Verify:

```bash
npm view toolproof-mcp version          # must print 0.3.0
npx -y toolproof-mcp --help             # runs the published artifact
```

---

## 3. Publish to the official MCP Registry

`server.json` at the repo root is the manifest. `packages[].version` is `0.3.0`,
so **step 2 must be complete** — the registry validates that the referenced npm
version exists and rejects the publish otherwise.

```bash
cd <repo root>
npx -y mcp-publisher@latest login github     # device code at github.com/login/device
npx -y mcp-publisher@latest publish
```

The GitHub device login must be completed by the account that owns
`io.github.ayush00dhyani-star/`, or the publish is rejected with
*"You do not have permission to publish this server"*.

Verify:

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.ayush00dhyani-star/toolproof"
node scripts/distribution-check.mjs        # the "presence" line must say listed
```

---

## 4. Directory listings

`public/.well-known/mcp-directory.json` is the copy-paste payload for these, and
it now carries the registry name, the server-card URL and the wrap-mode config.
`SUBMIT.md` is the human-readable one-pager.

| Directory | How | Note |
| --- | --- | --- |
| mcp.so | submit a server | reads the directory JSON |
| glama.ai/mcp | list a server | |
| pulsemcp.com | submit | |
| smithery.ai | publish the URL | ingests `/.well-known/mcp/server-card.json` |
| opentools.ai | submit a tool | |
| awesome-mcp-servers | pull request | add an entry under Security |

Smithery and any registry that cannot execute the server read the **static server
card** at `/.well-known/mcp/server-card.json`. It has been added, and
`distribution-check` fails if it ever disagrees with `mcp-directory.json` about
which tools exist — two surfaces advertising different tool lists is exactly how a
listing starts lying.

---

## 5. GitHub, already automated

Done via the API, no manual step left:

- **Topics** (18): mcp, mcp-server, model-context-protocol, mcp-security,
  prompt-injection, ai-agents, agent-security, ai-security, security-scanner,
  supply-chain-security, llm-security, trust, devsecops, github-actions, cli,
  openapi, nextjs, vercel — these make the repo reachable from github.com/topics.
- **Homepage** → https://toolproof-scan.vercel.app
- **Releases**: `toolproof-mcp-v0.2.1`, `toolproof-lock-v0.2.0`,
  `toolproof-scan-v0.1.1` — npm versions now have changelogs and a path back to
  the repo.

---

## 6. After the commits, the site

`mcp-directory.json` and `server-card.json` changed, so the deploy must be
promoted or the live metadata keeps describing an older release:

```bash
vercel deploy . --prod -y --wait        # the project is linked in .vercel/
node scripts/distribution-check.mjs     # every deploy line must say ok
```

**Why this is a manual step and should not be.** The `Deploy (Vercel)` workflow
has been reporting success on every push while skipping all of its deploy steps,
because the `VERCEL_TOKEN` repository secret was never set. That is a false
green, and it had a real cost: `main` advanced through several commits while
`toolproof-scan.vercel.app` kept serving an older build, including the directory
metadata that the MCP catalogues read. Nothing failed, so nothing was noticed —
`distribution-check` is what surfaced it.

The guard now emits a `::warning::` annotation and a job summary that says
plainly that production was **not** deployed. Set `VERCEL_TOKEN` (Vercel
dashboard → Account Settings → Tokens) to make the workflow real; until then,
trust the CLI command above and the `deploy` lines of `distribution-check`.

---

## 7. Known open items (not distribution blockers, but real)

- **CI is red on main.** The `Tests` workflow has failed on the last four pushes
  to `main`. The failures are in `packages/toolproof-mcp/test/rules.test.mjs`,
  both in `enforceTools`:
  1. *"removes deceptive tools and passes sloppy ones through"* — a tool that
     should be classified as `graded` is not in `graded`;
  2. *"tolerates malformed input"* — `null`/`undefined` entries are not skipped,
     so `safe.length` is 3 where the test expects 2.

  This is the wrap-mode enforcement path (`rules.mjs`), so it belongs to whoever
  owns that work — changing it wrongly changes what gets withheld from an agent's
  tool list, which is security-relevant behaviour, not a cosmetic fix. A red
  badge on a trust product is a distribution problem in its own right, so it
  should be fixed before the launch posts go out.
- **GitHub reports the licence as `NOASSERTION`.** The LICENSE deliberately
  combines MIT with a trademark carve-out, which GitHub's classifier cannot match
  to a known identifier. Directories that read licence metadata may skip it.
  Fixing it means changing legal text, so it is your call, not a script's.
- **Rule count corrected to 15.** The README, SUBMIT.md and both launch posts
  claimed 16 rules; the catalogue in `src/lib/rules.ts` has 15 rule ids
  (TP-101…TP-108, TP-201…TP-206, TP-302…TP-304). Corrected everywhere, because for
  a product whose claim is "evidence, not opinion", an inflated count is the one
  thing that would have been checked first in the launch thread.