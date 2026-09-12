import ScanBox from "@/components/ScanBox";
import CopyNpx from "@/components/CopyNpx";
import HeroStat from "@/components/HeroStat";
import HijackDemo from "@/components/HijackDemo";
import Ledger from "@/components/Ledger";
import SeedsGrid from "@/components/SeedsGrid";
import { RULES } from "@/lib/rules";
import { SEV_COLOR } from "@/lib/score";

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
          <a href="#anatomy" className="hover:text-ink">Anatomy</a>
          <a href="#rules" className="hover:text-ink">Rules</a>
          <a href="#passport" className="hover:text-ink">Passport</a>
          <a href="#neutral" className="hover:text-ink">Neutral</a>
          <a href="/docs" className="hover:text-ink">Docs</a>
        </div>
        <span className="rounded border border-line px-2 py-0.5 text-[10px] text-faint">v0.1</span>
      </div>
    </nav>
  );
}

export default function Home() {
  return (
    <main className="relative">
      <Nav />

      {/* hero */}
      <section className="glow pt-36 pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-6">Trust infrastructure for the agent economy</div>
          <h1 className="h-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold leading-[0.98] tracking-tight">
            Machines call
            <br />
            machines now.
            <br />
            <span className="text-amber">Somebody has to check IDs.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-[14px] leading-7 text-dim">
            Agents are being pointed at MCP servers and APIs that were never
            audited for one specific threat: the tool itself lying to the
            model. Toolproof probes a target for agent-hijack vectors — hidden
            instructions in tool text, silent auth gaps, scope creep — then
            issues a signed passport anyone can verify offline.
          </p>
          <div className="mt-10 max-w-3xl">
            <ScanBox />
          </div>
          <div className="mt-8 max-w-3xl">
            <CopyNpx />
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-[11px] tracking-[0.18em] uppercase text-faint">
            <span>{RULES.length}+ detection rules</span>
            <span>·</span>
            <span>median scan ~4s</span>
            <span>·</span>
            <span>free while v0</span>
            <span>·</span>
            <span>ed25519-signed passports</span>
          </div>
          <HeroStat />
        </div>
      </section>

      {/* anatomy of a hijack */}
      <section id="anatomy" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="lbl mb-4">01 · Anatomy of a hijack</div>
            <h2 className="h-display text-4xl font-bold tracking-tight leading-tight">
              The tool description is
              <br />
              the new attack surface.
            </h2>
            <p className="mt-6 text-[13px] leading-7 text-dim">
              When an agent connects to an MCP server, every tool description
              is loaded into the model&apos;s context. Whatever is written
              there becomes instruction. Zero-width unicode makes that text
              invisible to the humans who approved the tool — while the model
              reads it perfectly.
            </p>
            <p className="mt-4 text-[13px] leading-7 text-dim">
              Nobody audits for this. Code review can&apos;t see it. The fix
              is verification, not vibes.
            </p>
          </div>
          <HijackDemo />
        </div>
      </section>

      {/* rules */}
      <section id="rules" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">02 · The rule catalog</div>
          <h2 className="h-display text-4xl font-bold tracking-tight">
            What we look for.
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RULES.map((r) => (
              <div key={r.id} className="card card-hover p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: SEV_COLOR[r.sev] }}
                  />
                  <span className="text-[11px] text-dim">{r.id}</span>
                  <span className="text-[13px] font-bold">{r.name}</span>
                </div>
                <p className="mt-3 text-[12px] leading-6 text-dim">{r.why}</p>
                <div className="mt-3 text-[10px] tracking-[0.18em] uppercase text-faint">
                  {r.group} · {r.sev}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-[11px] text-faint">
            Scoring: critical −45 · high −25 · medium −12 · low −5. Grade A+
            starts at 95.
          </div>
        </div>
      </section>

      {/* passport */}
      <section id="passport" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="lbl mb-4">03 · The passport</div>
            <h2 className="h-display text-4xl font-bold tracking-tight leading-tight">
              Signed once.
              <br />
              Verifiable forever.
            </h2>
            <p className="mt-6 text-[13px] leading-7 text-dim">
              Every verify response is a canonical-JSON passport signed with
              ed25519. Take the signature, take the public key — served at{" "}
              <a href="/api/v1/pubkey" className="text-amber underline-offset-4 hover:underline">/api/v1/pubkey</a>{" "}
              — and verify offline with ten lines of code.
            </p>
            <p className="mt-4 text-[13px] leading-7 text-dim">
              If this service is ever compromised or disappears, passports
              already issued still verify. Trust doesn&apos;t depend on us
              staying alive. That&apos;s the point.
            </p>
            <a
              href="/docs"
              className="mt-6 inline-block rounded-lg border border-amber px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase text-amber hover:bg-amber hover:text-bg transition-colors"
            >
              Read the API docs →
            </a>
          </div>
          <div className="card overflow-hidden">
            <div className="tape h-1.5" />
            <pre className="px-5 py-5 text-[11.5px] leading-6 overflow-x-auto text-dim">{`{
  "passport": {
    "v": 1,
    "kind": "mcp",
    "target": "https://mcp.example.com/mcp",
    "host": "mcp.example.com",
    "state": "verified",
    "score": 88,
    "grade": "A",
    "findingCounts": { "critical": 0, "high": 1, … },
    "ruleIds": ["TP-103", "TP-202"],
    "scannedAt": "2026-09-12T21:04:11.482Z",
    "scanner": { "name": "toolproof", "version": "0.1.0" }
  },
  "signature": "dGVzdC4uLmV4YW1wbGUuYmFzZTY0",
  "keyId": "tpk-1",
  "alg": "ed25519"
}`}</pre>
          </div>
        </div>
      </section>

      {/* neutral by construction */}
      <section id="neutral" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">04 · Neutral by construction</div>
          <h2 className="h-display text-4xl font-bold tracking-tight leading-tight max-w-2xl">
            The referee can&apos;t
            <br />
            also play.
          </h2>
          <p className="mt-6 max-w-2xl text-[13px] leading-7 text-dim">
            Toolproof operates no agents, sells no models, and runs no tools.
            We cannot favor a vendor, a platform, or ourselves — accuracy is
            the only asset we have. The giants can grade their own homework;
            we can&apos;t afford to.
          </p>
          <p className="mt-4 max-w-2xl text-[13px] leading-7 text-dim">
            The rule catalog is public, the passports are verifiable offline,
            and{" "}
            <a
              href="/docs#toolproof-txt"
              className="text-amber underline-offset-4 hover:underline"
            >
              toolproof.txt
            </a>{" "}
            gives tool owners the right to refuse scanning.
          </p>
        </div>
      </section>

      {/* field notes */}
      <section className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">05 · Field notes</div>
          <h2 className="h-display text-4xl font-bold tracking-tight mb-10">
            The starter registry, scanned live.
          </h2>
          <div className="max-w-3xl">
            <SeedsGrid />
          </div>
        </div>
      </section>

      {/* the ledger */}
      <section id="ledger" className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="lbl mb-4">06 · The Ledger</div>
          <h2 className="h-display text-4xl font-bold tracking-tight mb-4">
            Every verdict, as it lands.
          </h2>
          <p className="max-w-2xl text-[13px] leading-7 text-dim mb-10">
            A live feed of fresh scans — no cache hits, no replays. When
            someone anywhere runs a scan on this node, it shows up here
            within seconds. Most security products hide their traffic; this
            is the moat, in public.
          </p>
          <div className="max-w-3xl">
            <Ledger />
          </div>
        </div>
      </section>

      {/* canary */}
      <section className="py-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5">
          <div className="card relative overflow-hidden p-10">
            <div className="tape absolute top-0 inset-x-0 h-1.5" />
            <div className="lbl mb-4">07 · Shipping in v1 — canaries</div>
            <h2 className="h-display text-3xl font-bold tracking-tight max-w-2xl leading-tight">
              Plant canaries inside the tools you operate.
              <br />
              <span className="text-amber">Get paged when something steals them.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[13px] leading-7 text-dim">
              Continuous monitoring wraps a target in honeypot credentials and
              tripwire instructions. If anything — a hijacked agent, a rogue
              tool, a compromised dependency — touches them, you get the stack
              trace of the theft. The registry stays free; the canary is the
              business.
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
            <br />v0.1 — point-in-time scans. A passing grade is not a
            guarantee, it is a receipt.
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
