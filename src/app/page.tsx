import ScanBox from "@/components/ScanBox";
import CopyNpx from "@/components/CopyNpx";
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
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-4xl px-5 h-12 flex items-center gap-5">
        <a href="/" className="flex items-center gap-2 text-amber">
          <Seal className="h-4 w-4" />
          <span className="text-[12px] font-bold tracking-[0.18em]">toolproof</span>
        </a>
        <div className="ml-auto flex items-center gap-5 text-[12px] text-dim">
          <a href="#checks" className="hover:text-ink">checks</a>
          <a href="#grades" className="hover:text-ink">grades</a>
          <a href="/for-agents" className="hover:text-ink">for agents</a>
          <a href="/docs" className="hover:text-ink">docs</a>
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
      <section className="pt-24 pb-14">
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="text-[22px] sm:text-2xl font-bold leading-snug">
            Check an AI tool before you connect to it.
          </h1>
          <p className="mt-3 text-dim">
            Paste an MCP server or API URL. In a few seconds you get a letter
            grade, what was found, and the evidence. Free, no account.
          </p>

          <div className="mt-6">
            <ScanBox />
          </div>

          <div className="mt-4">
            <CopyNpx />
          </div>

          <div className="mt-8">
            <div className="lbl mb-2">example output</div>
            <pre className="card px-4 py-3 text-[12px] leading-6 overflow-x-auto text-dim">{EXAMPLE_OUTPUT}</pre>
          </div>
        </div>
      </section>

      {/* how to do it */}
      <section id="how" className="py-14 border-t border-line">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-4">how it works</div>
          <ol className="space-y-2.5">
            <li className="flex gap-3">
              <span className="text-faint shrink-0">1.</span>
              <span>Paste a link to any MCP server or API.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-faint shrink-0">2.</span>
              <span>
                We run {RULES.length} checks — hidden instructions, exposed
                secrets, unsafe defaults, missing auth, plaintext transport.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-faint shrink-0">3.</span>
              <span>
                You get a grade. A+ means clean; anything less shows exactly
                why, with the evidence attached.
              </span>
            </li>
          </ol>
          <p className="mt-5 text-dim">
            Prefer zero effort? Put one line in your agent&apos;s instructions
            and it checks every tool itself —{" "}
            <a href="/for-agents" className="text-amber underline-offset-4 hover:underline">
              the agent rule
            </a>
            .
          </p>
        </div>
      </section>

      {/* why it exists */}
      <section className="py-14 border-t border-line">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-4">why this exists</div>
          <h2 className="text-xl font-bold">Tools can lie to your AI.</h2>
          <p className="mt-3 text-dim">
            When an AI connects to a tool, the tool&apos;s description goes
            straight into the model&apos;s context — and the model obeys it.
            Attackers hide instructions there in invisible characters: the
            human sees nothing, the model reads every word. Toggle the views:
          </p>
          <div className="mt-6">
            <HijackDemo />
          </div>
        </div>
      </section>

      {/* what we check */}
      <section id="checks" className="py-14 border-t border-line">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-4">what we check</div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {RULES.map((r) => (
              <div key={r.id} className="flex gap-3 text-[12.5px] leading-6">
                <span className="text-faint w-14 shrink-0">{r.id}</span>
                <span>
                  <span className="text-ink">{r.name}</span>{" "}
                  <span className="text-dim">— {r.why}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12px] text-faint">
            Each issue lowers the score: critical −45, high −25, medium −12,
            low −5. The full methodology is in the{" "}
            <a href="/docs" className="underline-offset-4 hover:underline">API docs</a>.
          </p>
        </div>
      </section>

      {/* grades */}
      <section id="grades" className="py-14 border-t border-line">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-4">grades in the wild</div>
          <p className="text-dim mb-5">
            Well-known tools, scanned live as this page loads. Today&apos;s
            scan, not an endorsement.
          </p>
          <SeedsGrid />
          <div className="mt-8">
            <div className="lbl mb-3">your receipts</div>
            <Ledger mineOnly />
            <p className="mt-2 text-[12px] text-faint">
              Every verdict you pull is kept in this browser — your private
              receipt book.
            </p>
          </div>
        </div>
      </section>

      {/* what else you can do */}
      <section className="py-14 border-t border-line">
        <div className="mx-auto max-w-3xl px-5">
          <div className="lbl mb-4">more you can do</div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <div className="text-ink font-bold">Let your AI do the checking</div>
              <p className="text-dim">
                One rule in your agent&apos;s config, or the{" "}
                <code>toolproof-mcp</code> server.{" "}
                <a href="/for-agents" className="text-amber underline-offset-4 hover:underline">Setup →</a>
              </p>
            </div>
            <div>
              <div className="text-ink font-bold">Show a tool&apos;s grade</div>
              <p className="text-dim">
                Every trust card has a share link, a badge and an embeddable
                widget (the card page shows the snippets).
              </p>
            </div>
            <div>
              <div className="text-ink font-bold">Run a tool? Opt out</div>
              <p className="text-dim">
                Serve <code>/.well-known/toolproof.txt</code> with{" "}
                <code>Deny: /</code> and we won&apos;t scan you —{" "}
                <a href="/docs#toolproof-txt" className="text-amber underline-offset-4 hover:underline">how it works →</a>
              </p>
            </div>
            <div>
              <div className="text-ink font-bold">Build on it</div>
              <p className="text-dim">
                Keyless API: <code>GET /api/v1/verify</code> for signed
                verdicts, <code>/api/v1/scan</code> for full findings —{" "}
                <a href="/docs" className="text-amber underline-offset-4 hover:underline">docs →</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto max-w-3xl px-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-amber">
            <Seal className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold tracking-[0.18em]">toolproof</span>
          </div>
          <div className="text-[11.5px] text-faint">
            Built by Ayush Dhyani — security researcher (Bugcrowd). A grade is
            a receipt, not a guarantee.
          </div>
          <div className="sm:ml-auto flex gap-4 text-[11.5px] text-dim">
            <a href="/docs" className="hover:text-ink">docs</a>
            <a href="/.well-known/security.txt" className="hover:text-ink">security.txt</a>
            <a href="/api/v1/pubkey" className="hover:text-ink">pubkey</a>
            <a
              href="https://www.linkedin.com/in/ayush-dhyanii/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              linkedin
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
