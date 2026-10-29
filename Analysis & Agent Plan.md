# Analysis & Agent Work Plan — 2026-10-29

Written for the agents that execute the work packages in §3; reviewed by the designer.
Status: **all packages WP0–WP8 delivered on 2026-10-29 (no git, Opus 5.5 agents). Tests pass: `node demo/engine.test.js --routes --sens`.** Open after delivery: (1) "Hold the site" beats "Hold the breach" on every route (ATK 42% vs 54%), see Formula.md §30; (2) the round view does not yet show which ability was armed; (3) a ladder match in progress is not saved across reloads; (4) nothing has been checked in a real browser yet.
Source of truth for round logic: `demo/engine.js` + `demo/data.js`, documented by `Formula.md`.
Answers were collected in the artifact "Squad Sim Decisions" (database document `answers/plan-2026-10-29`).

---

## 1. Where the project stands

### 1.1 Inventory

| Area | State |
|---|---|
| Design docs | 17 `.md` files in an Obsidian vault (~3,000 lines). `Formula.md` (1,100 lines) matches the demo exactly. `Web Game.md`, `Game Design/Combat system.md`, `Operators/Stats.md`, `MVP/MVP draft.md` and `Development notes.md` still describe the older design (TODO callouts, old constants, stale checkboxes). `Season structure.md` says: random generated opponents are enough for now. |
| Planned stack | `Development notes.md` plans React + TS / FastAPI / SQLite / JWT and marks stages 1–2 as done. No `backend/` or `frontend/` folder exists in this project or anywhere on the Desktop. That plan is stale and is now superseded by decision Q1. |
| Working code | `demo/` only. Vanilla JS, no build step, no dependencies. `engine.js` 264 lines, `data.js` 185, `ui.js` 188, `visuals.js` 80, `style.css` 526, `index.html` 59. |
| Tests | `demo/engine.test.js` (193 lines). Re-derives every rule step by step for 300 matches, runs 7,000 balance matches, fails when mirror balance leaves its target bands. Seeded. Runs in 2.0 s. |
| Version control | None. The folder is not a git repository. |

### 1.2 Measured engine performance (Node 24, this machine)

| Metric | Value |
|---|---|
| Throughput | 18,000 rounds/s · 0.32 ms per match |
| One round incl. JSON log | 58 µs · log 4.7 KB · 7.1 steps on average |
| `effectiveStats` / `operatorScore` | 364 ns / 663 ns per call |
| Where the time goes (CPU profile) | `effectiveStats` + helpers 36% · `operatorScore` 12% · `teamScore` 18% · GC 3% |
| 5,000-match simulation in the browser | ≈ 1.6 s, synchronous (page freezes for that long) |

**Verdict: speed is not a problem.** Nothing below is a performance fix. The one cheap gain (effective stats are recomputed for every operator every step although they only change at intel and at step 9) falls out of the modifier pipeline in WP1.

### 1.3 Measured balance (mirror roster, seeded test)

| Metric | Value | Target |
|---|---|---|
| ATK round win | 46.4% | 45–55% |
| First kill → round win | 71.0% | 65–75% |
| Steps per round | 7.28 | 6.5–8 |
| Endings: elimination / bomb / time out | 70.6% / 22.6% / 6.8% | 60–75 / 15–35 / 5–15 |
| ATK win by route | 31.4% (Exterior → Stairs) to 56.0% (Entry → Hallway) | none set |
| Upset: squad 6.6 avg stat points weaker | wins 12.1% of rounds, 0.6% of matches | 15–21% of rounds after Q12 |

### 1.4 Sensitivity: what actually moves the result

Measured against an equal generated opponent (quality 58.6), 3,000 matches, seed 777. Noise ≈ ±0.5 points.

| Change | Round win | Match win |
|---|---|---|
| baseline | 48.4% | 47.0% |
| one operator +10 Shooting (Breach) | 51.3% | 53.1% |
| one operator +10 on all stats (Breach / Fortress) | 58.4% / 56.3% | 67.5% / 64.4% |
| all 5 ATK operators +5 on all stats | 65.7% | 80.8% |
| all 10 operators +5 on all stats | 81.1% | 96.8% |
| all gadgets tier 3 (+4 flat) | 72.7% | 89.9% |
| all gadgets tier 6 (+10 flat) | 94.5% | 100.0% |
| Breach: AR instead of SMG | 49.4% | 49.5% |
| Fortress: AR instead of DMR | 48.8% | 47.3% |
| Fortress: Medium instead of Heavy armor | 50.5% | 51.3% |

