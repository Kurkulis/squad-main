# Plan v3 — Visual clarity and animation (2026-10-29)

Status: launched 2026-10-29, no git, Opus 5.5 agents. Builds on v2.

## 1. What the designer asked for

1. In the squad view see each operator's portrait and weapon image. Placeholders are in `demo/placeholders/operators` (12 AVIF portraits) and `demo/placeholders/guns` (14 gun images).
2. Stat colouring: when the effective value is below the base, show it in yellow or red by the size of the drop; when above, in green whose intensity grows with the gain.
3. The round must not play as a slide show. Operators move room to room with smooth animation along their paths; each squad member has a visible path and their icon moves along it. Rounds may take longer, and the animation speed is adjustable.
4. More clarity on stats: hovering a stat shows a short explanation and how important it is for that operator, to guide the playstyle and weapon choice. With portraits the team area may grow; separate pages for the DEF squad and the ATK squad.

## 2. Design

### 2.1 Assets
- `ASSETS` table in `catalog.js`: weapon id → image path (`placeholders/guns/...`); SVD reuses the SR-25 image (no asset yet). Pistols: M9 → `M45_MEUSOC.avif`, Desert Eagle → `D-50.avif`. M870 → `pump.png`.
- Portraits: `PORTRAITS` keyed by role with 1–2 images each; roster operators get a fixed `portrait` in `data.js`; generated operators take the role's portrait (alternate by index). All 12 images used.

### 2.2 Squad pages
- Two tabs replace "Squads": **ATK squad** and **DEF squad** (player's operators of that side, opponent's below, collapsed by default).
- Card v3: portrait (left, 96–128 px), name, role icon and role, trait, playstyle select, weapon image + name + select, sidearm, armor, gadget, ability; six stat rows with base and effective numbers, the delta colour rule: drop 1–3 yellow, 4+ red; gain 1–3 light green, 4+ strong green (CSS classes `stat-down-1`, `stat-down-2`, `stat-up-1`, `stat-up-2`), bar shows effective with a base marker.
- Stat hover tooltip (a custom tooltip element, not `title`, so it can hold several lines): what the stat does (one sentence), situations that weight it most (top 3 with weights), importance for this operator's role (High/Medium/Low from the role's situation multipliers combined with the weights), and what changes it now (playstyle, weapon, armor, trait contributions as signed numbers from the pipeline).
- Playstyle advisor and weapon select keep their deltas; the card also shows "best situation" and "weakest situation" for the operator.

### 2.3 Animated round
- Playback becomes a continuous timeline: each engine step is a segment of `stepMs` (default 2400 ms, speed ×0.5/×1/×2/×4, pause, skip). Within a segment: movement phase (tokens tween from the previous zone's door/anchor to the new zone along the door midpoints, 60% of the segment), then fight phase (fight burst in contested zones, kill crosses appear, dead tokens fade, 40%).
- Per-operator tokens on the floor plan: portrait clipped in a circle with a side ring; ATK operators follow their group path (positions from the log's `groups` per step, so every member of a group moves with it, slightly offset so tokens don't overlap); DEF operators move per the `defenders` field (rotation tweens the same way). Each ATK operator's remaining path is drawn faintly; the walked part solid.
- Control tints fade between states; reinforcement cancel, traps sprung, bomb plant/defuse have small animations. `prefers-reduced-motion` falls back to the v2 stepwise rendering.
- Implementation: `playback.js` drives `requestAnimationFrame`; `plan.js` gains `FloorPlan.tokens(mapName, state)` returning token targets (zone and offset) per operator per step, and `FloorPlan.route(mapName, from, to)` returning the point list via door midpoints. Tokens are SVG `<g>` elements updated in place (transform), not re-rendered per frame.

## 3. Packages

| # | Package | Owns | Model |
|---|---|---|---|
| WP-G | Animated round: tokens, tweens, timeline controls, event animations | `plan.js`, `plan.css`, new `playback.js`, the playback functions in `ui.js` (move them into playback.js; ui.js keeps only the calls) | Opus high |
| WP-H | Squad pages ATK/DEF: card v3 with portraits, weapon images, stat colouring, tooltips; assets tables | `cards.js`, `cards.css`, `catalog.js`, `data.js` (portrait fields only), new `squad.js` | Opus high |

Both run in parallel. `index.html` and the Squads tab wiring in `ui.js` are integrated by the coordinator from the lines each agent hands back. Tests (`node demo/engine.test.js --routes --sens`) must stay green; the headless UI script must still print ALL OK.
