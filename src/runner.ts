import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type EvalkitRunOptions = {
  threshold: number;
  labelsPath?: string;
  judgeConfig?: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
};

export type EvalkitRunResult = {
  status: number;
  stdout: string;
  stderr: string;
  report: string;
  scorePath?: string;
  reportPath?: string;
  judgeConfigPath?: string;
  scorePayload?: Record<string, unknown>;
  averageScore?: number;
  passedThreshold?: boolean;
  judgeConfig?: Record<string, unknown>;
};

export function runEvalkit(rubricPath: string, responsesPath: string, options: EvalkitRunOptions): EvalkitRunResult {
  const env = options.env ?? process.env;
  const runEnv = { ...env };
  const workDir = mkdtempSync(join(tmpdir(), "evalkit-action-"));
  const scorePath = join(workDir, "score.json");
  const reportPath = join(workDir, "report.md");
  const judgeConfigPath = join(workDir, "judge-config.json");
  const stdout: string[] = [];
  const stderr: string[] = [];

  if (options.judgeConfig) {
    const serializedConfig = JSON.stringify(options.judgeConfig, null, 2);
    writeFileSync(judgeConfigPath, `${serializedConfig}\n`, "utf8");
    runEnv.EVALKIT_JUDGE_CONFIG = serializedConfig;
    runEnv.EVALKIT_JUDGE_CONFIG_PATH = judgeConfigPath;
  }

  if (runEnv.EVALKIT_ACTION_SKIP_INSTALL !== "1") {
    const packageName = runEnv.EVALKIT_PACKAGE || "auraone-evalkit";
    const install = spawnSync("python", ["-m", "pip", "install", packageName], { encoding: "utf8", env: runEnv });
    stdout.push(install.stdout ?? "");
    stderr.push(install.stderr ?? "");
    if ((install.status ?? 1) !== 0) {
      return { status: install.status ?? 1, stdout: stdout.join(""), stderr: stderr.join(""), report: "", judgeConfigPath, judgeConfig: options.judgeConfig };
    }
  }

  const scoreArgs = [
    "score",
    "--rubric",
    rubricPath,
    "--responses",
    responsesPath,
    "--format",
    "report-json",
    "--pass-threshold",
    String(options.threshold),
    "--out",
    scorePath,
  ];
  if (options.labelsPath) {
    scoreArgs.push("--labels", options.labelsPath);
  }

  const score = spawnSync("evalkit", scoreArgs, { encoding: "utf8", env: runEnv });
  stdout.push(score.stdout ?? "");
  stderr.push(score.stderr ?? "");
  if ((score.status ?? 1) !== 0) {
    return { status: score.status ?? 1, stdout: stdout.join(""), stderr: stderr.join(""), report: "", scorePath, judgeConfigPath, judgeConfig: options.judgeConfig };
  }

  const scorePayload = readJson(scorePath);
  const averageScore = readAverageScore(scorePayload);
  const passedThreshold = averageScore === undefined ? undefined : averageScore >= options.threshold;

  const report = spawnSync("evalkit", ["report", "--score", scorePath, "--out", reportPath], { encoding: "utf8", env: runEnv });
  stdout.push(report.stdout ?? "");
  stderr.push(report.stderr ?? "");
  const reportText = existsSync(reportPath) ? readFileSync(reportPath, "utf8") : report.stdout ?? "";
  const reportStatus = report.status ?? 1;
  const status = reportStatus !== 0 ? reportStatus : passedThreshold === false ? 1 : 0;

  return {
    status,
    stdout: stdout.join(""),
    stderr: stderr.join(""),
    report: reportText,
    scorePath,
    reportPath,
    judgeConfigPath,
    scorePayload,
    averageScore,
    passedThreshold,
    judgeConfig: options.judgeConfig,
  };
}

export function parseJudgeConfig(input: string | undefined): Record<string, unknown> {
  if (!input || input.trim() === "") {
    return {};
  }
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("judge-config must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function readAverageScore(payload: Record<string, unknown>): number | undefined {
  const summary = payload.summary;
  if (summary && typeof summary === "object" && "average_score" in summary) {
    const value = (summary as { average_score?: unknown }).average_score;
    return typeof value === "number" ? value : undefined;
  }
  const value = payload.overall_score;
  return typeof value === "number" ? value : undefined;
}
