# Reply to @Dhyani0x

You've described the architecture exactly right, and it's the boundary the
product is built on. Replying with specifics, because the layer you're asking
for isn't a roadmap item — it shipped.

---

@Dhyani0x — you've got the boundary exactly right, and it's the one the
product is built on rather than the one it's heading toward.

**Pre-connection, gated on signed text drift — this exists today.** The
passport is point-in-time by design; it's a receipt for what was observed, and
a receipt that pretends to see the future is worse than none. So the gate is a
separate primitive: a lockfile that pins the capability surface — tool names,
descriptions, schemas, outbound hosts — as a signed manifest, then fails
*closed* in CI when it drifts.

```
npx toolproof-lock lock <target>   # pins the signed baseline
npx toolproof-lock check           # CI gate — blocks on drift
```

I just verified both paths. Clean surface: `IN SYNC`, exit 0. Tamper the pinned
hash: it blocks with `[BLOCKED] the capability fingerprint changed … treat as
unapproved drift and re-lock deliberately only after review` and exits non-zero.
The important part is that it does not pass silently on an unexplained change
— an unexplained fingerprint delta is a *block*, not a warning, because the
honest answer to "we don't know what changed" is to stop and look.

**Runtime tool-call and egress evidence as a separate trust layer — agreed,
deliberately out of the first cut.** Same reasoning you gave: conflating static
pre-connection evidence with runtime behavior is what makes verdicts
oversellable. The evidence trail is hash-chained and signed so an auditor can
later prove what was approved and when, but it attests to what was *observed*,
never that a service is *safe*. Runtime observation is the next layer, and it
stays a separate layer because the failure modes are different — a static
surface can't see a runtime exfil, and pretending otherwise is the exact gap
you're pointing at.

The one place I'd push back slightly: the value of the static layer isn't
despite that limit, it's *because* of it. A gate that only answers "has the
thing I approved changed since I approved it" is answerable with certainty. A
gate that answers "is this safe" isn't, and security tooling that blurs the two
is how teams learn to ignore their alerts.

Scanner and rule catalog are open source if you want to inspect the detection
rules or the signature scheme: github.com/ayush00dhyani-star/toolproof

---

## Notes

- The claim about failing closed is verified, not asserted — tamper test above,
  exit code non-zero, block message rendered. Don't soften the specificity when
  you paste it; that's what makes it credible to someone who clearly reads docs.
- The runtime layer being "deliberately out of the first cut" is the honest
  position and matches the approved scope. Don't promise a date for it.
