# 🎪 Kids Game Garden

A collection of six lightweight, mobile-friendly HTML5 games for children and families. Each game remains a self-contained `index.html` with no framework, build step, CDN, or audio assets.

The default source and site language is English. Add `?lang=zh` to any page to switch the shared shell and AI companion back to Simplified Chinese.

## Games

| Game | Folder | Style | Goal |
|---|---|---|---|
| 🎀 Sweet Adventure | `sweet-adventure/` | Runner | Jump, collect treats, dodge obstacles, and reach the rainbow gate. |
| 📜 History Time Quest | `mxq-history/` | Quiz adventure | Travel through eight eras, answer questions, and collect treasures. |
| 🎒 A Day at School | `mxq-school/` | Story game | Learn, play, share lunch, and write a tiny diary. |
| ⛏️ Block Park | `block-park/` | Builder | Dig blocks, decorate a small world, and discover hidden gems. |
| 🚩 Platform Adventure | `mxq-platform/` | Platformer | Jump across five hand-made stages and collect school books. |
| 🍓 Sweet Match | `sweet-match/` | Match-3 | Make special candy combinations and complete each level goal. |

## AI companion

Every game has a shared AI companion with three bounded actions:

- **Give me a hint**: a short suggestion based on the game type and current state.
- **Today’s quest**: one small, repeatable goal stored on the current device.
- **Cheer me on**: encouraging feedback after a difficult or successful round.

The browser sends only game state. It does not send a name, photo, voice recording, contact details, or chat history. If no AI endpoint is configured, the companion uses deterministic offline copy and the game remains fully playable.

The optional proxy in `worker/ai-proxy.js` calls **`glm-5.3-flash`**. The model key must stay in a Worker secret named `GLM_API_KEY`:

```bash
cd worker
cp wrangler.toml.example wrangler.toml
wrangler secret put GLM_API_KEY
wrangler deploy
```

Set `KIDS_AI_ENDPOINT` in the static-site environment to the deployed Worker URL. Never put the key in HTML, JavaScript, repository variables, or screenshots.

The current local deployment target is `https://kids-games-ai.convee-cn.workers.dev`. It intentionally returns `ai_not_configured` until the account owner adds the secret; games then keep using their offline fallback.

## Retention and monetization foundation

The shared runtime keeps a local streak, session count, encouragement stars, and daily quest progress under `kids-games-ai-profile-v1`. The lobby turns the six games into a repeatable daily loop. Optional support links use a parent math gate and stay disabled while `KIDS_SUPPORT_URL` is empty.

This is a monetization integration point, not proof of live payments. Before enabling a real payment page, add the legal entity, refund policy, parent-facing privacy copy, payment callbacks, and reconciliation flow.

## Run locally

```bash
cd kids-games
python3 -m http.server 8000
# open http://localhost:8000/
```

Use HTTP instead of `file://`; subdirectory links, locale query parameters, and browser audio policies depend on it.

Validate all six pages and the model boundary:

```bash
npm run validate
```

## Structure

```text
shared/ai-companion.js   # AI companion, quests, streak, offline fallback
shared/ai-companion.css  # shared floating panel
shared/locale.js         # English default; ?lang=zh fallback
shared/parent-gate.js    # parent confirmation gate
worker/ai-proxy.js       # GLM-5.3 Flash proxy
scripts/validate.mjs     # page and credential-boundary checks
```

## Compatibility

The games intentionally use conservative browser APIs for older mobile WebViews. Canvas pages set their CSS size explicitly, and each page keeps a visible error strip for devices without developer tools.

Characters and illustrations are original hand-drawn work for a personal project. They are not affiliated with any third-party rights holder.

中文说明见 [README.zh-CN.md](README.zh-CN.md)。
