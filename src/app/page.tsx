import ScanBox from "@/components/ScanBox";
import CopyNpx from "@/components/CopyNpx";
import HeroStat from "@/components/HeroStat";
import HijackDemo from "@/components/HijackDemo";
import Ledger from "@/components/Ledger";
import SeedsGrid from "@/components/SeedsGrid";
import { RULES } from "@/lib/rules";
import { SEV_COLOR } from "@/lib/score";

// CSP nonce is per-request — this page must render dynamically so Next can
// stamp the nonce onto its bootstrap scripts (see middleware.ts). Static
// HTML would carry a stale nonce and every script would be blocked.
export const dynamic = "force-dynamic";

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
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2.5 text-amber">
          <Seal className="h-5 w-5" />
          <span className="text-[13px] font-bold tracking-[0.3em]">TOOLPROOF</span>
        </a>
        <div className="ml-auto hidden sm:flex items-center gap-6 text-[11px] tracking-[0.18em] uppercase text-dim">
          <a href="#how" className="hover:text-ink">How</a>
          <a href="#why" className="hover:text-ink">Why</a>
          <a href="#checks" className="hover:text-ink">Checks</a>
          <a href="#grades" className="hover:text-ink">Grades</a>
          <a href="/for-agents" className="hover:text-ink">For AI</a>
          <a href="/docs" className="hover:text-ink">Docs</a>
        </div>
        <span className="rounded border border-line px-2 py-0.5 text-[10px] text-faint">free</span>
      </div>
    </nav>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Paste a link",
    body: "Any AI tool, server or API you're about to connect to. Copy the link from wherever you found it.",
  },
  {
    n: "2",
    title: "We run the checks",
    body: `${RULES.length} safety checks — for hidden instructions, exposed secrets, unsafe defaults and more. About five seconds.`,
  },
  {
    n: "3",
    title: "You get a grade",
    body: "A+ means clean. Anything less tells you exactly what's wrong — with the evidence attached.",
  },
];