What this says:

- **1 flat score point ≈ 1 stat point on all six stats** (situation weights sum to 1, role multipliers ≈ 1). Today's gadget tier bonus (+2 … +10 flat, in every situation) is therefore worth as much as +2 … +10 on every stat of every operator. The six-tier item ladder from `Items.md` cannot be plugged in with these values. Decision Q3 fixes the budget.
- **Weapon class and armor swaps move the result by 1–2 points**, inside noise. Gear is flavour today, not a progression axis.
- **Best-of-7 roughly doubles any round edge at match level.** +5 average stat ≈ match win almost guaranteed. Progression bonuses must be small or matches become foregone.
- **Flat terms do not scale with stats.** Random ±13, zone ±4, numbers 3, momentum 2, gadgets and gear are absolute points. Decision Q2 keeps the 0–100 scale, so they stay as absolute points.

---

## 2. Assessment against the four goals

### 2.1 Engine: effective, fast, accurate

Good: `data.js` / `engine.js` separation, every team term logged per step, strict rule test, seeded test, constants tuned with evidence (`Formula.md` §27–§31).

Gaps:

1. **No reproducible rounds in the UI.** The page uses `Math.random`. A strange round cannot be replayed, reported or debugged. Fix: a seed per round stored on the round, consumed by a small PRNG (the test already has one). → WP1
2. **Operators are identified by `name`.** Fine for 10 fixed operators; breaks with generated rosters, recruits, duplicates and any persistence. Fix: `id`. → WP1
3. **Generated opponents are clones.** `generateSquad` copies the roster's loadouts and playstyles and only adds stat noise. Every opponent plays the same. → WP2 (Q11)
4. **`operatorScore` hardcodes its five sources** and `pickSituation` mutates state as a side effect. Harmless today, in the way of 2.2. → WP1
5. **No per-operator explanation.** The log stores team terms but not how an operator reached a score of 96 (base × role × zone + gadget + gear). The UI cannot answer "why". → WP1 (data), WP4 (display)

### 2.2 Formula adjustability (skills, guns, traits)

Adding one trait today means editing `operatorScore`, `effectiveStats`, `checkRound` in the test and `Formula.md`. Items are strings (`'SMG'`, `'Heavy'`): nothing to hang a tier, an attachment or a condition on.

**One modifier pipeline, data-driven, behaviour-neutral at first (WP1), then content on top (WP2, WP8).**

