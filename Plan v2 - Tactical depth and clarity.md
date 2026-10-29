# Plan v2 — Tactical depth and clarity (2026-10-29)

**Status: all packages WP-A–WP-F delivered on 2026-10-29** (`node demo/engine.test.js --routes --sens` passes; results in `Formula.md` §29). Open items: (1) the UI was never checked in a real browser; (2) weapon swaps within a class are nearly neutral (share-weighted score change < 1, round win −0.7 to +0.9); (3) the Rush archetype is weak (its R defence wins 42.2% as DEF, the Rush opponent gives up 17.8 round-win points against the roster); (4) lone-defender stalemates (Hospital A vs P ends 29.6% by time out, B vs P 23.4%); (5) `narrate.js` has no lines for crowding, pinch or waiting. Also measured in WP-F docs: Calculated is the best playstyle for 6 of the 10 roster operators, above the Q5 target of 4 (`Formula.md` §7, §30).

Written for the agents that execute the packages in §4; the designer reads §1–§3 to check the intent.
History: **launched 2026-10-29, no git, Opus 5.5 agents.** Builds on the delivered v1 (see `Analysis & Agent Plan.md`).

## 1. What the designer asked for

1. **Stat clarity.** The player must see what every stat buys, so the playstyle choice is informed, not guessed.
2. **Weapon choice.** Several weapons per class, each with plus and minus stat effects; the player picks per operator.
3. **Decisions that matter on the map.** A planning phase before the fight: DEF first places reinforcements and traps (they debuff ATK in that zone) and positions its operators; ATK then sees what its intel reveals and plans: which operators go which way, where gadgets are used. Attacks can split over several routes, defences can spread or stack. When DEF wins a fight, ATK may reroute and lose time. One-route-all-five must not always be the right plan; flanking must exist.
4. **Maps as a web, not three lanes.** Three complex single-floor maps, drawn as top-down floor plans (inspiration: Rainbow Six Siege, CS2, Call of Duty), where the whole round is visible: zones, placements, groups, fights, control.

## 2. Design (the decisions this plan makes; change them here, not in code)

### 2.1 Map model

A map is a graph of zones with geometry for drawing.

```js
MAPS2['Meridian Office Tower'] = {
  size: [W, H],                    // SVG units, single floor
  spawns: ['ext-n', 'ext-e'],      // exterior zones where ATK starts (2–3 per map)
  site: 'site',                    // one bomb site per map (a second site is a later step)
  zones: {
    'lobby': { label: 'Main lobby', type: 'Entry', space: 'Narrow', poly: [[x,y],...], anchor: [x,y] },
    ...
  },
  edges: [['ext-n','lobby'], ['lobby','hall-w'], ...],   // undirected doors/openings
}
```

- Zone `type` keeps the v1 set (Exterior, Entry, Hallway, Stairs, Rotation, Power, Site) so role fit, weapon fit and default situations keep working.
- 14–18 zones per map, 2–3 spawns, exactly one site. Every map must have ≥ 3 edge-disjoint spawn→site paths and at least one "flank": a path whose second half enters the site from a different neighbour than the two shortest paths.
- Three maps: Meridian Office Tower (long corridors, open floor, glass), St. Mora Hospital (open reception, long wards, narrow service tunnels), Ironfield Factory (loading bay, machinery cover, catwalk connector). School and Mall are retired for now.
- `Engine.paths(map, from, to, k)` returns the k shortest simple paths (zone id arrays). `Engine.dist(map, a, b)`.

### 2.2 Round v2

Step 0 is the **planning phase**, resolved in order DEF → intel → ATK:

1. **DEF setup** (player when defending, archetype template otherwise):
   - `positions: { opId: zoneId }` — every DEF operator stands somewhere; the Anchor and Support Defender default to the site.
   - `reinforcements: [zoneId, zoneId]` — 2 charges per round. In a reinforced zone ATK gets `−6` on Breach and Objective situations (`reinforceDebuff`), and the zone takes one extra ATK win to fall (its status starts at `−2` instead of `−1`, clamped as today otherwise). An ATK Breaching Charge or Thermite used on that zone cancels the reinforcement.
   - `traps: [zoneId]` — one per Trap Specialist or Lurker alive (Barbed Wire, Flank Wire). The first ATK group entering that zone gets `−4` to all stats for that step (`trapDebuff`) and DEF gets a free intel ping: that group's position becomes known for the rest of the round.
   - `roam: { opId: true }` — operators flagged to roam move toward the nearest fight one zone per step; others hold position.
