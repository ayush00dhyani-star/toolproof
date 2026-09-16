import { createHash } from "node:crypto";
import { stableStringify } from "../sign";
import type { ScanReport } from "../types";

/**
 * Canonical capability manifest — the server-side half of the Toolproof Lock
 * contract. `buildManifest` reads the MCP/OpenAPI surface that `scanTarget`
 * recorded in `report.meta.surface` and normalizes it into the exact shape
 * `GET /api/v1/manifest` serves.
 *
 * This module is the ONLY authority for `fingerprint`: the fingerprint is
 * computed from a fixed `core` object and stable-stringified JSON. Consumers
 * (CLI, lockfiles, diffs) treat both the manifest shape and its fingerprint as
 * opaque-but-stable.
 */

/** One tool as advertised on the model-visible MCP surface. */
export interface ManifestTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

/** One prompt as advertised on the model-visible MCP surface. */
export interface ManifestPrompt {
  name: string;
  description?: string;
}

/** One resource as advertised on the model-visible MCP surface. */
export interface ManifestResource {
  name: string;
  uri: string;
  description?: string;
}

/** OpenAPI surface summary (present only when a spec was found). */
export interface ManifestOpenApi {
  specUrl: string;
  servers: string[];
  paths: string[];
}

/** Handshake `serverInfo` block, included only when it carries data. */
export interface ManifestServerInfo {
  name?: string;
  version?: string;
}

