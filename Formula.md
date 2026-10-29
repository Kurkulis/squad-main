# Round Resolution Formula (MVP)

This file is the single source of truth for how the MVP simulates a match (round v4: doors, rooms and small groups, Plan v4): match format, round phases and steps, every formula, every tunable constant, and the balance it produces. It documents exactly what the demo implements: `demo/engine.js` runs the simulation and reads every table and constant from `demo/data.js`.

> [!NOTE] ✏️ Code and doc stay in sync
> Every number here is a value from `demo/data.js` (`CONFIG` or a table). If this file and the code disagree, the code is what runs, so fix this file in the same change. `demo/engine.test.js` re-derives the round rules step by step for every simulated round: side order, phases, movement through doors, reinforcements, traps, support, entry sides, situations, team score terms, intel, fatigue, casualties, kill credit, zone control, spotting, rotation and end conditions. A rule change that is not mirrored there fails the test.

> [!TIP] 💡 The short version
> A round starts with a planning step: DEF places its operators (at most 3 per room), reinforces doors and hides traps on doors, intel decides what ATK learns, ATK splits into 1–5 groups of 1–3 operators with their own paths and gadgets, and its drones reveal and replan. Then every step the groups advance door by door: at most 2 operators of a side pass a door per step, reinforced doors need a hard breach, traps slow and debuff the unwary. A fight happens in every room where attackers meet defenders; operators in the rooms next door support it at 0.7 of an operator. Groups hold at the room next to the site, at most 2 steps, for groups heading to other site doors. Each side scores the weighted **average** OperatorScore of its fighters and supporters plus local numbers (capped), the occupant's hold or split from the entry doors, zone control, momentum and smoke, plus a random roll. The winner pushes that zone's control toward its side, the loser takes casualties, lost fights make groups fall back and reroute, defenders rotate toward the groups they have spotted, and the round ends on elimination, defuse, detonation or time out.

### Code map

| `demo/engine.js` (or `demo/data.js` where noted)                                                                                                                                                                                                                                                                                                                             | Section                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `newMatch(player, enemy, mapName)`, `nextPlayerSide`, `briefing(match, { setup, armed, enemyArmed, seed, defTemplate })`, `playMatchRound(match, { setup, plan, defSetup, seed, armed, enemyArmed, atkTemplate, defTemplate })`, `armable(match, owner)`, `unusedAbilities(match, side, owner)`                                                                      | §1, §9.5, §19.2     |
| `playRound(atk, def, mapName, { setup, plan, atkTemplate, defTemplate, seed, armed })`, `mulberry32(seed)`, `phaseOf`, `resolveStep` (advance, sync, trailing), `advanceFront`, `cross` (doors, traps), `fight`, `supportersFor`, `entrySides`, `retreat`                                                                                                    | §2, §10              |
| `validateSetup`, `validatePlan`, `reveal`, `replan`, `defaultSetup`, `defaultPlan`, `suggestPlan(map, atkOps, revealed, rand)`, `suggestSetup(map, defOps, rand)`, `pool(map, ops, side, archetype)`, `adaptPlan`, `reinforceCharges(defOps)`; `data.js`: `GADGET_USE`, `GADGET_TARGETS`, `ATK_TEMPLATES`, `DEF_TEMPLATES`, `ARCHETYPES[a].ai` | §9                    |
| `paths(map, from, to, k)`, `dist(map, a, b, closed)`, `route(map, from, to, avoid, closed)`, `doors(map)`, `doorId(a, b)`, `doorsOf(path)`, `lanes(map)`; `maps.js`: `MAPS2`                                                                                                                                                                                   | §9, §23.1            |
| `effectiveStats(op, ctx)`, `generateSquad`                                                                                                                                                                                                                                                                                                                                   | §4, §6               |
| `intelScore(st, side)`, `resolveIntel`                                                                                                                                                                                                                                                                                                                                       | §8, §9.2             |
| `pickSituation`                                                                                                                                                                                                                                                                                                                                                                | §10.6                 |
| `data.js`: `cleanupMods`, the `fatigue` contributor                                                                                                                                                                                                                                                                                                                        | §11                   |
| `situationScore`                                                                                                                                                                                                                                                                                                                                                               | §12                   |
| `data.js`: the `gadget` contributor (with the planning factor `ctx.gadgetUse`)                                                                                                                                                                                                                                                                                             | §15                   |
| `data.js`: the `primary`, `secondary`, `armor` contributors, `weaponStats`; `catalog.js`: `CATALOG` (`WEAPON_CATALOG`, `ROLE_CLASSES`)                                                                                                                                                                                                                         | §4, §16              |
| `data.js`: `SITUATION_SHARE` (measured by `engine.test.js --share`); `cards.js`: stat guide, playstyle advisor, weapon select                                                                                                                                                                                                                                            | §12, §16.5, §27     |
| `data.js`: `CONTRIBUTORS`; engine: `operatorScore(op, ctx)`                                                                                                                                                                                                                                                                                                                | §4, §19              |
| `data.js`: `TRAITS`, the `trait`, `trap` and `team` contributors; engine: `teamStats`                                                                                                                                                                                                                                                                                | §19.1, §10.3         |
| `data.js`: `ACTIVES`, the `active` contributor (`ctx.armed` is a list)                                                                                                                                                                                                                                                                                                   | §19.2                 |
| `data.js`: `GADGET_TIER_MULT`, `WEAPON_TIER_SH`, `ARMOR_TIER`                                                                                                                                                                                                                                                                                                            | §15.3, §16.4         |
| `data.js`: `ARCHETYPES`; engine: `generateSquad(quality, archetype)`                                                                                                                                                                                                                                                                                                       | §6, §9.4             |
| `teamScore(st, ctx, fighters, supporters, enemies, planning, hold)`                                                                                                                                                                                                                                                                                                            | §17, §18, §20, §21 |
| `take`, `retreat`, `rotate`                                                                                                                                                                                                                                                                                                                                                | §23.1                 |
| `pickKills(victims, supporters, killers, count)`                                                                                                                                                                                                                                                                                                                               | §23.4                 |
| `checkEnd`                                                                                                                                                                                                                                                                                                                                                                     | §24                   |
| `planOdds(atk, def, mapName, plan, setup, n)`                                                                                                                                                                                                                                                                                                                                  | §14.4                 |
| `simulate` (tallies endings, per map and per plan source)                                                                                                                                                                                                                                                                                                                      | §29, §32             |

---

## 1. Match structure

A match is a **best-of-7** series. The first team to win **4 rounds** (`roundsToWin`) wins the match.

### Side alternation

| Round | Player side |
| ----: | ----------- |
|     1 | ATK         |
|     2 | DEF         |
|     3 | ATK         |
|     4 | DEF         |
|     5 | ATK         |
|     6 | DEF         |
|     7 | Tiebreak    |

Round 7 is only played at 3–3.

### Tiebreak rule (3–3)

$$
tiebreakRoll = random(1, 100)
$$

- If `tiebreakRoll > 50` → player attacks
- If `tiebreakRoll ≤ 50` → player defends

The roll happens once, the first time round 7's side is asked for, and is stored on the match (`match.tiebreakSide`). The side shown before round 7 is therefore always the side that is played.

### Squads, maps and pre-round choices

- Each team owns 10 operators: 5 ATK roles and 5 DEF roles. A round uses the attacking team's ATK operators against the defending team's DEF operators. A match is played on one `MAPS2` map (§14.4).
- When the **player defends**, the player makes the DEF setup (§9.1): positions, door reinforcements, door traps, the camera and the roamers. The opponent's ATK plan comes from its archetype's AI pool, adapted to intel (§9.4).
- When the **player attacks**, the briefing shows the intel result and what it revealed of the opponent's setup (§9.2, §9.5); the player then builds the ATK plan from groups of 1–3 (§9.3). `suggestPlan` and `suggestSetup` give a random valid starting point; the templates A/B/C and S/P/R are examples (§9.4). `planOdds` estimates a plan against a setup (§14.4).
- The opponent draws its plan or setup from the pool of 6 of its archetype (Balanced and squads without an archetype draw from all four pools), weighted, so opponents differ round to round (§9.4).
- The player may **arm any unused active abilities** for the coming round: operators of the side the player plays whose ability is unused this match, each once per match (§19.2). The opponent arms one random unused ability of its side every round. `unusedAbilities` lists what was never armed.
- Playstyles can be changed between rounds (§7). The next round uses the new choice.

---

## 2. Round structure

Round v4 (Plan v4 §3, on top of round v2). A round is a **planning step** (step 0) followed by **steps** 1, 2, 3, … Each map is a graph of zones joined by doors (`MAPS2` in `demo/maps.js`). ATK splits into 1–5 **groups** of 1–3 operators that each walk their own path from a spawn to the site; every DEF operator stands in a zone. At most 2 operators of a side pass a door per step and at most 3 stand in a zone, so a group stretches out along its path: its **front** leads, the rest queue behind. A step can hold several **fights**: one in every zone where a live attacker and a live defender meet, with the operators next door supporting.

### Phases

| Phase      | Steps                     | What happens                                                                                 |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| Planning   | 0                         | DEF setup → intel → ATK plan → drones and replanning (§8, §9). No fights, no casualties |
| Entry      | 1 – `entryUntil` (2)   | first contact; only the Aggressive trait reads this label (§19.1)                           |
| Main       | from 3                    | groups push through doors, fight, reroute; defenders rotate (§10, §23.1)                   |
| Cleanup    | from `cleanupFrom` (10) | fatigue, every fight a Gunfight unless Clutch (§11)                                         |
| Post-plant | after the plant           | every defender converges on the site to defuse (§23.1)                                      |

The phase of a step is decided in this order: bomb planted → Post-plant; step ≥ `cleanupFrom` → Cleanup; step ≤ `entryUntil` → Entry; otherwise Main.

### One step

1. **Advance** (§10.0–§10.3): every group's front moves one door along its path if its zone is ATK-held and holds no live defender, at most 2 operators per door and 3 per zone; a reinforced door blocks it unless a breacher opens it; a trapped door springs or is disarmed. Before the plant a group waits in its site neighbour, at most 2 steps, for groups heading to other site doors (sync). Then the queued operators of every group catch up one door each.
2. **Fights** (§10.4–§10.6): in map zone order, every zone with a live attacker and a live defender has one fight between the local operators, with the supporters of both sides from neighbouring rooms and the occupant's hold or split.
3. **Control** (§23.1): a fought zone shifts toward the winner; a zone with ATK and no defender shifts as a Clear ATK win; a zone that reaches +1 is taken, or planted when it is the site. A Clear or Dominant DEF win makes the groups whose front is there fall back and reroute.
4. **Spotting and rotation** (§23.1): DEF spots groups (fights, traps, alarms, cameras); roaming defenders that did not fight move one zone toward the spotted groups.
5. **End conditions** (§24).

### Round length

Before the plant a round lasts at most `maxSteps` (11) steps; a plant on step 11 can run to step 13 (`bombSteps` 2). The mirror averages **8.42** steps, planning step excluded (§29).

### Round log contract

`playRound(atk, def, mapName, { setup, plan, atkTemplate, defTemplate, seed, armed })` returns the round; `round.log[0]` is the planning entry, `round.log[n]` the state after step `n`. Later changes may add fields, never rename or remove them (v4 keeps `crowd` and `pinch` at 0 and `modifiers.reinforced` with a new meaning, §10.7). The floor-plan renderer (`FloorPlan.plan(map, state, opts)` in `demo/plan.js`) draws `{ map, setup, plan, step: round.log[n] }`.

**Round**

| Field                    | Meaning                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seed`                 | seed of the round's generator, or `null` (shared generator). `playRound(r.ops.ATK, r.ops.DEF, r.map, { setup: r.setup, plan: r.plan, seed: r.seed, armed: r.armed })` replays the round exactly |
| `map`                  | `MAPS2` name                                                                                                                                                                                      |
| `setup`                | DEF setup `{ positions, reinforcements: [doorId], traps: { opId: doorId }, cameras: { opId: zoneId }, roam }` (§9.1)                                                                             |
| `plan`                 | ATK plan `{ groups: [{ ops, path }], gadgets: { opId: zoneId \| doorId } }` (§9.3)                                                                                                                |
| `templates`            | `{ ATK, DEF }`: template key (`A`/`B`/`C`, `S`/`P`/`R`) when that side came from a template, else `null`                                                                            |
| `pools`                | `{ ATK, DEF }`: `'Archetype#index'` when that side came from an AI pool (§9.4), else `null`                                                                                                  |
| `armed`                | `{ ATK: [opId], DEF: [opId] }` armed operators (§19.2)                                                                                                                                           |
| `ops.ATK`, `ops.DEF` | operator copies with `alive`, `kills`, `scoreSum`, `fights`, `diedAt`                                                                                                                     |
| `step`, `result`     | final step and `{ winner, reason }` (§24)                                                                                                                                                        |
| `playerSide`           | set by `playMatchRound` only                                                                                                                                                                      |

Other fields on the returned object (`control`, `groups`, `groupOf`, `idx`, `since`, `via`, `pos`, `roam`, `reinforced`, `opened`, `known`, `traps`, `smokeZones`, `smokeDoors`, `emp`, `cameras`, `seen`, `fronts`, `gadgetUse`, `revealed`, `planted`, `plantedAt`, `momentum`, `intel`) are engine state at the end of the round, not part of the contract.

**Planning entry** (`log[0]`): `{ step: 0, phase: 'Planning', setup, intel, revealed, plan, canceled, replanned, groups, attackers, defenders, control, fights: [], events: [], kills: [], waiting: [], doors: {}, queued, spotted: {} }`

| Field                                                             | Meaning                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `intel`                                                         | `{ atkIntel, defIntel, diff, winner, buff, debuff, learned }` (§8); `learned` is what ATK learned from the bucket: `[]`, `['reinforcements']`, `['reinforcements', 'traps']` or all three with `'positions'` |
| `revealed`                                                      | what ATK knew when the round started: `{ reinforcements: [doorId], traps: [doorId], positions: { opId: zoneId } }` (bucket plus drones, §9.2, §9.3)                                                                   |
| `canceled`                                                      | reinforced doors a planned hard breach opened (§9.3)                                                                                                                                                                     |
| `replanned`                                                     | `{ groupIndex: path }` for the groups that replanned around known reinforcements (§9.3)                                                                                                                                |
| `groups`, `attackers`, `defenders`, `control`, `queued` | the start state, same shape as a step entry                                                                                                                                                                               |

**Step entry** (`log[1…]`), the state after the step:

| Field               | Meaning                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step`, `phase` | step number and phase                                                                                                                                                                                                                                                                                                                                                                                            |
| `groups`          | `{ groupIndex: zoneId }`: every group's front zone, a wiped group's last front                                                                                                                                                                                                                                                                                                                                 |
| `attackers`       | `{ opId: zoneId }` for every ATK operator, a dead one where it fell                                                                                                                                                                                                                                                                                                                                            |
| `defenders`       | `{ opId: zoneId }` for every DEF operator, a dead one where it fell                                                                                                                                                                                                                                                                                                                                            |
| `control`         | `{ zoneId: status }` for every zone (§23.1)                                                                                                                                                                                                                                                                                                                                                                   |
| `fights`          | one entry per contested zone, in map zone order (below)                                                                                                                                                                                                                                                                                                                                                          |
| `events`          | in order: per group the advance events (`breach`, `blocked`, `reroute`, `trap`, `alarm`, `reveal`, `disarm`), then per fight `taken`, `planted`, `reroute`, then uncontested zones `taken`/`planted`, `rotate`, then the end event                                                                                                                                                     |
| `kills`           | all kills of the step, fight by fight                                                                                                                                                                                                                                                                                                                                                                            |
| `waiting`         | indexes of the groups that held in their site neighbour this step for the others (sync, §10.0)                                                                                                                                                                                                                                                                                                                  |
| `doors`           | `{ doorId: { crossed: [opId], queued: [opId], blocked: [groupIndex], trap, breached } }` for every door used or tried this step: who crossed (both sides, retreats included), who could not cross for throughput or room, which groups a reinforcement stopped, `trap` `'sprung'`, `'alarm'`, `'disarmed'`, `'careful'` or `null`, `breached` the opId of an on-the-spot hard breach or `null` |
| `queued`          | `{ groupIndex: [opId] }`: live operators behind their group's front                                                                                                                                                                                                                                                                                                                                            |
| `spotted`         | `{ groupIndex: zoneId }`: groups DEF spotted this step and where (§23.1)                                                                                                                                                                                                                                                                                                                                      |

**Fight entry** (`step.fights[i]`):

