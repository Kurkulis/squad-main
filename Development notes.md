# Development notes

Current state of the implementation, 2026-10-29 (round v2 delivered). Work packages, measurements and the decisions behind them: [[Analysis & Agent Plan]] (v1) and [[Plan v2 - Tactical depth and clarity]] (v2: map graph, planning phase, weapons, stat guide, floor plan).

---

## Stack decision (Q1)

- The game lives in `demo/`: **vanilla JS, no build step, no dependencies, no backend.** A port to another stack happens later, if ever.
- No server and no database: state that must persist (the ladder run) is in the browser's `localStorage`.
- No git for now, by the user's decision. The project goes under git once the improved demo convinces.
- The earlier plan (React + TypeScript, FastAPI, SQLite, JWT) is superseded. None of it was ever built.

## Source of truth

- Round logic: `demo/engine.js` + `demo/data.js`, documented by [[Formula]]. If the doc and the code disagree, the code is what runs.
- Every rule or constant change updates `Formula.md` in the same change.

---

## What `demo/` contains

| File | Purpose |
|---|---|
| `index.html` | the page; loads the scripts below in order (`catalog.js`, `data.js`, `maps.js`, `engine.js`, `visuals.js`, `plan.js`, `cards.js`, `narrate.js`, `ladder.js`, `ui.js`), no build |
| `catalog.js` | `CATALOG`: the weapon catalog (`WEAPON_CATALOG`, 12 primaries and 2 pistols with stat mods) and the allowed classes per role (`ROLE_CLASSES`) |
| `data.js` | every table and constant: `CONFIG`, playstyles, weights, `SITUATION_SHARE`, roles, gadgets and `GADGET_USE`, item tiers, zones, `ATK_TEMPLATES`, `DEF_TEMPLATES`, roster, `TRAITS`, `ACTIVES`, `ARCHETYPES`, the `CONTRIBUTORS` modifier pipeline |
| `maps.js` | `MAPS2`: the three floor plans (zones with type and polygon, edges, doors, spawns, site) |
| `engine.js` | the simulation: map paths (`paths`, `dist`, `route`), DEF setup and ATK plan (defaults, validation, intel reveal), seeded rounds with multi-group steps, fights, reroute and rotation, matches, `briefing`, `planOdds`, `generateSquad`, `simulate` |
| `engine.test.js` | rule checks for every simulated round, map checks, balance targets, template matrix, sensitivity and power budget (Node) |
| `baseline.txt` | pre-WP1 test output, kept for the behaviour-neutral diff of WP1 |
| `plan.js` | `FloorPlan`: the top-down SVG floor plan (rooms tinted by control, doors, reinforcements, traps, gadgets, defenders, group paths, fights), with planning clicks (`bindPlan`) and step playback |
| `plan.css` | floor-plan styles, using `style.css` tokens |
| `ui.js` | planning screens (DEF setup, ATK plan), briefing, match flow, playback on the floor plan, why panel, tabs |
| `narrate.js` | one sentence per log step (intel, fights, events) |
| `visuals.js` | role icons and zone glyphs used by the cards and the floor plan |
| `cards.js` | operator cards (role icon, stat bars, items, trait, playstyle advisor, weapon select), stat guide, table view toggle |
| `ladder.js` | ladder-lite: a 7-opponent run of rising quality, persisted in `localStorage` |
| `style.css` | page styles and colour tokens (light and dark) |
| `cards.css` | card styles, using only `style.css` tokens |

To play, open `demo/index.html` in a browser.

---

## Tests

Run from the project root:

```
node demo/engine.test.js --routes --sens
```

- Without flags: rule checks (MVP draft situation scores, 300 matches against generated squads, extreme-quality squads, seed replay, setups and plans, abilities, map geometry and paths) and the balance report with targets, the template matrix and the flank check. A target outside its band prints `OUT OF TARGET` and the test fails.
- `--routes` adds the mirror ATK win, steps and time outs per map and template pair.
- `--sens` adds the sensitivity table (item tiers, traits, archetypes, abilities, weapon swaps) and the power-budget, ability and weapon asserts.
- `--share` re-measures `SITUATION_SHARE` and prints its largest difference to `data.js`.
- With `--routes --sens` the run takes about 2 minutes. It is seeded, so the same data always prints the same numbers. How to read and retune: Formula.md §29–§32.

---

## Rules for changes

- No code comments; English identifiers and UI text; small pure functions; tables in `data.js`.
- Run `node demo/engine.test.js --routes --sens` before and after every change.
- Docs that mirror the code: `Formula.md` (all rules and numbers), `MVP/MVP draft.md` (roster tables, generated from `data.js`), `Operators/Traits.md`, `Operators/Stats.md`, `Game Design/Items.md` and `Game Design/Game modes and maps.md` (implemented values).