export interface CapabilityManifest {
  manifestVersion: 1;
  target: string;
  host: string;
  kind: ScanReport["kind"];
  state: ScanReport["state"];
  grade: string;
  score: number;
  generatedAt: string;
  fingerprint: string;
  ruleIds: string[];
  outboundHosts: string[];
  /** True when the enumerated surface hit the scanner's per-list cap. */
  truncated?: true;
  serverInfo?: ManifestServerInfo;
  instructions?: string;
  tools?: ManifestTool[];
  prompts?: ManifestPrompt[];
  resources?: ManifestResource[];
  openapi?: ManifestOpenApi;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Non-empty string, else undefined. Empty strings are treated as absent. */
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Trailing sentence punctuation that URL-matching tends to swallow. */
const TRAILING = /[.,;:!?)\]}"'`]+$/;
const URL_RE = /https?:\/\/[^\s"'`<>()[\]{},;]+/gi;

function hostOf(target: string): string | undefined {
  try {
    // Hostname only, ignoring the port: a URL to the same host on a different
    // port is still the target's own host, not a new outbound destination.
    return new URL(target).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Distinct `host[:port]` values of every http(s) URL found in the supplied
 * text sources, excluding the target's own host. Sorted ascending.
 */
export function outboundHostsOf(
  target: string,
  sources: readonly (string | null | undefined)[],
): string[] {
  const own = hostOf(target);
  const hosts = new Set<string>();
  for (const src of sources) {
    if (typeof src !== "string" || src.length === 0) continue;
    const hits = src.match(URL_RE);
    if (!hits) continue;
    for (const hit of hits) {
      let parsed: URL;
      try {
        parsed = new URL(hit.replace(TRAILING, ""));
      } catch {
        continue;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      const host = parsed.host.toLowerCase();
      if (!host || parsed.hostname.toLowerCase() === own) continue;
      hosts.add(host);
    }
  }
  return [...hosts].sort();
}

function normTools(value: unknown): ManifestTool[] {
  if (!Array.isArray(value)) return [];
  const out: ManifestTool[] = [];
  for (const raw of value) {
    if (!isObj(raw)) continue;
    const name = str(raw.name);
    if (!name) continue;
    const tool: ManifestTool = { name };
    const description = str(raw.description);
    if (description) tool.description = description;
    if (raw.inputSchema !== undefined && raw.inputSchema !== null)
      tool.inputSchema = raw.inputSchema;
    if (raw.outputSchema !== undefined && raw.outputSchema !== null)
      tool.outputSchema = raw.outputSchema;
    out.push(tool);
  }
  return out.sort(byName);
}

function normPrompts(value: unknown): ManifestPrompt[] {
  if (!Array.isArray(value)) return [];
  const out: ManifestPrompt[] = [];
  for (const raw of value) {
    if (!isObj(raw)) continue;
    const name = str(raw.name);
    if (!name) continue;
    const prompt: ManifestPrompt = { name };
    const description = str(raw.description);
    if (description) prompt.description = description;
    out.push(prompt);
  }
  return out.sort(byName);
}

function normResources(value: unknown): ManifestResource[] {
  if (!Array.isArray(value)) return [];
  const out: ManifestResource[] = [];
  for (const raw of value) {
    if (!isObj(raw)) continue;
    const name = str(raw.name);
    const uri = str(raw.uri);
    if (!name || !uri) continue;
    const resource: ManifestResource = { name, uri };
    const description = str(raw.description);
    if (description) resource.description = description;
    out.push(resource);
  }
  return out.sort((a, b) => (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0));
}

function normServerInfo(value: unknown): ManifestServerInfo | undefined {
  if (!isObj(value)) return undefined;
  const name = str(value.name);
  const version = str(value.version);
  if (!name && !version) return undefined;
  return { ...(name ? { name } : {}), ...(version ? { version } : {}) };
}

function normOpenApi(value: unknown): ManifestOpenApi | undefined {
  if (!isObj(value)) return undefined;
  const specUrl = str(value.specUrl);
  if (!specUrl) return undefined;
  const servers = Array.isArray(value.servers)
    ? value.servers.filter((s): s is string => typeof s === "string")
    : [];
  const paths = Array.isArray(value.paths)
    ? value.paths.filter((p): p is string => typeof p === "string")
    : [];
  return { specUrl, servers, paths };
}

function surfaceOf(r: ScanReport): Record<string, unknown> | undefined {
  const meta = isObj(r.meta) ? r.meta : {};
  const surface = meta.surface;
  return isObj(surface) ? surface : undefined;
}

export function buildManifest(r: ScanReport): CapabilityManifest {
  const surface = surfaceOf(r);

  const tools = normTools(surface?.tools);
  const prompts = normPrompts(surface?.prompts);
  const resources = normResources(surface?.resources);
  const instructions = str(surface?.instructions);
  const serverInfo = normServerInfo(surface?.serverInfo);
  const openapi = normOpenApi(surface?.openapi);
  const truncated = surface?.truncated === true;

  const outboundHosts = outboundHostsOf(r.target, [
    instructions,
    ...tools.map((t) => t.description),
    ...prompts.map((p) => p.description),
    ...resources.map((res) => res.description),
    ...resources.map((res) => res.uri),
    ...(openapi?.servers ?? []),
  ]);

  const ruleIds = [...new Set(r.findings.map((f) => f.rule))].sort();

  // The exact object the fingerprint is computed over. Optional/empty surface
  // keys fall back to empty values so the hash is stable across absent keys.
  const core = {
    v: 1,
    kind: r.kind,
    serverInfo: serverInfo ?? null,
    instructions: instructions ?? "",
    tools,
    prompts,
    resources,
    outboundHosts,
    openapi: openapi ?? null,
  };

  const fingerprint =
    "sha256:" +
    createHash("sha256").update(stableStringify(core)).digest("hex");

  return {
    manifestVersion: 1,
    target: r.target,
    host: r.host,
    kind: r.kind,
    state: r.state,
    grade: r.grade,
    score: r.score,
    generatedAt: r.scannedAt,
    fingerprint,
    ruleIds,
    outboundHosts,
    ...(truncated ? { truncated: true as const } : {}),
    ...(serverInfo ? { serverInfo } : {}),
    ...(instructions ? { instructions } : {}),
    ...(tools.length > 0 ? { tools } : {}),
    ...(prompts.length > 0 ? { prompts } : {}),
    ...(resources.length > 0 ? { resources } : {}),
    ...(openapi ? { openapi } : {}),
  };
}