| Field                                 | Meaning                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step`, `phase`, `situation`    | §10.6                                                                                                                                                                                                                                                                                                         |
| `zone`, `zoneType`                | zone id and its type (§14.3)                                                                                                                                                                                                                                                                                  |
| `groups`                            | indexes of the groups with a fighter there                                                                                                                                                                                                                                                                     |
| `modifiers`                         | `{ reinforced, trapped: [groupIndex], smoke, revealed }` (§10.7)                                                                                                                                                                                                                                            |
| `statusBefore`, `status`          | the zone's status before and after the fight                                                                                                                                                                                                                                                                   |
| `ATK`, `DEF`                      | `{ avg, numbers, crowd, pinch, hold, zone, momentum, planning, random, total, scores, support }` (§20); `crowd` and `pinch` are always 0                                                                                                                                                                |
| `ATK.scores[i]`, `ATK.support[i]` | `{ id, name, score, parts }` for every fighter and every supporter; `parts` as in v1 (`base`, `mult { role, zoneFit }`, `add { gadget, primary, secondary, armor, trait?, active? }`, `stats { playstyle, intel, fatigue?, primary, secondary?, armor, trait?, active?, trap?, team? }`, `risk`) |
| `supporters`                        | `{ ATK: [opId], DEF: [opId] }` (§10.4)                                                                                                                                                                                                                                                                      |
| `entrySides`                        | `{ occupant: 'ATK' \| 'DEF' \| null, value, doors: [{ from, door, ops, groups, weight, first, smoke, value }] }`: the occupant's hold/split per entry door and the weighted value it gets (§10.5)                                                                                                             |
| `diff`, `winner`, `strength`    | §22                                                                                                                                                                                                                                                                                                           |
| `kills[i]`                          | `{ killer, killerId, victim, victimId, side, zone, supporter }`, `side` = the victim's side, `supporter` true when the victim supported from next door                                                                                                                                                   |
| `event`                             | `'taken'`, `'planted'` or `null`                                                                                                                                                                                                                                                                         |

**Events**

| `type`                                | Fields                                           | When                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breach`                              | `group`, `op`, `door`                      | a front carrier opens a reinforced door                                                                                                                          |
| `blocked`                             | `group`, `door`, `zone`, `waitFor?`      | a front meets a reinforced door without a breacher at the front; `waitFor` names the group's own carrier it waits for                                          |
| `reroute`                             | `group`, `from`, `to`, `path`, `door?` | after a lost fight the group falls back from `from` to `to`; after `blocked` (with `door`) it stays at `to` and takes the new `path` around `from` |
| `trap`                                | `group`, `door`, `zone`                    | a group springs an unrevealed wire trap                                                                                                                          |
| `alarm`                               | `group`, `door`, `zone`                    | a group trips an unrevealed alarm                                                                                                                                |
| `reveal`                              | `group`, `zone`                              | DEF spots that group through a trap or alarm                                                                                                                     |
| `disarm`                              | `group`, `door`                              | a group disarms a revealed trap                                                                                                                                  |
| `taken`                               | `zone`                                         | a zone reaches +1 before the plant (not the site)                                                                                                                |
| `planted`                             | `zone`                                         | the site reaches +1                                                                                                                                              |
| `rotate`                              | `op`, `from`, `to`                         | a defender moves one zone                                                                                                                                        |
| `defused`, `detonated`, `timeout` | —                                               | the round's end event, last in the final step                                                                                                                    |

`score = parts.base × Π parts.mult + Σ parts.add`, folded in contributor order.

---

## 3. What the formula uses

### Operator data

- Role, which also fixes the side (`ATK` or `DEF`)
- Base stats: Shooting `sh`, Awareness `aw`, Teamwork `tw`, Utility Handling `ut`, Decision Making `dc`, Luck `lk`
- Selected playstyle
- Items as `{ class, tier }`: gadget (1 per role in the MVP), armor; weapons as `{ id, class, tier }`: primary weapon, secondary weapon (always a Pistol). Tables are keyed by `class`; `id` is a `WEAPON_CATALOG` entry (§16.5); `tier` is 1–6 (§15.3, §16.4). The MVP roster is tier 1 everywhere.
- Trait (§19.1) and `active`, the key of its role's active ability in `ACTIVES` (§19.2)
- Whether the operator is still alive

### Round state

- Step number and phase
- The map graph, the DEF setup and the ATK plan (§9); for the fight, its zone, zone type and space type
- Each group's path, each ATK operator's place on it and the zone and door it came through, each defender's zone, which defenders roam, where DEF last spotted each group (§10, §23.1)
- Zone control status of every zone: `−1` DEF control, `0` contested, `+1` ATK-held; the reinforced and breached doors, the traps (and which ATK knows), smokes, EMPs and cameras still in play (§9, §10)
- Whether the bomb is planted, and on which step
- Alive operators per side
- Which side won the previous step (momentum)
- Intel buffs and debuffs from the planning step, and what ATK learned (§9.2)
- The armed operators of each side (`armed`, §19.2)
- Which groups have had their Utility fight (§10.1)

### Game mode

Only **Bomb / Plant** is implemented. Hostage is not (§5).

---

## 4. Inputs that modify stats (not separate stats)

These do not create new stats. They change the existing six before a situation is scored:

$$
ES(o, s) = clamp\big(Base(o, s) + Playstyle(o, s) + Intel(o, s) + Fatigue(o, s) + Tier(o, s) + Weapon(o, s) + Trait(o, s) + Active(o, s) + Trap(o, s) + Team(o, s)\big)
$$

| Modifier            | Source                                                                                                                                      | Lasts                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Playstyle(o, s)` | §7, chosen before each round                                                                                                               | the whole round                          |
| `Intel(o, s)`     | §8, result of the planning step                                                                                                            | every step of the round                  |
| `Fatigue(o, s)`   | §11, from step 10 on                                                                                                                       | each step from step 10                   |
| `Tier(o, s)`      | §16.4, primary weapon tier (Shooting) and armor tier (Awareness, Decision)                                                                 | always                                   |
| `Weapon(o, s)`    | §16.5, the `mods` of the primary and the secondary weapon (`WEAPON_CATALOG`, by `id`); a weapon without `id` (old saves) adds none | always, intel step included              |
| `Trait(o, s)`     | §19.1, the operator's own trait                                                                                                            | when its condition holds                 |
| `Team(o, s)`      | §19.1, `team` stats of every alive teammate's trait (Shot Caller)                                                                        | while that teammate is alive             |
| `Active(o, s)`    | §19.2, the operator's armed active ability                                                                                                 | the round it is armed, in its situations |
| `Trap(o, s)`      | §10.3, −`trapDebuff` (4) on every stat of a group that sprang a wire trap                                                               | the group's next fight                   |

Training, sponsor bonuses and carry-over modifiers from the original design are not implemented and count as `0` (§5). Gadget quality changes the score only through the gadget bonus (§15.3).

---

## 5. What is NOT in the MVP formula

These exist in the design docs but are not used by the simulation:

| Not implemented                                                                                     | Value in the MVP                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Extra stats: Clutch, Composure, Aggression, Consistency, Reaction, Discipline, Close/Mid/Long range | no effect                                                                                                                                                                            |
| Training, sponsor bonuses, staff bonuses, injuries, between-match fatigue, aging                    | `0`                                                                                                                                                                                |
| Loadout presets                                                                                     | `LoadoutPresetBonus = 0`                                                                                                                                                           |
| Carry-over modifiers inside a round (§23.3)                                                        | skipped on purpose                                                                                                                                                                   |
| Entry kill-intel bonus                                                                              | skipped on purpose: worth ≈ 0.2 points against a ±18 random roll                                                                                                                   |
| Hostage mode                                                                                        | Bomb / Plant only                                                                                                                                                                    |
| Map-level role strengths and weaknesses ("Game modes and maps")                                     | only the zone-level role fit of §14.1 applies                                                                                                                                       |
| Gadget charges for DEF                                                                              | a DEF gadget adds its bonus in every fight and its placement works all round; ATK gadgets are spent in planning (or a carried breach charge at a door) or kept at half value (§9.3) |

They can be added later as extra modifiers once the core loop is balanced.

---

## 6. Stat scale

All MVP stats use a `0–100` scale. After all modifiers:

$$
clamp(x) = \min(STAT\_CAP, \max(0, x)), \qquad STAT\_CAP = 100
$$

The clamp is applied once, to the whole sum in §4. A stat already at 100 gains nothing from an intel buff, and a stat at 0 loses nothing to fatigue.

### Generated opponents

For an opponent of quality `q` and archetype `a`, each operator copies its role's MVP template (gadget, secondary, trait, item tiers) and takes its playstyle, primary weapon and armor from the archetype. Its stats keep the template's profile, shifted so that the mean is `q`, then shifted by the archetype:

$$
Base(o, s) = round\Big(clamp\big(Template(s) - \overline{Template} + q + Shift(a, s) + random(-8, +8)\big)\Big)
$$

`8` is `generatedSpread`. Because of the clamp, quality 0 and quality 100 produce squads whose real mean is above 0 or below 100. The MVP roster's mean base stat is **58.6**, so a quality 58–59 Balanced opponent is an even match.

### Opponent archetypes

`generateSquad(quality, archetype)` picks one of the four at random when no archetype is given; every generated operator records it as `archetype`. Shifts are zero-sum, so an archetype changes the profile, not the quality.

| Archetype     | Shift                                                  | Playstyle  | Primary / armor | Role exceptions                                                              | Templates ATK / DEF (§9.4) |
| ------------- | ------------------------------------------------------ | ---------- | --------------- | ---------------------------------------------------------------------------- | --------------------------- |
| Balanced      | none                                                   | template   | template        | —                                                                           | random / random             |
| Rush          | Shooting +8, Awareness −2, Teamwork −4, Decision −2 | Aggressive | SMG / Light     | Utility Specialist AR; Anchor Shotgun / Medium; Support Defender AR / Medium | A / R                       |
| Tactical      | Awareness +6, Decision +6, Shooting −8, Utility −4   | Calculated | AR / Heavy      | Entry SMG / Medium; Anchor DMR; Roamer Medium armor; Lurker DMR / Medium     | B / S                       |
| Utility-heavy | Utility +8, Teamwork +4, Shooting −8, Awareness −4   | Team-first | AR / Medium     | Entry Aggressive, SMG; Trap Specialist Slow & Steady, Shotgun                | C / P                       |

Every playstyle nets +4 (§7), so an archetype's playstyle reshapes the profile without adding stat points. Archetypes still differ in strength through situation fit, gear and templates (§29 sensitivity).

> [!NOTE] ✏️ Future scaling
> The 100 cap is temporary for MVP due to limited content. As items, training tiers, and progression deepen, the cap will increase to **1000 or become uncapped**. The formula is designed to work at any scale — all weights and multipliers are ratio-based, not tied to a specific cap value. The only hard rule: no item or exploit combination should allow unbounded stat stacking. Anti-abuse rules will be defined alongside the expanded progression systems.

---

## 7. Playstyle stat bonuses

| Playstyle     | Shooting | Awareness | Teamwork | Utility | Decision | Luck | Net |
| ------------- | -------: | --------: | -------: | ------: | -------: | ---: | --: |
| Aggressive    |       +8 |        -2 |       -2 |       0 |       -1 |   +1 |  +4 |
| Calculated    |       -3 |        +5 |        0 |       0 |       +5 |   -3 |  +4 |
| Slow & Steady |       -3 |        +2 |        0 |       0 |       +5 |    0 |  +4 |
| Opportunistic |       +4 |         0 |       -6 |       0 |       +2 |   +4 |  +4 |
| Team-first    |       -4 |        -1 |       +6 |      +4 |       -1 |    0 |  +4 |
| Adaptive      |       +1 |        +1 |       +1 |       0 |       +1 |    0 |  +4 |

- `Adaptive` is exclusive to Flex. Every other playstyle is open to every role.
- Every playstyle nets +4 stat points (Q5, §28 change 21), so the choice is a trade-off between stats, not a free upgrade.

Changing one operator's playstyle (measured on round v2 with the weapon catalog, 2026-10-29: MVP roster against a Balanced quality-58.6 opponent, 2 × 1500 matches with seeds 777 and 778, baseline 51.7% round win, round-win change vs the default):

| Operator | Default       | Best choice                       | Worst choice        |
| -------- | ------------- | --------------------------------- | ------------------- |
| Breach   | Aggressive    | Calculated +0.5                   | Team-first +0.0     |
| Haze     | Aggressive    | Calculated +0.3                   | Opportunistic −0.6 |
| Watcher  | Team-first    | Calculated +0.7                   | Opportunistic −0.7 |
| Volt     | Calculated    | Opportunistic +0.5                | Slow & Steady −0.5 |
| Mirage   | Adaptive      | Aggressive +1.0 (Calculated +1.0) | Slow & Steady +0.3  |
| Fortress | Slow & Steady | Aggressive +0.8                   | Team-first −0.1    |
| Jackal   | Aggressive    | Calculated +0.7                   | Opportunistic −0.3 |
| Shade    | Opportunistic | Aggressive +0.9                   | Team-first +0.1     |
| Wire     | Slow & Steady | Calculated +1.7                   | Opportunistic −0.4 |
| Lens     | Team-first    | Calculated +1.1                   | Opportunistic +0.3  |

Best pick: Calculated 6 (7 counting Mirage's tie), Aggressive 3, Opportunistic 1. The Q5 target (no playstyle the best pick for more than 4 of the 10 operators), met on round v1 (Opportunistic 3, Calculated 3, Aggressive 2, Team-first 1, Slow & Steady 1), is **missed on round v2**. Every effect is between −0.7 and +1.7 points, mostly inside noise (about ±1 point), so the playstyle choice is close to neutral either way (§30).

---

## 8. Intel (planning step)

Intel is **not a fight**. Both sides compute an intel score once, in the planning step after the DEF setup (§9). The result buffs the winner, and may debuff the loser, for every step of the round, and its bucket decides what ATK learns before it plans (§9.2). Intel **never produces casualties**.

### Intel score

$$
ATKIntel = \sum_{o \in ATK} \Big[\big(0.35\,ES(o, aw) + 0.25\,ES(o, ut) + 0.20\,ES(o, tw) + 0.10\,ES(o, dc) + 0.10\,ES(o, lk)\big) \cdot IntelRoleMult(o) + GadgetInfo(o)\Big]
$$

$$
DEFIntel = \sum_{o \in DEF} \Big[\big(0.30\,ES(o, aw) + 0.30\,ES(o, ut) + 0.15\,ES(o, tw) + 0.15\,ES(o, dc) + 0.10\,ES(o, lk)\big) \cdot IntelRoleMult(o) + GadgetInfo(o)\Big]
$$

- `ES` here is base + playstyle + item tiers + weapon mods + traits + team (§4). Intel and fatigue do not exist yet. The gadget is counted at full value: ATK spends gadgets only after intel (§9.3).
- `GadgetInfo(o)` is the gadget's **Info** column in §15.1 × the gadget tier multiplier (§15.3): Drone +8, Camera Network +8, Scout Drone +5, Proximity Alarm +5, Flank Wire +4, EMP Grenade +2, all other MVP gadgets 0 at tier 1. It is added after the role multiplier, with no space multiplier. Drone Expert adds +4 more (§19.1).

#### Intel role multipliers

| Role               | Intel multiplier |
| ------------------ | ---------------: |
| Entry              |             0.85 |
| Second Entry       |             0.90 |
| Support            |             1.25 |
| Utility Specialist |             1.15 |
| Flex               |             1.05 |
| Anchor             |             1.00 |
| Roamer             |             1.10 |
| Lurker             |             1.10 |
| Trap Specialist    |             1.05 |
| Support Defender   |             1.20 |

### Intel advantage

$$
IntelDiff = \frac{ATKIntel - DEFIntel}{count(ATK) + count(DEF)} + random(-3, +3)
$$

`3` is `intelRandom`. If `IntelDiff > 0`, ATK wins intel. Otherwise DEF wins: a tie goes to the defender.

| \|IntelDiff\| | Winning side buffs                                  | Losing side debuffs       |
| ------------- | --------------------------------------------------- | ------------------------- |
| below 3       | +1 Awareness, +1 Decision                           | none                      |
| 3 to below 6  | +2 Awareness, +2 Decision, +1 Shooting              | -1 Awareness              |
| 6 to below 10 | +3 Awareness, +3 Decision, +2 Shooting, +1 Teamwork | -2 Awareness, -1 Decision |
| 10 or more    | +4 Awareness, +4 Decision, +3 Shooting, +2 Teamwork | -3 Awareness, -2 Decision |

Each lower bound is inclusive, so exactly 3.0 lands in the second row. These modifiers are `Intel(o, s)` in §4 and apply to every operator of that side for the rest of the round.

> [!EXAMPLE] MVP roster mirror
> Without traits, ATKIntel = 326.3 and DEFIntel = 347.6, so the raw IntelDiff is −2.13. With traits and the ±3 roll, DEF wins intel in 79.3% of rounds (20,000 seeded rounds, seed 4242). The result is the first row in 70.7% of rounds and the second row in 29.3%. The last two rows need a real intel gap between the squads.

---

## 9. Planning phase (step 0)

Resolved in this order: **DEF setup → intel → ATK plan → drones and replanning**. The player supplies the setup when defending or the plan when attacking; the opponent's side comes from its archetype's AI pool (§9.4). Doors are the map edges (`MAPS2[map].edges`, drawn at `MAPS2[map].doors`); a door id is the two zone ids sorted and joined by `|` (`doorId(a, b)`, `doors(map)` lists `{ id, a, b, pos }`).

### 9.1 DEF setup

`{ positions: { opId: zoneId }, reinforcements: [doorId], traps: { opId: doorId }, cameras: { opId: zoneId }, roam: { opId: true } }`

| Part               | Rule                                                                                                                                                                                                                                                                                                             | Effect                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `positions`      | every DEF operator on a map zone that is not a spawn, at most `zoneCapacity` (3) per zone                                                                                                                                                                                                                      | the operator fights in that zone (§10)                                                                                                                                                                                                 |
| `reinforcements` | at most `reinforceCharges` (2) + `panelCharges` (1) when an Anchor carries the Reinforcement Panel (`reinforceCharges(defOps)`, 3 for every current squad); distinct doors; every zone must stay connected to the site through open doors and the site must keep at least `siteOpenDoors` (2) open doors | the door is a wall for both sides: ATK cannot cross it without a hard breach (§9.3, §10.3), nobody supports a fight through it (§10.4), DEF does not rotate through it. No stat effect. A breached door stays open with throughput 1 |
| `traps`          | one per DEF operator whose gadget is a trap (Barbed Wire, Flank Wire: Trap Specialist, Lurker) or an alarm (Proximity Alarm: Roamer), each on a distinct unreinforced door                                                                                                                                       | hidden from ATK unless revealed (§9.2, §9.3). Wire traps debuff, alarms only reveal (§10.3)                                                                                                                                          |
| `cameras`        | one per DEF operator with the Camera Network (Support Defender), on any zone                                                                                                                                                                                                                                     | every step DEF spots every group with a live operator in that zone or a neighbour (§23.1)                                                                                                                                              |
| `roam`           | DEF operator ids                                                                                                                                                                                                                                                                                                 | roaming defenders move toward the groups DEF has spotted (§23.1); the others hold                                                                                                                                                      |

`validateSetup(map, defOps, setup)` throws on a missing or unknown position, a spawn, a fourth defender in a zone, too many or non-door reinforcements, a reinforcement set that cuts a room off or leaves the site fewer than 2 open doors, a trap or camera without the gadget, a trap on a reinforced or unknown door, two traps on one door, or the v3 shapes (`traps` as an array).

### 9.2 Intel and what it reveals

Intel is resolved after the DEF setup with the §8 formula and roll. Its bucket decides what ATK learns before it plans (`INTEL_BUCKETS[i].reveal`):

| \|IntelDiff\| bucket (§8) | ATK wins intel: ATK learns                          | DEF wins intel     |
| -------------------------- | --------------------------------------------------- | ------------------ |
| below 3 (Marginal)         | nothing                                             | ATK learns nothing |
| 3 to below 6 (Clear)       | every reinforced door                               |                    |
| 6 to below 10 (Dominant)   | reinforced doors and every trap door                |                    |
| 10 or more                 | reinforced doors, trap doors and every DEF position |                    |

DEF always knows the ATK spawns (public), never the groups until it spots them (§23.1). `reveal(map, setup, learned, gadgets, atkOps, defOps)` returns `{ reinforcements: [doorId], traps: [doorId], positions: { opId: zoneId } }`, the bucket reveal plus the drones of §9.3.

### 9.3 ATK plan

`{ groups: [{ ops: [opId], path: [zoneId] }], gadgets: { opId: zoneId | doorId } }`

- 1 to `maxGroups` (5) groups of 1 to `maxGroupSize` (3) operators; every ATK operator in exactly one group. A path is a simple path along map edges from a spawn to the site.
- Each operator may place its gadget in planning on a zone of its own path or a door between two consecutive zones of its path (`GADGET_USE`, `GADGET_TARGETS` in `data.js`):

| Gadget use                      | Gadgets                                                  | Target       | Effect                                                                                                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reveal`                      | Drone, Scout Drone                                       | zone         | reveals the DEF positions in the zone and its neighbours, the reinforced doors touching any of those zones, the traps on doors touching the zone itself, and the traps of tier below `trapRevealTier` (3) on doors touching a neighbour                                            |
| `breach`                      | Breaching Charge, Thermite Charge                        | door         | a hard breach: opens that reinforced door before the round (`canceled` in the log; wasted on an unreinforced door). Not placed, it is carried: the first time its carrier stands at the front of its group at a reinforced door, it opens that door on the spot (`breach` event) |
| `emp`                         | EMP Grenade                                              | zone         | a revealed trap on a door touching the zone is disarmed when crossed (§10.3)                                                                                                                                                                                                        |
| `smoke`                       | Smoke Grenade                                            | zone or door | zone: `+smokeBonus` (12) to ATK in Breach and Objective fights there. Door: the occupant's hold bonus against ATK entering through it is cancelled (§10.5)                                                                                                                        |
| `trap`, `alarm`, `camera` | Barbed Wire, Flank Wire, Proximity Alarm, Camera Network | door / zone  | DEF only, §9.1                                                                                                                                                                                                                                                                      |
| `panel`                       | Reinforcement Panel                                      | —           | DEF only: the Anchor carrying it adds `panelCharges` (1) reinforcement                                                                                                                                                                                                             |

