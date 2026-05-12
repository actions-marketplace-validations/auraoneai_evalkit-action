# EvalKit Action Architecture

`evalkit-action` wraps EvalKit scoring in a GitHub Action so pull requests can run rubric checks and publish concise review feedback.

## Execution Flow

1. Read action inputs for rubric path, responses path, judge config, and optional score threshold.
2. Install `auraone-evalkit` inside the action runtime.
3. Validate `judge-config` as a JSON object, write it to a temporary file, and expose both `EVALKIT_JUDGE_CONFIG` and `EVALKIT_JUDGE_CONFIG_PATH` to EvalKit subprocesses.
4. Run `evalkit score --format report-json` and `evalkit report` against repository files.
5. Emit a PR comment with the Markdown report when pull request context and a token are available.
6. Fail the check when a configured threshold is not met.

## Design Decisions

- Inputs map directly to user-owned files so the action does not require an AuraOne account or backend.
- Threshold gating is optional because teams often want advisory evals before making them required checks.
- PR comments summarize results rather than embedding large artifacts, keeping review pages readable.
- Examples use synthetic rubrics and responses only.
