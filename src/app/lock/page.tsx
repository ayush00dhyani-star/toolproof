import type { Metadata } from "next";
import Link from "next/link";
import Proofmark from "@/components/Proofmark";

export const metadata: Metadata = {
  title: "Toolproof Lock — fail CI when an agent's capability surface changes",
  description:
    "Toolproof Lock writes a signed toolproof.lock baseline of an MCP server or API's capability surface. Commit it, then run toolproof check in CI to fail the build when tools, schemas, outbound hosts or instructions drift past your policy.",
  alternates: { canonical: "/lock" },
};

const WORKFLOW = [
  [
    "1",
    "Write the baseline",
    "Run toolproof lock <target>. Toolproof fetches the public capability surface and writes a signed toolproof.lock: tool names, descriptions, input/output schemas, prompts, resources, instructions, outbound hosts, OpenAPI paths and a canonical fingerprint.",
  ],
  [
    "2",
    "Commit the lockfile",
    "toolproof.lock lives in your repo next to your agent configuration and is reviewed in a pull request like any other file. It is plain JSON — your baseline is yours, and it stays valid whether or not you run an MCP gateway.",
  ],
  [
    "3",
    "Check it in CI",
    "toolproof check re-fetches the surface, computes a semantic diff against the baseline, applies your policy, and exits non-zero when the drift needs a human. Wire it into the workflow you already run on pull requests.",
  ],
];

const CI_OUTPUT = `$ npx -y --package toolproof-lock toolproof check --policy=toolproof.policy.yml
TOOLPROOF LOCK · mcp.example.com

baseline  sha256:08b39299…  grade A+
observed  sha256:4b81de0c…  grade A
state     verified · kind mcp · policy toolproof.policy.yml

  [BLOCKED] description of tool "query-docs" changed — the text the model reads differs from the baseline (tool:query-docs)
  [BLOCKED] inputSchema of tool "query-docs" expanded: gained property "attachments" — the target now accepts input that was not described in the baseline (tool:query-docs.inputSchema)
  [REVIEW] tool "send_sms" appears in the observed manifest — the target now exposes a capability that was not in the baseline (tool:send_sms)

BLOCKED · blocked - 2 blocking changes: description-changed (tool:query-docs), schema-expanded (tool:query-docs.inputSchema) · exit 2
Error: Process completed with exit code 2.`;

const DIFF_EXAMPLES = [
  ["search_email gained access to attachment content", "schema-expanded · block by default"],
  ["a new export_customers tool was added", "tool-added · review by default"],
  ["create_invoice changed from a read-only claim to an external write action", "description-changed · review by default"],
  ["a tool description now contains model-directed instructions", "description-changed / high-severity finding"],
  ["an endpoint now advertises an additional external host", "outbound-host-added · block by default"],
];

const POLICY_KEYS = [
  ["onToolAdded", "review", "a tool name present now but absent in the lockfile"],
  ["onToolRemoved", "review", "a tool name in the lockfile that disappeared"],
  ["onDescriptionChanged", "review", "any tool, prompt or resource description text differs"],
  ["onSchemaExpanded", "block", "a schema gained a property or required field (or went absent → present)"],
  ["onNewOutboundHost", "block", "an outbound host appears that was not in the baseline"],
  ["onHighSeverityFinding", "block", "a high-severity rule id is new since the baseline"],
];

export default function LockPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-hair bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-5">
          <Link href="/" className="flex items-center gap-2 text-amber">
            <Proofmark className="h-5 w-5" />
            <span className="font-semibold tracking-tight">Toolproof</span>
          </Link>
          <Link href="/docs" className="ml-auto text-[13px] text-dim transition-colors hover:text-ink">
            API docs →
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <div className="lbl mb-4">open · free · MIT</div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[40px]">
          Toolproof Lock.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-dim">
          A lockfile for the capabilities your agent can reach.{" "}
          <code className="mono text-ink">toolproof lock</code> records the exact
          capability surface you approved into a signed{" "}
          <code className="mono text-ink">toolproof.lock</code>;{" "}
          <code className="mono text-ink">toolproof check</code> fails CI when
          that surface changes past the policy you wrote.
        </p>
        <p className="mt-3 text-[15px] leading-7 text-dim">
          An MCP server can add a tool, widen an input schema, rewrite the text
          your model reads, or start calling a new host — with no change in your
          repository. The lock converts that invisible vendor-side mutation into
          a reviewable PR event.
        </p>

        <pre className="mono mt-7 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`npx toolproof-lock lock https://mcp.example.com/mcp   # write the baseline, commit it
