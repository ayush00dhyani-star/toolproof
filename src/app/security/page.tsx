import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Security",
  description: "How to report a Toolproof security issue, scanner bypass, or false-negative vector.",
  alternates: { canonical: "/security" },
};

const UPDATED = "13 September 2026";

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
