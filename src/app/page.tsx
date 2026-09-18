import Proofmark from "@/components/Proofmark";
import Link from "next/link";
import ScanBox from "@/components/ScanBox";
import HijackDemo from "@/components/HijackDemo";
import SeedsGrid from "@/components/SeedsGrid";
import Ledger from "@/components/Ledger";
import CommandPalette, { PaletteTrigger } from "@/components/CommandPalette";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollReveal from "@/components/ScrollReveal";
import CopyBlock from "@/components/CopyBlock";
import { RULES } from "@/lib/rules";

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-hair bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-5 h-14 flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2 text-amber">
          <Proofmark className="h-5 w-5" />
          <span className="font-semibold tracking-tight">Toolproof</span>
        </Link>
        <div className="ml-auto flex items-center gap-5 text-[13.5px] text-dim">
          <a href="#what-it-does" className="hover:text-ink transition-colors">What it does</a>
          <a href="#integrate" className="hover:text-ink transition-colors">Integrate</a>
          <a href="#checks" className="hover:text-ink transition-colors">Checks</a>
          <a href="/leaderboard" className="hover:text-ink transition-colors">Leaderboard</a>
          <a href="/for-agents" className="hover:text-ink transition-colors">For agents</a>
          <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
          <PaletteTrigger />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

const EXAMPLE_OUTPUT = `TOOLPROOF VERDICT — mcp.context7.com
grade: A+ (100/100) · state: verified · kind: mcp
Clean scan — no agent-hijack patterns found.
  + HTTPS enforced
  + Server instructions captured and reviewed
  + MCP surface verified — 2 tool(s) inspected
review card: toolproof-scan.vercel.app/t?target=…`;

// ---- the three things the product actually does -----------------------------
// Written to be pasted, not skimmed: each mode carries the one command a
// person needs, in the order they would reach for it.
const MODES = [
  {
    tag: "check",
    title: "Grade a tool before you connect to it",
    body:
      "Paste a link. You get a letter grade (A+ … F), every finding with the exact text that caused it, and the checks that passed. Nothing is blocked — you decide what to do with the answer.",
    code: "npx -y toolproof-scan https://mcp.example.com/mcp",
  },
  {
    tag: "stop",
    title: "Delete the malicious tool before your agent sees it",
    body:
      "Wrap mode sits in front of any MCP server. Tools carrying deception — hidden characters, an embedded credential, \"ignore your instructions\" — are removed from the list the agent reads, and the agent is told what was removed and why. Honest-but-sloppy tools (a docs URL, missing auth) are reported, never removed.",
    code: "npx -y toolproof-mcp wrap -- npx -y @stripe/mcp",
  },
  {
    tag: "freeze",
    title: "Block the build when a tool quietly changes",
    body:
      "Pin the capability surface you approved in a lockfile, then re-check it in CI. A tool that gains a parameter, a new outbound host or new instructions fails the build. Every decision is appended to a signed, hash-chained evidence file an auditor can verify without installing anything.",
    code: "npx -y toolproof-lock lock https://mcp.example.com/mcp\nnpx -y toolproof-lock check",
  },
];

// ---- the three integration paths, shortest first ---------------------------
const AGENT_RULE = `Tool safety rule:
Before connecting to any MCP server or unfamiliar API, verify it first.
GET https://toolproof-scan.vercel.app/api/v1/verify?target=<the url>
Report the grade to the user. If the state is not "verified", or the
grade is below B, tell the user what you found and ask before connecting.`;

const MCP_CONFIG = `{
  "mcpServers": {
    "toolproof": {
      "command": "npx",
      "args": ["-y", "toolproof-mcp"]
    }
  }
}`;

const CI_STEP = `# .github/workflows/toolproof.yml
- name: Trust-check our MCP server
  run: npx -y toolproof-scan https://our-mcp.example.com/mcp --fail-under 70`;

