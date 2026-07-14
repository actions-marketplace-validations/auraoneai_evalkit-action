import { strict as assert } from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJudgeConfig, runEvalkit } from "./runner.js";
import { buildComment, emitAnnotation, escapeMarkdown, postPullRequestComment, writeJobSummary, writeOutput, } from "./pr_comment.js";
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
const fail = runEvalkit(join(root, "rubric.jsonl"), join(root, "responses.jsonl"), { threshold: 0.95, env, judgeConfig });
assert.equal(fail.status, 1);
assert.equal(fail.passedThreshold, false);
const comment = buildComment({
    state: "pass",
    averageScore: pass.averageScore,
    threshold: 0.9,
    rubricPath: "evals/quality`rubric.jsonl",
    responsesPath: "evals/responses.jsonl",
    report: "# Evidence\n\nUser <!-- injection --> content.",
    version: "0.2.0",
});
assert.match(comment, /<!-- auraone-evalkit-action-summary -->/);
assert.match(comment, /\*\*Decision:\*\* Passed/);
assert.match(comment, /91\.0%/);
assert.doesNotMatch(comment, /injection/);
assert.match(escapeMarkdown("[unsafe](javascript:alert(1))"), /\\\[/);
const summaryPath = join(root, "summary.md");
const outputPath = join(root, "output.txt");
writeFileSync(summaryPath, "");
writeFileSync(outputPath, "");
assert.equal(writeJobSummary(comment, { GITHUB_STEP_SUMMARY: summaryPath }), "written");
assert.match(readFileSync(summaryPath, "utf8"), /AuraOne EvalKit/);
assert.equal(writeOutput("decision", "pass", { GITHUB_OUTPUT: outputPath }), "written");
assert.match(readFileSync(outputPath, "utf8"), /decision<</);
const logs = [];
const originalLog = console.log;
console.log = (value) => logs.push(String(value));
emitAnnotation("error", "bad,title", "line one\nline two", "evals/file,name.jsonl");
console.log = originalLog;
assert.match(logs[0], /title=bad%2Ctitle/);
assert.match(logs[0], /line one%0Aline two/);
const eventPath = join(root, "event.json");
writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 42 } }));
const requests = [];
const fetchImpl = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    requests.push({ url, method, body: typeof init?.body === "string" ? init.body : undefined });
    if (method === "GET") {
        return new Response(JSON.stringify([
            { id: 1, body: "<!-- auraone-evalkit-action-summary --> user", user: { type: "User", login: "attacker" } },
            { id: 2, body: "<!-- auraone-evalkit-action-summary --> old", user: { type: "Bot", login: "github-actions[bot]" } },
        ]), { status: 200 });
    }
    return new Response("{}", { status: 200 });
};
const commentResult = await postPullRequestComment(comment, {
    "INPUT_GITHUB-TOKEN": "test",
    GITHUB_REPOSITORY: "auraoneai/evalkit-action",
    GITHUB_EVENT_PATH: eventPath,
}, fetchImpl);
assert.equal(commentResult, "updated");
assert.equal(requests[1].method, "PATCH");
assert.match(requests[1].url, /comments\/2$/);
assert.equal(await postPullRequestComment(comment, {}), "skipped");
