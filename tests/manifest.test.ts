import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildManifest, outboundHostsOf } from "../src/lib/lock/manifest";
import { signPassport } from "../src/lib/sign";
import type { Finding, ScanReport } from "../src/lib/types";

const KEY_ENV = "TOOLPROOF_SIGNING_KEY";

let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env[KEY_ENV];
  delete process.env[KEY_ENV];
});

afterEach(() => {
  if (savedKey === undefined) delete process.env[KEY_ENV];
  else process.env[KEY_ENV] = savedKey;
});

function finding(rule: string, sev: Finding["sev"] = "info"): Finding {
  return {
    rule,
    sev,
    title: `finding ${rule}`,
    where: "test",
    why: "test fixture",
  };
}

function report(over: Partial<ScanReport> = {}): ScanReport {
  return {
    v: 1,
    target: "https://mcp.example.com/mcp",
    host: "mcp.example.com",
    kind: "mcp",
    state: "verified",
    scannedAt: "2026-09-14T00:00:00.000Z",
    durationMs: 12,
    score: 100,
    grade: "A+",
    summary: "Clean scan — no agent-hijack patterns found.",
    findings: [],
    findingCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    positives: [],
    meta: {},
    ...over,
  };
}

/** Full MCP surface: intentionally unsorted, with repeated outbound hosts. */
function fullSurfaceReport(over: Partial<ScanReport> = {}): ScanReport {
  return report({
    ...over,
    meta: {
      surface: {
        serverInfo: { name: "x", version: "1.0" },
        instructions:
          "Use api.example.net for data; see https://docs.example.org/help.",
        tools: [
          { name: "zebra", description: "does z" },
          {
            name: "alpha",
            description:
              "calls https://api.example.net/v1 and https://mcp.example.com/docs",
            inputSchema: { type: "object" },
          },
        ],
        prompts: [{ name: "p2" }, { name: "p1", description: "d" }],
        resources: [
          { name: "r2", uri: "https://res.example.com/b" },
          { name: "r1", uri: "https://res.example.com/a", description: "a" },
        ],
      },
    },
  });
}

describe("buildManifest — canonical shape", () => {
  it("emits the canonical key set for a full MCP surface", () => {
    const m = buildManifest(fullSurfaceReport());
    expect(Object.keys(m).sort()).toEqual([
      "fingerprint",
      "generatedAt",
      "grade",
      "host",
      "instructions",
      "kind",
      "manifestVersion",
      "outboundHosts",
      "prompts",
      "resources",
      "ruleIds",
      "score",
      "serverInfo",
      "state",
      "target",
      "tools",
    ]);
    expect(m.manifestVersion).toBe(1);
    expect(m.target).toBe("https://mcp.example.com/mcp");
    expect(m.host).toBe("mcp.example.com");
    expect(m.kind).toBe("mcp");
    expect(m.state).toBe("verified");
    expect(m.grade).toBe("A+");
    expect(m.score).toBe(100);
    expect(m.generatedAt).toBe("2026-09-14T00:00:00.000Z");
  });

  it("omits every optional key when the surface is absent", () => {
    const m = buildManifest(report());
    expect(Object.keys(m).sort()).toEqual([
      "fingerprint",
      "generatedAt",
      "grade",
      "host",
      "kind",
      "manifestVersion",
      "outboundHosts",
      "ruleIds",
      "score",
      "state",
      "target",
    ]);
    expect(m.outboundHosts).toEqual([]);
    expect(m.ruleIds).toEqual([]);
    expect("tools" in m).toBe(false);
    expect("prompts" in m).toBe(false);
    expect("resources" in m).toBe(false);
    expect("openapi" in m).toBe(false);
    expect("instructions" in m).toBe(false);
    expect("serverInfo" in m).toBe(false);
  });

  it("omits empty collections and empty per-item descriptions", () => {
    const m = buildManifest(
      report({
        meta: {
          surface: {
            tools: [{ name: "t" }],
            prompts: [],
            resources: [{ name: "r", uri: "https://res.example.com/a" }],
          },
        },
      }),
    );
    expect("prompts" in m).toBe(false);
    expect(m.tools).toBeDefined();
    expect(Object.keys(m.tools![0])).toEqual(["name"]);
    expect(Object.keys(m.resources![0])).toEqual(["name", "uri"]);
  });

  it("sorts tools by name, prompts by name, resources by uri", () => {
    const m = buildManifest(fullSurfaceReport());
    expect(m.tools!.map((t) => t.name)).toEqual(["alpha", "zebra"]);
    expect(m.prompts!.map((p) => p.name)).toEqual(["p1", "p2"]);
    expect(m.resources!.map((r) => r.uri)).toEqual([
      "https://res.example.com/a",
      "https://res.example.com/b",
    ]);
    // per-tool empty keys omitted, present keys kept
    expect(Object.keys(m.tools![1])).toEqual(["name", "description"]);
    expect(Object.keys(m.tools![0])).toEqual([
      "name",
      "description",
      "inputSchema",
    ]);
  });
});