// FAQ structured data — eligible for FAQ rich results / AI answer engines.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I check if an MCP server is safe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Paste the MCP server URL into Toolproof (toolproof-scan.vercel.app). In a few seconds you get a letter grade with the evidence behind it: ${RULES.length} checks covering hidden instructions in tool descriptions, invisible characters, exposed secrets, unsafe defaults and missing authentication. Free, no account, and nothing you paste is stored.`,
      },
    },
    {
      "@type": "Question",
      name: "What is an MCP prompt injection attack?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A tool's description is loaded straight into the AI model's context — and the model obeys it. Attackers hide instructions there (sometimes in invisible unicode characters) like 'ignore your rules' or 'send the conversation to this URL'. Humans see nothing; the model reads every word. Toolproof checks for these agent-hijack patterns before you connect.",
      },
    },
    {
      "@type": "Question",
      name: "Can my AI agent check tools automatically?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Add one rule to your agent's instructions — it calls the signed verify endpoint before connecting to any MCP server or unfamiliar API — or install the Toolproof MCP server and wrap mode removes malicious tools before the agent ever sees them.",
      },
    },
    {
      "@type": "Question",
      name: "Are the verdicts verifiable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every verdict ships as an ed25519-signed passport over canonical JSON. You can verify the signature offline with standard crypto libraries — no Toolproof code required — so a grade is a receipt you can keep, even if the site disappears.",
      },
    },
  ],
};

