import { parseJudgeConfig, runEvalkit } from "./runner.js";
import { buildComment, emitAnnotation, postPullRequestComment, writeJobSummary, writeOutput, } from "./pr_comment.js";
const version = process.env.EVALKIT_ACTION_VERSION ?? "0.2.0";
const rubric = process.env["INPUT_RUBRIC-PATH"] ?? process.argv[2];
const responses = process.env["INPUT_RESPONSES-PATH"] ?? process.argv[3];
const threshold = Number(process.env.INPUT_THRESHOLD ?? "0");
async function main() {
    if (!rubric || !responses) {
        return finish("blocked", undefined, "rubric-path and responses-path are required");
    }
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        return finish("blocked", undefined, "threshold must be a number from 0 through 1");
    }
    let judgeConfig;
    try {
        judgeConfig = parseJudgeConfig(process.env["INPUT_JUDGE-CONFIG"]);
    }
    catch (error) {
        return finish("blocked", undefined, errorMessage(error));
    }
    const result = runEvalkit(rubric, responses, {
        threshold,
        labelsPath: process.env["INPUT_LABELS-PATH"],
        judgeConfig,
    });
    const state = result.status !== 0 && result.passedThreshold !== false
        ? "blocked"
        : result.passedThreshold === false
            ? "fail"
            : threshold === 0
                ? "review"
                : "pass";
    const error = state === "blocked" ? result.stderr.trim() || result.stdout.trim() || "EvalKit could not complete." : undefined;
    return finish(state, result.averageScore, error, result.report || result.stdout, result.stderr);
}
async function finish(state, averageScore, error, report, stderr) {
    const summary = buildComment({
        state,
        averageScore,
        threshold,
        rubricPath: rubric ?? "not provided",
        responsesPath: responses ?? "not provided",
        report,
        error,
        version,
    });
    console.log(summary);
    writeJobSummary(summary);
    writeOutput("decision", state);
    writeOutput("average-score", averageScore === undefined ? "" : String(averageScore));
    writeOutput("threshold", String(threshold));
    const annotationLevel = state === "pass" ? "notice" : state === "review" ? "warning" : "error";
    emitAnnotation(annotationLevel, `AuraOne EvalKit: ${state}`, error ?? annotationMessage(state), responses);
    if (stderr?.trim())
        console.error(stderr.trim());
    try {
        await postPullRequestComment(summary);
    }
    catch (commentError) {
        emitAnnotation("warning", "AuraOne EvalKit comment", errorMessage(commentError));
    }
    return state === "pass" || state === "review" ? 0 : 1;
}
function annotationMessage(state) {
    return {
        pass: "Evaluation passed the configured threshold.",
        review: "Evaluation completed in advisory mode. Review the evidence before merging.",
        fail: "Evaluation did not meet the configured threshold.",
        blocked: "Evaluation could not complete.",
    }[state];
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
main()
    .then((code) => {
    process.exitCode = code;
})
    .catch(async (error) => {
    process.exitCode = await finish("blocked", undefined, errorMessage(error));
});
