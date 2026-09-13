import ScanBox from "@/components/ScanBox";
import HijackDemo from "@/components/HijackDemo";
import SeedsGrid from "@/components/SeedsGrid";
import Ledger from "@/components/Ledger";
import { RULES } from "@/lib/rules";

function Seal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.06] bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-5 h-14 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2 text-amber">
          <Seal className="h-4 w-4" />
          <span className="font-semibold tracking-tight">Toolproof</span>
        </a>
        <div className="ml-auto flex items-center gap-6 text-[13.5px] text-dim">
          <a href="#checks" className="hover:text-ink transition-colors">Checks</a>
          <a href="#grades" className="hover:text-ink transition-colors">Grades</a>
          <a href="/for-agents" className="hover:text-ink transition-colors">For agents</a>
          <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
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

export default function Home() {
  return (
    <main>
      <Nav />

      {/* what it does */}
      <section className="spotlight pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-5 text-center">The safety check for AI tools · free · no account</div>
          <h1 className="h-display text-center text-3xl sm:text-[40px] font-semibold leading-[1.15]">
            Check an AI tool
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
            or from a terminal:{" "}
            <code className="mono text-[12px] text-dim">npx toolproof-scan &lt;url&gt;</code>
          </p>

          <div className="mt-10 elevated overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/[0.06]">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="lbl ml-2">output</span>
            </div>
            <pre className="px-5 py-4 text-[12.5px] leading-6 overflow-x-auto text-dim mono">{EXAMPLE_OUTPUT}</pre>
          </div>
        </div>
      </section>

      {/* how to do it */}
      <section id="how" className="py-16 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-5">
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
      <section className="py-16 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-5">
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
      <section id="checks" className="py-16 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-5">What we check</div>
          <div className="card divide-y divide-white/[0.05] overflow-hidden">
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
      <section id="grades" className="py-16 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-5">
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

      {/* what else you can do */}
      <section className="py-16 border-t border-white/[0.05]">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-5">More you can do</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                t: "Let your AI do the checking",
                d: "One rule in your agent's config, or the toolproof-mcp server for any MCP client.",
                href: "/for-agents",
                cta: "Setup",
              },
              {
                t: "Show a tool's grade",
                d: "Every trust card has a share link, a badge, and an embeddable widget.",
                href: "/t?target=https%3A%2F%2Fmcp.context7.com%2Fmcp",
                cta: "See a card",
              },
              {
                t: "Run a tool? Opt out",
                d: "Serve /.well-known/toolproof.txt with Deny: / — respected, never penalized.",
                href: "/docs#toolproof-txt",
                cta: "The standard",
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

      <footer className="border-t border-white/[0.05] py-10">
        <div className="mx-auto max-w-4xl px-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-amber">
            <Seal className="h-3.5 w-3.5" />
            <span className="font-semibold text-[13px] tracking-tight">Toolproof</span>
          </div>
          <div className="text-[12.5px] text-faint">
            Built by Ayush Dhyani — security researcher (Bugcrowd). A grade is
            a receipt, not a guarantee.
          </div>
          <div className="sm:ml-auto flex gap-5 text-[12.5px] text-dim">
            <a href="/docs" className="hover:text-ink transition-colors">Docs</a>
            <a href="/.well-known/security.txt" className="hover:text-ink transition-colors">security.txt</a>
            <a href="/api/v1/pubkey" className="hover:text-ink transition-colors">pubkey</a>
            <a
              href="https://www.linkedin.com/in/ayush-dhyanii/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
