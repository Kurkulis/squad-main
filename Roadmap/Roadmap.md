# 🗺️ Development Roadmap

> Goal: build a working tactical squad management web game.  
> Priority – working MVP first, perfect design second.

---

## 🔴 Phase 1 – Core Design *(done for the MVP)*
**Goal:** Complete all game design documentation before writing any code.

### Systems designed ✅
- [x] Core game concept & gameplay loop
- [x] Operator design vision (role, stats, weapon, gadget, traits)
- [x] Stats system – Combat, Tactical, Hidden stats
- [x] Role system – 5 ATK roles + 5 DEF roles
- [x] Gadget system – role-locked gadgets, full gadget list, MVP simplified set
- [x] Traits – 9 traits with effects and planned expansion
- [x] Combat system – round structure, briefing phase, playstyle system
- [x] Maps – 5 maps designed; round v2 plays 3 of them as zone graphs with top-down floor plans (Meridian Office Tower, St. Mora Hospital, Ironfield Factory); School and Mall retired for now
- [x] Zone control system – zone types, a status per zone (reinforced / DEF / contested / ATK), role/gadget modifiers per zone
- [x] Game modes – Bomb/Plant, Hostage
- [x] Item system – 6 quality tiers, weapon/armor/gadget categories, crafting system
- [x] Economy – income/expenses, auction & bidding system, demand levels
- [x] Recruitment system – Scout assignment, Operator auction, Sponsor market
- [x] Sponsor system – Major vs minor tiers, playstyle demands, conflict matrix
- [x] Progression systems – Squad, Gear, Base, Staff, Sponsors
- [x] Campaign & side missions – league system, special operations

### Still needed before MVP ⬜
- [x] **Round resolution formula** – exact math for how a situation winner is calculated *(see Formula.md — match structure, planning phase, multi-group steps, full formulas, balance results)*
- [x] **Starting roster** – define 10 sample operators (5 ATK + 5 DEF) to use for MVP testing
---

## 🟡 Phase 2 – MVP *(in progress: playable demo in `demo/`)*
**Goal:** A working prototype with the core gameplay loop playable end-to-end.
Current state and how to run it: [[Development notes]]. Work packages and decisions: [[Analysis & Agent Plan]] (v1) and [[Plan v2 - Tactical depth and clarity]] (v2, delivered 2026-10-29).

### 2.1 Tech stack
- [x] Vanilla JS in `demo/`, no build step, no dependencies (decision Q1)
- [x] No backend, no database: the ladder run persists in `localStorage`
- ~~React + TypeScript · Python FastAPI · SQLite · JWT~~ superseded by Q1, never built

### 2.2 Core systems
- [x] Operator data model (stats, role, gadget, weapon, armor, trait; items as `{ class, tier }`; ids)
- [ ] Squad builder (select 5 ATK + 5 DEF operators) — the MVP roster is fixed; opponents are generated
- [x] Round simulator v2 (Formula.md: planning phase with DEF setup, intel reveal and ATK plan; 1–3 groups on their own paths, a fight in every contested zone, sync, reroute, rotation; seeded and replayable)
- [x] Weapons catalog: 3 weapons per class and 2 pistols with stat trade-offs, weapon select per operator
- [x] Stat clarity: stat guide (what each stat buys, situation shares), playstyle advisor on each card
- [x] No dominant plan: AI templates A/B/C (ATK) and S/P/R (DEF), none above 55% averaged (Formula.md §29, §32)
- [x] Match loop — best-of-7 (first to 4), alternating sides, tiebreak round
- [x] Pre-round planning — DEF setup (positions, reinforcements, traps, roam) or ATK plan (groups, paths, gadget placement) on the floor plan, plan odds, playstyle and weapon per operator; loadout presets not implemented
- [x] Post-round breakdown — step playback, narrative line, kill feed, "why" panel, per-operator score parts
- [x] Traits (9) and item tiers, within the power budget (Q3)
- [x] Opponent archetypes (Balanced, Rush, Tactical, Utility-heavy)
- [x] Ladder-lite — 7 opponents of rising quality, persistent run, no money (Q8)
- [ ] Basic progression save (operator levels, gear) — only the ladder run is saved; no levels or gear rewards
- [x] Active abilities, one per operator, armed once per match

### 2.3 UI screens
- [x] Squad management — operator cards with stat bars and playstyle select, table view toggle
- [x] Match prep (planning) — DEF setup or ATK plan on the clickable floor plan, with gadget placement and intel reveal
- [x] Round result (step-by-step playback on the floor plan and breakdown)
- [ ] Check the v2 UI in a real browser (built and tested in Node only)
- [x] Operator profile — cards show stats (base and effective), gadget, items with tier, trait, match stats; no history across matches
- [x] Ladder and Simulator tabs

