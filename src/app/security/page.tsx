import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Security",
  description: "How to report a Toolproof security issue, scanner bypass, or false-negative vector.",
  alternates: { canonical: "/security" },
};

const UPDATED = "15 September 2026";

export default function SecurityPage() {
  return (
    <LegalShell eyebrow="trust" title="Security reporting" updated={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">Report a vulnerability</h2>
        <p className="mt-3">
          Report security issues, scanner bypasses, and high-confidence false-negative
          vectors to{" "}
          <a className="text-amber underline-offset-4 hover:underline" href="mailto:security@toolproof-scan.vercel.app">
            security@toolproof-scan.vercel.app
          </a>. Include a concise reproduction, the affected URL or route, expected and
          actual behavior, and any safe proof of impact. The machine-readable policy is
          available at{" "}
          <a className="text-amber underline-offset-4 hover:underline" href="/.well-known/security.txt">
            /.well-known/security.txt
          </a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Scope</h2>
        <p className="mt-3">
          Reports are welcome for Toolproof&apos;s public website, API routes, scanner
          logic, response-signing flow, and vulnerabilities that could disclose data,
          bypass intended protections, or materially undermine a verdict. Scanner
          evasion and reproducible detection gaps are useful reports even when no system
          is compromised.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Please test safely</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Test only Toolproof or systems you own or are explicitly authorized to assess.</li>
          <li>Do not access other users&apos; data, disrupt the Service, send high-volume traffic, or use social engineering.</li>
          <li>Do not submit real credentials, personal data, destructive payloads, or secrets in a report or scan target.</li>
          <li>Use a non-destructive proof of concept and stop once you have enough evidence to report the issue.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Security controls</h2>
        <p className="mt-3">
          Toolproof uses HTTPS, security response headers, a restrictive content security
          policy, and basic SSRF protections that reject known private and internal
          addresses before scanning. These controls reduce risk; they do not make the
          Service invulnerable. We do not publish a response-time commitment or bounty
          program at this time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Cryptographic architecture</h2>
        <p className="mt-3">
          Verdicts and evidence are designed so you do not have to trust the Service to
          trust a result. Every artifact is verifiable offline, with no key and no network:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Signed verdicts.</strong> Each scan response carries
            an ed25519 signature over the canonical JSON of the verdict, plus a key id. The
            public key is published at{" "}
            <a className="text-amber underline-offset-4 hover:underline" href="/api/v1/pubkey">
              /api/v1/pubkey
            </a>{" "}and in the repository. Canonical form uses recursively sorted keys, so
            re-serialization does not break verification.
          </li>
          <li>
            <strong className="text-ink">Evidence receipts.</strong> Every{" "}
            <code className="text-ink">check</code> appends a receipt that is hash-chained to
            the one before it and signed with a project-local ed25519 key whose public half
            is published alongside the log. Editing a receipt breaks its hash; reordering or
            dropping one breaks the chain; forging a signature fails under the published key.
          </li>
          <li>
            <strong className="text-ink">Exported bundles.</strong> An export carries its own
            issuer key and one signature covering the whole range including its receipts, so
            the contents cannot be swapped after signing. The verifier at{" "}
            <a className="text-amber underline-offset-4 hover:underline" href="/evidence">
              /evidence
            </a>{" "}checks signature, chain and every receipt in the browser.
          </li>
        </ul>
        <p className="mt-3">
          Signatures attest <em>what Toolproof observed and when</em>. They are not a
          certification that a service is safe, and a verified signature does not mean the
          recorded decision was correct — only that the record has not been altered since
          it was made.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Disclosure</h2>
        <p className="mt-3">
          Please give us a reasonable opportunity to investigate and address a report
          before public disclosure. We will not ask you to expose secrets or continue a
          risky test. Do not publish details that would create an immediate, avoidable
          risk to users while a fix is being prepared.
        </p>
      </section>
    </LegalShell>
  );
}
