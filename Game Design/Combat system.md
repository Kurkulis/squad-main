

Matches are not played in real time. Instead, each round is broken down into a chain of tactical situations that are resolved automatically based on squad composition, stats, gear, and pre-round decisions.

---

## Round structure

Matches are **best-of-7** (first to 4 round wins) with alternating ATK/DEF sides. Round v2 (Plan v2): every round has a planning phase, then up to 12 steps on the map's zone graph ([[Game modes and maps]]).

| Phase | Steps | What happens | Formula.md |
|---|---|---|---|
| Planning | 0 | **DEF setup** (positions, 2 reinforcements, traps, roamers) → **intel** roll (stat buffs for the round; ATK may learn reinforcements, traps or positions) → **ATK plan** (1–3 groups with their own paths, gadgets placed on zones) | §8, §9 |
| Entry | 1–2 | groups leave their spawns; traps spring; first contact | §10 |
| Main | 3–8 | each group advances one zone per step; a fight in every zone where a group meets defenders; lost fights make groups reroute; roamers rotate | §10, §23.1 |
| Cleanup | from 9 | fatigue, every fight a Gunfight unless Clutch | §11 |
| Post-plant | up to 2 after the plant | every defender converges on the site to defuse, or the bomb detonates | §23.1, §24 |

Before the plant the groups wait in the room next to the site until every group holds its own, then go in together. Each fight is scored from the local operators only: their average operator score plus capped numbers, crowding, a pinch bonus for several held doors, zone control, momentum, smoke or reinforcement, and a random roll (Formula.md §20). A worked example of a whole planning step and three steps is in Formula.md §10 ("Playing a round v2").

Each fight is one of these situations, picked by fixed rules from the zone and round state (Formula.md §10.1):

- **Breach / Entry** – the first zone after a group's spawn
- **Utility usage** – a group's first fight elsewhere
- **Reposition** – Rotation zones
- **Gunfight** – Exterior, Hallway, Stairs, Power, and every Cleanup fight
- **Objective execution** – fights on the site, and the retake after the plant
- **Clutch / Cleanup** – an alive gap of 3 or more

Info gathering is the intel roll in the planning phase, not a fight. Full rules, formulas and constants: Formula.md §2, §8–§11, §20–§24.

The design idea behind every step:
- Which squad has the information advantage
- Which squad holds the positional advantage
- How well each operator's role and gear matches the situation
- Individual operator decision-making quality
- How effectively the squad functions as a unit

---

## Pre-round loadout & playstyle

Before a round starts, you select a **loadout preset** and a **playstyle** for each operator. These are not individual attachment choices – they are preset configurations that represent a tactical approach. *MVP: playstyles only; loadout presets are not implemented.*

If a round is lost, you can review each operator's performance, see where they underperformed, and adjust their loadout or playstyle before the next round.

### Playstyles

In the MVP every playstyle is open to every role, except `Adaptive`, which is Flex only. Every playstyle nets +4 stat points, so the choice is a trade-off between stats, not a free upgrade.

| Playstyle | Shooting | Awareness | Teamwork | Utility | Decision | Luck | Design intent |
|---|---:|---:|---:|---:|---:|---:|---|
| Aggressive | +8 | −2 | −2 | 0 | −1 | +1 | Entry, Roamer |
| Calculated | −3 | +5 | 0 | 0 | +5 | −3 | Support, Anchor |
| Slow & Steady | −3 | +2 | 0 | 0 | +5 | 0 | Anchor, Trap Specialist |
| Opportunistic | +4 | 0 | −6 | 0 | +2 | +4 | Lurker, Flex |
| Team-first | −4 | −1 | +6 | +4 | −1 | 0 | Support, Support Defender |
| Adaptive | +1 | +1 | +1 | 0 | +1 | 0 | Flex only |

> Playstyle modifiers stack on top of the operator's base stats for that round only. Measured effect per operator: Formula.md §7.
