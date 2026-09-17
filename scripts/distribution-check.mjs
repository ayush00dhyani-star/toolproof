#!/usr/bin/env node
/**
 * distribution-check — prove the shipped surfaces agree with each other.
 *
 * Distribution rots quietly. The concrete failures this repo has already hit:
 *   - package.json said 0.3.0 while npm's latest was 0.2.1, so every launch
 *     link installed an older tool than the one the README described;
 *   - the MCP server reported a version that was not the installed one;
 *   - the live directory artifact named a different owner than the ownership
 *     page, and claimed a rule count the catalog does not have;
 *   - `public/` changed on main but the deploy had not been promoted, so the
 *     live metadata described a previous release.
 *
 * None of those break a build. All of them break trust, which is the product.
 * So this asserts, mechanically, that:
 *   1. repo / npm / server.json version topology is coherent;
 *   2. the official-registry name matches `mcpName`, or publish will be rejected;
 *   3. the hosted API, badge, pubkey and metadata endpoints answer;
 *   4. what is deployed is byte-identical to what is committed (deploy drift);
 *   5. every link the discovery documents publish actually resolves.
 *
 * Zero dependencies, Node >= 18. Usage:
 *   node scripts/distribution-check.mjs            # full check
 *   node scripts/distribution-check.mjs --offline  # repo-only, no network
 *
 * Exit 0 = coherent (warnings allowed). Exit 1 = something is provably wrong.
 * Optional env GITHUB_TOKEN adds the GitHub metadata checks.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OFFLINE = process.argv.includes("--offline");
const SITE = "https://toolproof-scan.vercel.app";
const NPM = "https://registry.npmjs.org";
const REGISTRY = "https://registry.modelcontextprotocol.io/v0/servers";
// The registry is in preview and has served both /v0 and /v0.1; try both so a
// version bump there never reads as "Toolproof is missing".
const REGISTRY_FALLBACK = "https://registry.modelcontextprotocol.io/v0.1/servers";
const TIMEOUT = 20_000;

const readJson = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const readText = (p) => readFileSync(resolve(ROOT, p), "utf8");

const results = [];
const ok = (area, detail) => results.push({ level: "ok", area, detail });
const warn = (area, detail) => results.push({ level: "warn", area, detail });
const fail = (area, detail) => results.push({ level: "fail", area, detail });
const skip = (area, detail) => results.push({ level: "skip", area, detail });

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { accept: json ? "application/json" : "*/*", "user-agent": "toolproof-distribution-check" },
  });
  return { res, body: json ? await res.json().catch(() => null) : await res.text() };
}

/* ------------------------------------------------------------------ *
 * 1. version topology: repo vs npm vs server.json
 * ------------------------------------------------------------------ */

const PUBLISHED_PACKAGES = [
  { dir: "packages/toolproof-scan", npm: "toolproof-scan" },
  { dir: "packages/toolproof-mcp", npm: "toolproof-mcp" },
  { dir: "packages/toolproof-lock", npm: "toolproof-lock" },
];

const cmpSemver = (a, b) => {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};

const repoVersions = {};
const npmVersions = {};

