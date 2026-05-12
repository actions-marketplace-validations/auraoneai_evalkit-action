export function buildComment(summary: Record<string, unknown>): string {
  return `## EvalKit Results

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\``;
}
