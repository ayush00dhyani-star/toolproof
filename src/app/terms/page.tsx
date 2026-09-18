import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Toolproof's MCP and API safety-scanning service.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "17 September 2026";

export default function TermsPage() {
  return (
    <LegalShell eyebrow="legal" title="Terms of Service" updated={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. The service</h2>
        <p className="mt-3">
          Toolproof provides a free, best-effort static analysis service for public MCP
          servers and APIs. It returns a point-in-time report and, where available, a
          signed verdict. The service is available at toolproof-scan.vercel.app and its
          documented API routes (together, the “Service”).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. Who operates the Service</h2>
        <p className="mt-3">
          The Service is built and operated by the Toolproof maintainers. The
          maintainers publish no personal name and no personal address: the
          project is the attribution, and the individual identity of the rights
          holder is kept private, out of the public record, and disclosed only
          where the law requires it — to a registry, a court, or an authority
          entitled to ask. The rights holder is the holder named in the
          repository&apos;s LICENSE file.
        </p>
        <p className="mt-3">
          In practice, every attribution, copyright line, contact address and
          machine-readable surface for the Service points at the project rather
          than at a person. Where a request legally requires a named
          individual, write to the contact in section 8 and we will respond
          with the details that request requires.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Your responsibilities</h2>
        <p className="mt-3">You may use the Service only for endpoints that are public or that you are authorized to assess. You must not:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>submit credentials, access tokens, personal data, private URLs, or secrets as part of a scan target;</li>
          <li>use the Service to probe private, internal, restricted, or third-party systems without authorization;</li>
          <li>circumvent rate limits, access controls, or scanner safeguards; or</li>
          <li>use a report to harass, defame, threaten, or misrepresent a tool owner.</li>
        </ul>
        <p className="mt-3">
          Submitting a target instructs Toolproof to make network requests to that target
          as part of the scan. You are responsible for having a lawful basis and any
          permission needed for those requests.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Reports are not guarantees</h2>
        <p className="mt-3">
          Toolproof analyzes the public, model-visible surface available when the scan
          runs. It is not a penetration test, code audit, runtime sandbox, certification,
          endorsement, or guarantee that a tool is safe, secure, compliant, or free of
          defects. A grade is a signed record of that scan, not a promise about a future
          deployment. You remain responsible for your own security review and decisions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Availability and limits</h2>
        <p className="mt-3">
          The Service is provided free of charge, as available, and may be changed,
          limited, suspended, or discontinued at any time. Published rate limits,
          caching behavior, and technical limits apply. We may block use that threatens
          the Service, its users, or third parties.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Third-party systems</h2>
        <p className="mt-3">
          Scan targets and their operators are independent third parties. Toolproof does
          not control their content, availability, security, or privacy practices. A
          finding is a reason to review evidence; it is not an accusation of intent or a
          statement that the target owner acted improperly.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Disclaimers and liability</h2>
        <p className="mt-3">
          To the maximum extent permitted by applicable law, the Service is provided
          “as is” and “as available,” without warranties of any kind. Toolproof will not
          be liable for indirect, incidental, special, consequential, exemplary, or
          punitive damages, or for loss arising from reliance on a report, a scan target,
          or use of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">8. Changes and contact</h2>
        <p className="mt-3">
          We may update these Terms by posting a revised version here and changing the
          “Last updated” date. Continued use after an update means you accept the revised
          Terms. For questions or security-related concerns, contact{" "}
          <a className="text-amber underline-offset-4 hover:underline" href="mailto:security@toolproof-scan.vercel.app">
            security@toolproof-scan.vercel.app
          </a>.
        </p>
      </section>
    </LegalShell>
  );
}
