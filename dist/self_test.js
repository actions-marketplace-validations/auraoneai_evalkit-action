import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJudgeConfig, runEvalkit } from "./runner.js";
import { buildComment, postPullRequestComment } from "./pr_comment.js";
const root = join(tmpdir(), `evalkit-action-self-test-${process.pid}`);
const bin = join(root, "bin");
mkdirSync(bin, { recursive: true });
writeFileSync(join(root, "rubric.jsonl"), "{}\n");
writeFileSync(join(root, "responses.jsonl"), "{}\n");
writeFileSync(join(bin, "evalkit"), `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "score") {
  if (!process.env.EVALKIT_JUDGE_CONFIG_PATH || !process.env.EVALKIT_JUDGE_CONFIG) process.exit(3);
  const out = args[args.indexOf("--out") + 1];
  fs.writeFileSync(out, JSON.stringify({ schema_version: "test", summary: { average_score: 0.91, pass_rate: 1, scored_outputs: 1 } }));
  process.exit(0);
}
if (args[0] === "report") {
  const out = args[args.indexOf("--out") + 1];
  fs.writeFileSync(out, "# EvalKit Report\\n\\nSynthetic self-test report.\\n");
  process.exit(0);
}
process.exit(2);
`, { mode: 0o755 });
const env = {
    ...process.env,
    EVALKIT_ACTION_SKIP_INSTALL: "1",
    PATH: `${bin}:${process.env.PATH ?? ""}`,
};
const judgeConfig = parseJudgeConfig('{"backend":"local","model":"synthetic-self-test"}');
assert.deepEqual(judgeConfig, { backend: "local", model: "synthetic-self-test" });
assert.throws(() => parseJudgeConfig("[]"), /judge-config must be a JSON object/);
const pass = runEvalkit(join(root, "rubric.jsonl"), join(root, "responses.jsonl"), { threshold: 0.9, env, judgeConfig });
assert.equal(pass.status, 0);
assert.equal(pass.averageScore, 0.91);
assert.equal(pass.passedThreshold, true);
assert.match(pass.report, /EvalKit Report/);
assert.equal(pass.judgeConfig?.model, "synthetic-self-test");
assert.ok(pass.judgeConfigPath);
const fail = runEvalkit(join(root, "rubric.jsonl"), join(root, "responses.jsonl"), { threshold: 0.95, env, judgeConfig });
assert.equal(fail.status, 1);
assert.equal(fail.passedThreshold, false);
const comment = buildComment({ average_score: pass.averageScore, passed_threshold: pass.passedThreshold });
assert.match(comment, /EvalKit Results/);
assert.match(comment, /average_score/);
assert.equal(await postPullRequestComment(comment, {}), "skipped");
