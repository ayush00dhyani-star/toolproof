import { assertPublicHost, fetchX, normalizeTarget } from "./net";
import { probeMcp } from "./mcp";
import { huntOpenApi } from "./openapi";
import { SEVS, SEV_WEIGHT, gradeScore } from "./score";
import { scanSchema, scanText } from "./rules";
import type { Finding, ScanKind, ScanReport, Sev } from "./types";

interface CacheEntry {
  report: ScanReport;
  at: number;
}
const CACHE = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

function cacheKey(target: string, kind: string) {
  return `${kind}::${target}`;
}

export function getCached(raw: string, kind: ScanKind): ScanReport | null {
  const e = CACHE.get(cacheKey(raw, kind));
  if (e && Date.now() - e.at < TTL) return e.report;
  return null;
}

function summarize(
  state: ScanReport["state"],
  failReason: string,
  counts: Record<Sev, number>,
  findings: Finding[],
): string {
  if (state === "unverified") return `Unverified — ${failReason}.`;
  const worst = findings.find((f) => f.sev === "critical")
    ?? findings.find((f) => f.sev === "high");
  if (worst) {
    const hot = counts.critical + counts.high;
    return `Hijack risk: ${hot} high-or-above finding${hot === 1 ? "" : "s"}. Worst: ${worst.title.toLowerCase()}. Treat as hostile until remediated.`;
  }
  const minor = counts.medium + counts.low;
  if (minor > 0)
    return `No hijack patterns, ${minor} item${minor === 1 ? "" : "s"} worth a human look.`;
  return "Clean scan — no agent-hijack patterns found.";
}

export async function scanTarget(
  raw: string,
  kind: ScanKind = "auto",
): Promise<ScanReport> {
  const cached = getCached(raw, kind);
  if (cached) return cached;

  const t0 = Date.now();
  const u = normalizeTarget(raw);
  await assertPublicHost(u);

  const findings: Finding[] = [];
  const positives: string[] = [];
  const meta: Record<string, unknown> = {};
  let resolved: ScanReport["kind"] = "unknown";
  let state: ScanReport["state"] = "unverified";
  let failReason = "no MCP or OpenAPI surface detected";

  if (u.protocol === "http:") {
    findings.push({
      rule: "TP-201",
      sev: "critical",
      title: "Plaintext transport",
      where: "scheme",
      evidence: u.toString(),
      why: "Agent traffic over http can be read and rewritten by anyone on the path — including the tool responses the agent will trust.",
    });
  } else {
    positives.push("HTTPS enforced");
  }

  if (kind !== "api") {
    const mcp = await probeMcp(u);
    const mcpMeta: Record<string, unknown> = {
      serverInfo: mcp.serverInfo,
      toolCount: mcp.toolCount,
      error: mcp.error,
      authRequired: mcp.authRequired,
    };
    meta.mcp = mcpMeta;
    if (mcp.authRequired) {
      positives.push(
        "Authentication enforced — anonymous handshake rejected (TP-203)",
      );
    } else if (mcp.ok) {
      findings.push({
        rule: "TP-202",
        sev: "info",
        title: "No authentication observed",
        where: "initialize",
        evidence: mcp.serverInfo?.name ?? "handshake accepted anonymously",
        why: "The server completed an MCP handshake with no credentials. Fine for public data tools — dangerous for anything with write access.",
      });
      const tools = mcp.tools ?? [];
      for (const tool of tools) {
        findings.push(...scanText(`tools/${tool.name}`, tool.description ?? ""));
        findings.push(...scanSchema(`tools/${tool.name}`, tool.schema));
      }
      if (mcp.instructions) {
        findings.push(...scanText("server instructions", mcp.instructions));
        positives.push("Server instructions captured and reviewed");
      }
      resolved = "mcp";
      state = "verified";
      mcpMeta.toolNames = tools.map((t) => t.name);
      positives.push(
        `MCP surface verified — ${mcp.toolCount ?? tools.length} tool(s) inspected`,
      );
    } else if (kind === "mcp") {
      failReason = mcp.error ?? "MCP handshake failed";
    }
  }

  if (state === "unverified" && kind !== "mcp") {
    try {
      const api = await huntOpenApi(u);
      if (api.ok) {
        resolved = "openapi";
        state = "verified";
        meta.openapi = {
          specUrl: api.specUrl,
          paths: api.pathCount,
          servers: api.servers,
        };
        positives.push(`Machine-readable spec found (${api.specUrl})`);
        if (api.hasSecurity) positives.push("Auth declared in spec");
        else
          findings.push({
            rule: "TP-302",
            sev: "medium",
            title: "No security schemes declared",
            where: "spec.security / components.securitySchemes",
            why: "The spec declares no auth. If the API is genuinely open, document that choice; if not, endpoints are exposed.",
          });
        for (const s of api.servers ?? []) {
          if (String(s).startsWith("http:"))
            findings.push({
              rule: "TP-303",
              sev: "critical",
              title: "Plaintext server URL in spec",
              where: "spec.servers",
              evidence: String(s),
              why: "Agents may route traffic to the plaintext server advertised in the spec.",
            });
        }
        findings.push(
          ...scanText("spec.info", JSON.stringify(api.info ?? "")),
        );
        for (const d of api.descriptions ?? [])
          findings.push(...scanText("spec operations", d));
        for (const p of api.suspectParams ?? [])
          findings.push({
            rule: "TP-304",
            sev: "medium",
            title: "Credential-shaped parameter",
            where: p.where,
            evidence: p.name,
            why: "Credentials in query/path parameters leak into logs, referrers and agent transcripts.",
          });
      }
    } catch {
      /* fall through to reachability */
    }
  }

  if (state === "unverified") {
    const mcpMeta = meta.mcp as { authRequired?: boolean } | undefined;
    if (mcpMeta?.authRequired) {
      failReason = "auth-gated — anonymous handshake rejected, tool surface not enumerable";
    } else {
      try {
        const res = await fetchX(u.origin, { timeoutMs: 6000 });
        meta.http = { status: res.status };
        failReason = `reachable (HTTP ${res.status}) but ${failReason}`;
      } catch {
        failReason = `host unreachable — ${failReason}`;
      }
    }
  }

  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const k = `${f.rule}|${f.where}|${f.evidence ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let score = 100;
  for (const f of deduped) score -= SEV_WEIGHT[f.sev];
  score = Math.max(0, Math.min(100, score));

  const findingCounts = Object.fromEntries(
    SEVS.map((s) => [s, deduped.filter((f) => f.sev === s).length]),
  ) as Record<Sev, number>;

  const report: ScanReport = {
    v: 1,
    target: u.toString(),
    host: u.host,
    kind: resolved,
    state,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    score,
    grade: state === "verified" ? gradeScore(score) : "—",
    summary: summarize(state, failReason, findingCounts, deduped),
    findings: deduped,
    findingCounts,
    positives,
    meta,
  };
  CACHE.set(cacheKey(raw, kind), { report, at: Date.now() });
  return report;
}