- An ATK operator that places its gadget loses the per-situation gadget bonus (§15) for the round; one that keeps it gets the bonus at `unspentGadgetFactor` (0.5) until it spends it (a carried breach charge). DEF gadgets keep the full bonus.
- **Replanning.** After the drones, every group whose path crosses a reinforced door ATK now knows (intel or drone) takes the cheapest simple path from its spawn that avoids every known reinforced door (cost as in §9.4), unless exactly one known door is on its path and the group carries an unspent breach charge. The planning entry lists the new paths in `replanned`; a planned detour costs no step.
- `validatePlan(map, atkOps, plan)` throws on 0 or more than 5 groups, an empty group or one of more than 3, an operator missing or in two groups, a path that does not start on a spawn, end on the site, stay simple or follow edges, a gadget that cannot be placed, is placed off its path, or on the wrong kind of target.
- Abilities: any operator whose ability is unused this match may be armed, each once per match (§19.2).

### 9.4 AI plans: pools, suggestions and templates

**Pools.** An AI side draws its plan or setup from a pool of `poolSize` (6) entries per map, side and archetype (`pool(map, ops, side, archetype)`), generated once from a generator seeded by the map, side, archetype and the squad's roles and gadgets, and picked with the weights `poolWeights` [3, 3, 2, 2, 1, 1]. Balanced and squads without an archetype (the MVP roster, a mirror) pick from all four archetypes' pools. The pick uses a generator derived from the round seed (so `briefing` and the round draw the same setup), and the ATK pick is then adapted to intel (`adaptPlan`): a group whose path crosses a reinforced door intel revealed targets it with its breach charge when it carries one and there is only one such door, otherwise it takes the cheapest path. `round.pools` records `'Archetype#index'` per side, `null` when the side was supplied or a template.

**Suggestions.** `suggestPlan(map, atkOps, revealed, rand)` returns a random valid small-group plan: the archetype's group count range (`ARCHETYPES[a].ai.groups`, Balanced 2–4), operators shuffled into groups of 1–3, each group's path drawn from the near paths with weight `cost⁻³`, drones on the first room or the site neighbour of the path (probability `ai.drones`), smoke on the site (75%) or its last door, a breach charge on a revealed reinforced door of its path, an EMP on a zone touching a revealed trap of its path. `suggestSetup(map, defOps, rand)` places the Anchor and `ai.site` defenders on the site, the others on random site neighbours and near-path rooms (at most 3 per zone), roaming Roamer and Lurker off the site with probability `ai.roam`, reinforcements drawn from the site and approach doors (valid sets only), each trap or alarm on a random open near-path door, the camera on a random choke or near-path zone. Both take `rand`, a `() => [0, 1)` generator.

| Archetype `ai` | groups | site | roam | drones |
| ---------------- | ------ | ---- | ---- | ------ |
| Balanced         | 2–4   | 2–3 | 0.5  | 0.5    |
| Rush             | 2      | 2    | 0.8  | 0.3    |
| Tactical         | 2–3   | 3    | 0.2  | 0.9    |
| Utility-heavy    | 3–4   | 2–3 | 0.4  | 0.6    |

**Templates** (balance matrix and examples only). `defaultSetup(map, defOps, template)` and `defaultPlan(map, atkOps, template, revealed)` are deterministic. The map analysis: all simple spawn→site paths (`paths(…, 40)` per spawn); the *near* paths are at most two hops longer than their spawn's shortest; **entries** are the site neighbours and **chokes** the first zones after the spawn of the near paths, both ranked by how many near paths cross them; site doors, approach doors (into an entry) and choke doors (out of a spawn) are ranked the same way (`lanes(map)`).

| DEF template (`DEF_TEMPLATES`) | Positions                                                                             | Reinforcements (charges in this order, valid sets only) | Traps          | Camera    | Roam           |
| -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------- | --------- | -------------- |
| S — Stack site                  | Anchor, Trap Specialist, Support Defender on the site; Roamer, Lurker on entries 1–2 | site doors, then approach doors                         | approach doors | top choke | none           |
| P — Spread                      | Anchor, Support Defender on the site; Roamer, Lurker, Trap Specialist on entries 1–3 | site doors, then approach doors                         | choke doors    | top choke | none           |
| R — Roam                        | as P                                                                                  | approach doors, then site doors                         | choke doors    | top choke | Roamer, Lurker |

| ATK template (`ATK_TEMPLATES`) | Groups (operators in role order) | Paths                                                                                                                                                          |
| -------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — One lane                    | 3 + 2                            | both on the cheapest path                                                                                                                                      |
| B — Split                       | 3 + 2                            | two paths through different entries                                                                                                                            |
| C — Flank                       | 2 + 1 + 2                        | three paths through three different entries; the cheapest gets Entry + Second Entry, the second the Support alone, the costliest the Utility Specialist + Flex |

Path cost = zones on the path + per door: a revealed reinforcement 6 (1 if the group carries a breach charge), a revealed trap 1 (0 with a Utility Specialist) + ½ per revealed defender on the path. With several lanes the template picks, among one path per entry, the combination with the smallest length spread, then the lowest cost; groups take the paths in cost order. Template gadgets: smoke on the site, drones on the path's site neighbour, a breach charge on the first revealed reinforced door of its path.

### 9.5 Briefing

`briefing(match, { setup, armed, enemyArmed, seed, defTemplate })` runs the planning step up to intel for the coming round and returns `{ side, seed, armed: [opId], enemyArmed: [opId], defSetup, intel, revealed }`. When the player attacks, `defSetup` is the opponent's pool pick for that seed (or `defTemplate` when given) and `revealed` what intel shows (the bucket only; drones are applied when the round is played); the player then plans against it and calls `playMatchRound(match, { plan, defSetup, seed, armed, enemyArmed })` with the returned values, which reproduces the same intel. When the player defends, pass the player's `setup` to both calls; without one the briefing proposes template S. `unusedAbilities(match, side, owner = 'player')` lists `{ id, name, role, side, active, situations, zone }` for every operator of that side (both sides when `side` is null) whose ability was never armed this match.

---

## 10. Steps (v4)

### 10.0 Movement

Every ATK operator stands at an index of its group's path (`attackers` in the log); the group's **front** is its live operator furthest along. Per step, in group order:

1. **Front.** A live group whose front zone has status +1 and no live defender moves its front operators to the next zone, through that door (§10.1–§10.3). A group at the site stays.
2. **Sync.** Before the plant, a group that would enter the site waits in its site neighbour (the zone before the site on its path) while another live group heading to a *different* site neighbour is more than `syncHops` (0) behind, for at most `syncWait` (2) steps per round. Lag: hops to its own site neighbour, plus 1 if it cannot move this step; a group at the site, or wiped, has lag 0. Groups sharing a site door never wait for each other. The waiting group is listed in `waiting`.
3. **Trailing operators** (behind the front at the start of the step), furthest first, each cross one door along the path if their zone holds no live defender.

A group that cannot pass a door keeps its operators queued behind (`queued`, per group: the live operators behind the front).

### 10.1 Door throughput and room capacity

- At most `doorCapacity` (2) operators of one side cross one door per step; 1 through a breached door, and 1 on the step a trap slows it (§10.3). Retreats and DEF rotations count too.
- At most `zoneCapacity` (3) operators of one side stand in a zone (spawns excepted, they are staging areas). A crossing that would exceed it does not happen; DEF setups are validated to 3 per zone and rotations respect it.
- Operators that do not cross wait in their zone and appear as `queued` in the door entry. The test checks every step: no door moves more than 2 operators of a side, no non-spawn zone holds more than 3.

### 10.2 Reinforced doors

A front that reaches a reinforced door: if one of its front operators carries an unspent breach charge, it opens the door (`breach` event; the door becomes open with throughput 1, the charge is spent and its gadget bonus drops to 0) and the group crosses. Otherwise the door is `blocked`: ATK now knows it; if another live member of the group carries a charge the group waits for it (`blocked` with `waitFor`); else it takes the shortest path from its current zone to the site that avoids every reinforced door it knows (`reroute`, any length) and loses the step.

### 10.3 Traps

Applied on the first crossing of a trapped door in a step (that is, if at least one operator crosses):

| Trap state                                                                               | Effect                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unrevealed wire (Barbed Wire, Flank Wire)                                                | springs and is removed: the group gets −`trapDebuff` (4) to every stat in its next fight (`parts.stats.trap`, fighters and supporters of the group), only 1 operator crosses that door this step, DEF spots the group (`trap`, `reveal` events) |
| unrevealed alarm (Proximity Alarm)                                                       | removed; DEF spots the group (`alarm`, `reveal`); no debuff, no slowdown                                                                                                                                                                             |
| revealed, the group has a live Utility Specialist or an ATK EMP is on a zone of the door | disarmed and removed (`disarm` event), no effect                                                                                                                                                                                                       |
| revealed, otherwise                                                                      | stays; only 1 operator crosses that door this step; no debuff                                                                                                                                                                                            |

Each door entry records `trap`: `sprung`, `alarm`, `disarmed` or `careful`.

### 10.4 Fights and support

- A fight happens in every zone that holds a live ATK operator and a live defender, in map zone order, with the local operators (at most 3 per side). `groups` lists the groups with a fighter there.
- **Supporters.** A live operator in a neighbouring zone that has no fight this step, joined to the fight zone by an unreinforced door, supports the first fight it neighbours (map zone order; each operator supports once per step). Both sides. A supporter is scored like a fighter (same situation and zone type) and counts as `supportFactor` (0.7) of an operator in the average and in the local numbers (§17, §20). Supporters do not get fight credit (`fights`, `scoreSum`); only fighters kill.
- **Casualties.** Only the loser's fighters die, except in a Dominant fight, where its supporters are also in the victim pool and at most one of them dies (`kills[i].supporter`).

### 10.5 Entry sides: hold and split

