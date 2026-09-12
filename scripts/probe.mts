import { scanTarget } from "../src/lib/scan";

const args = process.argv.slice(2);
const targets = args.length
  ? args
  : [
      "https://mcp.context7.com/mcp",
      "https://learn.microsoft.com/api/mcp",
      "https://api.githubcopilot.com/mcp",
      "https://petstore3.swagger.io/api/v3",
    ];

for (const t of targets) {
  try {
    const r = await scanTarget(t);
    console.log(
      `\n=== ${t}\n    kind=${r.kind} state=${r.state} score=${r.score} grade=${r.grade} (${r.durationMs}ms)`,
    );
    console.log(`    summary: ${r.summary}`);
    for (const f of r.findings)
      console.log(`    [${f.sev}] ${f.rule} ${f.title} @ ${f.where}`);
    for (const p of r.positives) console.log(`    + ${p}`);
  } catch (e) {
    console.log(`\n=== ${t}\n    ERROR: ${e instanceof Error ? e.message : e}`);
  }
}
