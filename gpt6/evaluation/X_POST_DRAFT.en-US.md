# English X thread draft

Status: draft. The published launch thread is recorded in [`X_POST_DRAFT.zh-CN.md`](X_POST_DRAFT.zh-CN.md). This English version is ready for a follow-up post after the source and game UI localization lands.

## 1 / 3

I gave two coding agents the same brief: build Marble Alchemy, a browser marble roguelite.

Codex · GPT-6: TypeScript + Phaser + Matter, five stages, six real upgrades, mouse/touch controls, procedural art, synthesized audio, and a bounded AI Director that writes one daily challenge.

Claude Code · fable 5.1: the deterministic comparison build with the same core loop and its own visuals, audio, and tests.

## 2 / 3

I checked more than the first screen.

The Codex build started with four input and responsive-layout defects. After fixes, its 13 rule tests and 19 browser tests passed, and a normal UI recording completed all five stages.

The fable build passed 24 unit tests and 18 end-to-end tests. In 12 random-aim runs it won 5 times and stalled 0 times. The evidence protocols are different, so these numbers are not a single score.

## 3 / 3

Play the comparison: https://chaoschemy.com/

AI Director: https://chaoschemy.com/gpt6/?utm_source=x&utm_campaign=english_thread&utm_content=gpt6

Deterministic baseline: https://chaoschemy.com/fable5.1/?utm_source=x&utm_campaign=english_thread&utm_content=fable5.1

Source and reproducible evidence: https://github.com/convee/marble-alchemy

What matters more to you: the first impression, or the defects that remain after real interaction?

> Keep the claims tied to the linked evidence. Do not present controlled boundary tests as natural win-rate data.