2. **Intel** (existing §8 formula, same roll). The bucket now also decides what ATK learns before planning: Marginal reveals nothing; Clear reveals the reinforcements; Dominant reveals reinforcements and traps; the top bucket also reveals every DEF position. DEF always sees the ATK spawns (public), never the groups.
3. **ATK plan** (player when attacking, archetype template otherwise):
   - `groups: [{ ops: [opId...], path: [zoneId from a spawn to the site] }]` — 1 to 3 groups, every ATK operator in exactly one. A path is any simple path in the graph; the UI offers the k shortest and lets the player click zones to edit.
   - `gadgets: { opId: zoneId }` — where each operator's gadget is spent. Drone/Scout Drone/Camera: reveals DEF positions in that zone and its neighbours at planning time. Breaching Charge/Thermite/EMP: cancels a reinforcement there. Smoke: `+4` to that group's Objective and Breach scores in that zone. Unspent gadgets keep the v1 per-situation bonus but at half value.

Steps 1…`maxSteps` (12):

- Each ATK group whose current zone it controls advances one zone along its path. Entering a zone with no defenders takes it immediately (status +1) unless trapped (trap debuff applies to the next fight, the group still enters).
- A **fight** happens in every zone that holds at least one ATK group and at least one DEF operator. It is resolved with the v1 `teamScore` between the local ATK operators (all groups in the zone merged) and the local DEF operators, situation from v1 §10.1 using the zone type, plus the zone's reinforcement/trap/smoke modifiers. Numbers bonus uses local counts; momentum is per side as before. Casualties as v1.
- Zone control per zone (`status` from −2 to +1). ATK takes a zone at +1. Reaching the site with a group and bringing the site to +1 plants the bomb; post-plant and defuse rules as v1 (status −1 defuses, `bombSteps` 2).
- **Reroute.** When DEF wins a fight Clear or Dominant and the group has not taken the zone, the group falls back one zone and re-plans: shortest path to the site avoiding the lost zone, if one exists within `rerouteMaxExtra` (3) extra steps; otherwise it keeps pushing. Rerouting costs the fallback step.
- **DEF rotation.** After fights, each roaming defender not in a fight moves one zone toward the nearest zone that holds ATK (or toward the site if the bomb is planted). Anchors never leave the site before the plant; after a Dominant ATK win anywhere, one non-roaming defender (the closest) also rotates.
- End: elimination, detonation, defuse, time out (`maxSteps` 12, DEF wins).

The step log keeps the v1 fields per fight (zone, situation, terms, parts, kills, event) and adds: `fights[]` per step (one entry per contested zone), `groups` (each group's zone), `defenders` (each DEF op's zone), `control` (status per zone), `events` (taken, planted, reroute, rotate, trap, reveal).

### 2.3 Weapons

- `WEAPON_CATALOG`: 3 weapons per class (SMG, AR, DMR, Shotgun) and 2 pistols, each `{ id, name, class, mods: { sh, aw, tw, ut, dc, lk } }` with mods summing to 0 or +1 and spanning −4…+4 (e.g. a fast SMG `sh +4, aw −2, dc −2`; a steady AR `sh +1, dc +2, aw −1, tw −2`). Class fit by zone and tiers stay as in v1. Role → allowed classes: Entry/Second Entry/Roamer: SMG, Shotgun, AR; Support/Utility/Flex/Support Defender/Trap: AR, SMG; Anchor/Lurker: DMR, AR, SMG.
- Operator `primary = { id, class, tier }`. The `primary` contributor adds the weapon's mods to `stats`.
- UI: weapon select on the card with a live delta preview of effective stats and of the operator's score in the map's most common situations.

### 2.4 Stat clarity

