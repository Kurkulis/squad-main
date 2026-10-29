# Operator Stats

Stats define how an operator performs across different situations in a round. Every stat contributes something, but each role has a primary cluster of stats that matters most.

Stats are split into three categories: **Combat**, **Tactical**, and **Mental/Hidden**.

---

## Combat stats

Direct performance in gunfights and physical engagements.

| Stat | Description |
|------|-------------|
| **Shooting** | Overall accuracy and shot quality |
| **Close Range** | Modifier – performance in CQB situations |
| **Mid Range** | Modifier – performance at medium distance |
| **Long Range** | Modifier – performance at long distance |
| **Reaction** | How quickly the operator responds to contact |

> Range modifiers apply on top of the base Shooting stat. Weapon type sets the baseline range profile; this stat refines it.

---

## Tactical stats

How the operator reads and responds to the tactical situation.

| Stat | Description |
|------|-------------|
| **Awareness** | Detects sounds, spots threats, avoids getting flanked |
| **Decision Making** | Chooses the better action in a given situation |
| **Utility Handling** | How effectively gadgets are used |
| **Discipline** | Fewer mistakes, better positioning, doesn't overextend |
| **Teamwork** | Info sharing, combined actions, squad synergy |

---

## Mental / Hidden stats

Not visible to the player directly. These influence outcomes in pressure situations and add variance to performance.

| Stat            | Description                                               |
| --------------- | --------------------------------------------------------- |
| **Clutch**      | Performance when outnumbered or in a last-stand situation |
| **Composure**   | Resistance to pressure – stays effective under stress     |
| **Aggression**  | How often the operator chooses risky actions              |
| **Luck**        | Small hidden modifier applied to every action             |
| **Consistency** | Whether the operator performs reliably or goes "on/off"   |

---

## Role stat focus

Each role has a primary stat cluster. Operators in that role will naturally have higher values in these stats.

| Role | Primary stats |
|------|---------------|
| Entry | Shooting, Close Range, Reaction, Aggression |
| Second Entry | Shooting, Clutch, Discipline |
| Support | Teamwork, Awareness, Utility Handling |
| Utility Specialist | Utility Handling, Decision Making, Awareness |
| Flex | Decision Making, Consistency, balanced across all |
| Anchor | Discipline, Composure, Mid/Long Range |
| Roamer | Reaction, Awareness, Aggression |
| Lurker | Discipline, Awareness, Clutch |
| Trap Specialist | Utility Handling, Discipline, Decision Making |
| Support Defender | Teamwork, Awareness, Utility Handling |

---

## MVP stat set

The demo uses six stats on a 0–100 scale (permanent, decision Q2):

| Key | Stat |
|---|---|
| `sh` | Shooting |
| `aw` | Awareness |
| `tw` | Teamwork |
| `ut` | Utility Handling |
| `dc` | Decision Making |
| `lk` | Luck *(hidden)* |

All other stats above (range modifiers, Reaction, Discipline, Clutch, Composure, Aggression, Consistency) have no effect in the MVP and can be added later.

### Stat guide

The Squads tab shows the same guide (`Cards.statGuide` in `demo/cards.js`). One sentence per stat, as the game shows it, and its share-weighted weight: what one stat point is worth on average across fights.

| Stat | What it buys | Weight on average |
|---|---|---:|
| Shooting `sh` | Wins the trade when both sides shoot: the biggest weight in Gunfight, Clutch and Breach. | 0.221 |
| Awareness `aw` | Sees the enemy first: leads Info and Reposition and is the top weight of the intel roll. | 0.189 |
| Teamwork `tw` | Moves with the group: the top weight in Objective, strong in Reposition. | 0.153 |
| Utility Handling `ut` | Gets value out of gadgets: dominates Utility fights and helps Breach, Objective and intel. | 0.158 |
| Decision Making `dc` | Picks the right play: a steady weight in every situation, highest in Reposition. | 0.184 |
| Luck `lk` | Swings close calls: weighs most in Clutch; lucky operators keep some shooting and decisions under fatigue. | 0.094 |

How often each situation decides a fight in mirror play (`SITUATION_SHARE` in `demo/data.js`, measured by `node demo/engine.test.js --share` over 41,220 fights; Formula.md §27). Info is 0 because no fight is an Info fight: only the intel roll uses Info, with its own weights (Formula.md §8).

| Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---:|---:|---:|---:|---:|---:|---:|
| 0.000 | 0.124 | 0.140 | 0.130 | 0.216 | 0.296 | 0.093 |

The per-situation weights are in Formula.md §12. The playstyle advisor on each card and the weapon select use these shares to show the expected score change of each choice.

### Modifiers on top of the base stats

These change the six stats for one round; they are not separate stats. The sum is clamped to 0–100.

| Modifier | Source | Lasts |
|---|---|---|
| Playstyle | chosen before each round, every row nets +4 | the whole round |
| Intel | planning-step result: winner +1 to +4 Awareness/Decision (and Shooting, Teamwork in bigger wins), loser up to −3 Awareness, −2 Decision | every step of the round |
| Fatigue | steps 9+: −3 to all stats; base Luck above 50 gives back +2 Shooting and +2 Decision | each step from step 9 |
| Item tier | primary weapon tier → Shooting +0…+2; armor tier → Awareness and Decision +0…+1 | always |
| Weapon | the primary's and the sidearm's catalog mods, −4…+4 per stat, net 0 or +1 ([[Game Design/Items]]) | always, the intel roll included |
| Trap | −4 to every stat for a group that springs a DEF trap | the step it springs |
| Trait | the operator's trait, when its condition holds ([[Operators/Traits]]) | conditional |
| Team | Shot Caller gives the whole side +2 Teamwork | while the Shot Caller is alive |

In-round carry-over modifiers are not implemented (skipped on purpose). Exact tables and formulas: Formula.md §4, §7, §8, §9.1, §11, §16.4, §16.5, §19.1.