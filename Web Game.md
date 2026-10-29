# Web Game – Master Summary

Tactical squad management web game inspired by Rainbow Six Siege. The player is the team manager – recruiting, developing, and deploying a 5-man ATK squad and a 5-man DEF squad. Matches are resolved through a simulated round engine, not real-time gameplay.

---

## Core gameplay loop

1. Recruit and develop operators
2. Assign gear, roles, and train stats
3. Enter a match – planning phase: DEF places operators, reinforcements and traps; ATK splits into groups, picks their paths and places gadgets
4. Select pre-round loadout preset and playstyle for each operator
5. Round resolves automatically through a chain of tactical situations
6. Review round breakdown – adjust squad and strategy
7. Progress through leagues, earn sponsors, upgrade base

---

## Operators

Every operator has: **fixed role · base stats · weapon loadout · unique gadget · trait**

### Roles

| ATK | DEF |
|-----|-----|
| Entry – first through, CQB dominant | Anchor – holds site, direct fight specialist |
| Second Entry – follows, trades kills | Roamer – mobile, wastes ATK time |
| Support – info, cover, squad stability | Lurker / Flanker – circles behind ATK |
| Utility Specialist – destroys DEF gadgets | Trap Specialist – controls chokepoints |
| Flex – adapts, weaker peaks broader coverage | Support Defender – info, anti-breach, setup |

### Stats

**Combat:** Shooting · Close/Mid/Long Range modifiers · Reaction  
**Tactical:** Awareness · Decision Making · Utility Handling · Discipline · Teamwork  
**Hidden:** Clutch · Composure · Aggression · Luck · Consistency

*MVP set: Shooting · Awareness · Teamwork · Utility Handling · Decision Making · Luck*

### Gadgets

Role-locked – operators can only use gadgets from their role's pool. No cross-side gadgets.

Each operator has one signature gadget. Quality tier applies (higher tier = more charges, wider radius, longer range, etc.).
*MVP: the tier is a multiplier on the gadget's situation value, × 1.00 (tier 1) to × 1.15 (tier 6). See Formula.md §15.3.*

**ATK pools:** Entry (breach/flash), Second Entry (frag/smoke), Support (drone/beacon), Utility Specialist (EMP/thermite), Flex (weaker multi-pool access)  
**DEF pools:** Anchor (reinforcement/C4), Roamer (sensor/decoy), Lurker (wire/blackout), Trap Specialist (barbed wire/mines), Support Defender (cameras/alarms)

### Traits

Passive modifiers that activate in specific situations. The MVP gives each operator one trait; 1–2 per operator is the long-term plan.
Implemented in the demo: Cold Blooded · Tunnel Vision · Shot Caller · Breacher · Aggressive · Veteran · Unstable · Drone Expert · Fortifier. Effects and values: [[Operators/Traits]] and Formula.md §19.1.
One active ability per operator (`op.active`, one per role, armed once per match): Formula.md §19.2.

---

## Match & Round System

Matches are **best-of-7** (first to 4 round wins), sides alternate, round 7 side is a coin flip. Full rules: Formula.md §1–§2.

### Planning phase (step 0 of every round)
- **DEF setup:** a zone for every defender, 2 reinforcements, one trap per trap gadget, which defenders roam (Formula.md §9.1)
- **Intel:** one roll; the winner gets stat buffs for the round, and an ATK win reveals reinforcements, traps or positions (§9.2)
- **ATK plan:** 1–3 groups, each with its own path from a spawn to the site, and where each gadget is spent (§9.3); the briefing shows the plan's expected win rate
- **Both:** playstyle and weapon per operator, one armed active ability, changeable between rounds

Loadout presets are not in the MVP (`LoadoutPresetBonus = 0`).

### Playstyles

Round-only stat modifiers on the six MVP stats. Every playstyle nets +4 stat points, so the choice is a trade-off. `Adaptive` is Flex only.

| Playstyle | Shooting | Awareness | Teamwork | Utility | Decision | Luck |
|---|---:|---:|---:|---:|---:|---:|
| Aggressive | +8 | −2 | −2 | 0 | −1 | +1 |
| Calculated | −3 | +5 | 0 | 0 | +5 | −3 |
| Slow & Steady | −3 | +2 | 0 | 0 | +5 | 0 |
| Opportunistic | +4 | 0 | −6 | 0 | +2 | +4 |
| Team-first | −4 | −1 | +6 | +4 | −1 | 0 |
| Adaptive | +1 | +1 | +1 | 0 | +1 | 0 |

### Round resolution

Round v2: planning → intel → plan → steps (Formula.md §2, worked example in §10):

