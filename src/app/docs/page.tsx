import type { Metadata } from "next";
import Link from "next/link";
import { RULES } from "@/lib/rules";

// CSP nonce is per-request — dynamic rendering so Next stamps the nonce
// onto its bootstrap scripts (see middleware.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API docs",
  description:
    "One GET per verdict. Keyless signed API for MCP server and API safety grades — scan, verify, badge, OG cards, canaries. Full rule catalog TP-101–TP-304.",
  alternates: { canonical: "/docs" },
};

const PUBKEY = process.env.NEXT_PUBLIC_TOOLPROOF_PUBLIC_KEY ?? "unconfigured";

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <div className="border-b border-line sticky top-0 z-40 bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center">
          <Link href="/" className="text-[13px] font-bold tracking-[0.3em] text-amber">
            TOOLPROOF
          </Link>
          <span className="ml-4 lbl">api docs · v0.1</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-12 space-y-14">
        <section>
          <div className="lbl mb-3">quickstart</div>
          <h1 className="text-xl font-bold">
            Ask before you trust.
          </h1>
          <p className="mt-4 text-[13px] leading-7 text-dim max-w-2xl">
            One GET per verdict. No keys, no accounts. Responses are
            cache-friendly (s-maxage), rate-limited to 30 scans/min per IP,
            and every scan result is signed so you can verify it offline.
          </p>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            Building an agent? Start with the{" "}
            <a href="/for-agents" className="text-amber underline-offset-4 hover:underline">
              one-line agent rule
            </a>. Machines that fetch this domain read{" "}
            <a href="/agents.md" className="text-amber underline-offset-4 hover:underline">/agents.md</a>.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`curl "https://<host>/api/v1/verify?target=https://mcp.context7.com/mcp"`}</pre>
        </section>

        <section>
          <div className="lbl mb-4">endpoints</div>
          <div className="card divide-y divide-line">
            {[
              {
                m: "GET",
                p: "/api/v1/scan?target=&kind=auto|mcp|api",
                d: "Full scan report: findings with evidence, positives, metadata. The interactive API.",
              },
              {
                m: "GET",
                p: "/api/v1/verify?target=&kind=",
                d: "Signed passport: the verdict an agent should consult before calling a tool. ed25519 over canonical JSON.",
              },
              {
                m: "GET",
                p: "/api/v1/manifest?target=&kind=auto|mcp|api",
                d: "Canonical capability manifest for Toolproof Lock: tools, prompts, resources, instructions, outbound hosts and OpenAPI paths, plus the fingerprint a lockfile pins. Signed with ed25519 over canonical JSON.",
              },
              {
                m: "GET",
                p: "/api/v1/registry",
                d: "Starter registry, scanned live. Cached 15 min.",
              },
              {
                m: "GET",
                p: "/api/v1/badge?target=&kind=&style=grade|flat",
                d: "SVG badge for READMEs and dashboards. style=grade (default) or style=flat. Cached 10 min.",
              },
              {
                m: "GET",
                p: "/api/v1/feed",
                d: "Per-node, in-memory view of the newest scans: resets on cold start, and on Vercel each route is its own bundled function, so it only sees scans that hit the same instance. A shared cross-user ledger ships with v1.",
              },
              {
                m: "GET",
                p: "/api/v1/og?target=&kind=",
                d: "1200×630 social share card with the verdict stamp, used for trust-card link previews.",
              },
              {
                m: "GET",
                p: "/api/v1/pubkey",
                d: "The signing public key, PEM-encoded.",
              },
              {
                m: "GET",
                p: "/api/v1/canary?tool=",
                d: "Mint a tool-bound canary credential — plant it, detect exfiltration by lookup.",
              },
            ].map((e) => (
              <div key={e.p} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="rounded bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">{e.m}</span>
                  <code className="text-[12.5px] text-ink">{e.p}</code>
                </div>
                <p className="mt-2 text-[12px] leading-6 text-dim">{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="lbl mb-4">the passport</div>
          <p className="text-[13px] leading-7 text-dim max-w-2xl">
            <code className="text-ink">passport</code> is serialized with
            sorted keys (<code className="text-ink">canonical JSON</code>) and
            signed with ed25519. Verify like this — no toolproof code
            required:
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`import { verify, createPublicKey } from "node:crypto";

const res = await fetch(
  \`https://<host>/api/v1/verify?target=\${encodeURIComponent(target)}\`
);
const { passport, signature, alg } = await res.json();

// canonical JSON: keys sorted recursively, then serialized
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}
const canonical = JSON.stringify(canonicalize(passport));

const ok = verify(
  null,
  Buffer.from(canonical),
  createPublicKey(process.env.TOOLPROOF_PUBKEY),
  Buffer.from(signature, "base64")
);
// alg === "ed25519" && ok  →  the verdict is authentic and unmodified`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            The sort must be recursive — nested objects like{" "}
            <code className="text-dim">findingCounts</code> and{" "}
            <code className="text-dim">scanner</code> are part of the signed
            bytes. That&apos;s the entire ceremony.
          </p>
        </section>

        <section>
          <div className="lbl mb-4">current signing key</div>
          <pre className="overflow-x-auto card p-5 text-[11px] leading-6 text-dim whitespace-pre-wrap">{PUBKEY}</pre>
          <p className="mt-3 text-[12px] text-faint">
            keyId <code className="text-dim">tpk-1</code> · algorithm{" "}
            <code className="text-dim">ed25519</code>. Rotate = new keyId.
          </p>
        </section>

        <section>
          <div className="lbl mb-4">rule catalog</div>
          <div className="card divide-y divide-line">
            {RULES.map((r) => (
              <div key={r.id} className="px-5 py-4 flex gap-4 items-baseline">
                <code className="text-[12px] text-amber shrink-0">{r.id}</code>
                <div>
                  <div className="text-[12.5px] font-bold">
                    {r.name}{" "}
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-faint">
                      {r.sev} · {r.group}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-6 text-dim">{r.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="toolproof-txt" className="scroll-mt-16">
          <div className="lbl mb-4">the toolproof.txt standard</div>
          <p className="text-[13px] leading-7 text-dim max-w-2xl">
            Owners control scanning. Before any probe is sent, Toolproof
            fetches{" "}
            <code className="text-ink">/.well-known/toolproof.txt</code> from
            the target&apos;s own origin. If the requested path matches a{" "}
            <code className="text-ink">Deny</code> line, the scan ends right
            there with state{" "}
            <code className="text-ink">opted-out</code> — no probes are sent;
            that single fetch is the only request Toolproof makes, and the
            opt-out is recorded as a respected refusal, never a penalty.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# /.well-known/toolproof.txt — lines and keys are case-insensitive
# Never scan the admin panel or internal tools:
Deny: /admin
Deny: /internal
# Everything else is fine:
Allow: /
# Reserved for v1 canary attestations:
Canary: 9f2e4d1c7b`}</pre>
          <p className="mt-4 text-[13px] leading-7 text-dim max-w-2xl">
            Matching is plain path prefix:{" "}
            <code className="text-ink">Deny: /admin</code> also blocks{" "}
            <code className="text-ink">/administrator</code> — any path that
            starts with the pattern is denied — and{" "}
            <code className="text-ink">/</code> or{" "}
            <code className="text-ink">*</code> blocks the whole site.{" "}
            <code className="text-ink">#</code> starts a comment.{" "}
            <code className="text-ink">Allow</code> and{" "}
            <code className="text-ink">Canary</code> are part of the format
            today and reserved for opt-in semantics in v1 — only{" "}
            <code className="text-ink">Deny</code> affects scanning.
          </p>
        </section>

        <section id="automation" className="scroll-mt-16">
          <div className="lbl mb-4">automation</div>
          <p className="text-[13px] leading-7 text-dim max-w-2xl">
            The signed verify endpoint works from any terminal or CI job — no
            package, API key or account required:
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`curl "https://toolproof-scan.vercel.app/api/v1/verify?target=https%3A%2F%2Fmcp.context7.com%2Fmcp"`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            In CI, parse <code className="text-dim">passport.grade</code> or
            <code className="text-dim"> passport.score</code> from the JSON and
            fail your own policy check. The response also includes the signature
            for offline verification.
          </p>
          <h2 className="mt-8 text-xl font-bold">A pull-request gate in one file.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            Save this ready-to-run <Link href="/toolproof-check.yml" className="text-amber underline-offset-4 hover:underline">GitHub Actions workflow</Link>{" "}
            as <code className="text-ink">.github/workflows/toolproof.yml</code>, then
            set the repository variable <code className="text-ink">TOOLPROOF_TARGET</code>{" "}
            to the MCP endpoint or API your project uses. It rejects an unverified
            target or a score below 70; change <code className="text-ink">MIN_SCORE</code>{" "}
            in the file if your policy needs a different threshold.
          </p>
          <h2 className="mt-8 text-xl font-bold">CLI enforcement.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            The zero-dependency CLI exits non-zero for an unverified target or a
            score below your threshold. It is published as{" "}
            <a href="https://www.npmjs.com/package/toolproof-scan" target="_blank" rel="noopener noreferrer" className="text-amber underline-offset-4 hover:underline">toolproof-scan</a>.
          </p>
          <pre className="mt-5 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`npx -y toolproof-scan https://mcp.example.com/mcp --fail-under 70`}</pre>
          <h2 className="mt-8 text-xl font-bold">Baselines &amp; signed audit evidence.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            For teams: commit a baseline of every MCP server you depend on and
            let CI re-verify it on every push — signature checked locally
            (ed25519), grade gated by policy, and only an approved surface
            passes. Two shipped tools cover this:{" "}
            <code className="text-ink">toolproof-gate</code> (bundled with the
            toolproof-mcp package) gates a committed passport-hash baseline and
            appends a JSONL audit line containing the full signed passport,
            replayable by any auditor;{" "}
            <code className="text-ink">toolproof-lock</code> produces a semantic
            capability lockfile with consequence-level diffs and a policy — see{" "}
            <Link href="#lock" className="text-amber underline-offset-4 hover:underline">the lockfile section</Link>.
            Details and plans on the{" "}
            <Link href="/enterprise" className="text-amber underline-offset-4 hover:underline">enterprise page</Link>.
          </p>
          <pre className="mt-5 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`npx -y --package toolproof-mcp toolproof-gate --init https://mcp.example.com/mcp --min-grade B
npx -y --package toolproof-mcp toolproof-gate --audit audit.jsonl   # in CI: exit 1 on drift`}</pre>
        </section>

        <section id="lock" className="scroll-mt-16">
          <div className="lbl mb-4">toolproof lock</div>
          <h2 className="text-xl font-bold">A lockfile for a capability surface.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            <code className="text-ink">toolproof lock &lt;target&gt;</code> writes a
            signed <code className="text-ink">toolproof.lock</code> baseline of an
            MCP server or API capability surface; <code className="text-ink">toolproof check</code>{" "}
            re-fetches the live surface, computes a semantic diff against the
            baseline, applies a policy and exits non-zero when the drift needs a
            human. The file is committed next to your agent configuration and
            reviewed like any other file. Product overview:{" "}
            <Link href="/lock" className="text-amber underline-offset-4 hover:underline">Toolproof Lock</Link>.
          </p>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            <code className="text-ink">surface</code> mirrors the manifest surface
            exactly and omits empty keys, so tool order and re-serialization are
            not changes. JSON, UTF-8, two-space indent:
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`{
  "lockVersion": 1,
  "generatedAt": "2026-09-14T00:00:00.000Z",
  "target": "https://mcp.example.com/mcp",
  "kind": "mcp",
  "fingerprint": "sha256:<64 hex>",
  "grade": "A+",
  "score": 100,
  "ruleIds": ["TP-202"],
  "policy": null,
  "surface": {
    "tools": [ { "name": "t", "description": "d", "inputSchema": { }, "outputSchema": { } } ],
    "prompts": [ { "name": "p", "description": "d" } ],
    "resources": [ { "name": "r", "uri": "https://example.net/x", "description": "d" } ],
    "instructions": "...",
    "outboundHosts": [ "api.example.net" ],
    "openapi": { "specUrl": "...", "servers": ["..."], "paths": ["/x"] }
  },
  "signature": "...",
  "keyId": "tpk-1",
  "alg": "ed25519"
}`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            <code className="text-dim">fingerprint</code> is the{" "}
            <code className="text-dim">sha256:</code> of the canonical surface
            (recursively sorted keys) that the lockfile pins;{" "}
            <code className="text-dim">signature</code> is ed25519 over the
            canonical lockfile, <code className="text-dim">null</code> when the
            server has no signing key.
          </p>
        </section>

        <section id="lock-policy" className="scroll-mt-16">
          <div className="lbl mb-4">lock policy</div>
          <h2 className="text-xl font-bold">Three actions, six keys.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            A policy is pure JSON or the flat <code className="text-ink">key: value</code>{" "}
            YAML subset below — <code className="text-ink">#</code> starts a
            comment and blank lines are ignored. Every key accepts exactly three
            actions: <code className="text-ink">informational</code>,{" "}
            <code className="text-ink">review</code>, or{" "}
            <code className="text-ink">block</code>. Pass it with{" "}
            <code className="text-ink">--policy=&lt;path&gt;</code>; omit it and the
            built-in default applies.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# toolproof.policy.yml — the built-in default
minimumGrade: B
requireVerified: true
onToolAdded: review
onToolRemoved: review
onDescriptionChanged: review
onSchemaExpanded: block
onNewOutboundHost: block
onHighSeverityFinding: block`}</pre>
          <div className="mt-6 card divide-y divide-line">
            {[
              ["onToolAdded", "review", "A tool in the observed surface is absent from the lockfile."],
              ["onToolRemoved", "review", "A tool in the lockfile is absent from the observed surface."],
              ["onDescriptionChanged", "review", "A tool, prompt or resource description differs. Also covers a non-additive schema change and changed server instructions."],
              ["onSchemaExpanded", "block", "A tool input or output schema gained a property or required field, or went from absent to present."],
              ["onNewOutboundHost", "block", "The observed surface advertises an outbound host that was not in the baseline."],
              ["onHighSeverityFinding", "block", "A rule id is newly present since the baseline. v1 treats any new TP-1xx id as high severity."],
            ].map(([key, def, when]) => (
              <div key={key} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <code className="text-[12.5px] text-ink">{key}</code>
                  <span className="rounded bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">{def}</span>
                </div>
                <p className="mt-2 text-[12px] leading-6 text-dim">{when}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            <code className="text-dim">minimumGrade</code> (rank A+=5 … F=0) and{" "}
            <code className="text-dim">requireVerified</code> have no policy key and
            always block when unmet. Each change is reported as{" "}
            <code className="text-dim">{`{ category, action, message, where }`}</code>.
          </p>
        </section>

        <section id="lock-cli" className="scroll-mt-16">
          <div className="lbl mb-4">lock cli reference</div>
          <h2 className="text-xl font-bold">toolproof lock &amp; toolproof check.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            Package <code className="text-ink">toolproof-lock</code>, binary{" "}
            <code className="text-ink">toolproof</code>. Zero runtime dependencies,
            Node 18+.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`toolproof lock <target> [--kind=auto|mcp|api] [--out=toolproof.lock]
                        [--policy=<path>] [--api=<url>] [--timeout=<ms>]
toolproof check [--lock=toolproof.lock] [--policy=<path>] [--api=<url>]
                [--timeout=<ms>] [--json] [--quiet]
toolproof --help | -h | --version | -v`}</pre>
          <div className="mt-6 card divide-y divide-line">
            {[
              ["--kind=auto|mcp|api", "lock", "Target kind (default auto)."],
              ["--out=<path>", "lock", "Lockfile to write (default toolproof.lock)."],
              ["--lock=<path>", "check", "Lockfile to read (default toolproof.lock)."],
              ["--policy=<path>", "both", "Policy file, JSON or flat YAML. Default: built-in policy."],
              ["--api=<url>", "both", "Manifest API base URL (default https://toolproof-scan.vercel.app)."],
              ["--timeout=<ms>", "both", "Request timeout in milliseconds (default 30000)."],
              ["--json", "check", "Print { decision, exitCode, changes, manifest } instead of the report."],
              ["--quiet", "check", "Print a single verdict line."],
            ].map(([flag, cmd, what]) => (
              <div key={flag} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <code className="text-[12px] text-ink sm:w-56 sm:shrink-0">{flag}</code>
                <span className="text-[11px] uppercase tracking-wider text-faint sm:w-10 sm:shrink-0">{cmd}</span>
                <span className="text-[12px] leading-6 text-dim">{what}</span>
              </div>
            ))}
          </div>
          <h2 className="mt-8 text-xl font-bold">Exit codes.</h2>
          <div className="mt-4 card divide-y divide-line">
            {[
              ["0", "in sync", "The surface matches the baseline, or only informational changes were reported."],
              ["1", "review required", "At least one change resolved to review; a human should approve the drift."],
              ["2", "blocked", "At least one change resolved to block; the surface violates policy."],
              ["3", "error", "Usage, missing or invalid lockfile, or a network/API failure."],
            ].map(([code, label, what]) => (
              <div key={code} className="flex gap-4 px-5 py-3.5">
                <code className="text-[13px] font-bold text-amber shrink-0">{code}</code>
                <div>
                  <div className="text-[12.5px] font-bold text-ink">{label}</div>
                  <p className="mt-1 text-[12px] leading-6 text-dim">{what}</p>
                </div>
              </div>
            ))}
          </div>
          <h2 className="mt-8 text-xl font-bold">A pull-request gate in one file.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            Save the ready-to-run{" "}
            <Link href="/toolproof-lock.yml" className="text-amber underline-offset-4 hover:underline">Toolproof Lock workflow</Link>{" "}
            as <code className="text-ink">.github/workflows/toolproof-lock.yml</code>,
            commit a <code className="text-ink">toolproof.lock</code> and (optionally)
            a <code className="text-ink">toolproof.policy.yml</code>, and let the job
            fail the pull request on exit 1 or 2:
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# .github/workflows/toolproof-lock.yml (excerpt)
- uses: actions/checkout@v4
- run: npx -y --package toolproof-lock toolproof check --lock=toolproof.lock --policy=toolproof.policy.yml`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            Tags in the report are <code className="text-dim">[BLOCKED]</code>,{" "}
            <code className="text-dim">[REVIEW]</code> and{" "}
            <code className="text-dim">[INFO]</code>; the trailing{" "}
            <code className="text-dim">(where)</code> names the tool, prompt,
            resource, host or rule involved.
          </p>
        </section>

        <section id="badge-embed" className="scroll-mt-16">
          <div className="lbl mb-4">badge &amp; embed</div>
          <p className="text-[13px] leading-7 text-dim max-w-2xl">
            Pin a live verdict anywhere. The badge is an SVG that re-scans
            its target on every cache refresh (~10 min); the embed is a
            320×220 card that does the same — a grade that tracks the target
            over time, not a screenshot.
          </p>
          <pre className="mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`[![toolproof](https://toolproof-scan.vercel.app/api/v1/badge?target=mcp.context7.com%2Fmcp&style=flat)](https://toolproof-scan.vercel.app/t?target=mcp.context7.com%2Fmcp)`}</pre>
          <pre className="mt-3 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`<iframe
  src="https://toolproof-scan.vercel.app/embed?target=mcp.context7.com%2Fmcp"
  width="340" height="240" loading="lazy"
  title="Toolproof trust card">
</iframe>`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint max-w-2xl">
            <code className="text-dim">style=grade</code> renders the
            verdict stamp, <code className="text-dim">style=flat</code> a
            one-line badge. Add <code className="text-dim">&amp;kind=mcp</code>{" "}
            or <code className="text-dim">&amp;kind=api</code> to skip
            auto-detection.
          </p>
        </section>

                <section id="monitoring">
          <div className="lbl mb-4">change monitoring</div>
          <h2 className="text-xl font-bold">Watch the text your model reads.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            For verified MCP surfaces, every passport carries{" "}
            <code className="text-ink">toolTextHash</code> — a SHA-256
            fingerprint of every tool description, prompt, resource and
            server instruction the model sees. Monitoring is diffing that
            hash over time; alerts are whatever notifies you (CI email,
            Slack webhook, a scheduled task).
          </p>
          <pre className="mt-5 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# GitHub Actions — fails (and emails) when the tool's text changes
name: toolproof-watch
on:
  schedule: [{ cron: "0 */6 * * *" }]   # every 6 hours
jobs:
  watch:
    runs-on: ubuntu-latest
    steps:
      - name: Compare fingerprint
        run: |
          H=\$(curl -s "\${{ secrets.TOOLPROOF_URL }}/api/v1/verify?target=\${{ secrets.TOOLPROOF_TARGET }}" | jq -r .passport.toolTextHash)
          if [ "\$H" != "\${{ secrets.TOOLPROOF_LAST_HASH }}" ]; then
            echo "::error::Tool text changed — fingerprint \$H (was \${{ secrets.TOOLPROOF_LAST_HASH }})"
            exit 1
          fi`}</pre>
          <p className="mt-4 text-[12.5px] text-faint max-w-2xl">
            Browser-side: pin a tool from its trust card — the watchlist on
            the leaderboard re-checks your pins every visit.
          </p>
        </section>

        <section id="canaries">
          <div className="lbl mb-4">canaries</div>
          <h2 className="text-xl font-bold">Trap credentials that identify the thief.</h2>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            <code className="text-ink">GET /api/v1/canary?tool=your.host</code> mints
            a unique, tool-bound canary — a decoy secret shaped like a cloud
            key. Plant it where the tool reads. If the string ever surfaces
            in an agent transcript, a log, or a paste site, it identifies the
            tool it was stolen from.
          </p>
          <p className="mt-3 text-[13px] leading-7 text-dim max-w-2xl">
            Declare it in your{" "}
            <code className="text-ink">toolproof.txt</code> with{" "}
            <code className="text-ink">Canary: &lt;token&gt;</code> — scanners
            then report “canary declared by owner” as a positive signal.
            Real-time beacon alerting (a phone-home tripwire) ships in v1.1.
          </p>
        </section>

<section>
          <div className="lbl mb-4">honest limits</div>
          <ul className="space-y-3 text-[13px] leading-7 text-dim max-w-2xl">
            <li>· Scans are point-in-time. A passport speaks for its scannedAt, not for the tool&apos;s next deploy.</li>
            <li>· Static analysis of tool text — not a sandbox. Behavioral canaries ship in v1.</li>
            <li>· Rate limit 30 scans/min/IP. Please cache; responses carry s-maxage.</li>
            <li>· v0 is best-effort: no SLA, no warranty. A passing grade is a receipt, not a guarantee.</li>
          </ul>
        </section>

        <footer className="border-t border-line pt-8 pb-4 text-[11px] text-faint">
          Toolproof — built by Ayush Dhyani ·{" "}
          <a href="/terms" className="hover:text-ink">terms</a> ·{" "}
          <a href="/privacy" className="hover:text-ink">privacy</a> ·{" "}
          <a href="/security" className="hover:text-ink">security</a>
        </footer>
      </div>
    </main>
  );
}