- **Stat guide panel** (Squads tab): one row per stat: plain-language effect, which situations weight it (bar per situation from `WEIGHTS`), how often those situations occur (share measured by the test, stored in `DATA.SITUATION_SHARE`), and which intel/fatigue effects touch it.
- **Playstyle advisor** on each card: for every allowed playstyle, the change in expected operator score averaged over the situation share (and over the map's zone types when a match is open), shown as `+1.8` / `−0.6`, best one marked. Uses `Engine.operatorScore` with a neutral ctx, nothing new in the engine.
- **Score breakdown** on hover already exists (v1 parts); the why panel gets one line per planning decision that changed the decisive fight (reinforcement, trap, smoke, numbers from a split).

### 2.5 Floor-plan SVG

`Visuals.plan(map, state, options)` draws the whole map from `zones[].poly`: rooms as filled polygons tinted by control (DEF / contested / ATK), doors as gaps or short lines on edges, zone labels with the type glyph, reinforcement hatching, trap markers, smoke/drone markers, DEF operator tokens at their zones (role icon, greyed when dead), ATK group tokens with the group's path drawn as a dashed line, fight markers on contested zones, kill crosses, bomb icon on the site. Planning mode: clickable zones for placement and path editing; playback mode: one state per step. Single floor, whole map visible at once, legend in a corner. Inspiration: R6 Siege and CS2 overview maps (clean top-down, muted room fills, strong icons).

### 2.6 Balance targets v2 (in the test)

- Mirror ATK round win 45–55%, time outs 5–15%, steps 7–10 (planning step excluded).
- **No dominant plan.** The test plays each ATK template (A: all five one lane on the shortest path; B: 3+2 on two paths; C: 2+2+1 with the flank) against each DEF template (S: stack site + reinforce site neighbours; P: spread, traps on chokepoints; R: roam-heavy) per map, 400 rounds each. Fail if any ATK template wins ≥ 55% averaged over DEF templates, or if the same ATK template is best on all three maps. Same for DEF templates.
- **Flank matters.** On each map the flank path's rounds are won by ATK within 10 points of the shortest path's.
- Power budget and upset targets from v1 stay.

## 3. Assumptions made without asking

- One site per map; two sites later.
- The planning phase is per round (positions and placements reset), not per match.
- ATK gadgets are spent in planning; the v1 per-step gadget bonus survives at half value when unspent, so old gadgets never become useless.
- Hostage mode, economy, two floors: out of scope.

## 4. Agent packages

Rules: vanilla JS in `demo/`, no dependencies, no code comments, English identifiers and UI text, no git. `node demo/engine.test.js --routes --sens` must pass at every hand-off (v1 rules stay until WP-B replaces the round model; then the test is replaced by v2 checks that keep the v1 operator-score checks). One agent owns a file at a time; the table says who.

| # | Package | Owns | After | Model / effort |
|---|---|---|---|---|
| WP-A | Map graph model, 3 maps with geometry, path helpers, map tests | new `demo/maps.js`, `demo/engine.js` (paths/dist only), `demo/engine.test.js` (map checks) | — | Opus high |
| WP-B | Round v2: planning inputs, multi-lane steps, reroute, rotation, intel reveal, AI templates, log v2, test v2 incl. no-dominant-plan targets | `demo/engine.js`, `demo/data.js`, `demo/engine.test.js`, `Formula.md` §2, §9–§11, §23–§24, new §32 | WP-A | Opus high |
| WP-C | Floor-plan SVG renderer: static plan from geometry, state overlay, planning interactions (zone click, path edit), playback | new `demo/plan.js`, new `demo/plan.css`, `demo/visuals.js` | WP-A (geometry); state shape from §2.2 | Opus high |
| WP-D | Weapons catalog + stat guide + playstyle advisor + weapon select | new `demo/catalog.js`, `demo/cards.js`, `demo/cards.css`, one `primary` contributor line in `data.js` | WP-B (data.js free) | Opus medium |
| WP-E | UI integration: planning screens (DEF setup, ATK plan), briefing flow, playback on the plan, ladder/AI hookup, narrate for v2 events | `demo/ui.js`, `demo/narrate.js`, `demo/index.html`, `demo/style.css`, `demo/ladder.js` | WP-B, WP-C | Opus high |
| WP-F | Balance pass v2 + docs: tune constants to §2.6, Formula.md §27/§29/§31 regenerated, map docs rewritten | `data.js` CONFIG, `Formula.md`, `Game Design/Game modes and maps.md` | WP-D, WP-E | Opus high |

Order: WP-A → (WP-B ∥ WP-C) → (WP-D ∥ WP-E) → WP-F. The coordinator verifies each hand-off by running the tests and reading the changed files before launching the next.

### Interfaces frozen by this plan (so parallel agents fit)

- Map shape (§2.1), `Engine.paths`, `Engine.dist` (WP-A).
- DEF setup, ATK plan, step log v2 (§2.2). WP-C renders from `{ map, setup, plan, step: { groups, defenders, control, fights, events, kills } }` and must not need anything else; WP-B produces exactly that per step.
- `Visuals.plan(map, state, { mode: 'static' | 'planning' | 'playback', onZone(zoneId), onPath(groupIndex, path) })` (WP-C) is what WP-E calls.
- Weapon object `{ id, class, tier }` and `WEAPON_CATALOG` (WP-D).
