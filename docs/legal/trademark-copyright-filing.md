# Toolproof — trademark and copyright filing package

Prepared for filing. Every field is filled except signature and payment, so
filing takes minutes rather than hours of research.

---

## The name — attribution is private

The owner does not publish a personal name, and this repository must not either.
An earlier pass corrected the attribution to a legal name; that name is now
withdrawn from every public surface, because a personal name on a public
repository — and worse, on a public trademark record — is a privacy cost with no
upside. Attribution is the project, not a person.

What the public surfaces say instead:

- `LICENSE` — "Copyright (c) 2026 The Toolproof Authors"
- `CLA.md` — the Maintainer is "the copyright holder of the Project, as named in
  the LICENSE file", so the chain stays internal and no name is required
- ownership page, homepage, docs footer, `SUBMIT.md`, `llms-full.txt` and
  `.well-known/mcp-directory.json` — the project or its maintainers, never a person

**This is the one thing that changes for the filing, and it is the important one.**
The registration and the published attribution must agree, so the owner recorded
at the USPTO has to be whatever the LICENSE names. That is the argument for filing
as an **entity** rather than as an individual: a USPTO record publishes the owner's
name *and* address, so an individual filing publishes personal details permanently
and cannot be taken back. Filing in an LLC's name keeps the public record on the
entity and keeps the person out of it.

Until that entity exists, do not file. Decide the entity first, then the LICENSE
and the registration can be made to agree in a single pass — rather than filing
under a name you then have to publish everywhere else to stay consistent.

The GitHub handle `ayush00dhyani-star` is an account name, not a published
attribution, and is unchanged — renaming the org would break every link the launch
posts and directory submissions point at. It does carry a personal token, so treat
it as pseudonymous at best; change it after the filings are in and every inbound
link has been redirected.

### Owner
- Rights holder to record: **the entity that will hold the mark.** Not an
  individual name — see above.

---

## What is actually worth registering (and what is not)

Be selective. Filing fees are per class, and registering the wrong thing costs
money and protects nothing.

**Register the trademark — this is the one that matters.** The code is MIT
licensed; you have already given it away freely. What a competitor would
actually steal is the *name* — "Toolproof," the proofmark, the grade scale.
A fork can legally reuse MIT code; it may not call itself Toolproof. That is
the entire edge, and only a trademark holds it.

**Skip the copyright registration on the code.** It is MIT-licensed. Spending
a filing fee to register copyright in code you have already granted to the
world protects nothing, and the appearance of doing so suggests you do not
understand your own licence.

**Do register copyright in the authored content** — the rule catalog as a
published set, the website copy, the grade-scale presentation. These are the
things the trademark carve-out already reserves, and registration gives
statutory damages if copied.

---

## TRADEMARK — "TOOLPROOF"

**Filing path:** USPTO TEAS Plus ($250 per class, fixed fee).
https://teasplus.uspto.gov

A **word mark** ("TOOLPROOF") is stronger than a logo — it protects the name
in any font, so a competitor cannot sidestep by restyling it. File the word
mark first; the proofmark logo can follow.

### Owner
- Entity type: Individual (unless you have formed an LLC — if so, file in the
  LLC's name, and tell me, because the entity changes the form)
- Address and email: required for the public record. Note this is published —
  use a business address, not a home one, or your home address becomes public.

### Mark
- Type: Standard character mark (word mark)
- The mark: **TOOLPROOF**

### Basis for filing
- **§1(a) — use in commerce.** The mark is already in live commercial use.
  This is stronger than intent-to-use, and you qualify because the service is
  live at toolproof-scan.vercel.app and the packages are published on npm.

### Classes and goods/services (this is where money gets spent)

**Class 42 — the one that matters most** ($250)
> Providing online non-downloadable software as a service (SaaS) featuring
> software for security analysis, trust grading, and verification of Model
> Context Protocol (MCP) servers and application programming interfaces
> (APIs); providing an online database featuring trust assessments and
> security ratings of software tools.

**Class 9 — the software itself** ($250, file if you want the packages covered)
> Downloadable computer software for scanning, analyzing, grading, and
> verifying the security of MCP servers and APIs.

Two classes = **$500 in fees.** If you want to spend less, file Class 42 only
— it covers the hosted service, which is the product people actually use. The
CLI packages are supports, not the revenue.

### First Use in Commerce
- **Date of first use: 12 September 2026** — established from the repository
  history: the scanner, signed passports and site were first published that
  day (commit `2191f49`), and the `toolproof-scan` and `toolproof-mcp`
  packages first shipped to npm the same day.
- Use in commerce means the mark appearing on goods/services actually sold or
  transported. For a free service, the operative event is public availability
  of the service under the mark — which began 12 September 2026.

### Specimens (attach a screenshot per class)
- **For Class 42:** a screenshot of the homepage at
  toolproof-scan.vercel.app showing the TOOLPROOF mark in connection with the
  scanning service. Must show the mark **and** the service together.
- **For Class 9:** the npm package page for toolproof-mcp showing the mark.
- The specimen is the most common reason filings get rejected. Show the mark
  clearly, in use, connected to the actual service.

---

## COPYRIGHT — the authored content

**Filing path:** U.S. Copyright Office, eCO ($45–65 per claim).
https://eco.copyright.gov

### Claim 1 — website content and rule catalog
- Type of work: **Literary work** (website text) **and/or** compilation
- Title: "Toolproof — State of MCP Tool Safety website, rule catalog, and
  grade-scale presentation"
- Author: **[CONFIRM name]**
- Year of completion: 2026
- Deposit: PDF of the website pages and the rule catalog

Register the *expression* — the writing, the presentation, the curated
catalog as a set. Not the MIT code, not the rules' underlying logic (those
are functional and not copyrightable; that is what the trademark covers).

---

## After filing — what I need from you

1. The entity that will hold the mark (an LLC is the privacy-preserving answer —
   see "The name — attribution is private" above).
2. The exact first-use-in-commerce date (first npm publish or first site live).
3. A business address for the public record — never a home address; the USPTO
   record is public and permanent.
4. Confirmation that the LICENSE's rights-holder designation matches whatever
   owner goes on the form.

With those answers the filings are complete except for your signature and the
card. Whatever owner is recorded on the form, the LICENSE, the ownership page and
the CLA must be made to say the same thing before you file, so the registration and
the published attribution agree. No personal name needs to appear on any of them —
but the LICENSE and the registration must name the *same* holder, entity or not.

---

## What I cannot do, stated plainly

I cannot file these. Both offices require an authenticated account in the
owner's name, a payment card, and a signature under penalty of perjury —
attesting that the applicant is entitled to the mark. That attestation is
yours to make. Anyone offering to do it for you is either lying or committing
the fraud you are trying to prevent.

What I have done is remove every other obstacle: the classes are chosen, the
descriptions are drafted in the language the examiners use, the specimen
requirements are stated, and the one genuinely dangerous trap — the name
discrepancy — is flagged rather than papered over.
