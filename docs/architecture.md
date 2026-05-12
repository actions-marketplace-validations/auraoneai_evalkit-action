# EvalKit Action Architecture

`evalkit-action` wraps EvalKit scoring in a GitHub Action so pull requests can run rubric checks and publish concise review feedback.

## Execution Flow

1. Read action inputs for rubric path, responses path, judge config, and optional score threshold.
2. Install or invoke EvalKit inside the action runtime.
3. Run scoring and report generation against repository files.
4. Emit a PR comment with per-criterion results when pull request context is available.
5. Fail the check when a configured threshold is not met.

## Design Decisions

- Inputs map directly to user-owned files so the action does not require an AuraOne account or backend.
- Threshold gating is optional because teams often want advisory evals before making them required checks.
- PR comments summarize results rather than embedding large artifacts, keeping review pages readable.
- Examples use synthetic rubrics and responses only.
