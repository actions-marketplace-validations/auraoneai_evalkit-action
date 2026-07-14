# AuraOne EvalKit Quality Gate

Run AuraOne EvalKit rubric scoring in GitHub Actions and turn the result into an inspectable pull request decision.

This Action is for evaluation engineers and repository maintainers who want advisory or blocking LLM-evaluation checks next to code review. The current source normalizes every run to `pass`, `review`, `fail`, or `blocked` and publishes the same score, threshold, evidence paths, report/error, and next action across GitHub annotations, the job summary, outputs, and an optional pull request comment.

## Inspectable Proof

The current `0.2.0` source contract produces:

- An annotation on the responses file.
- A job summary with the decision, average score, threshold, rubric path, response path, report or error, and next action.
- Outputs: `decision`, `average-score`, and `threshold`.
- An optional bot-authored pull request comment that is updated in place.

EvalKit score JSON and the generated Markdown report are created in a temporary runner directory. They are not uploaded as standalone workflow artifacts by this Action; add an upload step if artifact retention is required.

`threshold: "0"` is advisory and returns `review` without failing the job. A missed non-zero threshold returns `fail`. Invalid inputs, installation errors, scoring errors, or report errors return `blocked`.

## Runtime, Data, and Network Boundary

The Action:

1. Installs the `auraone-evalkit` Python package at runtime with `pip`, which normally contacts the configured Python package index.
2. Reads the repository-provided rubric, responses, optional labels, and judge configuration on the GitHub runner.
3. Runs `evalkit score` and `evalkit report` in local subprocesses.
4. May send evaluation content to a network judge if the supplied EvalKit judge configuration selects one.
5. Sends report evidence to GitHub through annotations, the job summary, workflow outputs, and the GitHub API when pull request comments are enabled.

No AuraOne account or AuraOne-hosted backend is required by the Action itself.

## Public Action Quickstart

The latest public Action tag is `v0.1.1`. It supports the core rubric, responses, labels, judge-config, threshold, and token inputs:

```yaml
name: EvalKit
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  evaluation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: auraoneai/evalkit-action@v0.1.1
        with:
          rubric-path: evals/quality.rubric.jsonl
          responses-path: evals/model_outputs.jsonl
          threshold: "0"
          github-token: ${{ github.token }}
```

## Current Source Development

The decision outputs and `comment-on-pr` control documented in [`action.yml`](action.yml) are staged in source version `0.2.0` and are not available through a public `v0.2.0` or `v1` tag yet.

```bash
npm ci
npm test
node scripts/release-preflight.mjs v0.2.0
```

The checked-in `dist/` directory is the executable Action artifact and must match `src/`.

## Release Status

Registry and tag status verified July 13, 2026:

- Latest public Action tag: `v0.1.1`.
- Current source/package metadata: `0.2.0`, not yet tagged.
- No moving `v1` tag exists.
- `@auraone/evalkit-action` is not published on npm; GitHub Action tags are the supported public install channel.

No workflow-volume, quality-improvement, or adoption claim is made.

## Limits

The Action reports the result returned by EvalKit and the selected judge configuration. It does not validate the scientific quality of a rubric, guarantee model safety, or bundle customer evaluation data; repository tests are synthetic.

## Next Action

Add `auraoneai/evalkit-action@v0.1.1` to a representative pull request with `threshold: "0"`, inspect the reported evidence, pin the tag to its full commit SHA, then set a non-zero threshold only after the score behavior is acceptable.