export default function Home() {
  return (
    <main className="relative">
      <Nav />

      {/* hero */}
      <section className="glow pt-36 pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-6">The safety check for AI tools · no signup</div>
          <h1 className="h-display text-[clamp(2.8rem,7.5vw,5.6rem)] font-extrabold leading-[0.98] tracking-tight">
            Is this AI tool
            <br />
            safe to use?
            <br />
            <span className="text-amber">Paste a link. Know in seconds.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-[15px] leading-7 text-dim">
            AI assistants connect to tools — servers, APIs, plugins. Those
            tools can hide tricks your AI will obey and you&apos;ll never see.
            Toolproof checks any of them first and gives you a grade.
          </p>
          <div className="mt-10 max-w-3xl">
            <ScanBox />
          </div>
          <div className="mt-6 max-w-3xl">
            <CopyNpx />
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-[11px] tracking-[0.18em] uppercase text-faint">
            <span>{RULES.length} safety checks</span>
            <span>·</span>
            <span>verdict in ~5s</span>
            <span>·</span>
            <span>free</span>
            <span>·</span>
            <span>every result signed</span>
          </div>
          <HeroStat />
        </div>
      </section>

      {/* for the lazy (almost everyone) */}
      <section id="for-ai" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="card relative overflow-hidden p-10">
            <div className="tape absolute top-0 inset-x-0 h-1.5" />
            <div className="lbl mb-4">for the lazy — which is everyone</div>
            <h2 className="h-display text-3xl font-bold tracking-tight max-w-2xl leading-tight">
              Nobody scans things by hand.
              <br />
              <span className="text-amber">So don&apos;t — make your AI do it.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[13.5px] leading-7 text-dim">
              Your AI is the one connecting to tools, so your AI is the one
              who should check them first. Set it up once — paste a single
              rule into your agent&apos;s instructions, or install the
              Toolproof MCP server — and every tool gets verified
              automatically, forever. You never need to visit this site again.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/for-agents"
                className="rounded-lg bg-amber px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase text-bg hover:opacity-90 transition-opacity"
              >
                Give your AI the rule →
              </a>
              <a
                href="/for-agents#option-b"
                className="rounded-lg border border-line px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase text-dim hover:text-ink hover:border-dim transition-colors"
              >
                Install as an MCP tool
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">01 · How it works</div>
          <h2 className="h-display text-4xl font-bold tracking-tight">
            Three steps. No account.
          </h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card card-hover p-6">
                <div className="h-display text-3xl font-extrabold text-amber">{s.n}</div>
                <div className="mt-3 text-[14px] font-bold">{s.title}</div>
                <p className="mt-2 text-[12.5px] leading-6 text-dim">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why this matters */}
      <section id="why" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="lbl mb-4">02 · Why this matters</div>
            <h2 className="h-display text-4xl font-bold tracking-tight leading-tight">
              AI tools can lie
              <br />
              to your AI.
            </h2>
            <p className="mt-6 text-[13.5px] leading-7 text-dim">
              When your AI connects to a tool, everything that tool says goes
              straight into the AI&apos;s head — and the AI obeys it.
              Attackers hide secret instructions there, written so humans
              can&apos;t see them but the AI reads them perfectly.
            </p>
            <p className="mt-4 text-[13.5px] leading-7 text-dim">
              Toggle the view on this real pattern → the left side is what
              passed code review. The right side is what the AI actually
              receives.
            </p>
          </div>
          <HijackDemo />
        </div>
      </section>

      {/* checks */}
      <section id="checks" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">03 · What we check</div>
          <h2 className="h-display text-4xl font-bold tracking-tight">
            The full checklist. No asterisks.
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RULES.map((r) => (
              <div key={r.id} className="card card-hover p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: SEV_COLOR[r.sev] }}
                  />
                  <span className="text-[13px] font-bold">{r.name}</span>
                </div>
                <p className="mt-3 text-[12.5px] leading-6 text-dim">{r.why}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-[11px] text-faint">
            Each issue lowers the score: critical −45 · high −25 · medium −12 ·
            low −5. An A+ grade means nothing was found.
          </div>
        </div>
      </section>

      {/* proof + independence */}
      <section id="proof" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="lbl mb-4">04 · Proof, not promises</div>
            <h2 className="h-display text-4xl font-bold tracking-tight leading-tight">
              Every grade comes
              <br />
              with a receipt.
            </h2>
            <p className="mt-6 text-[13.5px] leading-7 text-dim">
              Every verdict is cryptographically signed. You can check it
              yourself — offline, forever — even if this site disappears
              tomorrow. Nobody can fake it, including us.
            </p>
            <p className="mt-4 text-[13.5px] leading-7 text-dim">
              And we&apos;re paid by nobody we scan: no agents, no models, no
              tools of our own. If we ever softened a grade, the whole site
              would be worthless. Accuracy is our only product.
            </p>
            <a
              href="/docs"
              className="mt-6 inline-block rounded-lg border border-amber px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase text-amber hover:bg-amber hover:text-bg transition-colors"
            >
              Verify it yourself — the API docs →
            </a>
          </div>
          <div className="card overflow-hidden">
            <div className="tape h-1.5" />
            <div className="px-5 pt-4 text-[10px] tracking-[0.2em] uppercase text-faint">
              the receipt, for humans who check
            </div>
            <pre className="px-5 pb-5 pt-2 text-[11.5px] leading-6 overflow-x-auto text-dim">{`{
  "passport": {
    "target": "https://mcp.example.com/mcp",
    "state": "verified",
    "score": 88,
    "grade": "A",
    "ruleIds": ["TP-103", "TP-202"],
    "scannedAt": "2026-09-12T21:04:11.482Z"
  },
  "signature": "dGVzdC4uLmV4YW1wbGUuYmFzZTY0",
  "alg": "ed25519"
}`}</pre>
          </div>
        </div>
      </section>

      {/* real grades + your receipts */}
      <section id="grades" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">05 · Grades in the wild</div>
          <h2 className="h-display text-4xl font-bold tracking-tight mb-10">
            Real tools. Real grades. Right now.
          </h2>
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div>
              <SeedsGrid />
              <p className="mt-3 text-[11px] leading-5 text-faint">
                Well-known tools, scanned live as you load this page. A grade
                here is not an endorsement — it&apos;s today&apos;s scan.
              </p>
            </div>
            <div>
              <Ledger mineOnly />
              <p className="mt-3 text-[11px] leading-5 text-faint">
                Every verdict you pull is kept in this browser — your private
                receipt book.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* canary teaser */}
      <section className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="card relative overflow-hidden p-10">
            <div className="tape absolute top-0 inset-x-0 h-1.5" />
            <div className="lbl mb-4">06 · Coming in v1 — canaries</div>
            <h2 className="h-display text-3xl font-bold tracking-tight max-w-2xl leading-tight">
              Running your own AI tools?
              <br />
              <span className="text-amber">We&apos;ll watch them for you.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[13.5px] leading-7 text-dim">
              Continuous monitoring plants honeypot secrets inside the tools
              you operate. If anything touches them — you get alerted, with
              the exact path of the theft. Scanning stays free; this is the
              paid tier.
            </p>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line py-12">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex items-center gap-2.5 text-amber">
            <Seal className="h-4 w-4" />
            <span className="text-[12px] font-bold tracking-[0.3em]">TOOLPROOF</span>
          </div>
          <div className="text-[11px] leading-6 text-faint">
            Built by Ayush Dhyani — security researcher (Bugcrowd) · builder of
            API Findr &amp; OpenBridge.
            <br />v0.1 — a passing grade is not a guarantee, it is a receipt.
          </div>
          <div className="sm:ml-auto flex gap-5 text-[11px] tracking-[0.14em] uppercase text-dim">
            <a href="/docs" className="hover:text-ink">Docs</a>
            <a href="/.well-known/security.txt" className="hover:text-ink">security.txt</a>
            <a href="/api/v1/pubkey" className="hover:text-ink">Pubkey</a>
            <a
              href="https://www.linkedin.com/in/ayush-dhyanii/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
