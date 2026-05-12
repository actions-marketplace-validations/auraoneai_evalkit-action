export function buildComment(summary: Record<string, unknown>): string {
  return `## EvalKit Results

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\``;
}

export async function postPullRequestComment(body: string, env: NodeJS.ProcessEnv = process.env): Promise<"posted" | "skipped"> {
  const token = env["INPUT_GITHUB-TOKEN"] || env.GITHUB_TOKEN;
  const repository = env.GITHUB_REPOSITORY;
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath) return "skipped";

  const event = await import("node:fs").then((fs) => JSON.parse(fs.readFileSync(eventPath, "utf8")) as GitHubEvent);
  const pullNumber = event.pull_request?.number;
  if (!pullNumber) return "skipped";

  const apiUrl = env.GITHUB_API_URL || "https://api.github.com";
  const response = await fetch(`${apiUrl}/repos/${repository}/issues/${pullNumber}/comments`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(`failed to post PR comment: ${response.status} ${await response.text()}`);
  }
  return "posted";
}

type GitHubEvent = {
  pull_request?: {
    number?: number;
  };
};
