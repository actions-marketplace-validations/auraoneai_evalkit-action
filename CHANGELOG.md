# Changelog

## 0.2.0 - 2026-07-13

- Add explicit pass, review, fail, and blocked decisions across annotations, job summaries, outputs, and pull request evidence.
- Update one bot-owned PR comment in place and safely escape Markdown and workflow-command values.
- Add immutable release-tag validation, checked-in distribution verification, and separately gated major-tag promotion.

## 0.1.1

- Prepare hardened source-side release after CI, validation, documentation, and packaging fixes.
- Validate `judge-config` as JSON and expose it to EvalKit subprocesses through environment variables and a temporary config file.

## 0.1.0

- Initial open-source implementation.
