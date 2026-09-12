# Toolproof launch-v1 — easy to use, hard to replace, launch-ready

Date: 2026-09-12 · Branch: `launch-v1` · Live: https://toolproof-scan.vercel.app

## Context

Toolproof v0.1 is live: a scanner for MCP servers and APIs that detects
agent-hijack vectors and issues ed25519-signed trust passports. This plan
ships the launch-v1 feature set with three goals:

1. **Easy to use** — one-liner CLI, one-click examples, instant verdicts,
   embeddable badges/widgets.
2. **Hard to replace by giants** — we define the `toolproof.txt` standard,
   stay neutral third-party, publish the rule catalog, accumulate a public
   verdict ledger (data + standards + positioning moats).
3. **Launch excitement** — animated verdict reveal, per-target OG share
   cards, a live Ledger of verdicts, share buttons everywhere.

## Global Constraints (bind every task)

- Stack: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4.
  Design tokens only: bg #0b0c0e, panel #121417, panel2 #171a1e, line
  #23262b, ink #e8e6df, dim #9ba0a6, faint #5c6167, amber #ffb224, good
  #34d399, bad #ff5d5d. Fonts via existing CSS vars (`--font-archivo`,
  `--font-jbmono`). Reuse `.card`, `.lbl`, `.tape`, `.scanbar`, `.fadeup`,
  `.glow` classes from globals.css.
- `npm run build` must pass with zero errors before every commit; from
  Task 1 onward `npm run test` must pass too.
- No new runtime dependencies in the root app (vitest as dev-dependency in
  Task 1 is allowed). The CLI package must remain zero-dependency.
- API routes: `export const runtime = "nodejs"`, `maxDuration` ≤ 60, CORS
  headers (`access-control-allow-origin: *` etc.) matching existing routes,
  and `cache-control` with `s-maxage` where responses are cacheable.
- The passport JSON returned by `/api/v1/verify` must keep the exact same
  key set and signing scheme (ed25519 over recursively-sorted canonical
  JSON). Additive changes only: `ScanState` may gain `"opted-out"`.
