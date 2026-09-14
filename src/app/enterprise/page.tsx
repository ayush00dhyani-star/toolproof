import type { Metadata } from "next";
import Link from "next/link";
import Proofmark from "@/components/Proofmark";

export const metadata: Metadata = {
  title: "Enterprise — MCP supply-chain policy for teams",
  description:
    "Put the AI tool supply chain under policy: cryptographically verified trust verdicts, CI enforcement with toolproof-gate, and signed audit evidence your compliance team can replay.",
  alternates: { canonical: "/enterprise" },
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything an individual builder needs.",
    items: [
      "Unlimited trust cards & grades",
      "Watchlist with diff-on-change alerts",
      "check_tool MCP server (Claude, Cursor, …)",
      "toolproof-gate CLI — MIT licensed",
      "Signed passports (ed25519) on every verdict",
    ],
    cta: { href: "/", label: "start scanning →" },
  },
  {
    name: "Team",
    price: "from $490/mo",
    tagline: "Policy as code for the whole org.",
    items: [
      "Org-wide baselines, managed centrally",
      "Webhook alerts on drift (Slack, PagerDuty, SIEM)",
      "Private watchlists & team review workflow",
      "Badge + gate enforcement across all repos",
      "Priority rules & signed key rotation",
    ],
    cta: {
      href: "mailto:security@toolproof-scan.vercel.app?subject=Toolproof%20Team",
      label: "talk to us →",
    },
  },
  {
    name: "Enterprise",
    price: "custom",
    tagline: "The control your security team mandates.",
    items: [
      "Self-hosted scanner & signing keys",
      "SSO / SAML, RBAC, org audit trails",
      "SIEM streaming (Splunk, Sentinel) of signed verdicts",
      "Vendor due-diligence reports on demand",
      "SLA + security review support",
    ],
    cta: {
      href: "mailto:security@toolproof-scan.vercel.app?subject=Toolproof%20Enterprise",
      label: "contact sales →",
    },
  },
];

export default function EnterprisePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <Link href="/" className="ml-auto text-[13px] text-dim transition-colors hover:text-ink">
            ← scan a tool
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <div className="lbl mb-4">for teams & enterprises</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[40px]">
          Put the AI tool supply chain under policy.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-dim">
          Every agent in your company connects to MCP servers and APIs that can
          change their instructions <em>at any time, without notice</em>.
          Toolproof turns that moving surface into a control:{" "}
          <strong className="text-ink">cryptographically signed verdicts</strong>,{" "}
          <strong className="text-ink">CI enforcement</strong>, and{" "}
          <strong className="text-ink">replayable audit evidence</strong>.
        </p>

        {/* shipping today */}
        <section className="mt-12">
          <div className="lbl mb-4">shipping today — free</div>
          <div className="card space-y-4 px-5 py-5">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                <code className="mono text-amber">toolproof-gate</code> — fail the build when a tool turns hostile
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                A committed baseline of every MCP server you depend on. CI
                re-verifies on every run: signature checked client-side
                (ed25519), grade gated by policy, and any change to a
                tool&apos;s model-visible instructions blocks the merge — the
                same discipline you already apply to dependencies, applied to
                the instructions your agents read.
              </p>
              <pre className="mono mt-3 overflow-auto rounded-md border border-hair bg-black/20 p-3 text-[11.5px] leading-5 text-dim">{`npx toolproof-gate --init https://mcp.example.com/mcp --min-grade B
npx toolproof-gate --audit audit.jsonl   # in CI: exit 1 on drift`}</pre>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Signed evidence, not screenshots</h2>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                Every gate check appends a JSONL audit line containing the full
                signed passport and its signature — replayable by any auditor
                with the public key. Compliance evidence for the newest supply
                chain in your stack, without inventing a new process.
              </p>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">The agent-side guard</h2>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                The <code className="mono text-amber">check_tool</code> MCP
                server lets any employee&apos;s AI check a tool <em>before</em>{" "}
                connecting — the same verdicts, same signatures, enforced at the
                moment of connection, not just at merge time.
              </p>
            </div>
          </div>
        </section>

        {/* tiers */}
        <section className="mt-12">
          <div className="lbl mb-4">plans</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.name} className="card flex flex-col px-5 py-5">
                <div className="text-[13px] font-semibold uppercase tracking-wide text-amber">{t.name}</div>
                <div className="mt-1 text-[22px] font-semibold text-ink">{t.price}</div>
                <div className="mt-1 text-[12px] text-faint">{t.tagline}</div>
                <ul className="mt-4 flex-1 space-y-2 text-[12.5px] leading-5 text-dim">
                  {t.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-good">+</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Link href={t.cta.href} className="mt-5 text-[12.5px] text-amber hover:text-ink">
                  {t.cta.label}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-faint">
            Team &amp; Enterprise tiers are in early access — everything on the
            Free tier stays free and open source. No lock-in: your baselines
            and audit files are plain JSON in your repos.
          </p>
        </section>

        {/* value math */}
        <section className="mt-12">
          <div className="lbl mb-4">the value math</div>
          <div className="card px-5 py-5 text-[13px] leading-6 text-dim">
            One poisoned MCP tool can exfiltrate every conversation it touches —
            customer data, credentials, code. The average enterprise tooling
            incident costs six figures; enforcement + evidence here costs less
            than the coffee budget of the incident review. It isn&apos;t a line
            item, it&apos;s the cheapest control you&apos;ll add this year.
          </div>
        </section>

        <footer className="mt-14 border-t border-hair pt-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-dim">
            <Link href="/docs" className="hover:text-ink">Docs</Link>
            <Link href="/leaderboard" className="hover:text-ink">Leaderboard</Link>
            <Link href="/security" className="hover:text-ink">Security</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </nav>
        </footer>
      </article>
    </main>
  );
}
