# Marble Alchemy · Claude Code fable 5.1

This directory contains the deterministic comparison build. The AI Director build is in [`../gpt6/`](../gpt6/); the English comparison home is https://chaoschemy.com/.

Marble Alchemy is a neon pachinko roguelite: aim and launch a marble, build damage through real peg collisions, choose upgrades, and defeat five enemies. It uses TypeScript, Phaser 3.90 with Matter physics, Vite, procedural art, and WebAudio synthesis. It has no backend, account, external images, or runtime AI call.

## Run locally

Requires Node 20.19+ or Node 22.12+.

```sh
npm ci
npm run dev
```

Checks and evidence commands:

```sh
npm test
npm run test:e2e
npm run build
npm run showcase
npm run autoplay -- [url] [runs]
```

## How to play

- Drag inside the board to aim and release to launch. Mouse and touch are supported; Space launches and Arrow keys adjust aim.
- Each peg hit adds one damage. Dark pegs relight before the next launch; green recharge stones relight them immediately.
- When all marbles land, stored damage is dealt to the enemy. Survivors retaliate.
- After each victory, choose one of three formulas. Defeat the Core Golem after stage five to win.

The six formulas are Strengthen, Fire, Lightning, Split, Critical, and Heal. Exact values live in [`src/core/balance.ts`](src/core/balance.ts) and [`src/core/upgrades.ts`](src/core/upgrades.ts).

## Evidence

The build includes unit tests, Playwright end-to-end tests, a stuck-marble watchdog, deterministic showcase capture, and random-aim autoplay. These checks are documented in [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md).

## Layout

```
src/core/      Rules, balance, upgrades, run state, layouts, and watchdog
src/game/      Board, marbles, aim, enemy, HUD, and effects
src/scenes/    Boot and main game scenes
src/ui/        DOM overlays for menus, help, upgrades, and end states
tests/         Unit tests
e2e/           Playwright tests and evidence scripts
```

## License

MIT. See [LICENSE](LICENSE).
