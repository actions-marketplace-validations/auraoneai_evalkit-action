# Contributing

Use Node.js 20, run `npm ci && npm test`, and keep examples synthetic. Changes to `src/` must include the rebuilt checked-in `dist/` output.

Release preparation must pass `node scripts/release-preflight.mjs vX.Y.Z`. Publish an immutable semantic-version tag first; promote a moving major tag only after the immutable tag passes a live synthetic workflow.