---

## 🟢 Phase 3 – Progression & Content *(not started)*
**Goal:** Full progression loop – a reason to keep playing.

- [ ] Operator leveling and stat growth
- [ ] Gear system (auction, tiers 1–3)
- [ ] Base building (rooms, upgrades)
- [ ] Staff hiring (coach, analyst, medic, scout, quartermaster, psychologist)
- [ ] Sponsor deals (major + minor, objectives, tradeoffs)
- [ ] Crafting system (Tier 4 Custom items)
- [ ] Side missions (special operations, VIP rescue, raids)
- [ ] Injury and fatigue system
- [ ] Base layout – which rooms exist at start vs must be built, upgrade costs
- [ ] Season structure – how long is a season, how many matches, when do sponsors pay

---

## 🔵 Phase 4 – Campaign & Meta *(not started)*
**Goal:** Long-term game with replayability.

- [ ] League system with divisions
- [ ] Seasons and season progression
- [ ] AI opponent teams with roster + stats *(MVP: generated squads by quality and archetype)*
- [ ] Tournament mode
- [ ] Prestige / fanbase / reputation system
- [ ] Recruitment system (Scout, Auction, Sponsor market)
- [ ] Tier 5 Unique items (operator-specific upgrades)
- [ ] Tier 6 Sponsor Exclusive items

---

## 🟣 Phase 5 – Polish & Launch *(not started)*

- [ ] Full game balancing pass
- [ ] Onboarding and tutorial
- [x] Traits system implementation *(9 passive traits in the MVP demo; 1–2 per operator and unlocks later)*
- [ ] Gun accessories (sights, mags, foregrips, etc.)
- [ ] Mobile-friendly UI
- [ ] Public hosting

---

## ❓ Open questions

| Question | Status |
|----------|--------|
| PvP against other players or AI only? | ❓ (MVP: AI only, generated opponents) |
| Are maps visual or text/data only? | ✅ Top-down floor plans of a zone graph, whole map visible (Plan v2; Q9 superseded) |
| Exact round resolution formula? | ✅ Formula.md |
| Real-time elements or fully turn-based? | ✅ Fully simulated; steps play back at ≈ 0.8 s with speed and skip (Q9) |
| Tech stack? | ✅ Vanilla JS demo, no backend (Q1) |
| Stat scale? | ✅ 0–100 permanently, every bonus in stat points (Q2) |
| Item power budget? | ✅ Fully equipped vs bare squad +7 to +13 round-win points (Q3) |
| DEF decision in the briefing? | ✅ DEF setup each round: positions, 2 reinforcements, traps, roamers (Plan v2; Q4 superseded) |
| Playstyle balance? | ✅ Zero-sum, every playstyle nets +4 (Q5) |
| Route imbalance? | ✅ Routes retired; no ATK or DEF plan may win 55% or more on average, and the plan's odds are shown (Plan v2 §2.6; Q6 superseded) |
| Skills? | ✅ 9 passive traits now, one active ability per operator later (Q7) |
| Progression in the MVP? | ✅ Ladder-lite, no money (Q8) |
| Operator presentation? | ✅ Cards with role icon, side colour, stat bars; no portraits (Q10) |
| Opponent variety? | ✅ Four archetypes (Q11) |
| Upset rate? | ✅ `randomRange` 16 since round v2, `zoneControlBonus` 3 (Q12) |
| Should the ladder ever hand out items? | ❓ decide after ladder-lite is played |
| Hostage mode? | ❓ later |
| Monetization model? | ❓ |
| Starting budget amount? | ❓ |
| How often does the auction refresh? | ❓ |
| Can operators be sold / released? | ❓ |
| Can you switch major sponsors mid-season? | ❓ |

---

## 📌 Immediate next steps

1. ~~Write the **round resolution formula**~~ ✅ Done (Formula.md)
2. ~~Define **10 starting operators**~~ ✅ Done (MVP draft.md)
3. ~~Decide **tech stack**~~ ✅ Done (vanilla JS demo, no backend — Q1; the React+TS · FastAPI plan is superseded)
4. ~~**Start Phase 2**~~ ✅ Playable demo in `demo/` — see [[Development notes]] and [[Analysis & Agent Plan]]
5. Round v2 follow-ups (Plan v2 status): check the UI in a real browser; make weapon and playstyle choices matter more (swaps are nearly neutral); strengthen the Rush archetype (its R defence is the weakest); break lone-defender stalemates (Hospital A vs P ends 29.6% by time out); narrate crowding, pinch and waiting
6. Sketch **base starting state** (what rooms exist on day 1) — moved to Phase 3
7. Define **season length and match structure** — moved to Phase 3
