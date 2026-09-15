import Proofmark from "@/components/Proofmark";
import ScanBox from "@/components/ScanBox";
import HijackDemo from "@/components/HijackDemo";
import SeedsGrid from "@/components/SeedsGrid";
import Ledger from "@/components/Ledger";
import CommandPalette, { PaletteTrigger } from "@/components/CommandPalette";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollReveal from "@/components/ScrollReveal";
import { RULES } from "@/lib/rules";

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-hair bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-5 h-14 flex items-center gap-5">
        <a href="/" className="flex items-center gap-2 text-amber">
          <Proofmark className="h-5 w-5" />
          <span className="font-semibold tracking-tight">Toolproof</span>
        </a>
        <div className="ml-auto flex items-center gap-5 text-[13.5px] text-dim">
          <a href="#checks" className="hover:text-ink transition-colors">Checks</a>
          <a href="/mcp-security-scanner" className="hover:text-ink transition-colors">MCP scanner</a>
          <a href="#grades" className="hover:text-ink transition-colors">Grades</a>
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
        text: "Paste the MCP server URL into Toolproof (toolproof-scan.vercel.app). In a few seconds you get a letter grade with evidence: 16 checks covering hidden instructions in tool descriptions, invisible characters, exposed secrets, unsafe defaults and missing auth. Free, no account, and nothing you paste is stored.",
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
        text: "Yes. Add one rule to your agent's config that calls the signed verify endpoint before connecting to any MCP server or unfamiliar API. It can report the grade to the user before it connects.",
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
      "Paste its URL into Toolproof. The scanner returns a letter grade and the evidence behind it, including hidden instructions in tool descriptions, invisible characters, exposed secrets, unsafe defaults and missing authentication signals.",
  },
  {
    question: "What is an MCP prompt injection attack?",
    answer:
      "A malicious tool can put instructions in the text an AI model reads. Those instructions can tell the model to ignore safeguards, expose data or contact another service. Some attacks use invisible Unicode characters, so the text can look harmless to a person.",
  },
  {
    question: "Can my AI agent check tools automatically?",
    answer:
      "Yes. Add the Toolproof rule to the agent's instructions or install the Toolproof MCP server. The agent can verify an unfamiliar MCP server or API before it connects and report the grade to the user.",
  },
  {
    question: "Are Toolproof verdicts verifiable?",
    answer:
      "Every verdict includes an ed25519-signed passport over canonical JSON. You can verify the signature offline with standard cryptography libraries, without trusting Toolproof code at verification time.",
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

      {/* what it does */}
      <section className="spotlight pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-5 text-center">The safety check for AI tools · free · no account</div>
          <h1 className="h-display text-center text-3xl sm:text-[40px] font-semibold leading-[1.15]">
            Check an AI tool or MCP server
            <br />
            before you connect to it.
          </h1>
          <p className="mt-4 text-center text-[15px] text-dim max-w-xl mx-auto">
            Paste an MCP server or API URL. In a few seconds you get a letter
            grade, what was found, and the evidence.
          </p>

          <div className="mt-8">
            <ScanBox />
          </div>

          <p className="mt-4 text-center text-[13px] text-faint">
            automate it with the{" "}
            <a href="/for-agents" className="underline-offset-4 hover:underline">one-line agent rule</a>
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

      {/* how to do it */}
      <section id="how" className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">How it works</div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { n: "1", t: "Paste a link", d: "Any MCP server or API you're about to connect to." },
              { n: "2", t: "We run the checks", d: `${RULES.length} checks — hidden instructions, exposed secrets, unsafe defaults, missing auth.` },
              { n: "3", t: "You get a grade", d: "A+ means clean. Anything less shows exactly why, with evidence." },
            ].map((s) => (
              <div key={s.n} className="card card-hover p-5">
                <div className="mono text-[13px] text-amber">{s.n}</div>
                <div className="mt-2 font-medium text-ink">{s.t}</div>
                <p className="mt-1.5 text-[13px] leading-6 text-dim">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13.5px] text-dim">
            Prefer zero effort? Put one line in your agent&apos;s instructions and
            it checks every tool itself —{" "}
            <a href="/for-agents" className="text-amber underline-offset-4 hover:underline">
              the agent rule
            </a>
            .
          </p>
        </div>
      </section>

      {/* why it exists */}
      <section id="why" className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">Why this exists</div>
          <h2 className="text-xl font-semibold">Tools can lie to your AI.</h2>
          <p className="mt-3 text-[14px] text-dim max-w-2xl">
            When an AI connects to a tool, the tool&apos;s description goes
            straight into the model&apos;s context — and the model obeys it.
            Attackers hide instructions there in invisible characters: you see
            nothing, the model reads every word. Toggle the views:
          </p>
          <div className="mt-7">
            <HijackDemo />
          </div>
        </div>
      </section>

      {/* what we check */}
      <section id="checks" className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">What we check</div>
          <div className="card divide-y divide-hair overflow-hidden">
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
      <section id="grades" className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">Grades in the wild</div>
          <p className="text-[13.5px] text-dim mb-5">
            Well-known tools, scanned live as this page loads. Today&apos;s
            scan, not an endorsement.
          </p>
          <SeedsGrid />
          <div className="mt-10">
            <div className="lbl mb-3">Your receipts</div>
            <Ledger mineOnly />
            <p className="mt-2.5 text-[12.5px] text-faint">
              Every verdict you pull is kept in this browser — your private
              receipt book.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 border-t border-hair">
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
            Need the technical details? Read the <a href="/docs" className="underline-offset-4 hover:underline">API docs</a> or set up the <a href="/for-agents" className="underline-offset-4 hover:underline">agent rule</a>.
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
                d: "One rule in your agent's config makes it check unfamiliar tools before connecting.",
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
                d: "Keyless API: signed verdicts and full findings, one GET each.",
                href: "/docs",
                cta: "API docs",
              },
            ].map((c) => (
              <a
                key={c.t}
                href={c.href}
                className="card card-hover p-5 group block"
              >
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

      {/* toolproof lock */}
      <section className="py-16 border-t border-hair">
        <div className="mx-auto max-w-3xl px-5" data-reveal>
          <div className="lbl mb-5">New — Toolproof Lock</div>
          <h2 className="text-xl font-semibold">A lockfile for the capabilities your agent can reach.</h2>
          <p className="mt-3 text-[14px] text-dim max-w-2xl">
            A scan tells you what a tool looks like right now; it does not tell
            you what changed since you approved it.{" "}
            <a href="/lock" className="text-amber underline-offset-4 hover:underline">Toolproof Lock</a>{" "}
            writes a signed{" "}
            <code className="mono text-[13px] text-ink">toolproof.lock</code>{" "}
            baseline of an MCP server or API&apos;s capability surface — every
            tool, schema, description, prompt, resource, instruction and outbound
            host you reviewed — and you commit it next to your agent config. In
            CI, <code className="mono text-[13px] text-ink">toolproof check</code>{" "}
            diffs the live surface against that baseline and fails the build when
            something drifts past your policy.
          </p>
          <p className="mt-4 text-[13px] text-faint">
            Open and free —{" "}
            <a href="/lock" className="underline-offset-4 hover:underline">how it works</a>{" "}
            ·{" "}
            <a href="/docs#lock" className="underline-offset-4 hover:underline">lockfile &amp; CLI reference</a>
          </p>
        </div>
      </section>

      <footer className="border-t border-hair py-10">
        <div className="mx-auto max-w-4xl px-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-amber">
            <Proofmark className="h-4 w-4" />
            <span className="font-semibold text-[13px] tracking-tight">Toolproof</span>
          </div>
          <div className="text-[12.5px] text-faint">
            Built by Ayush Dhyani — security researcher (Bugcrowd). A grade is
            a receipt, not a guarantee.
          </div>
          <div className="sm:ml-auto flex gap-5 text-[12.5px] text-dim">
            <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
            <a href="/enterprise" className="hover:text-ink transition-colors">Enterprise</a>
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