The **occupant** is the side whose fighters have been in the zone longer (each operator's arrival step; a tie means no occupant, term 0). The other side's fighters are grouped by the door they came through and its supporters by the door they stand behind. Each door remembers the step it was first used in this fight (reset when the zone has no fight in a step). Per door:

| Doors in use            | Value for the occupant                                                |
| ----------------------- | --------------------------------------------------------------------- |
| 1                       | +`holdBonus` (2)                                                    |
| 2, one opened earlier   | +2 against the earlier door, −`splitPenalty` (3) against the later |
| 2, opened the same step | −3 against both                                                      |
| 3 or more               | −3 against each                                                      |

An ATK smoke on a door caps that door's value at 0. The occupant's `hold` term is the average of the door values weighted by the operators behind them (fighters 1, supporters 0.7); the entering side's `hold` is 0. The fight entry lists every door with its operators, groups, weight, first step, smoke flag and value in `entrySides`. This replaces the v2 pinch.

### 10.6 Situation selection

Checked top to bottom per fight, the first match wins:

| # | Condition                                                             | Situation                                   |
| -: | --------------------------------------------------------------------- | ------------------------------------------- |
| 1 | bomb planted and the fight is on the site                             | Objective                                   |
| 2 | \|alive(ATK) − alive(DEF)\| ≥ `clutchGap` (3), whole round        | Clutch                                      |
| 3 | step ≥ `cleanupFrom` (10)                                          | Gunfight                                    |
| 4 | the zone is ATK-held (status +1): a defender walked in or survived    | Gunfight                                    |
| 5 | the zone is the first zone after the spawn on a fighting group's path | Breach                                      |
| 6 | the zone is the site                                                  | Objective                                   |
| 7 | a fighting group has not had its Utility fight yet                    | Utility (the groups in the fight use it up) |
| 8 | otherwise                                                             | the zone type's default situation (§14.3)  |

Rule 4 is new in v4: a lingering defender in a held zone used to fight Utility or Reposition fights that kill nobody on a Clear win (open question 2 of v2), which with door queues froze whole lanes.

### 10.7 Zone modifiers

| Modifier (`fight.modifiers`) | Condition                                          | Effect                                                                    |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| `reinforced`                 | a door of the zone is still reinforced             | none on the score (logged for the why panel)                              |
| `trapped`                    | groups fighting with a sprung wire's debuff        | −`trapDebuff` (4) to every stat of their operators                     |
| `smoke`                      | an ATK smoke was placed on the zone                | ATK `planning` term +`smokeBonus` (12) in Breach and Objective fights |
| `revealed`                   | ATK knew a DEF position in the zone (§9.2, §9.3) | none on the score; logged                                                 |

---

## 11. Cleanup (from step 10)

From step `cleanupFrom` (10) until the end of the round:

- Every fight that is not a Clutch and not a post-plant fight on the site is a **Gunfight** (§10.6).
- **Fatigue:** every operator gets `−3` to all stats (`cleanupFatigue`).
- **Intensity bonus:** operators with **base** Luck above 50 (`cleanupLuckAbove`) also get `+2` Shooting and `+2` Decision (`cleanupLuckBonus`).

$$
Fatigue(o, s) = -3 + \begin{cases} +2, & s \in \{sh, dc\} \text{ and } Base(o, lk) > 50 \\ 0, & \text{otherwise} \end{cases}
$$

Fatigue depends on the **step number**, not the phase label, so post-plant steps from step 10 are fatigued too. If step `maxSteps` (11) ends without a plant, DEF wins by **Time out** (§24).

---

## 12. Situation stat weights

Each situation weights the 6 MVP stats differently.

| Situation           | Shooting | Awareness | Teamwork | Utility | Decision | Luck |
| ------------------- | -------: | --------: | -------: | ------: | -------: | ---: |
| Info gathering      |     0.05 |      0.40 |     0.15 |    0.20 |     0.15 | 0.05 |
| Breach / Entry      |     0.30 |      0.10 |     0.10 |    0.20 |     0.20 | 0.10 |
| Utility usage       |     0.05 |      0.15 |     0.10 |    0.45 |     0.15 | 0.10 |
| Reposition          |     0.10 |      0.30 |     0.20 |    0.05 |     0.25 | 0.10 |
| Gunfight            |     0.45 |      0.20 |     0.10 |    0.00 |     0.15 | 0.10 |
| Objective execution |     0.10 |      0.20 |     0.25 |    0.20 |     0.20 | 0.05 |
| Clutch / Cleanup    |     0.40 |      0.15 |     0.05 |    0.05 |     0.15 | 0.20 |

$$
BaseSituationScore(o, t) = \sum_{s} W(t, s) \cdot ES(o, s)
$$

- `t` is the situation type, and `W(t, s)` is the weight from the table.
- Every row sums to 1.00, so a BaseSituationScore is a weighted average of the stats.
- The Info row is not used in rounds. Intel uses its own weights (§8). The row is kept for the MVP draft reference tables.

---

## 13. Role multiplier per situation

Roles give a **fit bonus for specific situations**, not a flat stat bonus.

| Role               | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
| ------------------ | ---: | -----: | ------: | ---------: | -------: | --------: | -----: |
| Entry              | 0.95 |   1.20 |    0.95 |       1.05 |     1.15 |      0.95 |   1.10 |
| Second Entry       | 0.95 |   1.15 |    1.00 |       1.05 |     1.10 |      1.00 |   1.10 |
| Support            | 1.15 |   0.95 |    1.10 |       1.00 |     0.95 |      1.15 |   0.95 |
| Utility Specialist | 1.10 |   1.10 |    1.20 |       1.00 |     1.00 |      1.15 |   0.95 |
| Flex               | 1.00 |   1.00 |    1.00 |       1.15 |     1.00 |      1.10 |   1.10 |
| Anchor             | 1.00 |   1.10 |    1.00 |       0.90 |     1.10 |      1.20 |   1.10 |
| Roamer             | 1.10 |   1.00 |    0.95 |       1.15 |     1.15 |      0.90 |   1.00 |
| Lurker             | 1.10 |   0.95 |    1.00 |       1.15 |     1.05 |      0.95 |   1.15 |
| Trap Specialist    | 1.00 |   1.10 |    1.20 |       0.95 |     1.00 |      1.05 |   0.95 |
| Support Defender   | 1.15 |   1.00 |    1.15 |       0.95 |     0.95 |      1.15 |   0.95 |

$$
RoleMult(o, t) = RoleTable(role_o, t)
$$

The Info column is not used in rounds. Intel uses the intel multipliers in §8.

---

## 14. Zone / map multipliers

### 14.1 Role fit by zone type

| Zone     | Favored (× 1.10)                    | Disadvantaged (× 0.90)    |
| -------- | ------------------------------------ | -------------------------- |
| Exterior | Roamer, Lurker                       | Anchor, Trap Specialist    |
| Entry    | Entry, Second Entry, Trap Specialist | Support Defender, Anchor   |
| Hallway  | Entry, Second Entry, Trap Specialist | Support Defender, Anchor   |
| Stairs   | —                                   | —                         |
| Rotation | Roamer, Lurker, Flex                 | Anchor, Utility Specialist |
| Power    | Support, Utility Specialist          | Entry                      |
| Site     | Anchor, Support Defender             | Roamer, Lurker             |

$$
ZoneRoleMult(o, z) \in \{0.90, 1.00, 1.10\}
$$

"Long Range operators" are favored on Exterior in the map doc, but there is no such MVP role. The weapon table covers that idea instead: DMR gets +6 in Exterior (§16.1).

### 14.2 Zone control bonus

Every zone has its own status (§23.1): `−1` DEF control, `0` contested, `+1` ATK-held. The bonus reads the fight zone's status:

$$
ZoneControlBonus(side) = 2 \cdot \max(-1, status) \cdot \begin{cases} +1, & side = ATK \\ -1, & side = DEF \end{cases}
$$

| status                                                 | ATK | DEF | Effect on Diff |
| ------------------------------------------------------ | --: | --: | -------------: |
| −1 DEF control                                        | −2 |  +2 |            −4 |
| 0 contested                                            |   0 |   0 |              0 |
| +1 ATK-held (a defender walked in, or after the plant) |  +2 | −2 |             +4 |

`2` is `zoneControlBonus` (3 before round v4). Together with the occupant's hold bonus (§10.5) it is the defender's positional advantage; with `numbersBonus` and `smokeBonus` it is the strongest ATK/DEF balance lever (§27).

### 14.3 Zones, space types and default situations

| Zone     | Space     | Default situation | On the maps                  |
| -------- | --------- | ----------------- | ---------------------------- |
| Exterior | Open      | Gunfight          | spawns                       |
| Entry    | Narrow    | Breach            | doors, windows, loading bays |
| Hallway  | Narrow    | Gunfight          | corridors                    |
| Stairs   | Narrow    | Gunfight          | stairwells, ladders          |
| Rotation | Connector | Reposition        | connector rooms              |
| Power    | Open      | Gunfight          | open floors                  |
| Site     | Fortified | Objective         | the bomb site, one per map   |

The default situation applies to fights that rules 1–7 of §10.6 do not cover. The space type comes from the zone type (`MAPS2` zones carry the same `space`).

### 14.4 Maps

Round v2 plays on the three `MAPS2` floor plans in `demo/maps.js` (Plan v2 §2.1): Meridian Office Tower, St. Mora Hospital and Ironfield Factory, 14–18 zones each, 2–3 Exterior spawns, one site, at least three edge-disjoint spawn→site paths and a flank. The v1 maps (three fixed three-zone routes per map, Vantage Secondary School and Crosspoint Mall included) are retired with `DATA.MAPS`.

Plan difficulty: `planOdds(atk, def, mapName, plan, setup, n = 300)` plays `n` rounds of these operators with this plan against this setup from a fixed seed and returns the ATK round-win share (0–1). A missing plan or setup is drawn per round from the squad's archetype pool (§9.4). The result is the same for the same inputs.

---

## 15. Gadget / space multiplier

MVP uses **1 gadget per role**, as in the simplified gadget doc. An ATK operator that places its gadget in planning loses this bonus for the round, and one that keeps it gets the bonus × `unspentGadgetFactor` (0.5) until it spends it (a carried breach charge); DEF gadgets keep the full bonus (§9.3). What each gadget does in the round is in §15.4.

### 15.1 Gadget relevance per situation

| Role gadget         | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
| ------------------- | ---: | -----: | ------: | ---------: | -------: | --------: | -----: |
| Breaching Charge    |    0 |     +8 |       0 |          0 |        0 |        +4 |      0 |
| Smoke Grenade       |    0 |     +4 |      +4 |         +2 |       +2 |        +6 |     +2 |
| Drone               |   +8 |     +2 |       0 |         +2 |        0 |        +2 |      0 |
| EMP Grenade         |   +2 |     +6 |      +8 |          0 |        0 |        +4 |      0 |
| Scout Drone         |   +5 |     +1 |       0 |         +2 |        0 |        +1 |      0 |
| Reinforcement Panel |    0 |     +6 |      +2 |          0 |        0 |        +8 |      0 |
| Proximity Alarm     |   +5 |     +1 |      +1 |         +4 |        0 |        +2 |     +1 |
| Flank Wire          |   +4 |      0 |      +3 |         +5 |        0 |        +2 |     +2 |
| Barbed Wire         |    0 |     +5 |      +7 |         +2 |        0 |        +4 |      0 |
| Camera Network      |   +8 |     +2 |      +2 |         +1 |        0 |        +4 |      0 |

The Info column is the intel gadget bonus of §8.

### 15.2 Space type multiplier

| Space     | Boosted (× 1.10)                                      | Weakened (× 0.90)                  |
| --------- | ------------------------------------------------------ | ----------------------------------- |
| Narrow    | Flashbang, Barbed Wire, Freeze Trap, Deployable Shield | Smoke Grenade, Cover Smoke Launcher |
| Open      | Smoke Grenade, Drone, Intel Beacon, Recon Pulse        | Flashbang, Laser Trip Mine          |
| Fortified | Thermite Charge, EMP Grenade, Breaching Charge         | Motion Sensor, Decoy Device         |
| Connector | Proximity Alarm, Flank Wire, Ambush Grenade            | Reinforcement Panel                 |

$$
GadgetSpaceMult(o, space) \in \{0.90, 1.00, 1.10\}
$$

Among the 10 MVP gadgets, this changes Barbed Wire (Narrow +), Smoke Grenade (Narrow −, Open +), Drone (Open +), EMP Grenade and Breaching Charge (Site +), Proximity Alarm and Flank Wire (Rotation +), and Reinforcement Panel (Rotation −).

### 15.3 Gadget tier multiplier

| Gadget tier          |       1 |       2 |       3 |       4 |       5 |       6 |
| -------------------- | ------: | ------: | ------: | ------: | ------: | ------: |
| `GADGET_TIER_MULT` | × 1.00 | × 1.03 | × 1.06 | × 1.09 | × 1.12 | × 1.15 |

$$
GadgetBonus(o, t, z) = PhaseGadgetBonus(o, t) \cdot GadgetTierMult(o) \cdot GadgetSpaceMult(o, space(z)) \cdot GadgetUse(o)
$$

`GadgetUse(o)` is 0 for an ATK operator that placed its gadget in planning or spent its breach charge at a door, `unspentGadgetFactor` (0.5) for one that still carries it, and 1 for DEF and outside a round (§9.3). The tier scales the gadget's own value in that situation, including the Info column (§8), so a tier adds nothing where the gadget's value is 0. All MVP operators are tier 1, so the multiplier is 1.0 today.

### 15.4 Gadget effects in the round (v4)

Besides the per-situation bonus above, every gadget has one planning effect (`GADGET_USE`, `GADGET_TARGETS`, §9):

| Gadget                             | Role               | Side | Target       | Effect in the round                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------ | ---- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breaching Charge (Thermite Charge) | Entry              | ATK  | door         | hard breach: opens a reinforced door in planning, or on the spot when its carrier leads its group to one (§10.2); the opened door has throughput 1                                                                                                              |
| Smoke Grenade                      | Second Entry       | ATK  | zone or door | zone: +`smokeBonus` (12) in Breach and Objective fights there; door: no hold bonus for the occupant against ATK through that door (§10.5)                                                                                                                     |
| Drone                              | Support            | ATK  | zone         | reveals positions in the zone and its neighbours, reinforced doors touching them, traps on the zone's doors and tier < 3 traps on the neighbours' doors (§9.3); revealed reinforcements make groups replan, revealed traps can be disarmed or crossed carefully |
| EMP Grenade                        | Utility Specialist | ATK  | zone         | disarms revealed traps on doors of the zone when a group crosses them                                                                                                                                                                                            |
| Scout Drone                        | Flex               | ATK  | zone         | as the Drone                                                                                                                                                                                                                                                     |
| Reinforcement Panel                | Anchor             | DEF  | —           | +`panelCharges` (1) reinforcement charge                                                                                                                                                                                                                       |
| Proximity Alarm                    | Roamer             | DEF  | door         | alarm: the first group through is spotted, no debuff                                                                                                                                                                                                             |
| Flank Wire                         | Lurker             | DEF  | door         | wire trap: −`trapDebuff` (4) every stat in the group's next fight, throughput 1 that step, the group is spotted                                                                                                                                               |
| Barbed Wire                        | Trap Specialist    | DEF  | door         | as the Flank Wire                                                                                                                                                                                                                                                |
| Camera Network                     | Support Defender   | DEF  | zone         | every step DEF spots the groups in the zone and its neighbours, so roamers rotate toward them (§23.1)                                                                                                                                                           |

The Utility Specialist also disarms a revealed trap for its group by being in it. A placed ATK gadget gives up its per-situation bonus for the round (§9.3).

---

## 16. Gear fit bonus

### 16.1 Weapon class fit (by zone)

| Weapon  | Entry | Hallway | Stairs | Rotation | Exterior | Power | Site |
| ------- | ----: | ------: | -----: | -------: | -------: | ----: | ---: |
| SMG     |    +6 |      +6 |     +6 |        0 |      −6 |   −6 |    0 |
| Shotgun |    +6 |      +6 |     +6 |        0 |      −6 |   −6 |    0 |
| AR      |    +4 |      +4 |      0 |       +4 |        0 |     0 |   +4 |
| DMR     |     0 |     −6 |    −6 |        0 |       +6 |    +6 |   +6 |
| Pistol  |    +2 |      +2 |     +2 |       +2 |       +2 |    +2 |   +2 |

$$
WeaponFit(o, z) = Fit(primary_o, z) + Fit(secondary_o, z)
$$

Every MVP operator carries a Pistol as secondary, so +2 everywhere.

> [!NOTE] ✏️ Pistol design intent
> The pistol is a secondary weapon and should **never penalize** operator strength. Its role is to provide a small universal buff. In future updates, pistols will support attachments that further strengthen the operator. Since the pistol does not replace the primary weapon, it only ever adds value.

### 16.2 Armor fit (by situation)

| Armor  | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
| ------ | -----: | ------: | ---------: | -------: | --------: | -----: |
| Light  |      0 |       0 |         +4 |        0 |       −2 |      0 |
| Medium |     +2 |      +2 |         +2 |       +2 |        +2 |     +2 |
| Heavy  |    −3 |       0 |        −3 |       +4 |        +4 |      0 |

### 16.3 Combined gear formula

$$
GearFitBonus(o, t, z) = WeaponFit(o, z) + ArmorFit(o, t) + LoadoutPresetBonus(o, t), \qquad LoadoutPresetBonus = 0
$$

### 16.4 Weapon and armor tiers

Item tiers are stat points added to the effective stats (§4) by the `primary` and `armor` contributors, in every step including intel. The fit bonuses above depend only on the class.

| Tier                                                |  1 |  2 |  3 |  4 |  5 |  6 |
| --------------------------------------------------- | -: | -: | -: | -: | -: | -: |
| Primary weapon: Shooting (`WEAPON_TIER_SH`)       | +0 | +0 | +1 | +1 | +1 | +2 |
| Armor: Awareness and Decision each (`ARMOR_TIER`) | +0 | +0 | +0 | +1 | +1 | +1 |

The secondary weapon's tier has no effect yet.

### 16.5 Weapon catalog

Each weapon (`WEAPON_CATALOG` in `demo/catalog.js`, global `CATALOG`, also `DATA.WEAPON_CATALOG`) is a class (for the fit in §16.1 and the tier in §16.4) plus stat `mods` that the `primary` and `secondary` contributors add to the effective stats (§4). Mods are integers in −4…+4 and sum to 0 or +1, so a weapon trades one stat for another instead of adding power.

| id             | Name         | Class   |  sh |  aw |  tw |  ut |  dc |  lk | Net |
| -------------- | ------------ | ------- | --: | --: | --: | --: | --: | --: | --: |
| `smg-vector` | Vector .45   | SMG     |  +4 | −2 |   0 |   0 | −2 |   0 |   0 |
| `smg-mp5`    | MP5 SD       | SMG     | −2 |  +3 |  +1 |   0 | −1 |   0 |  +1 |
| `smg-p90`    | P90          | SMG     |  +1 | −2 |  +2 |  +1 | −2 |   0 |   0 |
| `ar-m4`      | M4 Carbine   | AR      |  +1 | −1 | −2 |   0 |  +2 |   0 |   0 |
| `ar-ak`      | AK-12        | AR      |  +3 | −2 |   0 | −2 |   0 |  +1 |   0 |
| `ar-aug`     | AUG Optic    | AR      | −1 |  +2 |   0 |   0 |  +1 | −1 |  +1 |
| `dmr-sr25`   | SR-25        | DMR     |  +3 | −2 | −2 |   0 |  +1 |   0 |   0 |
| `dmr-mk14`   | Mk14 EBR     | DMR     | −1 |  +3 |   0 | −2 |  +1 |   0 |  +1 |
| `dmr-svd`    | SVD          | DMR     |  +4 |   0 | −3 |   0 | −3 |  +2 |   0 |
| `sg-m870`    | M870 Pump    | Shotgun |  +3 | −1 |   0 | −1 | −2 |  +1 |   0 |
| `sg-spas`    | SPAS-12      | Shotgun |  +1 | −2 |   0 |  +3 | −2 |   0 |   0 |
| `sg-saiga`   | Saiga-12     | Shotgun |  +4 | −2 |  +1 |   0 | −3 |   0 |   0 |
| `pistol-m9`  | M9           | Pistol  |   0 |   0 |   0 |   0 |  +1 |   0 |  +1 |
| `pistol-de`  | Desert Eagle | Pistol  |  +2 | −1 |   0 |   0 |   0 |   0 |  +1 |

Allowed primary classes per role (`ROLE_CLASSES`); the player's weapon select on the card offers every catalog weapon of these classes, the sidearm select both pistols:

| Roles                                               | Classes          |
| --------------------------------------------------- | ---------------- |
| Entry, Second Entry, Roamer                         | SMG, Shotgun, AR |
| Support, Utility Specialist, Flex, Support Defender | AR, SMG          |
| Trap Specialist                                     | AR, SMG, Shotgun |
| Anchor, Lurker                                      | DMR, AR, SMG     |

Trap Specialist also allows Shotgun because the MVP roster's Wire carries one (Plan v2 §2.3 lists AR, SMG).

MVP roster defaults: Breach and Jackal Vector .45, Haze AK-12, Watcher and Lens AUG Optic, Volt and Mirage M4 Carbine, Fortress SR-25, Shade MP5 SD, Wire SPAS-12; every secondary is the M9. Generated operators keep their archetype's class (§6) and draw a random catalog weapon of that class; their secondary is the M9. `generateSquad` does not check `ROLE_CLASSES`: the Rush Anchor carries a Shotgun, which the player's Anchor cannot pick. A weapon object without `id` (ladder saves from before the catalog) keeps its class fit and tier but adds no mods. The MVP draft reference scores in the test are checked with the weapon `id`s removed.

Because the mods sum to about 0 and the situation weights spread over all six stats, one weapon swap within a class moves the share-weighted operator score (`SITUATION_SHARE`, §27) by less than 1 point; the class matters more through its zone fit (§16.1, ±6). The `--sens` rows (§29) take each class's best and worst weapon by that score for the first MVP operator carrying the class (Breach SMG, Haze AR, Fortress DMR, Wire Shotgun) and assert that a single swap moves the round win by at most ±3 points; measured: Vector .45 +0.0 / P90 −0.7, AUG Optic +0.9 / AK-12 +0.0, Mk14 EBR −0.3 / SVD −0.4, Saiga-12 +0.1 / SPAS-12 +0.0 (the `--sens` rows of §29, baseline 52.0%).

---

## 17. Numbers bonus

Dead operators and bigger groups must clearly count, but a stack must not win a room on numbers alone:

$$
NumbersBonus(side) = 5 \cdot clamp\big(local(side) - local(enemy),\; -2.5,\; +2.5\big), \qquad local(side) = |E| + 0.7 \cdot |S|
$$

`5` is `numbersBonus`, `2.5` is `numbersCap`, `0.7` is `supportFactor`; `E` are the side's fighters and `S` its supporters (§10.4). Both sides get it with opposite signs, so each operator of difference is worth 10 on Diff, a supporter 7, up to 25.

| Local (fighters + supporters) |    Bonus (side / enemy) | Effect on Diff |
| ----------------------------- | ----------------------: | -------------: |
| 3v3                           |                   0 / 0 |              0 |
| 3 + 1 supporter v 3           |            +3.5 / −3.5 |            ±7 |
| 2v1                           |                +5 / −5 |           ±10 |
| 3 + 2 supporters v 1          | +12.5 / −12.5 (capped) |           ±25 |

Room capacity (3 per side, §10.1) and door throughput (2 per step) now bound the local difference; the cap trims a full squad (three fighters and two supporters) against a lone defender.

---

## 18. Momentum bonus

The side that won the previous step gets a small bonus:

$$
MomentumBonus(side) = \begin{cases} +2, & \text{if this side won the previous combat step} \\ 0, & \text{otherwise} \end{cases}
$$

`2` is `momentumBonus`. With several fights in a step, the side that won more of the previous step's fights has momentum (none on a tie or a step without fights); step 1 has none. It is kept small so that snowballing stays limited.

---

## 19. Operator score (full formula)

$$
OperatorScore(o, t, z) = BaseSituationScore(o, t) \cdot RoleMult(o, t) \cdot ZoneRoleMult(o, z) + GadgetBonus(o, t, z) + GearFitBonus(o, t, z) + TraitAdd(o, t) + ActiveAdd(o, t)
$$

Dead operators are not scored and are not part of the team average.

> [!EXAMPLE] Breach (Entry role) in a Breach fight on an Entry zone, no intel buff, gadget at full value (outside a round)
> ES = 90 sh, 48 aw, 45 tw, 48 ut, 53 dc, 61 lk (base + Aggressive + Vector .45 sh +4 aw −2 dc −2 + M9 dc +1 + Shot Caller +2 tw from Watcher; tier 1 adds 0; Cold Blooded is off outside Clutch).
> BaseSituationScore(Breach) = 0.30·90 + 0.10·48 + 0.10·45 + 0.20·48 + 0.20·53 + 0.10·61 = **62.6**
> × RoleMult 1.20 × ZoneRoleMult 1.10 = **82.63**
> \+ Breaching Charge 8 (tier × 1.0, Narrow: × 1.00) + SMG in Entry 6 + Pistol 2 + Light armor in Breach 0
> **OperatorScore = 98.63**

### 19.1 Traits

Each operator has one trait (`op.trait`, a key of `TRAITS`), applied by the `trait` contributor. A trait returns stat points (§4), a flat `add`, a casualty `risk` multiplier (§23.4) or `team` stats. `team` stats are collected in a first pass over the side's alive operators (that pass sees no random generator) and added to the effective stats of every alive operator of the side, the owner included, by the `team` contributor; they vanish when the owner dies.

| Trait         | Effect                                                                                  | When                                | MVP roster    |
| ------------- | --------------------------------------------------------------------------------------- | ----------------------------------- | ------------- |
| Cold Blooded  | Shooting +3, Decision +2                                                                | Clutch situation                    | Breach, Shade |
| Tunnel Vision | Shooting +3, Awareness −3                                                              | always                              | Haze          |
| Shot Caller   | `team`: Teamwork +2 for the whole side                                                | while alive, every step incl. intel | Watcher, Lens |
| Breacher      | Utility +3, Shooting +2                                                                 | Breach situation                    | —            |
| Aggressive    | Shooting +4, casualty risk × 1.5                                                       | Entry phase (steps 1–2)            | Jackal        |
| Unstable      | every stat ± the same roll, an integer from −6 to +6 drawn from the round's generator | every step incl. intel              | Mirage        |
| Veteran       | all stats +3 (cancels fatigue)                                                          | step ≥ `cleanupFrom`             | Fortress      |
| Drone Expert  | `add` +4                                                                              | Info (the intel step)               | Volt          |
| Fortifier     | Utility +3                                                                              | DEF in Objective or Utility         | Wire          |

Jackal is a Roamer, so Aggressive triggers when he meets ATK in steps 1–2. Unstable reads the round's generator, so it also rolls in the intel step. Generated operators copy their role template's trait. Measured values are in §29.

### 19.2 Active abilities

Each role has one active ability (`ACTIVES` in `data.js`, keyed by name); every operator's `active` is its role's ability, the MVP roster and generated squads alike. The `active` contributor applies it.

| Ability         | Role               | Situation                     | Effect                    |
| --------------- | ------------------ | ----------------------------- | ------------------------- |
| Flash entry     | Entry              | Breach                        | Shooting +6               |
| Trade push      | Second Entry       | Gunfight                      | Shooting +4, Decision +2  |
| Full recon      | Support            | Info (the intel step)         | `add` +6                |
| Overload        | Utility Specialist | Utility                       | Utility +6                |
| Read the room   | Flex               | any situation, intel included | Decision +4, Awareness +2 |
| Reinforce       | Anchor             | Objective on the Site zone    | Utility +4, Decision +2   |
| Flank run       | Roamer             | Reposition or Gunfight        | Shooting +4, Awareness +2 |
| Ambush          | Lurker             | Clutch or Reposition          | Shooting +6               |
| Wire the hall   | Trap Specialist    | Utility or Breach             | Utility +6                |
| Eyes everywhere | Support Defender   | Info (the intel step)         | `add` +6                |

Rule:

- Each operator can arm its ability **once per match**; any number of operators may arm in the same round. Before a round the player arms any of the operators of the side the player plays this round whose ability is unused (`armable(match, 'player')`). `playMatchRound(match, { …, armed })` and `briefing` take a list of operator ids (a single id or `null` is accepted); an id that is not armable, or listed twice, throws.
- The opponent arms one random unused ability of its side every round (`enemyArmed` omitted). `enemyArmed: null` or `[]` arms none, a list arms those operators. `simulate` arms nothing unless `playerArms` (the unused ability that covers the most situations, roster order on ties) or `enemyArms` (random) is set.
- The ability works for the whole round it is armed in, at every step (the intel step included) whose situation is in its list, and only for that operator: `ctx.armed` is the side's list of armed ids. It adds stat points (§4) or a flat `add` (§19), and nothing while the operator is dead or not engaged; supporters (§10.4) get it as well.
- `match.used[id]` holds the round number in which the operator used it; `round.armed` records both sides' lists. `unusedAbilities(match, side, owner)` lists the operators whose ability was never armed (the round summary's reminder).

