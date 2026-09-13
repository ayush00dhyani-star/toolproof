# Toolproof Lock — product design

**Status:** Approved direction; awaiting review before implementation
**Date:** 2026-09-13
**Owner:** Toolproof

## Decision

Toolproof will not position its letter grade as the product. A grade is an
explanation for a decision, not a control. The first paid-product foundation
is **Toolproof Lock**: a versioned, human-approved baseline for agent
capabilities that fails a check when the approved surface changes.

The ten-year company position is protocol-independent: **Toolproof is the
authority layer between autonomous software and external capabilities.** MCP
is the initial adapter, not the product boundary. Future adapters may cover
HTTP APIs, A2A agents, other agent protocols, and locally installed skills.

## Customer and job to be done

The initial customer is an engineering or security team that deploys an agent
connected to one or more MCP servers. They need to answer:

> Is this exactly the capability surface we reviewed, and may this agent use it
> under our policy today?

They do not need another static scan result. They need an enforceable answer
when a server gains a tool, changes tool text, expands a schema, introduces a
new outbound host, or stops satisfying an approved policy.

## Product boundary

Toolproof Lock covers the **connection-time capability surface**:

- server identity and endpoint;
- tool names, descriptions, input/output schemas, prompts, resources, and
  annotations presented to the model;
- declared or observed outbound hosts when safely discoverable;
- static security findings and the rule-set version that produced them;
- cryptographic fingerprints for the complete canonical surface.

Toolproof Lock does not claim to prove that a remote service behaves safely,
does not inspect private credentials, and does not replace sandboxing, network
egress controls, or authorization at the service being called.

## The first product: Toolproof Lock

### Developer workflow

1. A developer runs `toolproof lock <target>` or uses a GitHub Action.
2. Toolproof retrieves the allowed public MCP surface and creates a canonical,
   signed baseline in `toolproof.lock`.
3. The lockfile is committed with the agent configuration.
4. CI runs `toolproof check` on pull requests and scheduled checks.
5. If the observed surface differs, the check reports an exact semantic diff
   and exits non-zero unless an authorized reviewer accepts the update.

The initial CLI works without an account for local development. A hosted
workspace adds ownership, shared policy, approvals, alert delivery, and
durable evidence.

### A meaningful diff

The check must describe consequences, not only hashes. Examples:

- `search_email` gained access to attachment content.
- a new `export_customers` tool was added.
- `create_invoice` changed from read-only claim to an external write action.
- a tool description now contains model-directed instructions.
- an endpoint now advertises an additional external host.

Each difference is classified as **informational**, **review required**, or
**blocked** under a policy. Toolproof's existing rule detections supply the
reason and evidence, but do not themselves decide authorization.

## Policy model

A policy is explicit, reviewable, and portable. Initial policy fields are:

```yaml
minimumGrade: B
requireVerified: true
onToolAdded: review
onToolRemoved: review
onDescriptionChanged: review
onSchemaExpanded: block
onNewOutboundHost: block
onHighSeverityFinding: block
```

The `minimumGrade` field is temporary compatibility for the existing scanner;
the lasting policy is the specific change and permission rule. Policies are
versioned and linked to every decision they produce.

## Trust primitives

The design uses five durable primitives.

| Primitive | Purpose |
| --- | --- |
| Capability manifest | Canonical description of a capability surface at a point in time. |
| Lock | The approved manifest fingerprint and policy reference committed with an agent project. |
| Decision | Allowed, review-required, or blocked result with human-readable reasons. |
| Evidence receipt | Signed record of the observed manifest, policy, actor, and decision time. |
| Authority | The workspace policy and approvers entitled to accept a new capability surface. |

No blockchain is required. Append-only, tamper-evident receipts plus customer
controlled exports provide the needed evidence model in the first releases.

## Architecture and boundaries

### Local/open layer

- `toolproof lock` creates a local lockfile.
- `toolproof check` compares an observed manifest to the lockfile.
- GitHub Action reports a semantic diff and fails according to a checked-in
  policy.
- Public scans, API, badge, CLI, and MCP adapter remain free.

### Hosted control layer

- workspace, members, roles, and project ownership;
- private monitored-capability inventory;
- scheduled re-observation and alerts;
- shared policies and approval workflow;
- immutable audit history and evidence export;
- CI tokens with least-privilege project scopes.

### Future enforcement layer

The runtime gateway is a later product, not a prerequisite for Toolproof Lock.
It proxies capability discovery and invocation, verifies the resolved manifest
against policy, and withholds a changed or unapproved tool. The gateway must
provide protocol adapters rather than make MCP assumptions in its core model.

## Privacy and safety rules

- Never store customer credentials, prompt content, tool invocation arguments,
  or tool results in the initial Lock product.
- Store only manifests, hashes, scan evidence, policy decisions, and minimal
  workspace/account data needed to operate the service.
- Private endpoints require explicit authorization and a customer-supplied
  runner or gateway; Toolproof's public scanner must not probe private
  networks.
- Diff evidence must redact likely credentials and personal data.
- Every policy decision is explainable, exportable, and reversible by an
  authorized workspace administrator.

## Monetization

Free is the distribution engine, not a crippled trial:

- public scans, local lockfiles, CLI, MCP adapter, and basic GitHub Action;
- no account required for a developer to adopt the format.

The initial paid offer is **Toolproof Control — founding beta**:

- $99/month, capped at ten teams, price protected for 12 months;
- up to 20 monitored capabilities;
- shared policy, named approvers, scheduled monitoring, alert delivery, CI
  enforcement, and 90-day evidence history;
- hands-on onboarding while the workflow is being validated.

Subsequent pricing is based on monitored capabilities and enforcement scope,
not a generic letter grade or raw scan count. This aligns the price with the
protected surface area and preserves the free adoption loop.

## Long-term sequence

| Horizon | Product milestone | Lasting asset |
| --- | --- | --- |
| Now | MCP lockfile, semantic diff, CI check | Developer workflow and change history |
| Next | Hosted workspace, policy, approvals, evidence | Team control plane |
| Later | MCP/HTTP/A2A runtime gateway | Enforced cross-protocol authority |
| Long term | Federated identity and evidence exchange | Interoperable trust network |

The product avoids betting on any single agent protocol. MCP continues to
evolve, while A2A and other standards address different parts of the agent
stack; the stable customer problem is governing delegated authority across
those interfaces.

## Alternatives rejected

### Paid scan credits

Rejected because static scans are easy to substitute and do not create a
durable workflow or buyer urgency.

### Selling a letter-grade dashboard

Rejected because a score is useful evidence but does not enforce approval,
prevent drift, or prove governance.

### Building a full runtime proxy first

Rejected for the first release because it requires broad protocol and hosting
support before developer demand is validated. Lockfile and CI adoption create
the customer relationship and the data model the gateway will later require.

## Measures of success

Before expanding the paid product, verify:

- developers create a lockfile and add the CI check to a real agent project;
- teams review at least one meaningful capability change rather than ignoring
  alerts;
- the semantic diff gives a reviewer enough context to decide without manual
  investigation in most cases;
- three or more founding teams agree to pay for shared monitoring and
  approvals;
- no private target, credential, prompt, or tool-result data is retained by
  the product without explicit design and consent changes.

## Out of scope for the first implementation

- runtime proxy or inline invocation blocking;
- A2A, HTTP, or skill adapters;
- billing integration and self-serve checkout;
- a public reputation score or marketplace ranking;
- behavioral safety guarantees, sandboxing, or secret custody.