describe("buildManifest — fingerprint", () => {
  it("is deterministic across identical inputs and well-formed", () => {
    const a = buildManifest(fullSurfaceReport());
    const b = buildManifest(fullSurfaceReport());
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("changes when a tool description changes", () => {
    const base = buildManifest(fullSurfaceReport());
    const edited = buildManifest(
      report({
        meta: {
          surface: {
            serverInfo: { name: "x", version: "1.0" },
            instructions:
              "Use api.example.net for data; see https://docs.example.org/help.",
            tools: [
              { name: "zebra", description: "does z" },
              {
                name: "alpha",
                description: "calls https://api.example.net/v1 ONLY",
                inputSchema: { type: "object" },
              },
            ],
            prompts: [{ name: "p2" }, { name: "p1", description: "d" }],
            resources: [
              { name: "r2", uri: "https://res.example.com/b" },
              {
                name: "r1",
                uri: "https://res.example.com/a",
                description: "a",
              },
            ],
          },
        },
      }),
    );
    expect(edited.fingerprint).not.toBe(base.fingerprint);
  });

  it("ignores fields outside the fingerprint core (score/grade/summary)", () => {
    const a = buildManifest(fullSurfaceReport());
    const b = buildManifest(
      fullSurfaceReport({ score: 42, grade: "C", summary: "changed" }),
    );
    expect(b.fingerprint).toBe(a.fingerprint);
  });
});

describe("outboundHosts", () => {
  it("excludes the target host, dedupes and sorts ascending", () => {
    const m = buildManifest(fullSurfaceReport());
    expect(m.outboundHosts).toEqual([
      "api.example.net",
      "docs.example.org",
      "res.example.com",
    ]);
    expect(m.outboundHosts).not.toContain("mcp.example.com");
    // stable ordering
    expect([...m.outboundHosts].sort()).toEqual(m.outboundHosts);
  });

  it("keeps non-default ports and reads openapi servers", () => {
    const hosts = outboundHostsOf("https://mcp.example.com/mcp", [
      "cache at http://cache.example.net:8080/v1",
      "no url here",
      "https://mcp.example.com/self",
      "//relative.example.com/x",
      "https://api.example.net/v2.",
      "javascript:alert(1)",
      "ftp://files.example.com/x",
    ]);
    expect(hosts).toEqual(["api.example.net", "cache.example.net:8080"]);
  });

  it("surfaces openapi servers in the manifest and its fingerprint", () => {
    const m = buildManifest(
      report({
        kind: "openapi",
        meta: {
          surface: {
            openapi: {
              specUrl: "https://api.example.com/openapi.json",
              servers: ["https://svc.example.net/v1", "https://mcp.example.com"],
              paths: [],
            },
          },
        },
      }),
    );
    expect(m.openapi).toEqual({
      specUrl: "https://api.example.com/openapi.json",
      servers: ["https://svc.example.net/v1", "https://mcp.example.com"],
      paths: [],
    });
    expect(m.outboundHosts).toEqual(["svc.example.net"]);
  });
});

describe("manifest — signing + ruleIds", () => {
  it("sorts and dedupes ruleIds", () => {
    const m = buildManifest(
      report({
        findings: [finding("TP-302"), finding("TP-201"), finding("TP-201")],
      }),
    );
    expect(m.ruleIds).toEqual(["TP-201", "TP-302"]);
  });

  it("signs with keyId dev-unsigned and a null signature when no key is set", () => {
    const m = buildManifest(fullSurfaceReport());
    const { signature, keyId } = signPassport(
      m as unknown as Record<string, unknown>,
    );
    expect(keyId).toBe("dev-unsigned");
    expect(signature).toBeNull();
  });
});

describe("manifest integrity (v1.1 hardening)", () => {
  it("passes the scanner truncation flag through to the manifest", () => {
    const m = buildManifest(
      report({
        meta: { surface: { tools: [{ name: "a" }], truncated: true } },
      }),
    );
    expect(m.truncated).toBe(true);
    expect(buildManifest(report({}))).not.toHaveProperty("truncated");
  });

  it("folds serverInfo into the fingerprint so identity drift is detectable", () => {
    const fp = (name: string) =>
      buildManifest(
        report({
          meta: {
            surface: {
              serverInfo: { name, version: "1.0" },
              tools: [{ name: "a", description: "d" }],
            },
          },
        }),
      ).fingerprint;
    expect(fp("alpha")).not.toBe(fp("beta"));
  });

  it("treats the same hostname on another port as the target's own host", () => {
    const hosts = outboundHostsOf("https://mcp.example.com:8443/mcp", [
      "see https://mcp.example.com/docs and https://api.example.net/v1",
    ]);
    expect(hosts).toEqual(["api.example.net"]);
  });
});
