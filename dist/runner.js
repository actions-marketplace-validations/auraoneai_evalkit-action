import { spawnSync } from "node:child_process";
export function runEvalkit(rubricPath, responsesPath) {
    spawnSync("python", ["-m", "pip", "install", "auraone-evalkit"], { stdio: "inherit" });
    const score = spawnSync("evalkit", ["score", "--rubric", rubricPath, "--responses", responsesPath], { encoding: "utf8" });
    const report = spawnSync("evalkit", ["report", "--input", responsesPath], { encoding: "utf8" });
    return { status: score.status ?? 1, stdout: score.stdout, stderr: score.stderr, report: report.stdout };
}
