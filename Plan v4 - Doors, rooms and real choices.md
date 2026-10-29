# Plan v4 — Doors, rooms and real choices (2026-10-29)

Status: **delivered 2026-10-29** (WP-I engine, WP-J UI), no git. Tests green with two soft targets printed, not asserted: power budget +6.7 (floor +7) and Office Tower flank +15.7 (band ±10). Open: archetype swing (Rush −14, Tactical +11 round-win points), never viewed in a real browser.

## 1. What the designer asked for

1. Five operators cannot pour through one door at once: at most 2 per door per step.
2. Ten operators in one room is wrong. At most 3 of one team in a zone; the other 2 stand in adjacent rooms and still influence the fight. A defender caught between two doors fights one entry with an edge and the other at a disadvantage; if both arrive at once, at a disadvantage against both.
3. Reinforcements and traps must be strategic and skill-based, not a guaranteed debuff placed on the default entry. Research how Siege-style games balance this.
4. The one-lane / split / flank templates stay as examples only, not recommendations. Rounds should be built from groups of 1–3 operators acting on their own plans with their gadgets; armed abilities relevant and never forgotten. Every tool the player has should matter, so every round is different.

## 2. Research takeaways (sources at the end)

- Siege gives defenders a shared pool of 10 reinforcements and attackers a hard-breach counter; the pool is a resource that **blocks and shapes routes**, it does not debuff. Hard breach is the counter-resource.
- Traps in Siege are strong only when unseen; drones are the counter, so good trap play means placing where drones don't look and attackers who skip droning pay for it. Traps on obvious doors get found and destroyed.
- Flanking in tactics games works as a **bounded modifier scaled by angle/number of entry sides**, with a cost (exposure, time), never as automatic advantage.

## 3. Design

### 3.1 Doors and rooms

- **Door throughput:** per step, at most `doorCapacity` (2) operators of one side cross one door (edge). A group of 5 needs three steps to pass a door; the rest wait in the previous zone. Waiting operators in the adjacent zone count as **support** (3.2).
- **Room capacity:** at most `zoneCapacity` (3) operators of one side inside a zone for the fight. Extra operators (arrivals beyond 3, or operators queued at a door) stay in the adjacent zone they came from and are **supporters**.
- **Support:** a supporter adjacent to a contested zone through an edge adds `supportFactor` (0.5) of its operator score to its side's average (counted as half an operator in the average's denominator). This applies to both sides: defenders in rooms next to the site support the site fight.
- **Entry sides:** for a fight in zone Z, count the distinct doors through which the attacking side (the side that was not already in Z, or both if both arrived this step) enters or supports. The occupant side gets `holdBonus` (+3) when all enemies come through one door, 0 for two doors, `−splitPenalty` (3) for three or more. If an occupant already fought the first door's enemies in an earlier step and a second door opens this step, the occupant keeps the hold bonus against the first and takes the split penalty against the second: implement as the bonus applied to the fight against the first group's score and the penalty against the second group's score, averaged by their counts. If two groups arrive the same step through two doors, the penalty applies against both. This replaces v2 `pinchBonus`.
- Casualties and kills stay per fight; supporters can be killed only if the fight is Dominant (one supporter at most).

### 3.2 Reinforcements and traps, reworked