- Serverless platform: no persistent storage. All new server state is
  best-effort in-memory and must be labeled honestly in UI copy ("on this
  node"). Client persistence uses localStorage.
- Animations are CSS-only (keyframes in globals.css). No animation
  libraries.
- Never deploy, never touch `.vercel/`, Vercel env vars, or the Vercel
  project settings. The controller deploys after final review.
- All existing endpoints must keep working: `/api/v1/scan`, `/verify`,
  `/registry`, `/badge`, `/pubkey`, `/t`, `/docs`, `/`.
- Environment is Windows / Git Bash. Use cross-platform commands.

## Task 1: Scanner depth, toolproof.txt standard, precision, and the test suite

The moat task. Deepen the engine and give it a real test suite.

1. **MCP surface**: in `src/lib/mcp.ts`, after the tools/list call, also
   best-effort call `prompts/list` and `resources/list` (same session
   handling, 4s timeout each, failures ignored). Return `prompts` (title +
   description) and `resources` (name/uri/description) arrays. In
   `src/lib/scan.ts`, run `scanText` over each prompt (`where:
   "prompts/<name>"`) and each resource (`where: "resources/<name>"`);
   add `promptCount` and `resourceCount` to `meta.mcp`.
2. **New rules** (add to `src/lib/rules.ts` patterns AND the public
   `RULES` catalog):
   - `TP-108` "Destructive verbs" (high, group `description`): matches
     delete-all-scale verbs in tool text — pattern
     `/\b(?:delete all|drop (?:all )?tables?|truncate|rm -rf|wipe (?:the )?(?:disk|drive|database)|factory reset)\b/i`.
   - `TP-205` "Safety-bypass phrasing" (high, group `description`): pattern
     `/\b(?:skip|bypass|without)\s+(?:the\s+)?(?:user\s+)?(?:confirmation|approval|consent|asking)\b/i` plus
     `/\bdon'?t ask (?:the user|for (?:confirmation|permission))\b/i`.
   - `TP-206` "Unusual resource scheme" (medium, group `spec`): a
     resource whose `uri` starts with `http://`, `ftp://`, or any scheme
     that is not `https:`, `file:`, or `mcp-` — flagged in scan.ts (not
     scanText) with `where: "resources/<name>"` and evidence = the uri.
3. **toolproof.txt standard**: new `src/lib/toolproof-txt.ts` exporting
   `parseToolproofTxt(text: string): { deny: string[]; allow: string[];
   canary?: string }` (lines `Deny: <path>`, `Allow: <path>`,
   `Canary: <token>`, `#` comments; trim; case-insensitive keys) and
   `matchesPath(pattern: string, pathname: string): boolean` (`/` and `*`
   match everything, otherwise prefix match) and
   `fetchToolproofTxt(origin: string): Promise<Parsed | null>` (4s
   timeout, any failure → null). In `scan.ts`, fetch it from the target
   origin BEFORE any probe; if any `Deny` pattern matches the target
   pathname, return a report with `state: "opted-out"` (add to the
   `ScanState` union in types.ts), `grade: "—"`, score 100, no probes run,
   summary exactly `Owner requested no scanning via toolproof.txt —
   respected.`, and a positive line `toolproof.txt honored`. Update the
   badge route label to `OPTED OUT` (dim color) for this state, and make
   ScanBox/t-page copy treat it like unverified-but-respected (never a
   red color).
4. **Precision guard**: in `scanText`, remove benign phrases BEFORE
   running TP-102/TP-105/TP-108/TP-205 patterns (run TP-101, TP-103,
   TP-104 on the original text): strip matches of
   `/\bignore (?:invalid|unknown|malformed|empty|duplicate|missing|optional|the (?:leading|trailing|whitespace))[^.\n]{0,30}/gi`
   and `/\b(?:disregard|forget) (?:invalid|unknown|malformed|empty|duplicate|missing|optional)[^.\n]{0,30}/gi`.
   "Ignore invalid entries" must NOT flag; "IGNORE ALL PREVIOUS
   INSTRUCTIONS" must still flag.
5. **Tests**: add `vitest` as a devDependency, script `"test":
   "vitest run"`. Write relative-import tests: `tests/rules.test.ts` (each
   new and existing rule fires on a true positive; benign phrases and
   clean text don't fire; URL extraction and snippet control-char
   replacement), `tests/toolproof-txt.test.ts` (parse + path matching),
   `tests/score.test.ts` (grade boundaries 95/85/70/50/30 and weights),
   `tests/sign.test.ts` (stableStringify sorts recursively and is
   deterministic). Factor `passportOf` out of
   `src/app/api/v1/verify/route.ts` into `src/lib/passport.ts` (route
   imports it, output identical) and add `tests/passport.test.ts`
   asserting the exact key set: v, kind, target, host, state, scannedAt,
   score, grade, summary, findingCounts, ruleIds, positives, scanner —
   this test is the byte-compatibility guarantee.

Acceptance: `npm run test` green (≥ 15 tests), `npm run build` green,
`npx tsx scripts/probe.mts https://mcp.context7.com/mcp` still verified.

## Task 2: Per-target OG share cards and share buttons

The virality task. Every trust card gets a shareable, grade-bearing
preview image and one-click sharing.

1. New `src/app/api/v1/og/route.tsx` using `ImageResponse` from `next/og`
   (see existing `src/app/opengraph-image.tsx` for the import pattern):
   `GET ?target=&kind=` → 1200×630 PNG. Layout: amber bar top and bottom
   (solid, 14px — satori-safe), "TOOLPROOF" letterspaced small in dim, the
   target host in huge bold display type (truncate ~48 chars), a colored
   grade block (use `gradeColor` + score/100 or "UNVERIFIED"/"OPTED OUT"
   in dim), the report summary truncated to ~110 chars, footer
   `toolproof-scan.vercel.app · signed trust passport`. Scan via
   `scanTarget` (it caches); on `TargetError` render an "invalid target"
   variant. `runtime = "nodejs"`, `maxDuration = 60`, headers
   `cache-control: public, s-maxage=21600, stale-while-revalidate=86400`
   and CORS like the other routes.
2. In `src/app/layout.tsx` metadata add
   `metadataBase: new URL("https://toolproof-scan.vercel.app")`.
3. In `src/app/t/page.tsx` add `generateMetadata({ searchParams })`
   returning title `${host} — ${grade} on Toolproof` (grade "—" for
   unverified states) and `openGraph.images = ["/api/v1/og?target=…&kind=…"]`.
4. New client component `src/components/ShareRow.tsx` (props: target,
   kind, host, grade): four actions with existing design language —
   Copy link (clipboard, shows "copied ✓" for 1.5s, fallback to a prompt
   if clipboard unavailable), Post on X (`https://twitter.com/intent/tweet?text=…`,
   text includes host + grade), Share on LinkedIn
   (`https://www.linkedin.com/sharing/share-offsite/?url=…`), Copy badge
   markdown (`[![toolproof](<badge url>)](<card url>)`). Render it in the
   trust card header area. Zero dependencies.

Acceptance: build green; report includes `npm run build && npm run start`
evidence: `curl -s -D - -o /dev/null` on `/api/v1/og?target=https://mcp.context7.com/mcp`
shows 200 + `content-type: image/png` (kill the server after).

## Task 3: Scan experience overhaul

The excitement task. Make running a scan feel like a verdict being handed
down. All CSS-only.

1. Rewrite `src/components/ScanBox.tsx`:
   - Example chips under the input (click = fill + immediate run):
     Context7 `mcp.context7.com/mcp`, GitHub MCP
     `api.githubcopilot.com/mcp`, Petstore `petstore3.swagger.io/api/v3`,
     DeepWiki `mcp.deepwiki.com/mcp`. Chip style: bordered pill, dim,
     hover ink.
   - Staged progress while `phase === "scanning"`: cycle stage labels
     `["resolving host", "transport probe", "handshake", "tools/list",
     "rule engine", "signing"]` every 700 ms shown as a mono ticker line
     plus a live elapsed-ms counter, over the existing `.scanbar` card.
   - Verdict reveal: when results arrive, the grade badge animates with a
     new `.stamp-in` keyframe (opacity 0→1, scale 1.8→1, rotate -6deg→-2deg,
     380ms cubic-bezier(0.2, 1.4, 0.4, 1)) — a stamp slamming onto paper.
     Findings list items fade up with `animationDelay: i * 60ms` capped at
     8 items.
   - Keyboard: `/` focuses the input (unless already typing in it),
     `Escape` clears input and resets state.
   - After a verdict, render `ShareRow` (from Task 2) above the
     "Full trust card →" link.
2. `src/app/t/page.tsx`: wrap the GradeRing container in the same
   `.stamp-in` animation so the card opens with the stamp.
3. Add `.stamp-in` keyframes/class to `globals.css`.

Acceptance: build green; no hydration warnings reported; report describes
the animation flow.

## Task 4: Zero-dependency CLI

The distribution task. `npx toolproof-scan <target>` works from any
terminal; CI-friendly exit codes.

1. New package at `packages/toolproof-scan/`:
   - `package.json`: name `toolproof-scan`, version `0.1.0`, `"type":
     "module"`, `"bin": { "toolproof-scan": "./bin.mjs" }`, `"engines":
     { "node": ">=18" }`, description "Trust grades for MCP servers and
     APIs — the verify step for the agent economy", no dependencies.
   - `bin.mjs`: flags `--json`, `--kind=auto|mcp|api` (default auto),
     `--fail-under=<0-100>` (exit 1 when verified && score < N, or when
     state is unverified), `--api=<url>` (default
     `https://toolproof-scan.vercel.app`), `--timeout=<ms>` (default
     30000), `-h/--help`. Accepts one or more target args. Fetches
     `${api}/api/v1/verify?target=…&kind=…` with global fetch. Human
     output: header `TOOLPROOF · <host>`, state/grade/score line, the
     summary, findings as `  [sev] TP-xxx Title (where)` with severity
     colors, positives as `  + …`, footer `card: <api>/t?target=…`.
     ANSI colors: bold, dim (90), green (92), red (91), amber (38;5;208);
     disabled when `NO_COLOR` is set or stdout is not a TTY. `--json`
     prints the raw response body. Exit codes: 0 pass, 1 fail-under or
     unverified, 2 usage or network error (with a readable message).
2. `packages/toolproof-scan/README.md`: what it is, npx usage, example
   output block, a GitHub Actions CI step (`npx toolproof-scan
   https://our-mcp.example.com/mcp --fail-under 70`), and `npm publish`
   instructions (do NOT publish).
3. Root `README.md`: add a short "CLI" section pointing at the package.

Acceptance: report includes real terminal evidence: `node
packages/toolproof-scan/bin.mjs mcp.context7.com/mcp` against the live
API (expected grade A+, exit 0) and `node packages/toolproof-scan/bin.mjs
api.githubcopilot.com/mcp --fail-under 70` (expected exit 1, unverified).

## Task 5: The Ledger, badge v2, and the embed widget

The data-moat task. A live verdict feed, better badges, an embeddable
widget.

1. New `src/lib/feed.ts`: module-level singleton ring buffer (max 50,
   newest first, dedupe by target within 60s) plus a `total` counter.
   `record(entry)` from the scan and verify routes ONLY on fresh scans
   (when `getCached` returned null before the scan — keep the existing
   cache flow intact). Entry: `{ host, target, kind, state, score, grade,
   at }`. `snapshot()` returns `{ total, items: latest 20 }`. Honest
   limitation, documented in the file: per-instance, resets on cold start.
2. New `src/app/api/v1/feed/route.ts`: GET → snapshot, CORS,
   `cache-control: public, s-maxage=5`, default runtime/maxDuration.
3. New client component `src/components/Ledger.tsx`: polls
   `/api/v1/feed` every 10s (setInterval with cleanup, skipped while
   `document.hidden`), pauses polling on hover. Table: time (HH:MM:SS),
   host, kind, colored grade chip, state. Empty state: `no verdicts on
   this node yet — run a scan`. Render it on the landing page as section
   `05 · The Ledger` between Field notes and Canary; renumber Canary to
   `06` in the same task.
4. Badge route: support `style=grade` (default, current two-part design)
   and `style=flat` (single line: seal dot, `TOOLPROOF`, grade + VERIFIED
   state inline in one amber-on-dark pill, 240×64). Return sensible
   defaults for unknown styles.
5. New `src/app/embed/page.tsx`: server component, `searchParams.target`
   required; renders a minimal 320×220-grade card (seal, host, GradeRing
   size 96, summary one-liner truncated, `full card ↗` link opening in a
   new tab). No nav, no footer, `metadata: { robots: { index: false } }`.
6. Framing carve-outs: in `src/middleware.ts`, when the path starts with
   `/embed`, build the CSP WITHOUT the `frame-ancestors` directive (keep
   everything else). In `next.config.ts`, move `X-Frame-Options: DENY`
   from the `/:path*` block into a new block with source
   `/((?!embed).*)` so `/embed` can be iframed.
7. `src/app/t/page.tsx`: add an "embed" snippet box next to the badge box
   (`<iframe src="{origin}/embed?target=…" style="border:0;width:340px;height:260px">`).

Acceptance: build green; report includes prod-server evidence: run a scan
via the running server, then `curl /api/v1/feed` shows the entry; badge
`style=flat` returns SVG; `/embed?target=…` returns 200 HTML.

## Task 6: Launch finish — positioning, docs, hero

1. Landing hero additions: (a) a live verdict counter line under the stat
   row — new small client component `HeroStat` fetching `/api/v1/feed`
   once and rendering `verdicts on this node: <total>` (dim, mono; hide
   the line while loading); (b) a CLI one-liner block with a copy button:
   `npx toolproof-scan mcp.context7.com/mcp` (reuse clipboard behavior
   style from ShareRow; inline tiny client component `CopyNpx`); (c) a
   neutral-positioning block after the passport section: heading "Neutral
   by construction", 3-4 sentences: Toolproof operates no agents, sells no
   models, runs no tools — it has no incentive but accuracy; giants grade
   their own homework, we can't afford to.
2. `src/app/docs/page.tsx`: new sections — the `toolproof.txt` standard
   (format, semantics, worked example, "owners control scanning" framing),
   CLI reference (install, all flags, exit codes), embed/badge snippets,
   and endpoint-table rows for `/api/v1/feed` and `/api/v1/og`.
3. Root `README.md`: sync endpoint table (add feed + og), add
   toolproof.txt mention, add CLI section if Task 4 left it out.
4. Final consistency pass: section numbering on the landing page reads
   01…06 in order; every page's metadata title is sensible; no dead
   links between sections.

Acceptance: build green; docs page contains toolproof.txt + CLI +
embed sections; landing hero shows the CLI line and counter wiring.
