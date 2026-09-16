# Contributing to Toolproof

Toolproof accepts contributions — the rule catalog, the detection logic, and
the evidence formats are open precisely so a finding can be checked rather
than trusted. A few rules keep that usable.

## Before you contribute

**Read [`CLA.md`](./CLA.md).** Every contribution to this project is submitted
under that Contributor License Agreement. It is the standard Apache-style
arrangement: you keep ownership of your work, and you grant the project a
perpetual licence to use it. The agreement exists so the project can be
relicensed in future without having to track down every contributor, and so
that a contribution can be defended if it is ever contested. Contributions
that do not accept it cannot be merged.

If you are contributing on behalf of an employer, that employer must accept
the CLA in writing first.

## What we want

- **Detection rules.** A new rule must catch a real agent-hijack vector, not a
  style preference. Include a deliberately affected target and a test that
  fires on it and passes on a clean surface.
- **False-positive fixes.** If a rule fires on honest tool text, that is a
  bug in the rule, and it matters more than a new rule.
- **Format compatibility.** Evidence, lockfile, and passport handling must
  stay byte-compatible with existing receipts. A signed verdict that cannot
  be verified later is worse than no verdict.
- **Zero new runtime dependencies.** The packages stay dependency-free. Pure
  logic in `src/*.mjs`, the bin is a thin shell.

## What we will not accept

- Anything that weakens verification, or makes a signature unverifiable.
- A rule that reports a vendor's business model as a security finding.
- Changes to the grade scale or the rule identifiers without maintainer
  discussion first — those are a contract, not an implementation detail.

## Running the checks

```bash
npm install
npm test              # app suites (vitest)
npx vitest run

cd packages/toolproof-lock && npm test    # 65 lock tests
```

Every PR runs the full CI matrix on Node 20. A PR that does not pass cannot
be merged — branch protection is on, and it is on for everyone.

## The honest limits

A contribution that adds a rule should say plainly what that rule cannot
detect. This project's value is that its claims are narrow and true; a rule
that overstates its coverage damages the whole catalog. If your rule only
sees the static surface, the README for it should say so.

## Conduct

Be direct, be technical, be honest about limits. Assume good faith on the
part of tool owners — a finding is evidence for review, never an accusation
of intent, and that framing is a product requirement, not a courtesy.