npx toolproof-lock check --policy=toolproof.policy.yml # in CI: exit 1 review, 2 blocked`}</pre>

        {/* workflow */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">developer workflow</div>
          <h2 className="text-xl font-semibold text-ink">
            Pin what you approved. Re-check it on every pull request.
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {WORKFLOW.map(([n, title, body]) => (
              <li key={n} className="card p-5">
                <div className="mono text-[13px] text-amber">{n}</div>
                <h3 className="mt-2 font-medium text-ink">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-dim">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CI output */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">what fails in CI</div>
          <h2 className="text-xl font-semibold text-ink">
            A diff that names the consequence.
          </h2>
          <p className="mt-3 text-[13px] leading-7 text-dim">
            The check is not a hash comparison. It classifies each change — a new
            tool, an expanded schema, a changed description, a new outbound host,
            a new high-severity finding — under your policy, and prints the
            reason next to the tag. Exit <code className="mono text-ink">0</code>{" "}
            in sync, <code className="mono text-ink">1</code> review required,{" "}
            <code className="mono text-ink">2</code> blocked,{" "}
            <code className="mono text-ink">3</code> usage or network error.
          </p>
          <pre className="mono mt-6 overflow-x-auto card p-5 text-[11.5px] leading-6 text-dim">{CI_OUTPUT}</pre>
          <p className="mt-3 text-[12px] leading-6 text-faint">
            The tags, the reason text and the trailing{" "}
            <code className="text-dim">(where)</code> are verbatim; only the
            fingerprint is shortened for display. Tags are{" "}
            <code className="text-dim">[BLOCKED]</code>,{" "}
            <code className="text-dim">[REVIEW]</code> and{" "}
            <code className="text-dim">[INFO]</code>, and{" "}
            <code className="text-dim">(where)</code> names the tool, prompt,
            resource, host or rule the change belongs to.
          </p>
        </section>

        {/* meaningful diff */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">what a meaningful diff looks like</div>
          <h2 className="text-xl font-semibold text-ink">
            Consequences, not hashes.
          </h2>
          <p className="mt-3 text-[13px] leading-7 text-dim">
            Tool order and JSON re-serialization do not trip the check. A
            capability that actually widened does. Examples in the shape the
            report uses:
          </p>
          <div className="card mt-6 divide-y divide-hair overflow-hidden">
            {DIFF_EXAMPLES.map(([example, category]) => (
              <div key={example} className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-4">
                <span className="text-[13px] leading-6 text-ink">{example}</span>
                <span className="mono text-[11px] leading-6 text-faint sm:ml-auto">{category}</span>
              </div>
            ))}
          </div>
        </section>

        {/* policy */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">policy model</div>
          <h2 className="text-xl font-semibold text-ink">
            Policy is versioned, reviewable code.
          </h2>
          <p className="mt-3 text-[13px] leading-7 text-dim">
            A policy is a small file you keep in the repo — pure JSON, or the
            flat <code className="mono text-ink">key: value</code> YAML subset
            shown here. Each change category maps to one policy key, and every
            key accepts exactly three actions:{" "}
            <code className="mono text-ink">informational</code>,{" "}
            <code className="mono text-ink">review</code>, or{" "}
            <code className="mono text-ink">block</code>. Omit the file and the
            built-in default applies.
          </p>
          <pre className="mono mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# toolproof.policy.yml — the built-in default
minimumGrade: B
requireVerified: true
onToolAdded: review
onToolRemoved: review
onDescriptionChanged: review
onSchemaExpanded: block
onNewOutboundHost: block
onHighSeverityFinding: block`}</pre>
          <div className="card mt-4 divide-y divide-hair overflow-hidden">
            {POLICY_KEYS.map(([key, def, trigger]) => (
              <div key={key} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <code className="mono text-[12.5px] text-ink">{key}</code>
                  <span className="rounded bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">
                    {def}
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] leading-6 text-dim">{trigger}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-6 text-faint">
            <code className="text-dim">minimumGrade</code> and{" "}
            <code className="text-dim">requireVerified</code> always block when
            unmet. For v1, a newly added rule id beginning{" "}
            <code className="text-dim">TP-1</code> is treated as high severity —
            a documented simplification, not a classification of severity on its
            own.
          </p>
        </section>

        {/* scope */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">scope and non-claims</div>
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-6">
            <h2 className="text-lg font-semibold text-ink">What Lock is not.</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-dim">
              Toolproof Lock covers the{" "}
              <strong className="text-ink">connection-time capability surface</strong>
              : server identity and endpoint; tool names, descriptions, schemas,
              prompts, resources and annotations presented to the model;
              discoverable outbound hosts; static findings and the rule-set that
              produced them; and a cryptographic fingerprint of the canonical
              surface.
            </p>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-dim">
              It <strong className="text-ink">does not claim to prove that a
              remote service behaves safely</strong>,{" "}
              <strong className="text-ink">does not inspect private credentials</strong>,
              and <strong className="text-ink">does not replace sandboxing,
              network egress controls, or authorization</strong> at the service
              being called.
            </p>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-dim">
              Concretely: a signature attests what Toolproof observed and when —
              not that a service is safe. Lock detects a change and requires
              review; it does not stop a tool from running. Runtime enforcement
              is the gateway&apos;s job, and a gateway is not required to use
              the lock.
            </p>
          </div>
        </section>

        {/* market */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">where this sits in the market</div>
          <h2 className="text-xl font-semibold text-ink">
            Pinning is not new. Portability and consequence are the wedge.
          </h2>
          <div className="mt-6 space-y-4 text-[13px] leading-6 text-dim">
            <p>
              Tool-definition pinning already exists: MCP-Scan (April 2025)
              tracks tool-description changes by hashing tool definitions, and
              diffing against a &ldquo;golden baseline&rdquo; is already a named
              product concept. Snyk publishes a free agent/MCP scanner. Gateways
              from Zuplo, Cloudflare, Kong, AWS Bedrock AgentCore, Docker, IBM,
              MintMCP, Lasso and others own the enforcement point — they block at
              call time, and some keep an approved baseline inside the proxy.
            </p>
            <p>
              So we are not claiming a first. What is different here is the
              shape of the artifact: a baseline that is{" "}
              <strong className="text-ink">committed to your repository</strong>,{" "}
              <strong className="text-ink">gateway-independent</strong> (it stays
              valid if you switch gateways or run without one), reviewed in a PR,
              and paired with{" "}
              <strong className="text-ink">consequence-level diffs</strong> and a{" "}
              <strong className="text-ink">signed, exportable evidence receipt</strong>{" "}
              you keep when the vendor is absent.
            </p>
            <p>
              Stated plainly: scanning tools tell you what is wrong right now;
              the lock tells you what changed since you approved it. Gateways
              enforce at call time; the lock governs at review time. It
              complements a gateway rather than replacing one, and MCP is the
              first adapter — the manifest is protocol-independent by design.
            </p>
          </div>
        </section>

        {/* quickstart */}
        <section className="mt-16 border-t border-hair pt-12">
          <div className="lbl mb-5">install &amp; quickstart</div>
          <h2 className="text-xl font-semibold text-ink">
            Locally, with no account.
          </h2>
          <p className="mt-3 text-[13px] leading-7 text-dim">
            Zero runtime dependencies, Node 18+, published as{" "}
            <a
              href="https://www.npmjs.com/package/toolproof-lock"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber underline-offset-4 hover:underline"
            >
              toolproof-lock
            </a>{" "}
            with the <code className="mono text-ink">toolproof</code> binary.
          </p>
          <pre className="mono mt-6 overflow-x-auto card p-5 text-[12px] leading-6 text-dim">{`# write a baseline and commit toolproof.lock
npx toolproof-lock lock https://mcp.example.com/mcp

# in CI (or before you connect): diff against the baseline, apply policy
npx toolproof-lock check --policy=toolproof.policy.yml

# machine-readable, for your own tooling
npx toolproof-lock check --json   # { decision, exitCode, changes, manifest }`}</pre>
          <p className="mt-4 text-[12px] leading-6 text-faint">
            Add the ready-to-run{" "}
            <Link href="/toolproof-lock.yml" className="text-amber underline-offset-4 hover:underline">
              GitHub Actions workflow
            </Link>{" "}
            as <code className="text-dim">.github/workflows/toolproof-lock.yml</code>{" "}
            to run the check on every pull request.
          </p>
        </section>

        <footer className="mt-14 border-t border-hair pt-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-dim">
            <Link href="/docs" className="hover:text-ink">API docs</Link>
            <Link href="/for-agents" className="hover:text-ink">For agents</Link>
            <Link href="/enterprise" className="hover:text-ink">Plans</Link>
            <Link href="/security" className="hover:text-ink">Security</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </footer>
      </article>
    </main>
  );
}
