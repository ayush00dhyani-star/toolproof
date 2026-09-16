import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Ownership, IP, and licensing",
  description:
    "Who owns Toolproof, what the MIT License covers, what stays reserved, and why the trust layer stays neutral.",
  alternates: { canonical: "/ownership" },
};

const UPDATED = "15 September 2026";

export default function OwnershipPage() {
  return (
    <LegalShell eyebrow="trust" title="Ownership, IP, and licensing" updated={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. Who owns this</h2>
        <p className="mt-3">
          Toolproof is built and owned by Ayush Dhyani. The source code for the scanner, the
          CLI packages, the rule catalog, and the site is published openly. The Service
          itself is operated at toolproof-scan.vercel.app.
        </p>
        <p className="mt-3">
          The MIT License in the repository covers the code: you may read, use, modify, fork,
          and redistribute it, including commercially. What the license does not cover are
          the marks and formats that identify Toolproof — those are reserved below.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. What is open</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            The rule catalog (TP-101 through TP-304) and the detection logic, so a finding
            can be checked rather than trusted.
          </li>
          <li>
            The lockfile, policy, and evidence formats, so your governance artifacts are
            yours and are not hostage to a vendor.
          </li>
          <li>
            The verification path for every signature, so a verdict or an audit export can be
            checked without installing anything.
          </li>
          <li>The toolproof.txt opt-out standard, so tool owners stay in control.</li>
        </ul>
        <p className="mt-3">
          Deliberately open is the point. A trust layer that only one vendor can read is not
          a trust layer. The moat is not secrecy in the rules — it is that we are paid by
          nobody we scan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. What stays reserved</h2>
        <p className="mt-3">
          The following are trademarks of Ayush Dhyani / Toolproof and are not licensed by
          the MIT License:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>the name “Toolproof” and the Toolproof proofmark;</li>
          <li>the letter-grade scale and the verdict-card presentation;</li>
          <li>the rule identifiers and the rule catalog as a branded set;</li>
          <li>the toolproof.txt, lockfile, and evidence format names.</li>
        </ul>
        <p className="mt-3">
          You may not use these in a way that implies Toolproof endorses, sponsors,
          certifies, or is affiliated with an unrelated product or service. This is the
          standard separation: open code, reserved identity. It exists so that a fork cannot
          quietly rebrand the same verdicts as its own certification.
        </p>
        <p className="mt-3">
          Practical use stays unrestricted. Verifying a signature, importing a published
          format, embedding a verdict card for a tool you own, or linking to a verdict never
          requires a trademark license.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Neutrality as a property right</h2>
        <p className="mt-3">
          Toolproof takes no payment, equity, or sponsorship from any tool, vendor, or
          marketplace that it scans, and never will. A grade cannot be bought. This is not
          a promise of goodwill — it is the reason the signatures are worth anything. If
          funding from scanned vendors ever became the model, the receipts would be
          worthless, and every customer would be able to see it in the grades.
        </p>
        <p className="mt-3">
          This is also the part no incumbent can copy. A platform that scans its own
          marketplace, or a vendor that grades its own tools, is structurally incapable of
          issuing a verdict a third party would accept as evidence.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Contributions</h2>
        <p className="mt-3">
          Contributions are welcome. Unless you state otherwise in writing, a contribution is
          submitted under the MIT License covering the code, with no claim to the Toolproof
          marks. We do not accept contributions that carry patent or licensing obligations
          incompatible with MIT.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Contact</h2>
        <p className="mt-3">
          For licensing, trademark, or ownership questions, contact{" "}
          <a
            className="text-amber underline-offset-4 hover:underline"
            href="mailto:security@toolproof-scan.vercel.app"
          >
            security@toolproof-scan.vercel.app
          </a>
          . Vulnerability reports belong on the{" "}
          <Link
            className="text-amber underline-offset-4 hover:underline"
            href="/security"
          >
            security page
          </Link>
          .
        </p>
      </section>
    </LegalShell>
  );
}
