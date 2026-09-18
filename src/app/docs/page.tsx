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
          <div className="mt-6 card divide-y divide-line text-[12.5px] leading-6">
            {[
              {
                n: "1",
                t: "Check a tool by hand",
                d: "Paste a link on the homepage, or send the curl below. Nothing to install.",
              },
              {
                n: "2",
                t: "Let your agent check",
                d: "Paste the one-line rule into CLAUDE.md or AGENTS.md, or install npx -y toolproof-mcp. Wrap mode removes malicious tools instead of merely warning about them.",
              },
              {
                n: "3",
                t: "Gate it in CI",
                d: "npx -y toolproof-scan <target> --fail-under 70 fails a build on a bad grade; npx -y toolproof-lock pins the approved surface and fails on drift.",
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-4 px-5 py-3">
                <span className="mono text-[11px] text-amber shrink-0 pt-0.5">{s.n}</span>
                <span>
                  <span className="text-ink font-medium">{s.t}</span>{" "}
                  <span className="text-dim">— {s.d}</span>
                </span>
              </div>
            ))}
          </div>
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
            Commit a signed baseline of the capability surface you approved,
            then re-check it on every push. The check recomputes the surface,
            applies your policy, and exits non-zero when a tool gained reach —
            not when something merely moved. Every decision is appended to a
            hash-chained evidence file an auditor verifies offline, with
            nothing installed. The walkthrough is on the{" "}
            <Link href="/lock" className="text-amber underline-offset-4 hover:underline">lock gate page</Link>
            ; hosted re-checks and shared policy are on the{" "}
            <Link href="/enterprise" className="text-amber underline-offset-4 hover:underline">enterprise page</Link>.
          </p>
          <pre className="mt-5 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`npx -y toolproof-lock lock https://mcp.example.com/mcp      # pin the approved surface (commit toolproof.lock)
npx -y toolproof-lock check --policy=toolproof.policy.json  # CI gate: exit 2 when a change is blocked`}</pre>
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
          Toolproof ·{" "}
          <a href="/terms" className="hover:text-ink">terms</a> ·{" "}
          <a href="/privacy" className="hover:text-ink">privacy</a> ·{" "}
          <a href="/security" className="hover:text-ink">security</a>
        </footer>
      </div>
    </main>
  );
}
