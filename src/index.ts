import { runEvalkit } from "./runner.js";
import { buildComment } from "./pr_comment.js";
const rubric = process.env["INPUT_RUBRIC-PATH"] ?? process.argv[2];
const responses = process.env["INPUT_RESPONSES-PATH"] ?? process.argv[3];
const threshold = Number(process.env.INPUT_THRESHOLD ?? "0");
if (!rubric || !responses) throw new Error("rubric-path and responses-path are required");
const result = runEvalkit(rubric, responses);
console.log(buildComment({ status: result.status, threshold, report: result.report || result.stdout }));
process.exit(result.status);