async function checkVersions() {
  for (const pkg of PUBLISHED_PACKAGES) {
    repoVersions[pkg.npm] = readJson(`${pkg.dir}/package.json`).version;
  }

  if (OFFLINE) {
    skip("versions", "npm topology not compared (--offline)");
    return;
  }

  for (const pkg of PUBLISHED_PACKAGES) {
    let latest;
    try {
      const { res, body } = await get(`${NPM}/${pkg.npm}`, { json: true });
      if (res.status === 404) {
        fail("versions", `${pkg.npm} is not published on npm`);
        continue;
      }
      if (!res.ok || !body) {
        warn("versions", `${pkg.npm}: npm responded ${res.status}`);
        continue;
      }
      latest = body["dist-tags"]?.latest;
    } catch (e) {
      warn("versions", `${pkg.npm}: npm unreachable (${e.message})`);
      continue;
    }

    npmVersions[pkg.npm] = latest;
    const local = repoVersions[pkg.npm];
    const delta = cmpSemver(local, latest);

    if (delta === 0) {
      ok("versions", `${pkg.npm} ${local} — repo and npm agree`);
    } else if (delta > 0) {
      warn(
        "versions",
        `${pkg.npm}: repo is ${local} but npm's latest is ${latest} — publish pending, so npx still installs the older build`,
      );
    } else {
      fail(
        "versions",
        `${pkg.npm}: repo is ${local} but npm's latest is ${latest} — the published package is AHEAD of the repo`,
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * 2. official MCP Registry manifest
 * ------------------------------------------------------------------ */

function checkServerManifest() {
  const p = "server.json";
  if (!existsSync(resolve(ROOT, p))) {
    fail("registry", "server.json is missing — the official MCP Registry cannot be published");
    return;
  }

  let doc;
  try {
    doc = readJson(p);
  } catch (e) {
    fail("registry", `server.json is not valid JSON (${e.message})`);
    return;
  }

  for (const field of ["$schema", "name", "description", "version", "packages"]) {
    if (doc[field] === undefined || doc[field] === null || doc[field] === "") {
      fail("registry", `server.json is missing required field "${field}"`);
    }
  }
  if (!/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/.test(String(doc.name ?? ""))) {
    fail("registry", `server.json name "${doc.name}" is not reverse-DNS/name shaped`);
  }
  if (!String(doc.name ?? "").startsWith("io.github.")) {
    warn("registry", `"${doc.name}" is not an io.github.* namespace — GitHub auth will not cover it`);
  }
  if (doc.version !== repoVersions["toolproof-mcp"]) {
    fail("registry", `server.json version ${doc.version} != packages/toolproof-mcp ${repoVersions["toolproof-mcp"]}`);
  }

  // The registry verifies npm ownership by matching package.json's mcpName to
  // this name. If they differ, publishing is rejected.
  const mcpPkg = readJson("packages/toolproof-mcp/package.json");
  if (!mcpPkg.mcpName) {
    fail(
      "registry",
      "packages/toolproof-mcp/package.json has no mcpName — the official registry rejects an npm package with no ownership proof",
    );
  } else if (mcpPkg.mcpName !== doc.name) {
    fail("registry", `mcpName "${mcpPkg.mcpName}" != server.json name "${doc.name}" — publish will be rejected`);
  } else {
    ok("registry", `mcpName and server.json name agree (${doc.name})`);
  }

  const entry = (doc.packages ?? []).find((x) => x.registryType === "npm");
  if (!entry) {
    fail("registry", "server.json declares no npm package");
    return;
  }
  if (entry.registryBaseUrl && entry.registryBaseUrl !== NPM) {
    fail("registry", `packages[].registryBaseUrl must be ${NPM} (got ${entry.registryBaseUrl})`);
  }
  if (entry.transport?.type !== "stdio") {
    warn("registry", `npm entry transport is "${entry.transport?.type ?? "missing"}", expected stdio`);
  }
  if (entry.identifier !== mcpPkg.name) {
    fail("registry", `packages[].identifier "${entry.identifier}" != package name "${mcpPkg.name}"`);
  }

  // The registry validates that the referenced package version exists on npm,
  // so a manifest ahead of npm is un-publishable rather than merely stale.
  const onNpm = npmVersions[entry.identifier];
  if (!OFFLINE && onNpm && entry.version !== onNpm) {
    warn(
      "registry",
      `server.json pins ${entry.identifier}@${entry.version} but npm's latest is ${onNpm} — release to npm before publishing to the registry`,
    );
  } else if (!OFFLINE && onNpm) {
    ok("registry", `${entry.identifier}@${entry.version} exists on npm`);
  }
}

/* ------------------------------------------------------------------ *
 * 3. hosted surface
 * ------------------------------------------------------------------ */

async function checkHosted() {
  if (OFFLINE) {
    skip("hosted", "live endpoints not probed (--offline)");
    return;
  }

  // The public key is the root of every signature claim we make.
  try {
    const { res, body } = await get(`${SITE}/api/v1/pubkey`);
    if (res.ok && body.includes("BEGIN PUBLIC KEY")) ok("hosted", "/api/v1/pubkey serves a PEM public key");
    else fail("hosted", `/api/v1/pubkey returned ${res.status} without a PEM key`);
  } catch (e) {
    fail("hosted", `/api/v1/pubkey unreachable (${e.message})`);
  }

  // A real, signed verdict.
  try {
    const target = encodeURIComponent("https://mcp.context7.com/mcp");
    const { res, body } = await get(`${SITE}/api/v1/verify?target=${target}`, { json: true });
    const passport = body?.passport ?? body;
    if (res.ok && passport?.grade && (body?.signature || passport?.signature)) {
      ok("hosted", `/api/v1/verify signs a verdict (grade ${passport.grade}, alg ${body?.alg ?? passport?.alg ?? "?"})`);
    } else if (res.ok && passport?.grade) {
      warn("hosted", "/api/v1/verify returned a grade but no signature — is TOOLPROOF_SIGNING_KEY set?");
    } else {
      fail("hosted", `/api/v1/verify did not return a graded passport (HTTP ${res.status})`);
    }
  } catch (e) {
    fail("hosted", `/api/v1/verify unreachable (${e.message})`);
  }

  // The badge is the acquisition loop: every install is a live verdict.
  try {
    const target = encodeURIComponent("https://mcp.context7.com/mcp");
    const { res, body } = await get(`${SITE}/api/v1/badge?target=${target}`);
    if (res.ok && body.includes("<svg")) ok("hosted", "/api/v1/badge renders SVG");
    else fail("hosted", `/api/v1/badge did not render SVG (HTTP ${res.status})`);
  } catch (e) {
    fail("hosted", `/api/v1/badge unreachable (${e.message})`);
  }

  for (const path of ["/agents.md", "/llms.txt", "/robots.txt", "/sitemap.xml", "/.well-known/security.txt"]) {
    try {
      const { res } = await get(`${SITE}${path}`);
      if (res.ok) ok("hosted", `${path} serves`);
      else fail("hosted", `${path} returned ${res.status}`);
    } catch (e) {
      fail("hosted", `${path} unreachable (${e.message})`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. deploy drift — the committed artifact must equal the deployed one
 * ------------------------------------------------------------------ */

const normalize = (text) => text.replace(/\r\n/g, "\n").trim();
const digest = (text) => createHash("sha256").update(normalize(text)).digest("hex").slice(0, 12);

const DEPLOYED_ARTIFACTS = [
  { local: "public/.well-known/mcp/server-card.json", url: "/.well-known/mcp/server-card.json" },
  { local: "public/.well-known/mcp-directory.json", url: "/.well-known/mcp-directory.json" },
  { local: "public/agents.md", url: "/agents.md" },
];

async function checkDeployDrift() {
  if (OFFLINE) {
    skip("deploy", "deploy drift not compared (--offline)");
    return;
  }
  for (const artifact of DEPLOYED_ARTIFACTS) {
    if (!existsSync(resolve(ROOT, artifact.local))) {
      fail("deploy", `${artifact.local} is missing from the repo`);
      continue;
    }
    const localBody = readText(artifact.local);
    try {
      const { res, body } = await get(`${SITE}${artifact.url}`);
      if (!res.ok) {
        fail("deploy", `${artifact.url} returned ${res.status} — not deployed`);
        continue;
      }
      // Compare parsed JSON where possible so key order and formatting are not
      // mistaken for drift; fall back to normalized text for anything else.
      let same;
      try {
        same = JSON.stringify(JSON.parse(localBody)) === JSON.stringify(JSON.parse(body));
      } catch {
        same = normalize(localBody) === normalize(body);
      }
      if (same) {
        ok("deploy", `${artifact.url} matches the committed file`);
      } else {
        fail(
          "deploy",
          `${artifact.url} differs from the committed file (live ${digest(body)} vs repo ${digest(localBody)}) — main is undeployed, so the live metadata describes an older release`,
        );
      }
    } catch (e) {
      fail("deploy", `${artifact.url} unreachable (${e.message})`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 5. discovery documents — declared tools and published links
 * ------------------------------------------------------------------ */

async function checkDiscoveryDocuments() {
  const cardPath = "public/.well-known/mcp/server-card.json";
  const dirPath = "public/.well-known/mcp-directory.json";

  if (!existsSync(resolve(ROOT, cardPath))) {
    fail("discovery", `${cardPath} is missing — registries cannot index the server without it`);
  } else {
    const card = readJson(cardPath);
    const pkg = readJson("packages/toolproof-mcp/package.json");

    if (card.serverInfo?.version !== pkg.version) {
      fail("discovery", `server card version ${card.serverInfo?.version} != package version ${pkg.version}`);
    } else {
      ok("discovery", `server card matches package version ${pkg.version}`);
    }
    if (!Array.isArray(card.tools) || card.tools.length === 0) {
      fail("discovery", "server card declares no tools");
    }
    for (const tool of card.tools ?? []) {
      if (!tool.name || !tool.inputSchema) {
        fail("discovery", `server card tool "${tool.name ?? "?"}" has no inputSchema`);
      }
    }

    // The card and the directory listing must advertise the same tools, or one
    // of the two surfaces is lying to a different registry.
    if (existsSync(resolve(ROOT, dirPath))) {
      const dir = readJson(dirPath);
      const cardTools = (card.tools ?? []).map((t) => t.name).sort();
      const dirTools = [...(dir.tools ?? [])].sort();
      if (JSON.stringify(cardTools) !== JSON.stringify(dirTools)) {
        fail("discovery", `server card tools [${cardTools.join(", ")}] != directory tools [${dirTools.join(", ")}]`);
      } else {
        ok("discovery", `declared tools agree across card and directory (${cardTools.join(", ")})`);
      }
      // The owner named in machine-readable metadata must be the legal owner.
      if (/dhyani/i.test(JSON.stringify(dir.author ?? {}))) {
        fail("discovery", `mcp-directory.json author "${dir.author?.name}" contradicts the ownership page`);
      } else if (dir.author?.name) {
        ok("discovery", `directory author is "${dir.author.name}"`);
      }
    }
  }

  if (OFFLINE) {
    skip("discovery", "published links not resolved (--offline)");
    return;
  }

  const docs = ["public/llms.txt", "public/agents.md"].filter((f) => existsSync(resolve(ROOT, f)));
  const urls = new Set();
  for (const doc of docs) {
    for (const match of readText(doc).matchAll(/https?:\/\/[^\s)"'<>\]]+/g)) {
      const url = match[0].replace(/[.,;:]+$/, "");
      // A trailing "=" or "?" means a placeholder was stripped from a template
      // such as `?target=<url>`; probing the truncated address only yields a
      // misleading 400, so it is not a link we can check.
      if (/[=?&]$/.test(url)) continue;
      urls.add(url);
    }
  }

  const broken = [];
  const refused = [];
  for (const url of urls) {
    try {
      let res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { "user-agent": "toolproof-distribution-check" },
      });
      // Plenty of hosts refuse HEAD; retry once with GET before deciding.
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT),
          headers: { "user-agent": "toolproof-distribution-check" },
        });
      }
      if (res.status === 401 || res.status === 403) {
        // The host declined the probe (npmjs.com blocks datacenter clients).
        // That is not evidence the link is dead — report it as unchecked.
        refused.push(`${url} → ${res.status}`);
      } else if (res.status >= 400) {
        broken.push(`${url} → ${res.status}`);
      }
    } catch (e) {
      broken.push(`${url} → ${e.message}`);
    }
  }
  if (broken.length) fail("discovery", `published links are broken:\n      ${broken.join("\n      ")}`);
  else ok("discovery", `all ${urls.size} published links resolve`);
  if (refused.length) {
    warn("discovery", `${refused.length} link(s) refused the probe (unchecked, not broken): ${refused.join(", ")}`);
  }
}

/* ------------------------------------------------------------------ *
 * 6. registry presence + GitHub metadata
 * ------------------------------------------------------------------ */

async function checkRegistryPresence() {
  if (OFFLINE || !existsSync(resolve(ROOT, "server.json"))) return;
  const name = readJson("server.json").name;
  try {
    let body = null;
    for (const base of [REGISTRY, REGISTRY_FALLBACK]) {
      const attempt = await get(`${base}?search=toolproof`, { json: true });
      if (attempt.res.ok) {
        body = attempt.body;
        break;
      }
    }
    if (!body) {
      skip("presence", "MCP registry API did not answer on /v0 or /v0.1");
      return;
    }
    const servers = Array.isArray(body?.servers) ? body.servers : [];
    const found = servers.some((s) => (s?.server?.name ?? s?.name) === name);
    if (found) {
      ok("presence", `${name} is listed in the official MCP Registry`);
    } else {
      warn(
        "presence",
        `${name} is not in the official MCP Registry yet — after the npm release run: mcp-publisher login github && mcp-publisher publish`,
      );
    }
  } catch (e) {
    skip("presence", `MCP registry unreachable (${e.message})`);
  }
}

async function checkGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    skip("github", "set GITHUB_TOKEN to check repo topics, homepage and releases");
    return;
  }
  if (!existsSync(resolve(ROOT, "server.json"))) return;

  const repoUrl = readJson("server.json").repository?.url ?? "";
  const slug = repoUrl.replace(/^https?:\/\/github\.com\//, "");
  if (!slug.includes("/")) {
    skip("github", "could not derive a GitHub slug");
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "user-agent": "toolproof",
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) {
      skip("github", `GitHub API responded ${res.status}`);
      return;
    }
    const repo = await res.json();
    if (!repo.homepage) fail("github", `${slug} has no homepage — the repo does not link to the live site`);
    else ok("github", `homepage → ${repo.homepage}`);
    if (!Array.isArray(repo.topics) || repo.topics.length === 0) {
      fail("github", `${slug} has no topics — it is invisible on github.com/topics`);
    } else {
      ok("github", `topics: ${repo.topics.join(", ")}`);
    }
    if (repo.license?.spdx_id === "NOASSERTION") {
      warn("github", "GitHub does not recognise the LICENSE file — directories that read license metadata will skip it");
    }
  } catch (e) {
    skip("github", `GitHub unreachable (${e.message})`);
  }
}

/* ------------------------------------------------------------------ */

const SYMBOL = { ok: "  ok  ", warn: " warn ", fail: " FAIL ", skip: " skip " };

async function main() {
  process.stdout.write("toolproof · distribution check\n");
  process.stdout.write(`root: ${ROOT}${OFFLINE ? "  (offline)" : ""}\n\n`);

  await checkVersions();
  checkServerManifest();
  await checkHosted();
  await checkDeployDrift();
  await checkDiscoveryDocuments();
  await checkRegistryPresence();
  await checkGitHub();

  for (const r of results) {
    process.stdout.write(`[${SYMBOL[r.level]}] ${r.area.padEnd(10)} ${r.detail}\n`);
  }

  const failures = results.filter((r) => r.level === "fail");
  const warnings = results.filter((r) => r.level === "warn");
  process.stdout.write(
    `\n${results.length} checks · ${results.filter((r) => r.level === "ok").length} ok · ` +
      `${warnings.length} warn · ${failures.length} fail\n`,
  );

  if (failures.length) {
    process.stdout.write("\nDistribution is inconsistent. Fix the FAIL lines above.\n");
    process.exit(1);
  }
  process.stdout.write("\nAll distributed surfaces agree.\n");
}

main().catch((e) => {
  process.stderr.write(`distribution-check crashed: ${e?.stack ?? e}\n`);
  process.exit(1);
});