- A contributor is a pure function `(op, ctx) → { stats?, mult?, add?, risk?, team? } | null`. `ctx` carries side, situation, zone, space, step, phase, intel result, alive counts, planted, and `rand` (the round's generator, so seeds stay reproducible).
- `stats` adjusts effective stats before the situation weights. `mult` multiplies the weighted score. `add` is a flat bonus. `risk` multiplies the operator's chance of being the casualty. `team` applies `stats` to every alive teammate while this operator is alive. The engine folds the list in one pass and writes every contribution into the step log.
- Today's sources become the first contributors: playstyle, intel, fatigue, role × situation, zone × role, gadget (+ tier + space), weapon, armor. Intel (step 1) runs through the same fold with the `Info` weights, so traits can touch it.
- Items become objects: `{ class: 'SMG', tier: 2 }`. Tier effects follow the Q3 budget (§4).
- A **power budget** assert: the test's `--sens` run prints the sensitivity of every item tier, trait and ability and fails when a fully equipped squad beats a bare one by more than the budget.

### 2.3 Game loop: more interesting, clearer, more visual

Today the player makes **one decision that matters** (the attack route: 31–56% swing) and **five that barely matter** (playstyles: at most 2.6 points each), and **none on defence**. The result is read from a dense table. Nothing persists, so the loop ends after one match.

| # | Change | Decision | Package |
|---|---|---|---|
| A | Defence briefing choice: "hold the breach" vs "hold the site" line-up | Q4 a | WP3 |
| B | Step playback: timed steps, animated map, narrative line, kill feed | Q9 a | WP4 |
| C | "Why" panel per round from the logged terms and per-operator parts | — | WP4 |
| D | Operator cards with stat bars; no portraits | Q10 a | WP5 |
| E | Zero-sum playstyles | Q5 a | WP3 |
| F | Route difficulty shown in the briefing | Q6 a | WP3 + WP4 |
| G | Ladder-lite: 7 opponents of rising quality, persistent run, no money | Q8 a | WP6 |
| H | Opponent archetypes | Q11 a | WP2 |
| I | Traits now, one active ability per operator later | Q7 a | WP2, WP8 |

Hostage mode, economy, base, sponsors, recruitment: later, as the docs already say.

---

## 3. Agent work packages

### 3.0 Rules for every agent

- Vanilla JS in `demo/`, no dependencies, no build step (Q1).
- No code comments; English identifiers and UI text. Follow the existing style of `engine.js` and `data.js` (small pure functions, tables in `data.js`).
- Run `node demo/engine.test.js --routes` before and after. For behaviour-neutral work the printed output must be identical to the saved pre-change run.
- One agent owns a file at a time (the "Owns" column). Shared files are split by function, and the split is stated in the brief.
- Any rule or constant change updates `Formula.md` in the same change, as the file's own header requires.
- No git for now, by the user's decision: no init, no commits. Packages that run in parallel never edit the same file; `demo/baseline.txt` holds the pre-WP1 test output for the byte-identical check.
- Hand-off: a short report with what changed, which files, the test output, and anything left open. Nothing else.

### 3.1 Package table

| # | Package | Owns | Depends on | Decisions |
|---|---|---|---|---|
| WP0 | Repository prep | `.gitignore`, `Formula.md` §2 | — | Q1 |
| WP1 | Engine core (behaviour-neutral) | `engine.js`, `data.js`, `engine.test.js`, `ui.js` (ids and seed only) | WP0 | Q2 |
| WP2 | Content model: items, traits, archetypes, sensitivity | `data.js`, `engine.js` (contributors and `generateSquad` only), `engine.test.js` | WP1 | Q3, Q7, Q11 |
| WP3 | Balance pass | `data.js` (CONFIG, tables), `engine.js` (line-ups, `routeOdds`), `engine.test.js` (targets), `Formula.md` | WP1, WP2 | Q4, Q5, Q6, Q12 |
| WP4 | Match presentation | `ui.js` (match part), `visuals.js`, `style.css`, `index.html`, new `narrate.js` | WP0 (log contract); WP1 optional | Q6, Q9 |
| WP5 | Operator cards | new `cards.js`, new `cards.css` | WP1 ids | Q10 |
| WP6 | Ladder-lite | new `ladder.js`, `ui.js` (ladder tab), `index.html` | WP1, WP2, WP4 | Q8, Q11 |
| WP7 | Docs sync | stale `.md` files, `MVP/MVP draft.md` tables | WP2, WP3 | — |
| WP8 | Active abilities | `data.js` (ACTIVES), `engine.js` (one contributor), `ui.js` (briefing) | WP3, WP6 | Q7 phase 2 |

### 3.2 Milestones and parallelism

| Milestone | Packages | Agents | Visible result |
|---|---|---|---|
| M1 Foundation | WP0 → WP1 | 1, sequential | nothing visible; rounds replayable by seed, test unchanged |
| M2 Content and presentation | WP2 ∥ WP4 ∥ WP5 | 3 in parallel, separate branches | items and traits exist; matches play back; operators are cards |
| M3 Balance | WP3 | 1 | DEF choice, zero-sum playstyles, new constants, Formula.md current |
| M4 Loop | WP6 | 1 | a 7-match run with persistence |
| M5 Docs | WP7 | 1 | all docs match the code |
| M6 Abilities | WP8 | 1 | one active ability per operator |

M2 merges: WP4 and WP5 never touch the same file. WP5's `Cards.mount(el, ops, editable)` has the same signature as `mountSquad`; the two call sites in `ui.js` are switched at merge time. WP3 starts only after M2 is merged, because items and traits shift the balance.

### 3.3 Briefs

#### WP0 — Repository prep

- Git deferred by decision; the baseline is `demo/baseline.txt` instead of a commit.
- Add a "Round log contract" table to `Formula.md` §2: every field a step entry carries today (`step, phase, situation, zone, statusBefore, status, ATK/DEF {avg, support, numbers, zone, momentum, random, total, scores[]}, diff, winner, strength, kills[], event`) and the intel entry (`step 1, phase 'Intel', atkIntel, defIntel, diff, winner, buff, debuff, kills: []`). Later packages may add fields, never rename or remove.
- Save the current test output to `demo/baseline.txt` (committed) so WP1 can diff against it.
- Done when: `demo/baseline.txt` exists and the log-contract table is in `Formula.md` (done by the WP1 agent).

#### WP1 — Engine core (behaviour-neutral)

Read first: `Formula.md` §2, §4, §8, §19–§23, §27; `demo/engine.js`; `demo/data.js`; `demo/engine.test.js`; `demo/baseline.txt`.

Do:

1. **Seeds.** Move the mulberry32 generator from the test into `engine.js`. `playRound(atk, def, route, seed)`: when `seed` is given, the round draws from its own generator and stores `round.seed`; when absent, it draws from the shared generator exactly as today, so the test output does not move. `playMatchRound(match, route, seed)` passes it through. `ui.js` passes `Math.floor(Math.random() * 2 ** 31)` per round and shows `seed N` in the round header. New test: replaying a round with its seed reproduces the identical log.
2. **Ids.** `id` on every operator: roster `r01`–`r10`, generated `g<n>` from a counter inside `generateSquad`. `cloneSquad` keeps ids. Kill entries gain `killerId` and `victimId` next to the names. `ui.js` lookups (`named`, MVP, replay) use ids. The mirror opponent gets new ids.
3. **Pipeline.** `CONTRIBUTORS` in `data.js`: an ordered list of `(op, ctx) => { stats?, mult?, add? } | null` for playstyle, intel, fatigue, role × situation, zone × role, gadget (tier + space), primary weapon, secondary weapon, armor. `ctx = { side, situation, zone, space, step, phase, intel, alive, planted, rand }`. `operatorScore(op, ctx)` folds them: `ES = clamp(base + Σstats)`, `score = situationScore(ES) × Π mult + Σ add`. Keep today's evaluation order (role, then zone fit; gadget, primary, secondary, armor) so results are bit-identical. Intel (step 1) uses the same fold with `situation: 'Info'`, `INTEL_WEIGHTS[side]` as the weight row, `ROLES[].intel` as `mult`, `GADGETS[].Info` as `add`.
4. **Parts in the log.** Each `scores[i]` becomes `{ id, name, score, parts }` with `parts = { base, mult: { role, zoneFit }, add: { gadget, primary, secondary, armor }, stats: { playstyle, intel, fatigue } }`. `checkRound` recomputes `score` from `parts`.
5. **Cache** effective stats per operator per (intel bucket, fatigue flag) only if it stays a few lines. Otherwise skip it.
6. `pickSituation` stops mutating `st.utilityUsed` inside the pick; the caller sets it.

Don't: change any constant, table or rule; add traits or items (WP2); touch `visuals.js` or `style.css`.

Done when: `node demo/engine.test.js --routes` output is identical to `demo/baseline.txt` (diff empty), the seed-replay test passes, and `ui.js` shows seeds and uses ids.

#### WP2 — Content model

Read first: WP1's `CONTRIBUTORS`, `Items.md`, `Operators/Traits.md`, `MVP/MVP draft.md` (trait per operator), `Development notes.md` §6.2 (archetypes), `Formula.md` §15–§16.

Do:

1. **Items as objects.** `primary`, `secondary`, `armor`, `gadget` on an operator become `{ class, tier }`. Lookup tables stay keyed by class. Tier effects per Q3: `WEAPON_TIER_SH = [0, 1, 1, 2, 2, 3]` as `stats { sh }` on the primary; `ARMOR_TIER = [0, 0, 1, 1, 2, 2]` as `stats { aw, dc }`; `GADGET_TIER_MULT = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5]` multiplying the gadget's own situation value (including the Info column). `GADGET_TIER_BONUS` is deleted. Roster stays tier 1 everywhere, so the mirror numbers do not move from items alone.
2. **Traits.** `TRAITS` table of 9 contributors, `op.trait` from `MVP/MVP draft.md`. Starting values, each within ±3 stat points or one conditional multiplier: Cold Blooded (Clutch: `sh +3, dc +2`), Tunnel Vision (`sh +3, aw −3`), Shot Caller (`team: { tw: +2 }` while alive), Breacher (Breach: `ut +3, sh +2`), Aggressive (Entry step: `sh +4, risk 1.5`), Unstable (every step: all stats `± rand(6)` from `ctx.rand`), Veteran (step ≥ `cleanupFrom`: all stats `+3`), Drone Expert (Info: `add +4`), Fortifier (DEF in Objective or Utility: `ut +3`). This needs `risk` and `team` in the fold: `risk` multiplies the victim weight in `pickKills`; `team` is collected in a first pass over alive teammates.
3. **Skill slot.** `op.active = null` placeholder; no behaviour (WP8).
4. **Archetypes.** `ARCHETYPES = { Balanced, Rush, Tactical, 'Utility-heavy' }` with zero-sum stat shifts (Rush `sh +8, aw −2, tw −4, dc −2`; Tactical `aw +6, dc +6, sh −8, ut −4`; Utility-heavy `ut +8, tw +4, sh −8, aw −4`), a default playstyle and gear classes per role. `generateSquad(quality, archetype = pick)` applies the shift after centering on `quality` and before the ±8 noise; the squad records its archetype.
5. **Sensitivity.** `node demo/engine.test.js --sens` prints, against the quality-58.6 opponent: baseline; each item tier at 6 for everyone; each trait on/off; each archetype's round win as opponent. Assert: a squad with every item at tier 6 and all traits beats the bare squad by 7–13 round-win points (budget +10 ± 3). The mirror balance targets keep their bands; traits are now on both sides of the mirror, so report the new numbers in the hand-off.

Don't: retune `CONFIG` (WP3); touch UI files.

Done when: the test passes including `--sens`, items are objects everywhere (roster, generator, UI reads `.class` and `.tier` without breaking), and the hand-off lists the measured value of each trait and tier.

#### WP3 — Balance pass

Read first: `Formula.md` §7, §9, §21, §22, §27–§31; WP2's hand-off.

Do:

1. **DEF line-up (Q4).** Replace `ROLES[].entry` with `ENTRY_SETUPS`: ATK `{ fight: ['Entry', 'Second Entry'], support: ['Utility Specialist'] }`; DEF `breach: { fight: ['Anchor', 'Trap Specialist'], support: ['Support Defender'] }` and `site: { fight: ['Roamer', 'Trap Specialist'], support: ['Support Defender'] }`. `playMatchRound(match, { route, defSetup, seed })`. The player chooses when defending; the opponent chooses by archetype (Rush → breach, Tactical → site, others random). A squad without the named roles falls back to everyone fighting, as today.
2. **Zero-sum playstyles (Q5), starting table, every row nets +4:** Aggressive `sh +8, aw −2, tw −2, ut 0, dc −1, lk +1`; Calculated `sh −3, aw +5, tw 0, ut 0, dc +5, lk −3`; Slow & Steady unchanged; Opportunistic unchanged; Team-first `sh −4, aw −1, tw +6, ut +4, dc −1, lk 0`; Adaptive `sh +1, aw +1, tw +1, ut 0, dc +1, lk 0`. Re-run the §30.5 experiment (best and worst playstyle per operator) and adjust until no playstyle is the best pick for more than 4 of 10 operators. The `mvpDraftBaseSituationScores` check in the test must be regenerated from the new effective stats.
3. **Constants (Q12).** `randomRange` 18, `zoneControlBonus` 3; try `maxSteps` 11 with `cleanupFrom` 10; re-size `clearAt` / `dominantAt` to the ±18 roll so Marginal / Clear / Dominant stay near 35 / 40 / 25%. Sweep one constant at a time as §31 does.
4. **Targets.** Keep the mirror bands. Add `6-pt weaker squad round win 15–21%` (the quality-52 run, read from the weaker side) and `Anchor dies in the Entry step < 25% when holding the site`.
5. **Route odds (Q6).** `Engine.routeOdds(atk, def, route, n = 300)` returns the ATK round-win share over `n` rounds from a fixed seed. Fast: 300 rounds ≈ 20 ms.
6. **Formula.md.** §7, §9, §14.2, §21, §22, §27, §29, §31 updated; the §30 questions answered here move to §28 as changes 20+.

Don't: touch presentation files.

Done when: the test passes with the new targets, every number in `Formula.md` is the value in `data.js`, and the hand-off contains the new §29 and §31 tables.

#### WP4 — Match presentation

Read first: `Formula.md` §2 (log contract), `demo/ui.js`, `demo/visuals.js`, `demo/style.css`, `demo/index.html`.

Do:

1. **Playback (Q9).** After "Play round", reveal the round one step per 0.8 s. Controls: speed ×1 / ×2 / ×4, pause (space), skip to end. Each step: the map updates through `Visuals.roundAt(r, n)` (front highlight, kill marks, bomb state), the kill feed appends, the narrative line appears, the step table grows (table collapsed by default behind a toggle). Operators that die are marked in the lineup. `prefers-reduced-motion` shows steps without transitions.
2. **`narrate.js`.** `Narrate.step(step, round)` → one sentence from the log: intel ("DEF wins the intel exchange: +1 Awareness, +1 Decision"), fights ("Breach and Haze edge the Main lobby entry; Wire falls to Breach"), events ("Hallway taken", "Bomb planted", "Defused", "Detonation", "Time out"). Strength words: Marginal "edges", Clear "wins", Dominant "overwhelms".
3. **Why panel.** Per round: the decisive step is the last step with kills, else the final step. Show the three largest `|ATK term − DEF term|` among avg, support, numbers, zone, momentum, random, worded for the player's side ("Defender zone control −8", "Numbers −6 (3 v 5)", "Luck −11"). When `scores[].parts` exists (WP1), show the per-operator breakdown on hover.
4. **Match strip.** Round chips at the top of the match view: W/L, side, end reason, steps.
5. **Briefing.** Next to each route, a difficulty label from `Engine.routeOdds` when the function exists: Hard < 42%, Even 42–58%, Favourable > 58%, percent in the tooltip. Hidden when the function is missing, so this package never waits for WP3.
6. Keep everything inside the existing `style.css` tokens; new tokens only in `:root` and its dark block.

Don't: touch `engine.js`, `data.js`, the squad tables (WP5) or `cards.*`.

Done when: a full match can be watched without reading the step table, the page works at 400 px width without horizontal scroll, and the test still passes.

#### WP5 — Operator cards

Read first: `demo/ui.js` (`squadTable`, `mountSquad`), `demo/visuals.js` (`icon`), `demo/style.css` tokens, `Operators/Role system.md`.

Do:

1. `cards.js` exposes `Cards.mount(el, ops, editable, match)` with the same contract as `mountSquad`: renders a responsive grid of cards and wires the playstyle `select` to `ops[i].playstyle` and `render()`.
2. A card: role icon (`Visuals.icon`), name, side colour, role, gadget with tier, weapon and armor with tier, trait when present, playstyle select (editable) or text, six stat bars showing base and effective values (`Engine.effectiveStats`), and for the current match: fights, kills, average score, died at step. Dead state greys the card.
3. `cards.css` holds the card styles using only `style.css` tokens; `index.html` links it after `style.css` (that one-line edit is done at merge time, together with switching the two `mountSquad` calls).
4. A "Table view" toggle keeps the old table reachable.

Don't: edit `ui.js`, `style.css`, `engine.js` or `data.js`.

Done when: cards render for the roster and for a generated squad at desktop and phone widths, the playstyle select still changes effective stats live, and the test still passes.

#### WP6 — Ladder-lite

Read first: WP2's archetypes, WP4's match flow, `Game Design/Season structure.md`, `Formula.md` §1.

Do:

1. `ladder.js`: a run `{ id, seed, opponents, results, current }`. Opponents: 7 generated squads with qualities 50, 53, 56, 59, 62, 65, 68 and archetypes rotating Balanced, Rush, Tactical, Utility-heavy, Rush, Tactical, Utility-heavy, generated from the run seed so a run is reproducible.
2. Persistence in `localStorage['squadsim.ladder.v1']`: the run, the player squad (ids, playstyles, item tiers, traits) and results. Every read and write wrapped in try/catch; without storage the run still plays, with a notice.
3. Ladder tab: standings (matches W/L, rounds for and against), next opponent preview (archetype, quality, cards), "Play match" → the existing match flow with this opponent; after the match the result is stored and the why summary of the last round is shown. "New run" resets after an inline confirmation.
4. No money, no rewards, no injuries.

Don't: touch `engine.js`, `data.js`, `narrate.js`, `cards.*`.

Done when: a run can be played to the end, the page can be closed mid-run and continued, and a second run starts fresh.

#### WP7 — Docs sync

- `Web Game.md`, `Game Design/Combat system.md`, `Operators/Stats.md`: rewrite the outdated sections or replace them with "superseded by Formula.md §x".
- `MVP/MVP draft.md`: regenerate the effective-stat and situation-score tables from `data.js` (zero-sum playstyles), mark traits as implemented with their effects, items as objects.
- `Operators/Traits.md`, `Game Design/Items.md`: state the implemented values (WP2) and the Q3 budget.
- `Development notes.md`: replace with the current stack decision (Q1) and a pointer to this plan. `Roadmap.md`: Phase 2 reflects what exists.

Done when: no document contradicts `data.js`, and every TODO callout added on 2026-10-28 is resolved or removed.

#### WP8 — Active abilities (Q7, phase 2)

Read first: WP1 pipeline, WP2 traits, WP3 line-ups, WP6 briefing flow.

Do:

1. `ACTIVES`: one per role, e.g. Entry "Flash entry" (Breach: `sh +6`), Second Entry "Trade push" (Gunfight: `sh +4, dc +2`), Support "Full recon" (Info: `add +6`), Utility Specialist "Overload" (Utility: `ut +6`), Flex "Read the room" (any: `dc +4, aw +2`), Anchor "Reinforce" (Objective on the Site: `ut +4, dc +2`), Roamer "Flank run" (Reposition and Gunfight: `sh +4, aw +2`), Lurker "Ambush" (Clutch and Reposition: `sh +6`), Trap Specialist "Wire the hall" (Utility and Breach: `ut +6`), Support Defender "Eyes everywhere" (Info: `add +6`).
2. One activation per operator per match, armed in the briefing for the coming round; one contributor checks `ctx.round === op.armedRound`. The opponent arms one random unused ability per round.
3. Briefing UI: "Arm ability" select (operator → ability), remaining uses shown on the cards.
4. `--sens` extended: an armed ability is worth about +6 stat points in its situation for one round and never more than +4 round-win points when every operator arms every round.

Done when: the test passes with the extended `--sens`, and a match can be played with abilities armed on both sides.

---

## 4. Decisions (answered 2026-10-29)

All twelve answers chose the recommended option.

| Q | Decision | Applied in |
|---|---|---|
| Q1 | Stay in `demo/`: vanilla JS, no build, no backend. Port later if ever. | every package |
| Q2 | Stat scale stays 0–100 permanently; every bonus in stat points. | WP1, WP2 |
| Q3 | Power budget: a fully equipped squad beats a bare one by ≈ +10 round-win points (measured +10.7). The first tier tables measured +22.4 and were halved: weapon tier +0…+2 Shooting, armor tier +0…+1 Awareness/Decision, gadget tier ×1.00…×1.15, trait ≈ ±3 conditional. | WP2 tables and the `--sens` assert |
| Q12 | Upset rate: `randomRange` 18, `zoneControlBonus` 3 → a 6-point-weaker squad takes ≈ 18% of rounds, ≈ 3% of matches. | WP3 constants and target |
| Q4 | Defence line-up choice each round: hold the breach or hold the site. | WP3 |
| Q5 | Playstyles become zero-sum, +4 net each. | WP3 |
| Q6 | Keep the route spread; show expected difficulty in the briefing. | WP3 `routeOdds`, WP4 label |
| Q7 | Skills: 9 passive traits first, one active ability per operator later. | WP2, WP8 |
| Q11 | Four opponent archetypes. | WP2, WP6 |
| Q8 | Ladder-lite progression, no money. | WP6 |
| Q9 | Auto-play ≈ 0.8 s per step with speed and skip, animated map, narrative line, kill feed. | WP4 |
| Q10 | Operator cards with role icon, side colour and stat bars; no portraits. | WP5 |

Open after this round: none that block M1–M3. Items to decide later, when WP6 is done: whether the ladder should ever hand out items (it currently cannot, there is no economy), and the Hostage mode.

---

## 5. Risks and what was not checked

- The demo could not be opened in a browser during the analysis (browser extension not connected). UI judgements come from reading `ui.js`, `visuals.js` and `style.css`.
- Sensitivity numbers use one seed and 3,000 matches: ±0.5 points of noise. Directions and orders of magnitude are solid; single digits are not.
- WP1 is the keystone: if the pipeline is not byte-identical against `demo/baseline.txt`, every later balance number in `Formula.md` becomes unverifiable. Do not merge WP1 without the empty diff.
- WP2 puts traits on the mirror roster, which moves the mirror balance by an unknown amount before WP3 retunes it. If a mirror target leaves its band in WP2, WP2 reports it and does not retune; WP3 owns the retune.
- WP3 changes playstyle tables, which invalidates the hand-calculated tables in `MVP/MVP draft.md` until WP7 regenerates them.
- `localStorage` (WP6) is per browser. A run does not follow the player to another device; that is accepted for ladder-lite.
