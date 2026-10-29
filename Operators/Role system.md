# Role System

Every operator has one fixed primary role. Roles define what the operator does in a round, which gadgets they can use, and which playstyles are available to them.

Roles are split between **Attack** and **Defense**. An operator belongs to one side and cannot be switched.

---

## Attack roles

| Role | Responsibility | Stat focus |
|------|---------------|------------|
| **Entry** | First through the door. Forces contact, dominates CQB. | Shooting, Close Range, Reaction |
| **Second Entry** | Follows Entry, trades kills, capitalizes on chaos. | Shooting, Clutch, Discipline |
| **Support** | Provides info, cover, and stability for the squad. | Teamwork, Awareness, Utility Handling |
| **Utility Specialist** | Destroys DEF gadgets, creates breach opportunities, controls space. | Utility Handling, Decision Making |
| **Flex** | Adapts to what the round needs. Weaker peaks, broader coverage. | Decision Making, Consistency |

---

## Defense roles

| Role | Responsibility | Stat focus |
|------|---------------|------------|
| **Anchor** | Holds the site. Last line of defense, strong in direct fights. | Discipline, Composure, Mid/Long Range |
| **Roamer** | Moves around the map, wastes ATK time, creates uncertainty. | Reaction, Awareness, Aggression |
| **Lurker / Flanker** | Quietly circles behind ATK to hit from the rear. | Discipline, Awareness, Clutch |
| **Trap Specialist** | Controls chokepoints and corridors, forces ATK into predictable paths. | Utility Handling, Discipline |
| **Support Defender** | Manages info, counters breach attempts, enables the rest of the team. | Teamwork, Awareness, Utility Handling |

---

## Role rules

- Each operator has **one fixed role** – it cannot be reassigned
- Role determines the **gadget pool** the operator can draw from
- Role determines which **playstyles** are available pre-round
- Operator stats are naturally skewed toward their role's requirements
- You need a full and balanced squad – missing a role creates a clear tactical gap

### MVP implementation

- Roles live in `ROLES` in `demo/data.js`: side, a multiplier per situation and an intel multiplier (Formula.md §8, §13). Zone fit adds × 1.10 / × 0.90 per zone (Formula.md §14.1).
- Playstyles: every role can pick every playstyle except `Adaptive`, which is Flex only.
- **Entry step line-ups** (`ENTRY_SETUPS`, Formula.md §9): only front-line roles fight step 2; support roles add only their gadget.

| Line-up | Fight | Gadget support | Not engaged |
|---|---|---|---|
| ATK | Entry, Second Entry | Utility Specialist | Support, Flex |
| DEF hold the breach (`breach`) | Anchor, Trap Specialist | Support Defender | Roamer, Lurker |
| DEF hold the site (`site`) | Roamer, Trap Specialist | Support Defender | Anchor, Lurker |

- The player picks the DEF line-up in the briefing each round. Opponents pick by archetype: Rush holds the breach, Tactical holds the site, Balanced and Utility-heavy pick at random. A squad without its line-up's front-line roles fights with everyone.
- **Archetype defaults** for generated opponents (`ARCHETYPES`, Formula.md §6): Rush plays Aggressive with SMG / Light, Tactical plays Calculated with AR / Heavy, Utility-heavy plays Team-first with AR / Medium, Balanced keeps the role template. Some roles have exceptions (e.g. Rush Anchor carries a Shotgun with Medium armor, Tactical Anchor a DMR).

---

## Squad composition

A full squad is **5 operators per side**. A balanced setup covers all roles, but you can double up on a role if you want to specialise.

**Recommended starting composition:**

| ATK | DEF |
|-----|-----|
| Entry | Anchor |
| Second Entry | Roamer |
| Support | Lurker |
| Utility Specialist | Trap Specialist |
| Flex | Support Defender |