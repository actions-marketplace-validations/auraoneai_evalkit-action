# evalkit-action

Eval-as-CI for AuraOne EvalKit. The action accepts `rubric-path`, `responses-path`, `judge-config`, and `threshold`, installs `auraone-evalkit`, runs score/report commands, and can fail checks below threshold.

## What This Is Not

Examples contain no paid or customer data.

## Example

```yaml
name: evalkit
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: auraoneai/evalkit-action@v0.1.1
        with:
          rubric-path: evals/rubric.jsonl
          responses-path: evals/model_outputs.jsonl
          threshold: "0.75"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The action installs `auraone-evalkit`, writes report-ready score JSON, generates a Markdown report, comments on pull requests when a token and PR context are available, and fails the check when the average score is below `threshold`.
