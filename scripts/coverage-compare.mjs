// CI coverage gate: total line coverage may not drop more than MAX_DROP percentage points
// below the latest develop baseline (coverage-summary.json from the last develop run).
// Usage: node scripts/coverage-compare.mjs <baseline.json> <current.json>
import { existsSync, readFileSync } from "node:fs";

const MAX_DROP = 0.5;
const [baselinePath, currentPath] = process.argv.slice(2);

if (!baselinePath || !currentPath) {
  console.error("usage: coverage-compare.mjs <baseline.json> <current.json>");
  process.exit(2);
}
if (!existsSync(baselinePath)) {
  console.log("No develop baseline yet; skipping the coverage drop check.");
  process.exit(0);
}

const linesPct = (path) => JSON.parse(readFileSync(path, "utf8")).total.lines.pct;
const baseline = linesPct(baselinePath);
const current = linesPct(currentPath);
const drop = Math.round((baseline - current) * 100) / 100;

console.log(
  `Line coverage: develop ${baseline}% → this PR ${current}% (drop ${drop} pp, max ${MAX_DROP})`,
);
if (drop > MAX_DROP) {
  console.error(`Coverage dropped ${drop} pp, more than the allowed ${MAX_DROP} pp.`);
  process.exit(1);
}
