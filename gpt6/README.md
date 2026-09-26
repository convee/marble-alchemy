# Marble Alchemy · Codex GPT-6

This directory contains the Codex build of the comparison project. The deterministic baseline is in [`../fable5.1/`](../fable5.1/); the English comparison home is https://chaoschemy.com/.

[![CI](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml/badge.svg)](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c3a6fb.svg)](LICENSE)

> [Play online](https://chaoschemy.com/gpt6/) · [Full unedited recording](https://github.com/convee/marble-alchemy/releases/download/v1.0.0/codex-gameplay-v1.0.0.mp4) · [Evaluation evidence](evaluation/README.md)

Marble Alchemy is a five-stage neon pachinko roguelite with an AI Director. GLM-5.3 Flash creates a daily prophecy, selects one of three bounded mechanics, and writes the post-run debrief. The browser executes the mechanic locally and deterministically. No browser-exposed key or runtime model call is required.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run format:check
npm test
npm run test:e2e
npm run build
```

`npm run ai:scenarios` generates and validates the next challenge set in the build environment. The provider key is never shipped to the browser.

## How to play

- Move the mouse to aim and click to launch. On touch, drag and release. Arrow keys adjust aim and Space launches.
- Each peg collision adds damage. When every marble is recovered, the volley settles against the enemy.
- A surviving enemy retaliates. Defeat it and choose one of three formulas.
- Finish five stages, build a daily streak, and read the AI Director debrief.

The six formulas are Strengthen, Fire, Lightning, Split, Critical, and Heal. Their exact rules live in [`src/game.ts`](src/game.ts), and the AI challenge validator lives in [`src/ai.ts`](src/ai.ts).

## AI Director boundary

The build-time generator writes validated JSON into `public/ai/scenarios.json`. The browser can fall back to a local challenge if the file is unavailable. Physics and rule execution stay local, deterministic, and auditable.

## Layout

```
src/           Game state, Phaser scene, AI challenge, UI, audio, and telemetry
tests/         Rule and browser tests
evaluation/    Defect history, results, recordings, and publication drafts
public/ai/     Validated daily challenge data
```

## License

MIT. See [LICENSE](LICENSE).
