# Launch posts — ready to paste

These are written to be pasted as-is. Do not soften them; the specificity
is what makes them land.

---

## Show HN

**Title:** Show HN: Toolproof — trust grades for MCP servers and APIs

**Body:**

Hi HN. I'm a security researcher, and I kept watching AI agents connect to
MCP servers that no human had ever read. The tool descriptions an agent
obeys are loaded straight into the model's context — and nobody was
checking them.

So I built Toolproof. It scans the model-visible surface of an MCP server
or API (tool names, descriptions, schemas, prompts, resources, server
instructions, outbound hosts) and returns a letter grade with the evidence:
16 rules covering hidden instructions, invisible unicode characters,
exposed secrets, unsafe defaults, and missing auth.

The part I care about: every verdict is an ed25519-signed passport over
canonical JSON. You can verify it offline with the published public key.
No accounts, no API keys, no payment, and nothing you paste is stored.

There's also a lockfile primitive — `npx toolproof-lock lock <target>` pins
the approved capability surface, and `check` in CI fails when it drifts.
Every check appends a hash-chained, signed receipt, so a team can later
prove what was approved, when, and that the record was never rewritten.
An auditor verifies an export in the browser with nothing installed:
https://toolproof-scan.vercel.app/evidence

One honest limitation: this is a static, point-in-time scan of the
connection surface. It does not see what a server does at runtime, it is
not a sandbox, and a signature attests what was observed and when — never
that a service is safe. I'd rather say that plainly than sell a grade.

I scanned the tools agents already trust and published what I found:
https://toolproof-scan.vercel.app/report

The scanner is open source (MIT), the rule catalog is public, and I am
paid by nobody I scan. That last part is the whole product: a trust layer
that takes money from the tools it grades is worthless.

Ask me anything about the detection rules, the signature scheme, or what
I found in the wild.

---

## r/MCP

**Title:** I scanned the MCP servers agents already trust — here's what I found

**Body:**

I'm a security researcher. I kept seeing agents connect to MCP servers
whose descriptions nobody had read — and those descriptions are the
instructions the model obeys.

I built an open scanner that grades a server's model-visible surface:
hidden instructions, invisible characters, exposed secrets, unsafe
defaults, missing auth. Letter grade, signed verdict, keyless API, no
account.

Results from scanning the popular servers are here (recomputes live):
https://toolproof-scan.vercel.app/report

There's a lockfile primitive too — pin the approved surface, and CI fails
if it changes, with a signed audit trail an auditor verifies in the
browser: https://toolproof-scan.vercel.app/evidence

Try it on a server you use: https://toolproof-scan.vercel.app/

It's static and point-in-time — it sees the connection surface, not
runtime behaviour. Say that plainly because overselling trust is how trust
dies.

Open source, MIT, paid by nobody it scans.

---

## r/LocalLLaMA / r/ClaudeAI (shorter)

**Title:** A free scanner that grades MCP servers before your agent connects

**Body:**

Paste an MCP URL, get a letter grade and the exact rules that produced it
— hidden instructions, invisible characters, exposed secrets, unsafe
defaults. Every verdict is a signed passport you can verify offline. No
account, no key.

The evidence side: pin the approved surface with a lockfile, CI fails on
drift, and every decision is a hash-chained signed receipt an auditor
checks in the browser with nothing installed.

What it found in the wild: https://toolproof-scan.vercel.app/report
Scanner is open source. I'm paid by nobody I scan.

---

## X / Twitter (thread)

**1/** Your AI agent obeys tool descriptions that no human has ever read.

Hidden instructions, invisible unicode, exposed secrets — sitting right
there in the context your model trusts.

I'm a security researcher. So I built a scanner.

**2/** Toolproof grades an MCP server or API by its model-visible surface:
tools, schemas, prompts, resources, instructions, outbound hosts.

16 rules. Letter grade. Every verdict an ed25519-signed passport,
verifiable offline. No account, no key, nothing stored.

**3/** It's also a lockfile.

Pin the approved surface. CI fails when it drifts. Every decision becomes a
hash-chained, signed receipt — so a team can prove what was approved, when,
and that nobody rewrote the record.

Auditors verify an export in the browser, nothing installed:
toolproof-scan.vercel.app/evidence

**4/** What it found in the wild:
toolproof-scan.vercel.app/report

The scanner is open source. I'm paid by nobody I scan — not a promise, the
business model. A trust layer that takes money from the tools it grades is
worthless.

**5/** Paste a server and see for yourself:
toolproof-scan.vercel.app

---

## Where to submit (each is one paste of .well-known/mcp-directory.json)

- mcp.so — submit a server
- glama.ai/mcp — list a server
- pulsemcp.com — submit
- smithery.ai — publish
- opentools.ai — submit a tool
- awesome-mcp-servers (GitHub PR)