- **Reinforcement = door block.** DEF has `reinforceCharges` (2, plus 1 if an Anchor with Reinforcement Panel is in the squad) placed on **doors** (edges), not zones. A reinforced door cannot be crossed by ATK unless opened by a hard breach (Breaching Charge or Thermite spent on that door in planning or when the group reaches it, by a group member who carries it). A group that meets a reinforced door without a breacher reroutes (existing reroute logic, no step lost if the reroute was planned). Reinforced doors have throughput 1 even when opened. No stat debuff.
- **Traps = door traps, hidden by default.** Barbed Wire, Flank Wire (and the Proximity Alarm as an alarm trap) are placed on doors. Effect on the first ATK group crossing an unrevealed trapped door: `trapDebuff` (4) to all stats in the next fight, throughput 1 that step, and the group is revealed to DEF (defenders get the step's rotation toward it). **Counterplay:** a drone or scout drone used on a zone reveals every trap on that zone's doors and every reinforcement; a revealed trap is disarmed for free if the crossing group has a Utility Specialist or an EMP placement on that zone, otherwise it still costs throughput 1 but no debuff. Proximity Alarm never debuffs; it only reveals. Trap tier raises what a drone needs: tier ≥ 3 traps are revealed only by a drone placed on the exact zone, not by adjacency.
- **Smoke** on a door negates the occupant's hold bonus for the crossing group. **Camera Network** reveals one group's position each step in its zone and neighbours (the defenders' intel), so roamers rotate earlier.
- Planning UI consequence: placements are on doors, shown on the floor plan as door markers.

### 3.3 Plans from small groups, examples not defaults

- Groups of 1–3 operators; a group has a path, a gadget use per member (zone or door target), and an armed ability choice per member (one use per match, as today). `maxGroups` rises to 5.
- The templates A/B/C and S/P/R stay only for the balance matrix and as an "Examples" dropdown in the UI, labelled as examples. The default proposal for the player is **empty groups** with a "Suggest" button that produces a random valid small-group plan (not the template), so the player builds the round.
- The AI opponent draws from a pool of 6 ATK and 6 DEF plans per archetype (small-group plans with door placements, built from the map's paths), chosen with weights, so opponents differ round to round.
- Ability reminder: the planning screen lists every unused ability per operator with its situation, and the round summary says which abilities were never used in the match.

### 3.4 Balance targets v4

- Keep v2 targets (mirror 45–55%, time outs 5–15%, steps 7–12, weaker squad 15–21%, power budget, no dominant template at ≥ 55%).
- New: **door realism**: no step moves more than `doorCapacity` operators through one door; no zone ever holds more than 3 fighters per side. **Trap counterplay**: trap debuffs trigger in ≤ 40% of trapped-door crossings when the crossing side used a drone on the zone, ≥ 80% when it did not. **Reinforcement value**: a reinforced door changes the attacker's path in ≥ 50% of the rounds where it lies on the planned path. **Plan variety**: over 200 AI-vs-AI rounds on one map, at least 8 distinct ATK plans and 8 distinct DEF setups occur.

## 4. Packages

| # | Package | Owns | After | Model |
|---|---|---|---|---|
| WP-I | Engine: door throughput, room capacity and support, entry-side hold/split, door reinforcements with hard breach, door traps with drone counterplay, smoke/camera effects, small-group plans and AI plan pools, abilities listing, log fields, tests and balance | `engine.js`, `data.js`, `engine.test.js`, `Formula.md` | — | Opus high |
| WP-J | UI: door placements on the floor plan (reinforce, trap, smoke, breach targets), group builder for 1–5 groups, Suggest button, Examples dropdown, ability reminders, playback of door queues/support/hold-split, narration, docs touch | `ui.js`, `plan.js`, `plan.css`, `playback.js`, `narrate.js`, `cards.js` (ability badge only), `style.css`, `index.html` | WP-I | Opus high |

Verification at each hand-off: `node demo/engine.test.js --routes --sens` green; headless UI v3 script (updated) prints ALL OK.

## Sources

- [Rainbow Six Wiki: Reinforcement](https://rainbowsix.fandom.com/wiki/Reinforcement)
- [Team-wide reinforcement pool and Hard Breach Charge](https://powerup-gaming.com/2020/08/19/rainbow-six-siege-is-switching-to-a-team-wide-reinforcement-pool-and-adding-a-new-breaching-gadget/)
- [PC Gamer on breacher/anti-breacher meta](https://www.pcgamer.com/what-rainbow-six-sieges-rumored-new-breacher-and-anti-breacher-could-mean-for-the-meta)
- [Rainbow Six Siege review: drones vs traps](https://godisageek.com/reviews/rainbow-six-siege-review/)
- [Steam discussion: trap operators only beat unaware players](https://steamcommunity.com/app/359550/discussions/0/1752401587333663574)
- [Master of Tactics: making strategy more strategic (flanking bonuses)](https://www.moddb.com/games/master-of-tactics/news/making-turn-based-strategy-more-strategic)
- [EN World: flanking as a bounded modifier](https://www.enworld.org/threads/flanking.677376/)
