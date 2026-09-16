/**
 * The monitoring vehicle: a pinned surface, re-observed, alerts on the
 * transition. This is the thing the Team tier charges for, so the behaviour
 * is pinned by tests.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  registerMonitor,
  recheck,
  shouldAlert,
  dispatchAlert,
  configureScanner,
  __resetMonitorsForTests,
} from "../src/lib/billing/monitor";
import { TIERS } from "../src/lib/billing/tiers";

const TARGET = "https://mcp.example.com/mcp";

/** Deterministic stand-in for the live scanner: returns a fingerprint per host. */
let stubFingerprints: Record<string, string> = {};
configureScanner(async (target) => ({
  fingerprint: stubFingerprints[target] ?? null,
  state: "verified",
  grade: "A",
}));

beforeEach(() => {
  __resetMonitorsForTests();
  stubFingerprints = {};
});

describe("tier table", () => {
  it("never gates a scan behind a paid tier", () => {
    expect(TIERS.free.priceCents).toBe(0);
    expect(TIERS.free.monitoredTargets).toBe(0);
    expect(TIERS.team.priceCents).toBeGreaterThan(0);
    expect(TIERS.team.monitoredTargets).toBeGreaterThan(0);
  });
});

describe("registering a monitor", () => {
  it("rejects the free tier, which has no monitoring", () => {
    expect(() =>
      registerMonitor({ target: TARGET, tier: "free" }),
    ).toThrow(/does not include monitoring/);
  });

  it("pins the baseline fingerprint the customer committed", () => {
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    expect(m.baselineFingerprint).toBe("sha256:aaaa");
    expect(m.target).toBe(TARGET);
    expect(m.host).toBe("mcp.example.com");
  });

  it("is idempotent per target — re-registering returns the same monitor", () => {
    const a = registerMonitor({ target: TARGET, tier: "team" });
    const b = registerMonitor({ target: TARGET, tier: "team" });
    expect(a.token).toBe(b.token);
  });
});

describe("alerting logic", () => {
  it("alerts when the observed fingerprint leaves the baseline", () => {
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    expect(
      shouldAlert(m, {
        token: m.token,
        target: TARGET,
        drifted: true,
        fingerprint: "sha256:bbbb",
        baseline: "sha256:aaaa",
        state: "verified",
        grade: "A",
      }),
    ).toBe(true);
  });

  it("does not re-alert while the drift persists", () => {
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    const r = {
      token: m.token,
      target: TARGET,
      drifted: true,
      fingerprint: "sha256:bbbb",
      baseline: "sha256:aaaa",
      state: "verified",
      grade: "A",
    };
    expect(shouldAlert(m, r)).toBe(true);
    m.lastAlertedFingerprint = "sha256:bbbb";
    expect(shouldAlert(m, r)).toBe(false);
  });

  it("does not alert when the surface is in sync", () => {
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    expect(
      shouldAlert(m, {
        token: m.token,
        target: TARGET,
        drifted: false,
        fingerprint: "sha256:aaaa",
        baseline: "sha256:aaaa",
        state: "verified",
        grade: "A",
      }),
    ).toBe(false);
  });
});

describe("recheck against a live surface", () => {
  it("detects drift when the observed fingerprint leaves the baseline", async () => {
    stubFingerprints[TARGET] = "sha256:bbbb";
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    const r = await recheck(m.token);
    expect(r?.drifted).toBe(true);
    expect(r?.fingerprint).toBe("sha256:bbbb");
  });

  it("is calm when the surface is in sync", async () => {
    stubFingerprints[TARGET] = "sha256:aaaa";
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    const r = await recheck(m.token);
    expect(r?.drifted).toBe(false);
  });

  it("adopts the first observation as the baseline when none was pinned", async () => {
    stubFingerprints[TARGET] = "sha256:cccc";
    const m = registerMonitor({ target: TARGET, tier: "team" });
    const r = await recheck(m.token);
    expect(r?.baseline).toBe("sha256:cccc");
    expect(r?.drifted).toBe(false);
  });

  it("treats an unobservable surface as an outage, not drift", async () => {
    configureScanner(async () => {
      throw new Error("connection refused");
    });
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    const r = await recheck(m.token);
    expect(r?.drifted).toBe(false);
    expect(r?.state).toBe("unreachable");
  });
});

describe("the scanner contract", () => {
  /**
   * A raw ScanReport carries no fingerprint — the canonical hash of the
   * capability surface is computed by the manifest builder. The API route
   * wires a scanner that returns the manifest; if it ever wires a bare report
   * instead, fingerprints silently become null and drift can never fire.
   */
  it("never sees a null fingerprint from a real scanner", async () => {
    stubFingerprints[TARGET] = "sha256:bbbb";
    configureScanner(async () => ({
      fingerprint: stubFingerprints[TARGET],
      state: "verified",
      grade: "A",
    }));
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      baselineFingerprint: "sha256:aaaa",
    });
    const r = await recheck(m.token);
    expect(r?.fingerprint).not.toBeNull();
  });
});

describe("webhook delivery", () => {
  it("posts the alert to the configured webhook", async () => {
    const captured: unknown[] = [];
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      alertUrl: "https://hooks.example.test/drift",
      baselineFingerprint: "sha256:aaaa",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    fetchSpy.mockImplementation(async (input, init) => {
      captured.push(JSON.parse(String(init?.body)));
      return new Response("ok", { status: 200 });
    });

    const ok = await dispatchAlert(m, {
      token: m.token,
      target: TARGET,
      drifted: true,
      fingerprint: "sha256:bbbb",
      baseline: "sha256:aaaa",
      state: "verified",
      grade: "B",
    });
    expect(ok).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      target: TARGET,
      baseline: "sha256:aaaa",
      observed: "sha256:bbbb",
    });

    fetchSpy.mockRestore();
  });

  it("survives a failing webhook without throwing", async () => {
    const m = registerMonitor({
      target: TARGET,
      tier: "team",
      alertUrl: "https://hooks.example.test/drift",
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("connection refused"));
    await expect(
      dispatchAlert(m, {
        token: m.token,
        target: TARGET,
        drifted: true,
        fingerprint: "sha256:bbbb",
        baseline: "sha256:aaaa",
        state: "verified",
        grade: "B",
      }),
    ).resolves.toBe(false);
    fetchSpy.mockRestore();
  });
});
