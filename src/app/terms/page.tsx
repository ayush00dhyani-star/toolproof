import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Toolproof's MCP and API safety-scanning service.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "15 September 2026";

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
        <h2 className="text-lg font-semibold text-ink">2. Your responsibilities</h2>
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
        <h2 className="text-lg font-semibold text-ink">3. Reports are not guarantees</h2>
        <p className="mt-3">
          Toolproof analyzes the public, model-visible surface available when the scan
          runs. It is not a penetration test, code audit, runtime sandbox, certification,
          endorsement, or guarantee that a tool is safe, secure, compliant, or free of
          defects. A grade is a signed record of that scan, not a promise about a future
          deployment. You remain responsible for your own security review and decisions.
        </p>
        <p className="mt-3">
          The same applies to Toolproof Lock and to evidence receipts. A lockfile pins a
          capability surface at generation time; a check compares a later observation to
          it. Both are point-in-time artifacts. Neither observes what a server does at
          runtime, and neither replaces sandboxing, network egress controls, or
          authorization at the service being called.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Lockfiles, evidence, and canaries</h2>
        <p className="mt-3">
          The CLI writes artifacts into your repository: a{" "}
          <code className="text-ink">toolproof.lock</code> baseline, a policy file, and the
          evidence store under <code className="text-ink">.toolproof/</code>. Those files are
          yours. They live in your repository, under your version control, and Toolproof has
          no access to them.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            The evidence signing key in <code className="text-ink">.toolproof/</code> is a
            project-level key that exists so receipts are provably yours. It is not a secret
            that protects confidential data: receipts contain no prompt content, tool
            arguments, tool results, or credentials by construction. Treat it as repository
            material, not as a credential.
          </li>
          <li>
            An exported evidence bundle carries its own issuer key and is designed to be
            handed to an auditor. You are responsible for deciding what to export and to
            whom. Do not export or publish a bundle whose contents you have not reviewed.
          </li>
          <li>
            Canary tokens are decoy credentials. Generate and plant them only on systems you
            own or are authorized to test. A canary that fires identifies where a leak
            occurred; it does not grant access to anything.
          </li>
        </ul>
        <p className="mt-3">
          Verifying a signature, a lockfile, or an evidence bundle confirms the
          cryptographic integrity of the record. It does not certify that the underlying
          service is safe or that the recorded decision was correct.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Availability and limits</h2>
        <p className="mt-3">
          The Service is provided free of charge, as available, and may be changed,
          limited, suspended, or discontinued at any time. Published rate limits,
          caching behavior, and technical limits apply. We may block use that threatens
          the Service, its users, or third parties.
        </p>
        <p className="mt-3">
          The open-source CLI packages are provided under the MIT License, as-is and without
          warranty. Their availability is not guaranteed, and you are responsible for the CI
          jobs, policies, and evidence stores you configure with them.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Content and marks</h2>
        <p className="mt-3">
          Scan reports, verdicts, badge images, and leaderboard entries are generated from
          public capability surfaces. You may display, embed, and share verdicts for your own
          tools, and you may link to a verdict card for any scanned target.
        </p>
        <p className="mt-3">
          You may not present a Toolproof verdict as an endorsement, certification, or
          security audit of any product, or alter a verdict card, badge, or export so that it
          misrepresents what was scanned, when, or what it concluded. Removing, editing, or
          forging the signature on a verdict, lockfile, or evidence receipt, or
          redistributing a bundle known to be tampered with, is a violation of these Terms.
        </p>
        <p className="mt-3">
          The Toolproof name, the proofmark, the rule identifiers, and the file formats are
          trademarks of Ayush Dhyani / Toolproof, described in the repository LICENSE. They
          are not licensed for use in a way that implies endorsement or affiliation.
          Verifying a signature or importing a published format does not require a trademark
          license.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Third-party systems</h2>
        <p className="mt-3">
          Scan targets and their operators are independent third parties. Toolproof does
          not control their content, availability, security, or privacy practices. A
          finding is a reason to review evidence; it is not an accusation of intent or a
          statement that the target owner acted improperly.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">8. Disclaimers and liability</h2>
        <p className="mt-3">
          To the maximum extent permitted by applicable law, the Service is provided
          “as is” and “as available,” without warranties of any kind. Toolproof will not
          be liable for indirect, incidental, special, consequential, exemplary, or
          punitive damages, or for loss arising from reliance on a report, a lockfile,
          an evidence receipt, a scan target, or use of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">9. Changes and contact</h2>
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
