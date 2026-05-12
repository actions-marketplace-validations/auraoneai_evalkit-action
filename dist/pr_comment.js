export function buildComment(summary) {
    return `## EvalKit Results

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\``;
}
