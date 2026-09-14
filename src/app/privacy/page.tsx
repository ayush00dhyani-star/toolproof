import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Toolproof handles scan targets, local browser data, and service requests.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "13 September 2026";

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="legal" title="Privacy Policy" updated={UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-ink">1. Scope</h2>
        <p className="mt-3">
          This policy explains how Toolproof handles information when you use
          toolproof-scan.vercel.app and its public API. Toolproof does not offer user
          accounts, payment processing, advertising, or an email newsletter.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">2. Information you submit</h2>
        <p className="mt-3">
          A scan request includes the target URL you provide and an optional scan type.
          Toolproof uses that information to request the public endpoint, inspect the
          response, produce a report, and apply abuse protection. Do not include
          credentials, access tokens, personal data, or sensitive query parameters in a
          target URL.
        </p>
        <p className="mt-3">
          A fresh report may be held in a short-lived in-memory cache and may appear in
          the Service&apos;s temporary public live feed with its target, host, kind, state,
          score, grade, and timestamp. API responses are also marked as public and
          cacheable. Do not scan confidential endpoints or URLs that you would not want
          disclosed in that context.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">3. Requests to scan targets</h2>
        <p className="mt-3">
          Submitting a target causes the Service to make network requests to the target
          from Toolproof&apos;s infrastructure. The target operator may observe those
          requests and Toolproof&apos;s scanner user agent. Toolproof does not authenticate
          to targets and rejects known private or internal network addresses.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">4. Local browser storage</h2>
        <p className="mt-3">
          Toolproof stores functional preferences in your browser&apos;s local storage: your
          theme, up to 20 scan receipts, and up to 12 watched tools. These records stay
          in that browser unless you choose to share a result. You can remove them by
          clearing this site&apos;s storage in your browser settings. Toolproof does not use
          advertising or marketing cookies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">5. Hosting and service logs</h2>
        <p className="mt-3">
          The Service is hosted on Vercel. Hosting and delivery infrastructure may
          process request information such as IP address, browser and device details,
          request paths, query parameters, timestamps, and diagnostic data. Toolproof
          uses a short-lived in-memory IP-based rate-limit bucket to protect scan routes.
          Vercel&apos;s handling of infrastructure data is described in its{" "}
          <a className="text-amber underline-offset-4 hover:underline" href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">
            Privacy Notice
          </a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">6. Sharing and retention</h2>
        <p className="mt-3">
          Toolproof does not sell personal information. We share information only as
          needed to operate the Service: with hosting and delivery providers, with the
          target you instruct us to contact, and when required to protect the Service or
          comply with law. In-memory scan and rate-limit data are designed to expire when
          the relevant server instance is recycled; infrastructure logs may have their
          own retention periods.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">7. Your choices and contact</h2>
        <p className="mt-3">
          Because Toolproof has no accounts, there is no account profile to access or
          delete. You can clear local browser storage at any time. For a privacy question
          or request, email{" "}
          <a className="text-amber underline-offset-4 hover:underline" href="mailto:security@toolproof-scan.vercel.app">
            security@toolproof-scan.vercel.app
          </a> and include enough information for us to understand the request. We may
          update this policy by posting a revised version here.
        </p>
      </section>
    </LegalShell>
  );
}