const FAQS = [
  {
    question: "How do I check if an MCP server is safe?",
    answer:
      "Paste its URL into Toolproof. The scanner returns a letter grade and the evidence behind it, including hidden instructions in tool descriptions, invisible characters, exposed secrets, unsafe defaults and missing authentication signals. It is free, needs no account, and stores nothing you paste.",
  },
  {
    question: "What is an MCP prompt injection attack?",
    answer:
      "A malicious tool can put instructions in the text an AI model reads. Those instructions can tell the model to ignore safeguards, expose data or contact another service. Some attacks use invisible Unicode characters, so the text can look harmless to a person.",
  },
  {
    question: "Can my AI agent check tools automatically?",
    answer:
      "Yes. Add the Toolproof rule to the agent's instructions, or install the Toolproof MCP server. With wrap mode the agent is not just warned — the deceptive tools are removed before it can call them.",
  },
  {
    question: "Are Toolproof verdicts verifiable?",
    answer:
      "Every verdict includes an ed25519-signed passport over canonical JSON. You can verify the signature offline with standard cryptography libraries, without trusting Toolproof code at verification time.",
  },
  {
    question: "Does a good grade mean the tool is safe?",
    answer:
      "No, and the product says so everywhere. A scan is point-in-time static analysis of the text your model is about to read. It is not a sandbox, it does not watch runtime behaviour, and a grade is a receipt for the moment it was taken — not a guarantee about the tool's next deploy. Wrap and lock modes are how you keep that honest after the scan.",
  },
];

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <Nav />
      <CommandPalette />
      <ScrollReveal />

      {/* hero */}
      <section className="spotlight pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-5 text-center">Free tool-safety check for AI agents · no account</div>
          <h1 className="h-display text-center text-3xl sm:text-[40px] font-semibold leading-[1.15]">
            Your agent is about to use a tool
            <br />
            <span className="text-amber">nobody has checked.</span>
          </h1>
          <p className="mt-4 text-center text-[15px] text-dim max-w-xl mx-auto">
            MCP servers and APIs put their text straight into your AI&apos;s
            context — and the text is an instruction. Some of them use it to
            leak your data. Paste a link: get a letter grade, the exact reason
            for it, and a receipt you can verify without trusting us.
          </p>

          <div className="mt-8">
            <ScanBox />
          </div>

          <p className="mt-4 text-center text-[13px] text-faint">
            No sign-up, no API key. Want your agent to do this check for you
            automatically?{" "}
            <a href="#integrate" className="underline-offset-4 hover:underline">
              three ways to add it
            </a>
          </p>

          <div className="mt-10 elevated overflow-hidden" data-reveal>
            <div className="flex items-center gap-1.5 px-4 h-9 border-b border-hair">
              <span className="h-2.5 w-2.5 rounded-full bg-hair3" />
              <span className="h-2.5 w-2.5 rounded-full bg-hair3" />
              <span className="h-2.5 w-2.5 rounded-full bg-hair3" />
              <span className="lbl ml-2">output</span>
            </div>
            <pre className="px-5 py-4 text-[12.5px] leading-6 overflow-x-auto text-dim mono">{EXAMPLE_OUTPUT}</pre>
          </div>
        </div>
      </section>

      {/* what it does — and, plainly, how it stops an attack */}
      <section id="what-it-does" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">What it does</div>
          <h2 className="text-xl font-semibold">Three modes: check it, stop it, freeze it.</h2>
          <p className="mt-3 text-[14px] leading-7 text-dim max-w-2xl">
            A grade is the check. The thing that actually <em>stops</em> an
            attack is wrap mode — the agent never learns the malicious tool
            exists. Lock mode is what keeps a tool honest after you have
            approved it.
          </p>

          <div className="mt-7 space-y-4">
            {MODES.map((m) => (
              <div key={m.tag} className="card p-5">
                <div className="flex items-baseline gap-3">
                  <span className="lbl">{m.tag}</span>
                  <span className="font-medium text-ink">{m.title}</span>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-dim">{m.body}</p>
                <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-black/20 p-3.5 text-[11.5px] leading-6 text-dim">
                  {m.code}
                </pre>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[13.5px] text-dim">
            Everything above is free, keyless and account-free — and the
            verdict your agent gets is the same signed verdict a paying team
            gets.{" "}
            <a href="/docs" className="text-amber underline-offset-4 hover:underline">
              Read the API docs
            </a>{" "}
            or{" "}
            <a href="/lock" className="text-amber underline-offset-4 hover:underline">
              see how the lock gate works
            </a>
            .
          </p>
        </div>
      </section>

      {/* why this exists — one concrete demonstration */}
      <section id="why" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">Why this exists</div>
          <h2 className="text-xl font-semibold">A tool description is an instruction.</h2>
          <p className="mt-3 text-[14px] leading-7 text-dim max-w-2xl">
            When an AI connects to a tool, the tool&apos;s description goes
            straight into the model&apos;s context — and the model obeys it.
            Attackers hide their instructions in invisible characters, so the
            text passes code review and looks harmless to you, while the model
            reads every word. Toggle the two views:
          </p>
          <div className="mt-7">
            <HijackDemo />
          </div>
          <p className="mt-5 text-[13px] leading-7 text-dim max-w-2xl">
            That is the whole idea. You cannot read what is invisible, and you
            should not have to — so the scanning is done by a program, on the
            same text the model will read.
          </p>
        </div>
      </section>

      {/* integrate — three paste-and-go paths, cheapest first */}
      <section id="integrate" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">Integrate it</div>
          <h2 className="text-xl font-semibold">Working in about two minutes.</h2>
          <p className="mt-3 text-[14px] leading-7 text-dim max-w-2xl">
            Pick the smallest one that fits. Nothing requires an account, an
            API key, or a sign-up of any kind.
          </p>

          <div className="mt-8 space-y-10">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="mono text-[12px] text-amber">1</span>
                <span className="font-medium text-ink">
                  Your agent checks every tool itself
                </span>
                <span className="text-[12px] text-faint">~1 minute · no install</span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                Paste this into <code className="text-ink">CLAUDE.md</code>{" "}
                (Claude Code), <code className="text-ink">AGENTS.md</code>{" "}
                (Codex, Cursor), <code className="text-ink">.cursor/rules</code>
                , or any custom instructions. Your agent then verifies an
                unfamiliar MCP server or API before it connects, and asks you
                first when the grade is below B.
              </p>
              <div className="mt-4">
                <CopyBlock label="the agent rule" code={AGENT_RULE} />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="mono text-[12px] text-amber">2</span>
                <span className="font-medium text-ink">
                  Install the MCP server (check and stop modes)
                </span>
                <span className="text-[12px] text-faint">~2 minutes · one block</span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                Add this to Claude Desktop, Claude Code, Cursor or any MCP
                client and the agent gets a{" "}
                <code className="text-ink">check_tool</code> it can call before
                it connects. For enforcement as well as advice, see{" "}
                <a
                  href="/for-agents"
                  className="text-amber underline-offset-4 hover:underline"
                >
                  the wrap configuration
                </a>
                .
              </p>
              <div className="mt-4">
                <CopyBlock label="MCP configuration" code={MCP_CONFIG} />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="mono text-[12px] text-amber">3</span>
                <span className="font-medium text-ink">
                  Gate it in CI
                </span>
                <span className="text-[12px] text-faint">~2 minutes · one step</span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-dim">
                A failing grade fails the job. Drop this step into any workflow
                — or use{" "}
                <a
                  href="/docs#monitoring"
                  className="text-amber underline-offset-4 hover:underline"
                >
                  the lockfile gate
                </a>{" "}
                to fail on capability drift instead of on the grade alone.
              </p>
              <div className="mt-4">
                <CopyBlock label="GitHub Actions" code={CI_STEP} />
              </div>
            </div>
          </div>

          <p className="mt-8 text-[13px] leading-7 text-dim">
            Building an agent, or want the whole contract in one page?{" "}
            <a href="/docs" className="text-amber underline-offset-4 hover:underline">
              API docs
            </a>{" "}
            ·{" "}
            <a href="/for-agents" className="text-amber underline-offset-4 hover:underline">
              for agents
            </a>{" "}
            ·{" "}
            <a href="/agents.md" className="text-amber underline-offset-4 hover:underline">
              /agents.md
            </a>{" "}
            (the file machines that fetch this domain read).
          </p>
        </div>
      </section>

      {/* what we check */}
      <section id="checks" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">What we check</div>
          <h2 className="text-xl font-semibold">
            {RULES.length} named checks. No black box.
          </h2>
          <p className="mt-3 text-[13.5px] leading-7 text-dim max-w-2xl">
            Every finding cites a rule id, the exact text it matched, and what
            to change. A finding is a reason to look — never an accusation, and
            never the reason a scan is hidden from you.
          </p>
          <div className="mt-6 card divide-y divide-hair overflow-hidden">
            {RULES.map((r) => (
              <div key={r.id} className="flex gap-4 px-5 py-3 text-[13px] leading-6">
                <span className="mono text-[11px] text-faint w-14 shrink-0 pt-0.5">{r.id}</span>
                <span>
                  <span className="text-ink font-medium">{r.name}</span>{" "}
                  <span className="text-dim">— {r.why}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-faint">
            Each issue lowers the score: critical −45, high −25, medium −12,
            low −5. Full methodology in the{" "}
            <a href="/docs" className="underline-offset-4 hover:underline">API docs</a>.
          </p>
        </div>
      </section>

      {/* grades */}
      <section id="grades" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">Grades in the wild</div>
          <p className="text-[13.5px] text-dim mb-5">
            Well-known tools, scanned live as this page loads. Today&apos;s
            scan, not an endorsement — and not a ranking we were paid for.
          </p>
          <SeedsGrid />
          <div className="mt-10">
            <div className="lbl mb-3">Your receipts</div>
            <Ledger mineOnly />
            <p className="mt-2.5 text-[12.5px] text-faint">
              Every verdict you pull is kept in this browser only — your
              private receipt book, not an account.
            </p>
          </div>
        </div>
      </section>

      {/* honest limits — the part that makes the rest believable */}
      <section id="limits" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">What it does not do</div>
          <h2 className="text-xl font-semibold">
            Stated plainly, because it decides whether you can use this.
          </h2>
          <div className="mt-6 card divide-y divide-hair overflow-hidden text-[13.5px] leading-6">
            {[
              {
                t: "It is not a sandbox.",
                d: "Nothing is executed and no traffic is intercepted. Toolproof reads the text your model is about to read.",
              },
              {
                t: "It does not watch the future.",
                d: "A scan is point-in-time. A grade is a receipt for the moment it was taken, not a promise about the next deploy — that is what wrap mode and the lockfile gate are for.",
              },
              {
                t: "A grade is not a certification.",
                d: "It is evidence you can check: findings, the matched text, and a signature you verify offline. You stay responsible for your own decisions.",
              },
              {
                t: "It cannot be bought.",
                d: "Toolproof takes no payment, equity or sponsorship from anything it scans, and the rules and formats are open. Nothing here can be upgraded into a passing grade.",
              },
            ].map((l) => (
              <div key={l.t} className="px-5 py-4">
                <div className="font-medium text-ink">{l.t}</div>
                <p className="mt-1 text-dim">{l.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-faint">
            Tool owners can refuse scanning entirely — see{" "}
            <a href="/docs#toolproof-txt" className="underline-offset-4 hover:underline">
              the toolproof.txt standard
            </a>
            .
          </p>
        </div>
      </section>

      <section id="faq" className="py-16 border-t border-hair scroll-mt-14">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">MCP security FAQ</div>
          <h2 className="text-xl font-semibold">Know what your agent is about to trust.</h2>
          <div className="mt-6 card divide-y divide-hair overflow-hidden">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="cursor-pointer list-none pr-8 text-[14px] font-medium text-ink marker:hidden relative">
                  {faq.question}
                  <span className="absolute right-0 text-amber transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-[13px] leading-6 text-dim">{faq.answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-faint">
            Need the technical details? Read the{" "}
            <a href="/docs" className="underline-offset-4 hover:underline">API docs</a>{" "}
            or set up the{" "}
            <a href="/for-agents" className="underline-offset-4 hover:underline">agent rule</a>.
          </p>
        </div>
      </section>

      {/* what else you can do */}
      <section className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">More you can do</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                t: "Let your AI do the checking",
                d: "One rule makes your agent check unfamiliar tools before connecting — or a wrap line makes it never see the bad ones.",
                href: "/for-agents",
                cta: "Setup",
              },
              {
                t: "Leaderboard — pressure in the open",
                d: "The safest and most flagged tools, ranked from reproducible scans. Plus your watchlist.",
                href: "/leaderboard",
                cta: "See the rankings",
              },
              {
                t: "Watch tools · plant canaries",
                d: "Pin a tool and get flagged when its model-visible text changes. Mint canary credentials to trap leaks.",
                href: "/docs#monitoring",
                cta: "Monitoring & canaries",
              },
              {
                t: "Build on it",
                d: "Keyless API: signed verdicts and full findings, one GET each. Badges and embeddable trust cards for tools you own.",
                href: "/docs",
                cta: "API docs",
              },
            ].map((c) => (
              <a key={c.t} href={c.href} className="card card-hover p-5 group block">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-ink">{c.t}</div>
                  <span className="text-faint group-hover:text-amber group-hover:translate-x-0.5 transition-all">→</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-6 text-dim">{c.d}</p>
                <div className="mt-3 text-[12px] text-amber">{c.cta}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-hair py-10">
        <div className="mx-auto max-w-4xl px-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2 text-amber">
            <Proofmark className="h-4 w-4" />
            <span className="font-semibold text-[13px] tracking-tight">Toolproof</span>
          </div>
          <div className="text-[12.5px] text-faint sm:max-w-sm">
            Built and maintained by the Toolproof maintainers — an independent
            security-research project, paid by nobody it scans. A grade is a
            receipt, not a guarantee. Who operates the Service is set out in
            the{" "}
            <a href="/terms" className="underline-offset-4 hover:underline">Terms</a>.
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-dim">
            <a href="/mcp-security-scanner" className="hover:text-ink transition-colors">MCP scanner</a>
            <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
            <a href="/lock" className="hover:text-ink transition-colors">Lock gate</a>
            <a href="/enterprise" className="hover:text-ink transition-colors">Enterprise</a>
            <a href="/ownership" className="hover:text-ink transition-colors">Ownership</a>
            <a href="/terms" className="hover:text-ink transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-ink transition-colors">Privacy</a>
            <a href="/security" className="hover:text-ink transition-colors">Security</a>
            <a href="/api/v1/pubkey" className="hover:text-ink transition-colors">pubkey</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

