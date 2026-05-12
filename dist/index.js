import { runEvalkit } from "./runner.js";
import { buildComment, postPullRequestComment } from "./pr_comment.js";
const rubric = process.env["INPUT_RUBRIC-PATH"] ?? process.argv[2];
const responses = process.env["INPUT_RESPONSES-PATH"] ?? process.argv[3];
const threshold = Number(process.env.INPUT_THRESHOLD ?? "0");
if (!rubric || !responses)
    throw new Error("rubric-path and responses-path are required");
if (!Number.isFinite(threshold))
    throw new Error("threshold must be numeric");
const result = runEvalkit(rubric, responses, {
    threshold,
    labelsPath: process.env["INPUT_LABELS-PATH"],
});
const comment = buildComment({
    status: result.status,
    threshold,
    average_score: result.averageScore,
    passed_threshold: result.passedThreshold,
    report: result.report || result.stdout,
});
console.log(comment);
await postPullRequestComment(comment);
if (result.stderr)
    console.error(result.stderr);
process.exit(result.status);
