# EvalKit Action Architecture

`evalkit-action` wraps EvalKit scoring in a GitHub Action so pull requests can run rubric checks and publish concise review feedback.

## Execution Flow

1. Read action inputs for rubric path, responses path, judge config, and optional score threshold.
2. Install `auraone-evalkit` inside the action runtime.
3. Validate `judge-config` as a JSON object, write it to a temporary file, and expose both `EVALKIT_JUDGE_CONFIG` and `EVALKIT_JUDGE_CONFIG_PATH` to EvalKit subprocesses.
4. Run `evalkit score --format report-json` and `evalkit report` against repository files.
5. Normalize the result to `pass`, `review`, `fail`, or `blocked`.
6. Emit the same decision, evidence, and next action to annotations, the job summary, action outputs, and an optional bot-owned PR comment.
7. Fail the check for `fail` or `blocked`; advisory `review` runs remain successful.

## Design Decisions

- Inputs map directly to user-owned files so the action does not require an AuraOne account or backend.
- Threshold gating is optional because teams often want advisory evals before making them required checks.
- PR comments are optional, safely escaped, bot-owned, and updated in place rather than appended.
- Immutable release tags are verified before a separately requested moving-major promotion.
- Examples use synthetic rubrics and responses only.

## Runtime and Data Boundary

- The Action installs `auraone-evalkit` with `pip` unless an internal test override disables installation. Normal Action runs therefore require package-index network access.
- Rubric, response, label, score, report, and judge-config files are processed on the GitHub runner.
- A selected judge backend may send evaluation content to its configured model provider.
- The report and selected paths leave the runner through GitHub annotations, the job summary, outputs, and the optional GitHub API comment.
- Score and report files live in a temporary directory and are not uploaded as standalone artifacts automatically.

## Publication Boundary

Source metadata is currently `0.2.0`, while the latest public Action tag is `v0.1.1`. The current output and comment-control contract must not be documented as available through `v1` or npm until those channels exist.
