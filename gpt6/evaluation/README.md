# Evaluation evidence

This directory separates pre-fix findings, post-fix checks, and a normal playable run. Controlled fixtures are never presented as a full playthrough.

## Comparison protocol

The Codex GPT-6 and Claude Code fable 5.1 builds should use the same prompt, runtime, viewport, and acceptance checklist. Report separately:

- build and local startup;
- five-stage play, six upgrades, and real Matter collisions;
- rule tests, browser tests, and a normal UI run;
- fixed defects and still-unverified devices or behaviors;
- the unedited recording and its SHA-256.

The repository keeps each build’s evidence protocol separate and does not assign a combined score.

## Materials

- [`baseline/`](baseline/): the four defects found during the first independent audit.
- [`current/RESULTS.md`](current/RESULTS.md): the current verification scope and results.
- [`current/recording-manifest.json`](current/recording-manifest.json): recording timeline, source commit, requests, and media hashes.
- [`current/e2e-results.json`](current/e2e-results.json): machine-readable Playwright results.
- [`X_POST_DRAFT.en-US.md`](X_POST_DRAFT.en-US.md): the English follow-up thread draft.
- [`X_POST_DRAFT.zh-CN.md`](X_POST_DRAFT.zh-CN.md): the historical Chinese launch thread record.

The recording is a normal production page operated through the real UI. The README GIF is a shortened preview; the release MP4 preserves the full timeline.