Budget: an ability is worth about 6 stat points in its situations for one round. Arming one every round moves the player's round win by **+1.4** points, the opponent arming one every round by **−0.2** (§29); the `--sens` assert keeps both within ±4 round-win points. The Q3 power budget is measured without abilities.

---

## 20. Team score

The team score is the **weighted average** OperatorScore of the engaged operators, plus shared bonuses:

$$
TeamScore(side) = avg + NumbersBonus(side) + Hold(side) + ZoneControlBonus(side) + MomentumBonus(side) + Planning(side) + RandomBonus(side)
$$

$$
avg = \frac{\sum_{o \in E} OperatorScore(o) + 0.7 \sum_{o \in S} OperatorScore(o)}{|E| + 0.7\,|S|}, \qquad Planning(ATK) = [t \in \{Breach, Objective\}] \cdot 12 \cdot [smoke], \quad Planning(DEF) = 0
$$

- `E` are the fighters (the side's live operators in the zone, at most 3), `S` the supporters (§10.4); `0.7` is `supportFactor`. A supporter weaker than the side's fighters lowers the average; it always adds to the numbers term (§17).
- **Hold** (`holdBonus` 2, `splitPenalty` 3): the occupant's entry-side value of §10.5, 0 for the entering side. One door: +2; two doors opened a step apart: +2 against the first door's operators and −3 against the second, weighted by their operators; two doors at once or three and more: −3.
- `Planning` is the zone smoke of §10.7 (`smokeBonus` 12). Reinforcements no longer change the score: they block doors (§10.2).
- v2's crowding (`crowdPenalty`, `crowdLimit`) and pinch (`pinchBonus`) are removed: with at most 3 operators of a side in a room, crowding was always 0, and the hold/split term replaces the pinch. The log keeps `crowd: 0` and `pinch: 0` for the field contract.
- Intel and fatigue modifiers are already inside each OperatorScore through `ES`.

Each fight in the round log stores every term per side: `avg`, `numbers`, `crowd` (0), `pinch` (0), `hold`, `zone`, `momentum`, `planning`, `random`, `total`, plus `scores` (fighters) and `support` (supporters, same shape).

---

## 21. Random factor

$$
RandomBonus(side) = random(-14, +14)
$$

The roll is uniform and rolled separately for each side in every fight (`randomRange` = 14 since round v4, 16 in v2, 18 in v1, Q12). The difference of the two rolls spans ±28 with a standard deviation of about 11.4. The size is set by the upset rate: a squad 6.6 average stat points weaker takes 20.2% of rounds (§29; 16 gave 22–24% on round v4, above the 21% band). Luck as a stat lives inside the weights (§12); it is not a separate RNG layer.

Intel has its own, smaller roll (±3, §8).

---

## 22. Step winner

$$
Diff = TeamScore(ATK) - TeamScore(DEF)
$$

### Rule

- If `Diff > 0` → ATK wins the step
- If `Diff ≤ 0` → DEF wins the step. A tie goes to the defender; with continuous random rolls an exact tie practically never happens.

### Win strength

|       \|Diff\| | Outcome      |
| -------------: | ------------ |
|       below 11 | Marginal win |
| 11 to below 27 | Clear win    |
|     27 or more | Dominant win |

`clearAt` = 11 and `dominantAt` = 27, sized to the v1 ±18 rolls (§21). Win strength sets the casualty count (§23.2), the zone shift and reroutes (§23.1), not who wins. Local numbers move Diff by 10 per operator of difference and 7 per supporter, up to 25 (§17), so lopsided fights are often Clear or Dominant.

---

## 23. How step results change round state

### 23.1 Zone control, reroute and rotation

Every zone has its own status: `+1` ATK-held, `0` contested, `−1` DEF control. The spawns start at +1, every other zone at −1 (v4: reinforcements are on doors, so there is no −2 status any more).

**After a fight** the zone's status moves toward the winner:

$$
status \leftarrow \max\Big(-1,\; \min\big(+1,\; status \pm zoneShift[strength]\big)\Big)
$$

`zoneShift` is `[1, 2, 2]` for Marginal / Clear / Dominant.

**Uncontested zones.** After the fights, every zone that had no fight and holds a live attacker but no live defender shifts as a Clear ATK win (+2), so an empty zone falls as soon as an attacker enters it. After the plant, a site with live defenders and no live ATK shifts as a Clear DEF win (−2), which defuses.

**Taking.** A zone whose status reaches +1 from below is taken (`taken` event). On the site, the first time, that is the plant (`planted` event): planted on this step (`plantedAt`), site status reset to 0. After the plant the site keeps shifting: −1 defuses, `bombSteps` (2) post-plant steps without a defuse detonate (§24).

**Reroute after a lost fight.** When DEF wins a fight Clear or Dominant in a zone ATK did not hold (status before the fight below +1), and not on the planted site, every live group whose front is in that zone and not on its spawn falls back to the previous zone of its path and re-plans: the shortest path from there to the site that avoids the lost zone and every reinforced door ATK knows (`route(map, from, to, avoid, closed)`). It takes the new path only if that costs at most `rerouteMaxExtra` (3) extra steps against its remaining path, the fallback step included, and only if all its operators in the zone fit through the door and into the fallback zone this step (door throughput and room capacity, §10.1); otherwise it stays and keeps pushing. A lost site cannot be avoided, so groups at the site never reroute.

**Reroute at a reinforced door** (§10.2): the group stays in its zone and takes the shortest path from there that avoids every reinforced door it knows, whatever its length; the step is lost. A detour planned before the round (replanning, §9.3) costs nothing.

**Spotting.** DEF knows a group's position only when it spots it: the group fought this step, sprang a trap or an alarm (§10.3), or has a live operator in a camera zone or its neighbour (§9.1). DEF remembers the zone of the group's front where it was last spotted (`spotted` in the step entry lists this step's sightings).

**DEF rotation**, after the control updates and the spotting, for defenders that did not fight this step:

1. For every Dominant ATK win, the closest non-roaming defender that is not an **anchor** (a non-roaming defender on the site) starts roaming.
2. Every roaming defender moves one zone along the shortest open path (reinforced doors are walls) toward the nearest zone where DEF last spotted a live group. Before the plant it does not step into a zone holding more than `roamHold` (1) attackers: it holds the room next to it, from where it supports (§10.4).
3. After the plant, every defender moves one zone toward the site, anchors and holders included.
4. Before the plant, anchors and other non-roaming defenders hold their zone.
5. A rotation respects door throughput (2 per door), room capacity (3 per zone) and never enters a spawn; a defender that cannot move waits (`queued` at that door).

A group advances only from an ATK-held zone without defenders, so a defender that walks into a group's zone stops it and fights it the next step.

### 23.2 Casualty tables

Per fight, only the loser takes casualties, among its local fighters; in a Dominant fight its supporters are in the pool as well, and at most one supporter dies (§10.4).

| Situation           | Marginal | Clear | Dominant |
| ------------------- | -------: | ----: | -------: |
| Breach / Entry      |        0 |     1 |        1 |
| Utility usage       |        0 |     0 |        1 |
| Reposition          |        0 |     0 |        1 |
| Gunfight            |        1 |     1 |        2 |
| Objective execution |        0 |     1 |        1 |
| Clutch / Cleanup    |        1 |     1 |        2 |

The count is capped by the loser's fighters plus one supporter in a Dominant fight. Cleanup uses the Gunfight and Clutch rows (§28 change 15).

### 23.3 Carry-over stat modifiers

Not implemented (skipped on purpose, §5). The only stat changes inside a round are intel (§8), fatigue (§11) and the trap debuff (§10.3).

### 23.4 Who dies and who gets the kill

Casualties are weighted random, not deterministic:

$$
P(victim = o) \propto \frac{Risk(o)}{\max(1, OperatorScore(o))^2}, \qquad P(killer = k) \propto \max(1, OperatorScore(k))^2
$$

`Risk(o)` is the product of `parts.risk`: 1 unless a trait raises it (Aggressive × 1.5 in the Entry phase, steps 1–2, §19.1).

- Victims are drawn without replacement from the losing side's fighters, plus its supporters in a Dominant fight (after one supporter dies the others leave the pool). Each victim's killer is drawn from the winning side's fighters. Both use this fight's scores.
- An operator scoring 60 is (90 / 60)² ≈ 2.25 times as likely to die as one scoring 90, and 2.25 times less likely to get the kill. Weak links die first more often, but not always.
- Kills inside one fight are simultaneous. The first kill of a round always belongs to the winner of the first bloody fight.
- Each operator keeps `kills`, `diedAt` (the step of death), `fights` (steps it fought in, support excluded) and `scoreSum`. The round summary shows `scoreSum / fights` as the average score, and the round MVP has the most kills, with ties broken by average score.

---

## 24. Round winner

After every step, the end conditions are checked in this order. The first one that holds ends the round:

| # | Condition                                               | Winner | Reason      | Event         |
| -: | ------------------------------------------------------- | ------ | ----------- | ------------- |
| 1 | ATK has no alive operators                              | DEF    | Elimination | —            |
| 2 | DEF has no alive operators                              | ATK    | Elimination | —            |
| 3 | bomb planted and site status = −1                      | DEF    | Defused     | `defused`   |
| 4 | bomb planted and `step − plantedAt ≥ bombSteps` (2) | ATK    | Detonation  | `detonated` |
| 5 | bomb not planted and step ≥ `maxSteps` (11)          | DEF    | Time out    | `timeout`   |

- Eliminating ATK after the plant is a DEF win by Elimination.
- A defuse on the last post-plant step beats detonation, because rule 3 comes before rule 4.
- Only the loser of a fight takes casualties, so both sides are never wiped in the same fight; with several fights in one step the alive totals are checked after all of them.
- The end event is appended to the final step's `events`.

---

## 25. Match winner

The first team to win **4 rounds** wins the match.

Possible match scores:

- `4–0` (dominant sweep)
- `4–1`
- `4–2`
- `4–3` (went to the tiebreak round)

---

## 26. Full formula in one place

### Effective stat

$$
ES(o, s) = clamp\big(Base(o, s) + Playstyle(o, s) + Intel(o, s) + Fatigue(o, s) + Tier(o, s) + Weapon(o, s) + Trait(o, s) + Active(o, s) + Trap(o, s) + Team(o, s)\big)
$$

### Single operator score

$$
OperatorScore(o, t, z) = \Big(\sum_{s} W(t, s) \cdot ES(o, s)\Big) \cdot RoleMult(o, t) \cdot ZoneRoleMult(o, z) + GadgetBonus(o, t, z) + WeaponFit(o, z) + ArmorFit(o, t) + TraitAdd(o, t) + ActiveAdd(o, t)
$$

$$
GadgetBonus(o, t, z) = Gadget(o, t) \cdot GadgetTierMult(o) \cdot GadgetSpaceMult(o, space(z)) \cdot GadgetUse(o)
$$

### Single side score

$$
TeamScore(side) = \frac{\sum_{E} OperatorScore + 0.7 \sum_{S} OperatorScore}{|E| + 0.7|S|} + 5\,clamp(\Delta local, \pm 2.5) + Hold(side) + 2 \cdot \max(-1, status) \cdot (\pm 1) + 2 \cdot [\text{won more fights last step}] + Planning(side) + random(-14, +14)
$$

### Step result

$$
Diff = TeamScore(ATK) - TeamScore(DEF), \qquad winner = \begin{cases} ATK, & Diff > 0 \\ DEF, & Diff \le 0 \end{cases}
$$

$$
strength = \begin{cases} Marginal, & |Diff| < 11 \\ Clear, & 11 \le |Diff| < 27 \\ Dominant, & |Diff| \ge 27 \end{cases}
$$

---

## 27. CONFIG reference

All constants live in `CONFIG` in `demo/data.js`. Values below are the round v4 values after the WP-I balance pass; "v2" marks the value before WP-I where it differs. The "Why" column comes from the WP-I sweeps (§32): "mirror" is the 2000-match mirror of the test, the template averages come from the §29 matrix (400 rounds per cell; sweeps at 100–200), "A 45 / S 50" means ATK template A wins 45% averaged over S/P/R, DEF template S wins 50% averaged over A/B/C. The balance target is that no template reaches 55% (§32).

| Constant                |                    Value | Used in            | What it does                                                                       | Why this value                                                                                                                   |
| ----------------------- | -----------------------: | ------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `statCap`             |                      100 | §6                | upper clamp for every effective stat                                               | MVP 0–100 scale                                                                                                                 |
| `roundsToWin`         |                        4 | §1, §25          | rounds needed to win the match                                                     | best-of-7                                                                                                                        |
| `maxSteps`            |               11 (v2 12) | §24               | last step before Time out (no plant)                                               | the sync cap and held-zone Gunfights shortened rounds (8.4 steps); 12 left 1.6% time outs, below the 5% floor                    |
| `entryUntil`          |                        2 | §2                | last step labelled Entry (Aggressive trait)                                        | first contact happens on steps 1–2                                                                                              |
| `cleanupFrom`         |                10 (v2 9) | §2, §10.6, §11  | first step with fatigue and forced Gunfight                                        | 9 → time outs 4.7–5.2%, at the floor; 10 → 6.9%                                                                               |
| `bombSteps`           |                        2 | §23.1, §24       | post-plant steps DEF gets to retake the site                                       | v1 value                                                                                                                         |
| `clutchGap`           |                        3 | §10.6             | whole-round alive gap that turns a fight into a Clutch                             | v1 value                                                                                                                         |
| `randomRange`         |               14 (v2 16) | §21               | ± random per side, per fight                                                      | 16 → 6.6-points-weaker squad 22–24% of rounds (band 15–21%); 14 → 20.2%                                                      |
| `intelRandom`         |                        3 | §8                | ± random on IntelDiff                                                             | v1 value                                                                                                                         |
| `numbersBonus`        |                 5 (v2 4) | §17               | per operator of **local** difference (supporters at 0.7), per side           | 4 → mirror ATK 34–40% (fights are 1–3 a side now); 6 → B 60–68                                                              |
| `numbersCap`          |               2.5 (v2 3) | §17               | at most this much local difference counts                                          | 3 → B 56–60; 2 → S 56–58 as DEF                                                                                              |
| `doorCapacity`        |                  2 (new) | §10.1             | operators of one side through one door per step                                    | Plan v4 §3.1                                                                                                                    |
| `zoneCapacity`        |                  3 (new) | §10.1             | operators of one side in one zone (spawns excepted)                                | Plan v4 §3.1                                                                                                                    |
| `supportFactor`       |                0.7 (new) | §10.4, §17, §20 | weight of a supporter in the average and in the numbers term                       | Plan v4 asks 0.5: with the other v4 values 0.5 gives mirror ATK 42–47% and S 63–64 as DEF; 0.75 → B 57, 0.7 → B 53.2, R 53.9 |
| `holdBonus`           |                  2 (new) | §10.5, §20       | occupant bonus against a single entry door, and against the earlier of two         | Plan v4 asks 3: 3 → S 63–71 as DEF with smoke 9–12; 4 → S/P/R 55–62                                                         |
| `splitPenalty`        |                  3 (new) | §10.5, §20       | occupant penalty against doors opened together, the later of two, or three or more | Plan v4 value; 1–2 barely move the matrix, 6 → C 64                                                                            |
| `syncHops`            |                        0 | §10.0             | how far behind other groups may be when a group enters the site                    | v2 value                                                                                                                         |
| `syncWait`            |                  2 (new) | §10.0             | steps a group holds in its site neighbour for the others, per round                | no cap → 32% time outs (groups stuck behind door queues hold everyone); 3 → B 57                                               |
| `roamHold`            |                  1 (new) | §23.1             | a roamer does not step into a room with more attackers than this before the plant  | no hold → R 31–36 as DEF; holding against any attacker → R 66–73                                                             |
| `zoneControlBonus`    |                 2 (v2 3) | §14.2             | × `max(−1, status)`, per side                                                  | 3 → mirror ATK 42–46%; the occupant edge is now also in `holdBonus`; 1 → B 60–68                                           |
| `momentumBonus`       |                        2 | §18               | bonus for the side that won more fights last step                                  | v1 value                                                                                                                         |
| `clearAt`             |                       11 | §22               | \|Diff\| needed for a Clear win                                                    | v1 value; 12 → B 55.2                                                                                                           |
| `dominantAt`          |                       27 | §22               | \|Diff\| needed for a Dominant win                                                 | v1 value; 29 → B 57.5                                                                                                           |
| `zoneShift`           |                [1, 2, 2] | §23.1             | status shift for Marginal / Clear / Dominant                                       | v1 value                                                                                                                         |
| `cleanupFatigue`      |                      −3 | §11               | all stats from step 10                                                             | original §11                                                                                                                    |
| `cleanupLuckAbove`    |                       50 | §11               | base Luck must be strictly above this                                              | original §11                                                                                                                    |
| `cleanupLuckBonus`    |                        2 | §11               | + Shooting and + Decision for lucky operators                                      | original §11                                                                                                                    |
| `generatedSpread`     |                        8 | §6                | ± random per stat for generated opponents                                         | opponents vary per stat but keep each role's profile                                                                             |
| `reinforceCharges`    |                        2 | §9.1              | reinforced doors per DEF setup                                                     | Plan v4; 1 → C 16–29 (the two left seal whole lanes)                                                                           |
| `panelCharges`        |                  1 (new) | §9.1              | extra charge when an Anchor carries the Reinforcement Panel                        | Plan v4                                                                                                                          |
| `siteOpenDoors`       |                  2 (new) | §9.1              | open doors the site must keep                                                      | 1 → two sealed site doors funnel every group: S 63–74 as DEF                                                                   |
| `trapDebuff`          |                        4 | §10.3             | stat penalty for the trapped group, its next fight                                 | Plan v4 value                                                                                                                    |
| `trapRevealTier`      |                  3 (new) | §9.3              | traps of this tier and above are revealed only by a drone on a zone of their door  | Plan v4                                                                                                                          |
| `smokeBonus`          |                12 (v2 7) | §9.3, §10.7      | ATK bonus in Breach and Objective fights in a smoked zone                          | the site trio averages about 91 in Objective against about 81 for the best ATK three; 13 → B 57; 11 → S 55.8 and R 56.5        |
| `rerouteMaxExtra`     |                        3 | §23.1             | extra steps a reroute after a lost fight may cost                                  | v2 value; 4 → P 61 as DEF                                                                                                       |
| `unspentGadgetFactor` |                      0.5 | §9.3, §15        | share of the gadget bonus an ATK operator keeps while it has not spent its gadget  | v2 value                                                                                                                         |
| `maxGroups`           |                 5 (v2 3) | §9.3              | ATK groups per plan                                                                | Plan v4                                                                                                                          |
| `maxGroupSize`        |                  3 (new) | §9.3              | operators per group                                                                | Plan v4                                                                                                                          |
| `poolSize`            |                  6 (new) | §9.4              | AI plans per map, side and archetype                                               | Plan v4                                                                                                                          |
| `poolWeights`         | [3, 3, 2, 2, 1, 1] (new) | §9.4              | pick weights of the pool entries                                                   | equal weights move the mirror by 1–2 points only                                                                                |

Removed in v4: `crowdPenalty`, `crowdLimit` (always 0 with room capacity 3), `pinchBonus` (replaced by hold/split), `reinforceDebuff` (reinforcements block instead).

The tables next to `CONFIG` are documented in their sections: playstyles §7, intel weights, multipliers and buckets (with `reveal`) §8, §9.2, situation weights §12, the situation share `SITUATION_SHARE` (below), role multipliers §13, zones and role fit §14, gadgets and space fit §15, gadget uses `GADGET_USE` and targets `GADGET_TARGETS` §9.3, §15.4, gadget tier multiplier `GADGET_TIER_MULT` §15.3, weapons and armor §16, weapon catalog `WEAPON_CATALOG` and `ROLE_CLASSES` §16.5, weapon and armor tiers `WEAPON_TIER_SH`, `ARMOR_TIER` §16.4, traits `TRAITS` §19.1, active abilities `ACTIVES` §19.2, opponent archetypes `ARCHETYPES` (with the AI style `ai`: groups, site, roam, drones) §6, §9.4, templates `ATK_TEMPLATES`, `DEF_TEMPLATES` §9.4, casualties §23.2. Maps are `MAPS2` in `demo/maps.js`; `DATA.MAPS` (three-zone routes), `ENTRY_SETUPS` and `ENTRY_CASUALTIES` were removed in round v2. The fit multipliers are `FIT = { up: 1.10, down: 0.90 }`. `CONTRIBUTORS` is the ordered modifier pipeline (playstyle, intel, fatigue, role, zoneFit, gadget, primary, secondary, armor, trait, active, trap, team): each entry is `{ name, apply(op, ctx) }` returning `{ stats?, mult?, add?, risk?, team? }` or `null`, with `ctx = { side, situation, zone, zoneId, space, step, phase, intel, alive, planted, rand, armed, trapped, gadgetUse, team }`; `zone` is the zone **type**, `zoneId` the map zone, `armed` the side's armed operator ids, `trapped` the trapped operator ids, `gadgetUse` the ATK gadget factor per operator id (`null` for DEF and for a neutral ctx, which means full value). `operatorScore(op, ctx)` folds it into §4 (`stats`) and §19 (`mult`, then `add`, in list order) and collects `risk` for §23.4; `ctx.team` is the sum of the `team` results of the side's alive operators, collected first (§19.1). The intel step folds the same list with `phase: 'Intel'`, the §8 weights, the intel role multiplier and the gadget's Info column. The MVP roster and its effective stats are in `MVP/MVP draft.md`.

`SITUATION_SHARE` is how often each situation decides a fight in mirror play: the share of all fight entries in the round v2 logs, measured by `node demo/engine.test.js --share` (MVP roster on both sides, random templates, no abilities, 1000 matches, seed 4242, 41,220 fights) and stored as constants in `data.js`. The round does not use it; the stat guide shows it, and the playstyle advisor and the weapon select weight operator scores by it. Refresh it with `--share` after a balance change: the flag prints the new row and its largest difference to `data.js`.

|  Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
| ----: | -----: | ------: | ---------: | -------: | --------: | -----: |
| 0.000 |  0.124 |   0.140 |      0.130 |    0.216 |     0.296 |  0.093 |

Info is 0 because no fight is an Info fight; the intel step uses its own weights (§8).

---

## 28. Changes from the original formula

|  # | Original                                                                                                                      | Implemented                                                                                                                                                                                                                                                                                      | Why                                                                                                                                                                                                         |
| -: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1 | TeamScore = **sum** of engaged OperatorScores                                                                           | **average**, plus numbers, zone, momentum and random (§20); round v2 drops the v1 support term and adds crowding, pinch and planning; round v4 weights supporters at 0.7 and replaces crowding and pinch with hold/split                                                                  | the sum made attackers win virtually every round (see below)                                                                                                                                                |
|  2 | Random ±4 per side (±3 in Entry)                                                                                            | ±13 per side, every step; ±18 since change 22 (§21)                                                                                                                                                                                                                                           | team averages are usually 3–12 points apart, so ±4 lets the better side win almost every step: mirror ATK 59.6%, and a 6.6-points-weaker squad takes 6.4% of rounds and no matches                        |
|  3 | Numbers bonus 4 per operator                                                                                                  | 3; back to 4 since change 23 (§17)                                                                                                                                                                                                                                                              | with the ±13 roll, 4 → first kill → round win 79.2%, above the 65–75% target; with ±18 and the DEF line-up, 4 gives 70.4% (change 23)                                                                  |
|  4 | Momentum +3                                                                                                                   | +2 (§18)                                                                                                                                                                                                                                                                                        | keeps chaining small; the original also warned against snowballing                                                                                                                                          |
|  5 | 4 zone statuses (Neutral, Contested, ATK, DEF), bonus {−6, 0, +2, +6}                                                        | 3 statuses −1 / 0 / +1, ±4 per side; ±3 since change 22 (§14.2)                                                                                                                                                                                                                              | one number per zone that also drives the front and the plant; 6 → ATK 29.6%                                                                                                                                |
|  6 | Win strength at \|Diff\| 5 / 12                                                                                               | 8 / 20; 11 / 27 since change 24 (§22)                                                                                                                                                                                                                                                           | scaled to the ±13 rolls: with 5/12, 49.9% of steps would be Dominant (26.6% with 8/20)                                                                                                                     |
|  7 | Zone control as an abstract state                                                                                             | attack routes: 3 zones per route, every fight at the front zone, taking a zone moves the front; **superseded by round v2** (map graph, control per zone, §2, §23.1)                                                                                                                      | uses the map docs and gives the round a real objective path                                                                                                                                                 |
|  8 | Plant was only a situation type; no timer                                                                                     | taking the Site plants; 2 retake steps; defuse at status −1, detonation otherwise (§23.1)                                                                                                                                                                                                      | concrete win conditions                                                                                                                                                                                     |
|  9 | Intel over steps 1–2, deterministic                                                                                          | one comparison with a ±3 roll (§8); since round v2 it is part of the planning step (step 0, §9.2)                                                                                                                                                                                             | one comparison is enough; without the roll the squad with better intel stats wins intel every round (DEF in the MVP mirror)                                                                                 |
| 10 | Entry over steps 3–4                                                                                                         | step 2 only; **superseded by round v2** (no Entry step, everyone fights where it stands, §9)                                                                                                                                                                                              | the Entry casualty limits are per phase, and two entry steps doubled them                                                                                                                                   |
| 11 | Situation "likely" from conditions (§10 table)                                                                               | fixed rule order (§10.1)                                                                                                                                                                                                                                                                        | deterministic and explainable; the "after a DEF win → Reposition" rule was removed because it looped: DEF won 85% of those steps                                                                           |
| 12 | Who dies: lowest score, then worst fit (deterministic)                                                                        | weighted random by score² (§23.4)                                                                                                                                                                                                                                                              | a deterministic rule always kills the same operator in the same situation; weighting keeps "weak links die more" without certainty                                                                          |
| 13 | Tie: zone-control side wins, DEF if neutral                                                                                   | DEF (§22)                                                                                                                                                                                                                                                                                       | same result before the plant, and ties practically never happen                                                                                                                                             |
| 14 | All steps resolved: zone-control side wins                                                                                    | Time out → DEF (§24)                                                                                                                                                                                                                                                                           | the same result without a zone-control tie-break                                                                                                                                                            |
| 15 | Cleanup casualties 1 / 1–2 / "2 or all" (§11)                                                                               | Gunfight and Clutch rows 1 / 1 / 2 (§23.2)                                                                                                                                                                                                                                                      | the original had two conflicting cleanup tables (§11 and §23.2 "Phases III and IV"); the implementation uses §23.2                                                                                       |
| 16 | 5–10 steps per round                                                                                                         | planning step 0, then 1–11 steps, up to 13 after a late plant (§2)                                                                                                                                                                                                                             | `maxSteps` 11 plus up to `bombSteps` 2 post-plant steps; the mirror averages 8.42                                                                                                                       |
| 17 | Carry-over modifiers, entry kill-intel bonus                                                                                  | not implemented (§5)                                                                                                                                                                                                                                                                            | effects of a fraction of a point (kill intel ≈ +0.2) against a ±18 roll, for extra complexity                                                                                                             |
| 18 | Intel rows 0–2 / 3–5 / 6–9 / 10+                                                                                           | below 3 / 3–6 / 6–10 / 10+, lower bound inclusive (§8)                                                                                                                                                                                                                                        | closes the gaps for fractional IntelDiff values                                                                                                                                                             |
| 19 | Optional MVP simplifications (skip gear fit, flat ±2 intel)                                                                  | not needed: gear fit and the full intel table are implemented                                                                                                                                                                                                                                    | the data was ready                                                                                                                                                                                          |
| 20 | DEF had no briefing decision, and the Anchor and Trap Specialist always fought the Entry step (former open questions 3 and 4) | DEF line-up each round: hold the breach (Anchor, Trap Specialist) or hold the site (Roamer, Trap Specialist), Support Defender supports in both; the player picks, opponents pick by archetype (Q4); **superseded by round v2** (DEF setup: positions, reinforcements, traps, roam, §9.1) | the Anchor died in the Entry step in 47.9% of mirror rounds and its Site strengths went unused; it now never dies there when DEF holds the site. Hold the site is the stronger pick (open question 1, §30) |
| 21 | Playstyles netted +1 to +12 stat points (former open question 5)                                                              | every playstyle nets +4 (§7, Q5)                                                                                                                                                                                                                                                                | Calculated or Team-first was the best pick for all 10 operators; now no playstyle is the best pick for more than 3 of 10 (round v1; on round v2 with weapons Calculated is the best pick for 6, §7)        |
| 22 | `randomRange` 13, `zoneControlBonus` 4 (former open question 1)                                                           | 18 and 3 (§21, §14.2, Q12)                                                                                                                                                                                                                                                                     | a 6.6-points-weaker squad won 14.9% of rounds and 1.5% of matches (12.1% / 0.6% before traits); now 20.0% / 2.7%. Lowering the zone bonus pays back part of the ATK loss from the larger roll               |
| 23 | `numbersBonus` 3                                                                                                            | 4 (§17)                                                                                                                                                                                                                                                                                         | the DEF line-up and the ±18 roll left the mirror at ATK 40.2% and first kill → round win 62.5%, both below target; 4 gives 48.1% and 70.4%                                                                |
| 24 | `clearAt` / `dominantAt` 8 / 20                                                                                           | 11 / 27 (§22)                                                                                                                                                                                                                                                                                   | re-sized to the ±18 roll: 8 / 20 would make 37% of steps Dominant and drop time outs to 2.7%                                                                                                               |
| 25 | Route spread 31–56% with no information for the player (former open question 2)                                              | spread kept; `routeOdds` gives each route's expected ATK win for the briefing label (§14.4, Q6); **superseded by round v2** (no routes; `planOdds` gives a plan's odds, §14.4)                                                                                                       | the route choice stays a real decision and the player sees its difficulty                                                                                                                                   |
| 26 | Groups advance on their own (WP-B)                                                                                            | sync: a group waits in its site neighbour until every other group holds its own (§10.0, `syncHops` 0)                                                                                                                                                                                         | splits arrived one group at a time and each fought the whole site alone (B and C 47% and 32% against A 78%, §32)                                                                                           |
| 27 | Local numbers 4 per operator, uncapped                                                                                        | capped at 3 operators (`numbersCap`, §17)                                                                                                                                                                                                                                                     | five against one was +32 on Diff before skill; one lane always won its rooms                                                                                                                                |
| 28 | —                                                                                                                            | crowding: −2 per operator above 3 (Narrow, Connector) or 4 (Open, Fortified), both sides; **removed in v4** (change 33)                                                                                                                                                                   | a stack must pay for being in one room; a 3-group in a corridor fights at full strength                                                                                                                     |
| 29 | —                                                                                                                            | pinch: ATK +1 per held door of the fight zone beyond the first; **replaced in v4** by hold/split (change 33)                                                                                                                                                                               | taking two or three ways into a room has to count; without it the stacked site defence wins 56%                                                                                                             |
| 30 | `smokeBonus` 12, `maxSteps` 11, P traps the entries it holds, C 2 + 2 + 1, Tactical C, Utility-heavy B                    | 7, 12, P traps chokes (Plan v2 §2.6), C 2 + 1 + 2, Tactical B, Utility-heavy C (§9.4, §27)                                                                                                                                                                                                    | smoke at most 8 (WP-F brief); the Plan v2 values for steps and P; the flank pair makes C a real plan (C 46% with 2 + 2 + 1, 52% with 2 + 1 + 2, measured during WP-F)                                       |
| 31 | One group moves as a block; a zone holds any number                                                                           | per-operator positions on the group path; at most `doorCapacity` (2) operators of a side through a door per step, at most `zoneCapacity` (3) per zone (spawns excepted), the rest queue behind (§10.0, §10.1)                                                                              | Plan v4 §3.1: five operators cannot pour through one door, ten cannot stand in one room                                                                                                                    |
| 32 | Only operators in the fight zone count                                                                                        | supporters in neighbouring zones without a fight, through open doors, count as 0.7 of an operator in the average and the numbers term; at most one dies, only in a Dominant fight (§10.4, §17, §20)                                                                                           | Plan v4 §3.1 (0.5 asked); 0.5 in the numbers term too left ATK at 23% of mirror rounds before the other changes, 0.7 balances the queued attackers against the site trio                                   |
| 33 | Pinch: ATK +1 per held door beyond the first; crowding −2 per operator above the limit                                       | hold/split for the occupant: +2 through one door, +2 / −3 for staggered doors, −3 for doors opened together or three or more (§10.5); pinch and crowding removed                                                                                                                              | Plan v4 §3.1; crowding is identically 0 with room capacity 3 (the smallest `crowdLimit` is 3)                                                                                                            |
| 34 | Reinforced zone: status −2, ATK −6 on Breach and Objective                                                                  | reinforced door: a wall until a hard breach opens it (planned or by a carrier at the front), then throughput 1; groups that meet one reroute or wait for their breacher; at most 3 charges; no room cut off, the site keeps 2 open doors (§9.1, §10.2)                                         | Plan v4 §3.2; without the site rule two sealed site doors funnelled every group into one door and the stacked site won 63–74% as DEF                                                                      |
| 35 | Zone traps: −4 the step a group enters, the zone not taken that step                                                         | door traps hidden by default: unrevealed wire −4 in the group's next fight, throughput 1, the group spotted; alarm only spots; drones reveal them; a revealed trap is disarmed by a Utility Specialist or an EMP, or crossed at throughput 1 (§10.3)                                           | Plan v4 §3.2: traps strong only when unseen, drones are the counter                                                                                                                                        |
| 36 | Roaming defenders always know where every group is                                                                            | DEF rotates toward groups it has spotted (fights, traps, alarms, cameras), holds the adjacent room when more than `roamHold` (1) attacker stands in the target, never steps into a spawn; rotations respect door and room capacity (§23.1)                                                    | Camera Network and alarms need something to reveal; roamers walking into a stack one at a time made R win 31–36% as DEF                                                                                    |
| 37 | 1–3 groups; one armed ability per side per round; AI from templates                                                          | 1–5 groups of 1–3; any unused ability may be armed, each once per match; AI sides draw from pools of 6 plans per map, side and archetype, adapted to intel; templates for the matrix only (§9.3, §9.4, §19.2)                                                                               | Plan v4 §3.3                                                                                                                                                                                               |
| 38 | Sync until every group holds its site neighbour                                                                               | sync only toward groups heading to a different site neighbour, at most `syncWait` (2) steps (§10.0)                                                                                                                                                                                           | waiting without a cap made 32% of mirror rounds time out; waiting for a group behind in the same lane gains nothing                                                                                         |
| 39 | Situation in an ATK-held zone follows the normal rules                                                                        | Gunfight (§10.6)                                                                                                                                                                                                                                                                                | lingering defenders in taken rooms froze door queues (24.8% time outs without the rule, measured with the sync cap)                                                                                         |
| 40 | Drones only reveal, the plan stays                                                                                            | after the drones, groups replan around every known reinforced door (§9.3)                                                                                                                                                                                                                       | a planned detour costs no step (Plan v4 §3.2); without it a lone breacher entered the stacked site through a throughput-1 door                                                                             |

> [!WARNING] ⚠️ Why the sum had to go (change 1)
> At first contact (Breach situation, Entry zone), the MVP roster's summed scores were **ATK 265.0** (Breach 96.8 + Haze 87.2 + Volt 81.0) against **DEF 218.1** (Fortress 67.1 + Wire 87.4 + Lens 63.6). With the original ±6 zone bonus for DEF that is 259.0 vs 224.1. A gap of about 35 points against a ±3 random window is far above the Dominant threshold, so DEF lost every entry with 2–3 casualties. After that, each death removed a whole ~70-point score from the losing sum, so the first exchange decided the round.
> Re-running the engine of 2026-10-28 with only the average switched back to a sum: ATK wins **95.6%** of mirror rounds (first kill → round win 97.6%, 4.98 steps). With the original constants as well (random ±4, numbers 4, momentum 3, zone ±6, Clear ≥ 5, Dominant ≥ 12), ATK wins **98.8%**.

---

## 29. Balance results

Round v4 after the WP-I balance pass, measured with `node demo/engine.test.js --routes --sens` and `--share` on 2026-10-29. The run is seeded, so the numbers below are reproducible exactly. The v2 results are retired with that round model.

### Targets (Plan v4 §3.4; mirror: MVP roster with traits on both sides, AI plan pools, 2000 matches, 11,530 rounds)

| Target                                                                                                          |                                                                                                             Result |                                         Band |                                                              |
| --------------------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------: | -------------------------------------------: | ------------------------------------------------------------ |
| Mirror ATK round win                                                                                            |                                                                                                              50.6% |                                      45–55% | met                                                          |
| Time out endings                                                                                                |                                                                                                               6.9% |                                       5–15% | met                                                          |
| Average steps, planning excluded                                                                                |                                                                                                               8.42 |                                        7–12 | met                                                          |
| 6.6-points-weaker squad round win (the quality-52 run, read from the weaker side)                               |                                                                                                              20.2% |                                      15–21% | met                                                          |
| No dominant template (§32)                                                                                     | 0 violations: ATK A 43.6%, B 53.2%, C 43.7%; DEF S 51.8%, P 53.8%, R 53.9%; best ATK B / B / A, best DEF R / P / P | none ≥ 55% averaged, none best on every map | met (asserted)                                               |
| Door realism: most operators of one side through one door in one step / in one non-spawn zone                   |                                                                                                              2 / 3 |                                  ≤ 2 / ≤ 3 | met (asserted every step of every checked round)             |
| Trap counterplay: wire-trap debuffs per trapped-door crossing, crossing side's drone covered the door / did not |                                                                                           0% of 833 / 84.6% of 539 |                              ≤ 40% / ≥ 80% | met                                                          |
| Reinforcement value: reinforced doors on a planned path that changed the path (replanned or blocked)            |                                                                                                      74.9% of 1365 |                                       ≥ 50% | met                                                          |
| Plan variety in 200 AI-vs-AI rounds on the Tower: distinct ATK plans / DEF setups                               |                                                                                                          102 / 109 |                                  ≥ 8 / ≥ 8 | met                                                          |
| Flank: all five on the flank path minus all five on the shortest path, averaged over S/P/R                      |                                                                   Tower +15.7, Hospital +8.3, Factory −0.2 points |                                  within ±10 | **missed on the Tower; reported, not asserted** (§32) |
| Power budget (bare 49.2% → full 55.9%)                                                                         |                                                                                                               +6.7 |                                    +7 to +13 | **missed by 0.3; reported, not asserted** (§32)       |
| Arming abilities: player every round / opponent every round                                                     |                                                                                                       +0.8 / −0.2 |                                   within ±4 | met                                                          |
| One weapon swap within a class (§16.5)                                                                         |                                                                                                       +0.0 to +1.0 |                                   within ±3 | met                                                          |

Not targets, for reference: your round win / match win 50.2% / 50.3%; first kill → round win 71.5%; elimination endings 49.9%; bomb endings 43.3% (Detonation 32.0%, Defused 11.3%). Per map: Tower ATK 52.8% (8.35 steps, time out 4.8%), Hospital 47.2% (8.33, 9.7%), Factory 51.9% (8.56, 6.0%).

### MVP roster vs random opponents (1000 matches each, random archetype per match)

| Opponent quality | vs roster mean 58.6 | Your round win | Your match win | ATK round win | Avg steps | First kill → round win |
| ---------------: | ------------------: | -------------: | -------------: | ------------: | --------: | ----------------------: |
|               44 |              −14.6 |          96.2% |         100.0% |         51.9% |      6.94 |                   87.5% |
|               52 |               −6.6 |          79.8% |          94.8% |         53.2% |      7.97 |                   74.8% |
|               58 |               −0.6 |          55.5% |          61.0% |         50.2% |      8.37 |                   72.1% |
|               64 |                +5.4 |          27.2% |          11.7% |         47.8% |      8.18 |                   73.5% |
|               72 |               +13.4 |           7.0% |           0.2% |         48.1% |      7.17 |                   83.4% |

### Template matrix

ATK round win, MVP roster both sides, 400 rounds per cell, seed 2026. Rows: ATK templates; columns: DEF templates (§9.4).

| Meridian Office Tower |     S |     P |               R |         ATK avg |
| --------------------- | ----: | ----: | --------------: | --------------: |
| A — One lane         | 49.5% | 65.8% |           28.2% |           47.8% |
| B — Split            | 45.0% | 81.8% |           62.0% | **62.9%** |
| C — Flank            | 48.5% | 56.3% |           50.5% |           51.7% |
| DEF win               | 52.3% | 32.1% | **53.1%** |                 |

| St. Mora Hospital |     S |               P |     R |         ATK avg |
| ----------------- | ----: | --------------: | ----: | --------------: |
| A                 | 38.5% |           20.5% | 50.5% |           36.5% |
| B                 | 55.0% |           26.3% | 76.8% | **52.7%** |
| C                 | 50.0% |           50.2% | 19.8% |           40.0% |
| DEF win           | 52.2% | **67.7%** | 51.0% |                 |

| Ironfield Factory |     S |               P |     R |         ATK avg |
| ----------------- | ----: | --------------: | ----: | --------------: |
| A                 | 75.0% |           46.0% | 18.0% | **46.3%** |
| B                 | 46.8% |           23.0% | 62.3% |           44.0% |
| C                 | 25.3% |           46.0% | 47.3% |           39.5% |
| DEF win           | 51.0% | **61.7%** | 57.5% |                 |

Averaged over the maps: ATK A 43.6%, B 53.2%, C 43.7%; DEF win S 51.8%, P 53.8%, R 53.9%. Single cells range from 18% to 82%: a deterministic template either meets a reinforced door on its lane or not, and both sides are fixed. The two-lane split (B) leads because door throughput slows the one lane (A) and the three-lane flank (C) runs a lone operator; it stays under 55% with 1.8 points of margin, so the target is close to its edge (§32).

The flank paths of the check: Tower `ext-s > lobby > open > hall-n > site` 64.0% against the shortest `ext-e > mail > hall-e > site` 48.3%; Hospital `ext-n > window > hall > site` 43.5% against `ext-s > entrance > lift > site` 35.2%; Factory `ext-s > rail > boiler > locker > site` 47.2% against `ext-s > rail > boiler > site` 47.3%. Each lane plan is 3 + 2 on the path with smoke on the site and the drones on the path's site neighbour.

### Sensitivity (`--sens`)

The MVP roster against a generated quality 58.6 opponent (Balanced unless noted, traits on), 2000 matches per row, seed 777 reset per row. Changes apply to your squad only.

| Change                                        | Your round win | vs baseline | Your match win |
| --------------------------------------------- | -------------: | ----------: | -------------: |
| baseline (tier 1, traits on)                  |          50.9% |          — |          51.6% |
| primary tier 6 for everyone                   |          53.4% |        +2.4 |          57.1% |
| armor tier 6 for everyone                     |          53.2% |        +2.3 |          57.1% |
| gadget tier 6 for everyone                    |          53.3% |        +2.4 |          57.0% |
| all items tier 6                              |          55.9% |        +5.0 |          63.5% |
| Cold Blooded off (Breach, Shade)              |          51.1% |        +0.2 |          52.4% |
| Tunnel Vision off (Haze)                      |          51.2% |        +0.3 |          52.9% |
| Shot Caller off (Watcher, Lens)               |          48.6% |       −2.4 |          47.5% |
| Breacher on Breach instead of Cold Blooded    |          51.8% |        +0.9 |          54.0% |
| Aggressive off (Jackal)                       |          52.0% |        +1.1 |          54.5% |
| Unstable off (Mirage)                         |          52.0% |        +1.1 |          54.1% |
| Veteran off (Fortress)                        |          50.4% |       −0.5 |          51.7% |
| Drone Expert off (Volt)                       |          51.7% |        +0.8 |          53.4% |
| Fortifier off (Wire)                          |          51.2% |        +0.3 |          52.6% |
| all traits off                                |          49.2% |       −1.7 |          48.0% |
| opponent Balanced (all pools)                 |          50.9% |        +0.0 |          51.6% |
| opponent Rush                                 |          65.2% |       +14.3 |          80.0% |
| opponent Tactical                             |          40.0% |      −10.9 |          29.1% |
| opponent Utility-heavy                        |          50.0% |       −0.9 |          50.0% |
| player arms every round (best unused, §19.2) |          51.7% |        +0.8 |          53.1% |
| opponent arms every round (random unused)     |          50.8% |       −0.2 |          51.7% |

Weapon rows: every swap within a class moves the round win by +0.0 to +1.0 (assert ±3). Power budget: bare squad (tier 1, no traits) 49.2% → every item tier 6 plus traits 55.9% = **+6.7** round-win points, 0.3 below the +7 floor (v2: +10.5). Traits are worth less in v4 (all off −1.7 against −4.2 in v2): fights are small and decided more by the numbers, hold and support terms than by a few stat points.

`--share` counted 41,548 fights (1000 mirror matches, seed 4242); `SITUATION_SHARE` is updated to the v4 row `[0.000, 0.051, 0.162, 0.085, 0.218, 0.408, 0.076]` (largest change 0.112, Objective up from 0.296: more site fights, Breach down from 0.124: door queues spread first contact).

---

## 30. Open design questions

1. **Archetypes are far apart.** Against the MVP roster, a Rush opponent gives up 14.3 round-win points and a Tactical one gains 10.9 (§29), through the stat shift and the pool styles (Rush: 2 groups, roamers; Tactical: site stacked with 3, drones). Pool styles (`ARCHETYPES[a].ai`) are the lever.
2. **The template matrix is at its edge.** B averages 53.2% against the 55% bound; a 1–2 point change of `smokeBonus`, `supportFactor`, `numbersCap`, `syncWait` or `clearAt` pushed B to 55–57% or a DEF template to 55–57% in the WP-I sweeps (§32). Single cells span 18–82% because the templates are deterministic.
3. **Flank check.** The v2 flank check (all five on one lane) no longer measures one lane: a lane whose site door is reinforced turns into a split after replanning (Tower +15.7), and without drones it walks into the reinforced site door (Hospital −28.7 measured). It is reported, not asserted. A v4 version should compare flank entries inside the AI pools.
4. **Power budget +6.7** (target +7). Items and traits matter less in v4 fights. Options: wider tier tables, or a larger `numbersBonus` share for skill.
5. **Supporters can lower the average.** The weighted average (Plan v4 §3.1) means a weak supporter pulls its side's average down; it always helps through the numbers term. Site defenders support fights in the site neighbours through open doors and can die there in Dominant fights; this decides the P matchups (§32).
6. **Gear and playstyle choices are nearly neutral** (v2 question 5, unchanged).

---

## 31. How to retune

1. Change `CONFIG` (or a table) in `demo/data.js`. The page and the tests both read it, so nothing else needs to change.
2. Run from the project root:

```
node demo/engine.test.js --routes --sens
```

3. Read the output:
   - Rule checks: base situation scores, 300 matches against generated squads of quality 40–79, extreme-quality squads, replays by seed, AI picks by seed, briefing, AI pools and suggestions (validity, variety), invalid setups and plans, abilities (several per round), map checks. Every round is re-derived step by step (`checkRound`: per-operator movement, door throughput, room capacity, reinforcements and breaches, traps and disarms, sync, supporters, entry sides, fights, numbers, control, retreats, spotting, rotation, ends, door and queue logs).
   - Balance report: mirror, vs random quality 44 / 52 / 58 / 64 / 72, ATK win per map and ATK pool archetype (`--routes`), the template matrix with the flank check, and "Balance targets". A target outside its band is marked `OUT OF TARGET` and fails the test, except the two marked "reported, not asserted" (flank, power budget).
   - `--sens` adds the sensitivity table, the power budget and the ability and weapon asserts (§29).
   - `--share` re-measures `SITUATION_SHARE`.
   - The run takes about 4 minutes with `--routes --sens` and is seeded.
4. Rule changes (not just numbers) also need `checkRound` in `demo/engine.test.js` and this file updated.
5. Update §27 and §29 with the new values and results.

### What each knob does (WP-I sweeps)

Template averages from 100–200 rounds per cell (noise about ±2–3 points), mirror from 300–1000 matches; one constant changed from the values of the time, so the rows are directions, not exact deltas. Bold: 55% or more.

| Change                            | ATK A / B / C          | DEF S / P / R                              | Mirror ATK | Time out |
| --------------------------------- | ---------------------- | ------------------------------------------ | ---------: | -------: |
| final values                      | 44 / 53 / 44           | 52 / 54 / 54                               |      50.6% |     6.9% |
| `smokeBonus` 13                 | 48 / **57** / 48 | 46 / 51 / 50                               |      50.8% |     4.9% |
| `smokeBonus` 11                 | 47 / 50 / 38           | **56** / 52 / **57**           |      48.8% |     4.7% |
| `supportFactor` 0.75            | 44 / **55** / 46 | 49 / **55** / 53                     |      49.5% |     6.2% |
| `supportFactor` 0.6             | 42 / 51 / 45           | **56** / 51 / **55**           |         — |       — |
| `numbersCap` 2                  | 42 / 53 / 41           | 53 / 53 / **58**                     |         — |       — |
| `numbersCap` 3                  | 45 / **56** / 44 | 52 / 53 / 51                               |      49.5% |     5.2% |
| `holdBonus` 3                   | 39 / 52 / 38           | **58** / **56** / **58** |        48% |       5% |
| `syncWait` 3                    | 45 / **57** / 48 | 47 / 51 / 52                               |      49.5% |     5.2% |
| `cleanupFrom` 9                 | 45 / 53 / 47           | 50 / 52 / 53                               |      49.1% |     4.7% |
| `reinforceCharges` 1            | 51 / 49 / 29           | **60** / **56** / 55           |         — |       — |
| `siteOpenDoors` 1               | 41 / 43 / 51           | **71** / 51 / 37                     |        48% |       4% |
| no `roamHold` (roamers walk in) | 50 / 51 / 41           | **57** / **55** / 44           |        49% |       4% |

| Goal                  | Turn                                                            | Watch out for                |
| --------------------- | --------------------------------------------------------------- | ---------------------------- |
| More ATK wins overall | `smokeBonus` ↑, `zoneControlBonus` ↓, `numbersBonus` ↑ | B passes 55% first           |
| Weaker stacked site   | `smokeBonus` ↑, `siteOpenDoors` stays 2                    | S and R as DEF move most     |
| Splits weaker         | `numbersCap` ↓, `supportFactor` ↓                         | the spread defences gain     |
| More time outs        | `cleanupFrom` ↑, `syncWait` ↑                             | `syncWait` 3 makes B 57%   |
| Fewer upsets          | `randomRange` ↓                                              | also lowers the power budget |

---

## 32. Round v4 balance

The WP-I pass for Plan v4 §3.4. The v2 record (WP-F: sync, numbers cap, crowding, pinch, smoke 7) is superseded; crowding and pinch are gone, sync and the cap remain with new values.

### Starting point

The v4 rules as specified (door throughput 2, room capacity 3, supporters 0.5 in the average only, hold +3 / split −3, reinforced doors as walls, door traps, v2 constants) gave mirror ATK **18.9%**, time outs **32.7%**, template averages ATK A 4 / B 18 / C 21 and DEF S 96 / P 82 / R 79. Causes, measured with traces and fight tallies: the site holds the three best Objective defenders (Fortress 100, Lens 98, Wire 74 against the best ATK three at about 81) instead of five diluted ones; two reinforced site doors funnel every group into one door, where a lone breacher entered a 3-stack through a throughput-1 door; sync held every group while one was stuck behind a door queue; lingering defenders in taken rooms repeated no-kill Utility fights; site fights at 3v3 lost the v2 numbers edge (ATK won 26% of site fights, Diff −12).

### What was changed and why

| Step                                                                                                        | Mirror ATK |                Time out | Matrix (ATK A/B/C · DEF S/P/R)                      |
| ----------------------------------------------------------------------------------------------------------- | ---------: | ----------------------: | ---------------------------------------------------- |
| v4 as specified                                                                                             |      18.9% |                   32.7% | 4 / 18 / 21 · 96 / 82 / 79                          |
| + AI adapts to intel, groups wait for their own breacher                                                    |      19.8% |                   32.1% | 4 / 19 / 21 · 95 / 86 / 76                          |
| + supporters count in the numbers term                                                                      |      23.3% | 22.0% (`maxSteps` 14) | 3 / 24 / 25 · 90 / 82 / 75                          |
| + `syncWait` 2, Gunfight in held zones                                                                    |      24.2% |                    6.4% | 11 / 16 / 12 · 94 / 89 / 78                         |
| + replanning after drones, template drones                                                                  |      26.3% |                    4.7% | 20 / 24 / 28 · 84 / 81 / 63                         |
| + numbers 5–6, smoke 9–12, zone control 1–2, support 0.75                                                |    50–53% |                   2–4% | 40–56 / 46–68 / 44–63 · 43–71 / 45–65 / 34–46 |
| + the site keeps 2 open doors                                                                               |    44–55% |                   2–4% | 46–57 / 48–57 / 44–53 · 49–65 / 44–58 / 36–48 |
| + `roamHold` 1                                                                                            |    47–53% |                   2–3% | 40–50 / 52–60 / 41–47 · 45–59 / 52–59 / 52–57 |
| + sync only toward other site doors, C = 2 + 2 + 1, `numbersCap` 2.5, `randomRange` 14, `maxSteps` 11 |      49.5% |               4.7–5.2% | 45 / 53–56 / 44–47 · 49–52 / 50–53 / 52–56     |
| final: + `cleanupFrom` 10, `supportFactor` 0.7, smoke 12                                                |      50.6% |                    6.9% | 43.6 / 53.2 / 43.7 · 51.8 / 53.8 / 53.9             |

- **Supporters in the numbers term** (not in the plan's text, which names only the average): with 0.5 in the average only, queued attackers mostly lowered their side's average and the 3v3 site fight stayed a DEF win. Counting a supporter as 0.7 of an operator everywhere makes the whole squad matter.
- **The site keeps 2 open doors** (`siteOpenDoors`). Sealing two of three site doors was the dominant defence (S 63–74% as DEF in every constant set tried). DEF still reinforces one site door and two approach doors.
- **Roamers hold next to a stack** (`roamHold` 1): with spotting-gated rotation, roamers arriving one at a time into a group made R the weakest defence (31–36%); holding next to any attacker made it 66–73%.
- **Templates.** C became 2 + 2 + 1 (the lone operator on the costliest lane): 2 + 1 + 2 left C at 40–44%. A is one lane of 3 + 2, B 3 + 2 on two lanes; DEF templates S/P/R reinforce site door, then approach doors. Other placement orders tried (all approach doors, choke doors, one per entry) made one DEF template 55–75% as DEF.
- **Not met:** the flank check (Tower +15.7) and the power budget (+6.7) are reported, not asserted (§30). Plan v4's 0.5 `supportFactor` and +3 `holdBonus` are 0.7 and +2 for the reasons in §27.

### AI pools

Pools are per archetype (§9.4); the mirror and squads without an archetype draw from all of them. Mirror ATK win per ATK pool archetype and map (`--routes`) ranges 44–56%; per DEF pool archetype 38–49% ATK win in the WP-I measurement, so no archetype's pool dominates. Plan variety: 102 distinct ATK plans and 109 DEF setups in 200 AI rounds on one map.
