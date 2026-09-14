import type { Metadata } from "next";
import Link from "next/link";
import Proofmark from "@/components/Proofmark";

export const metadata: Metadata = {
  title: "Free MCP Security Scanner",
  description:
    "Scan an MCP server before your AI connects. Toolproof finds prompt injection, hidden Unicode, exposed secrets and unsafe defaults, then returns a signed safety grade.",
  alternates: { canonical: "/mcp-security-scanner" },
};

const FAQS = [
  {
    question: "What does an MCP security scanner check?",
    answer:
      "Toolproof inspects the public text and declared surface of an MCP server or API for agent-hijack patterns: hidden Unicode, instruction overrides, exfiltration language, embedded credentials, risky parameter defaults, insecure transport and missing authentication signals.",
  },
  {
    question: "Does scanning a server execute its tools?",
    answer:
      "No. Toolproof evaluates the endpoint and the model-visible descriptions it exposes. A scan is static analysis, not a sandbox or a guarantee about every future deployment.",
  },
  {
    question: "Can I verify a grade independently?",
    answer:
      "Yes. Each verified result carries an ed25519-signed passport over canonical JSON. The public key and an offline verification example are available in the API docs.",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function McpSecurityScannerPage() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }}
      />
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <Link href="/" className="ml-auto text-[13px] text-dim transition-colors hover:text-ink">
            Scan a tool →
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-16">
        <div className="lbl mb-5">Free, keyless MCP security scanner</div>
        <h1 className="text-3xl font-semibold leading-tight sm:text-[42px]">
          Scan an MCP server before your AI connects.
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-dim">
          MCP servers and APIs can place instructions directly in an AI agent&apos;s context.
          Toolproof checks the model-visible text for prompt injection and unsafe
          tool design, then gives you a signed letter grade and the evidence behind it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-md bg-amber px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
        >
          Scan an MCP server free
        </Link>

        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">How to scan an MCP server</div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Paste the endpoint", "Use the MCP server or API URL you are considering."],
              ["2", "Review the evidence", "See exactly which descriptions, prompts or declarations triggered a finding."],
              ["3", "Decide before connecting", "Use the grade, signed passport and your own risk policy to decide what happens next."],
            ].map(([number, title, body]) => (
              <li key={number} className="card p-5">
                <div className="mono text-[13px] text-amber">{number}</div>
                <h2 className="mt-2 font-medium text-ink">{title}</h2>
                <p className="mt-1.5 text-[13px] leading-6 text-dim">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">What Toolproof looks for</div>
          <div className="card divide-y divide-hair overflow-hidden">
            {[
              ["Prompt injection", "Instruction overrides, exfiltration requests and covert-action language in tool text."],
              ["Hidden text", "Zero-width, bidirectional and other invisible Unicode characters that can change what a model reads."],
              ["Unsafe tool design", "Credential-shaped parameters, destructive defaults, missing authentication signals and plaintext transport."],
              ["Proof you can keep", "An ed25519-signed passport that can be verified offline and shared with your security review."],
            ].map(([title, body]) => (
              <div key={title} className="px-5 py-4">
                <h2 className="text-[14px] font-medium text-ink">{title}</h2>
                <p className="mt-1.5 text-[13px] leading-6 text-dim">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">Frequently asked questions</div>
          <div className="card divide-y divide-hair overflow-hidden">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="relative cursor-pointer list-none pr-8 text-[14px] font-medium text-ink marker:hidden">
                  {faq.question}
                  <span className="absolute right-0 text-amber transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[13px] leading-6 text-dim">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-lg border border-amber/30 bg-amber/5 p-6">
          <h2 className="text-lg font-semibold text-ink">Make the check automatic.</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-dim">
            Add one rule to your agent&apos;s instructions so it verifies unfamiliar tools
            before connecting and reports the grade to the user.
          </p>
          <Link href="/for-agents" className="mt-4 inline-block text-[13px] font-medium text-amber hover:underline">
            Set up the agent rule →
          </Link>
        </section>
      </article>
    </main>
  );
}