| Phase | Steps | What happens |
|---|---|---|
| Planning | 0 | DEF setup, intel roll, ATK plan; no fights (§8, §9) |
| Entry | 1–2 | groups leave their spawns, traps spring, first contact |
| Main | 3–8 | groups advance one zone per step and fight wherever they meet defenders; lost fights reroute; roamers rotate (§10, §23.1) |
| Cleanup | from 9 | fatigue, Gunfight or Clutch only (§11) |
| Post-plant | up to 2 | every defender converges on the site to defuse (§23.1) |

Each fight picks one situation (Breach, Utility, Reposition, Gunfight, Objective, Clutch) by fixed rules (Formula.md §10.1). A round ends on elimination, defuse, detonation or time out after step 12 (§24).

---

## Maps

All matches take place in buildings. Three single-floor maps, each a graph of 15–16 zones drawn as a top-down floor plan, with 2–3 spawns, one site and at least three independent ways in plus a flank ([[Game Design/Game modes and maps]]). Zone type affects role performance and gadget effectiveness.

| Map      | Character                                 |
| -------- | ----------------------------------------- |
| Meridian Office Tower | Long corridors, open floor, glass partitions |
| St. Mora Hospital | Open reception, long wards, narrow service tunnels |
| Ironfield Factory | Loading bay, machinery cover, catwalk connector |

School and Mall are retired for now.

**Zone types:** Exterior · Entry · Hallway · Stairs · Rotation · Power · Site
**Zone statuses:** every zone has its own: −2 reinforced / −1 DEF control / 0 contested / +1 ATK-held. See Formula.md §14, §23.1.

---

## Items

6 quality tiers:

| Tier | Name | How to get |
|------|------|------------|
| 1 | Standard | Starting gear, always available |
| 2 | Advanced | Auction, match prizes |
| 3 | Professional | Auction, market, missions |
| 4 | Custom | Crafted at base – requires facilities + org level + sponsor standing |
| 5 | Unique | Operator-specific – upgraded at base only, non-transferable |
| 6 | Sponsor Exclusive | Major sponsor rewards – unsellable, identity-based |

**Categories:** Primary weapons (SMG/DMR/AR/Bolt-action/Shotgun) · Secondary weapons · Armor (Light/Medium/Heavy) · Gadgets · Gun accessories *(later)*

---

## Economy

**Income:** Match winnings · Sponsor deals · Side mission payouts · Fanbase revenue  
**Expenses:** Salaries · Gear · Base upgrades · Staff · Recruitment

**Auction system:** All items and operators use demand-based bidding. Demand level determines AI aggression. Player decides how much to commit without seeing others' bids – higher bid = lower risk of losing, higher budget impact.

---

## Recruitment

| Method | Description |
|--------|-------------|
| Scout Assignment | Send Scout with requirements, wait, receive targeted candidate. Slow but predictable. |
| Operator Auction | Random operators listed at intervals. Demand-based bidding against AI. Fast but unpredictable. |
| Sponsor Market | Curated higher-quality operators with sponsor affiliation. Major sponsor exclusivity rules apply. |

---

## Sponsors

**Major (Top 5):** Exclusive, high rewards, strict playstyle demands, rival operator restrictions.  
**Minor / independent:** Stackable, flexible, no exclusivity.

Each sponsor wants a specific playstyle (aggressive / tactical / entertainment / results / development). Meeting their objectives builds standing and unlocks better rewards. Failing risks losing the deal.

---

## Progression

| System | Content |
|--------|--------|
| Squad | Operator leveling, stat growth, trait unlocks, aging/injury |
| Gear | Tiers 1–6, crafting, auction, sponsor rewards |
| Base | Training room · Shooting range · Tactical sim · Medical bay · Intel room · Armory · R&D Wing |
| Staff | Head coach · Analyst · Quartermaster · Medic · Scout · Psychologist – all provide preparation bonuses |
| Sponsors | Income, gear discounts, training bonuses, seasonal objectives, exclusive items |

---

## Campaign & Side Missions

**Campaign:** League system → divisions → seasons → tournaments → prestige / fanbase  
**Side missions:** Special operations · VIP rescue · Anti-terror ops · Raids · Training sims · Challenges  
→ Used for grinding, testing builds, earning unique rewards, expanding the game's world beyond the league.

---

## Document index

| Topic | File |
|-------|------|
| Operator design vision | [[Operators/mano vizija]] |
| Stats | [[Operators/Stats]] |
| Roles | [[Operators/Role system]] |
| Gadgets | [[Operators/Gadgets]] |
| Traits | [[Operators/Traits]] |
| Combat system & playstyles | [[Game Design/Combat system]] |
| Maps & game modes | [[Game Design/Game modes and maps]] |
| Items & crafting | [[Game Design/Items]] |
| Economy & auctions | [[Game Design/Economy]] |
| Recruitment | [[Game Design/Recruitment system]] |
| Sponsors | [[Game Design/Sponsors]] |
| Progression | [[Progression/Progression]] |
| Campaign & side missions | [[Progression/Campaign & side missions]] |
| Roadmap | [[Roadmap/Roadmap]] |