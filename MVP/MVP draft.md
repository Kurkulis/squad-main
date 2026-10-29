# 10 Starting Operators (MVP Test Roster)

> 5 ATK + 5 DEF operatoriai MVP testavimui.
> Statai pagal MVP stat set: **Shooting, Awareness, Teamwork, Utility Handling, Decision Making, Luck** (0–100 skalė).
> Kiekvienas turi 1 MVP gadgetą (pagal role), ginklą, šarvus, trait'ą ir default playstyle.
> In `demo/data.js` (`ROSTER`) every item is an object `{ class, tier }` (gadget, primary, secondary, armor), all tier 1; each operator has an `id` (`r01`–`r10`), a `trait` and an `active` slot for the role's active ability (WP8, in progress: no effect unless armed for the round).

---

## 🔴 ATK Operators

---

### 1. "Breach" — Entry

> Agresyvus CQB specialistas. Pirmas pro duris, pirmas į kontaktą. Pasitiki greičiu ir šūvių tikslumu. Šaltakraujiškas spaudimo situacijose.

| Stat | Value |
|------|------:|
| Shooting | 78 |
| Awareness | 52 |
| Teamwork | 45 |
| Utility Handling | 48 |
| Decision Making | 55 |
| Luck | 60 |

| | |
|---|---|
| **Side** | ATK |
| **Role** | Entry |
| **Gadget** | Breaching Charge |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | SMG |
| **Secondary weapon** | Pistol |
| **Armor** | Light |
| **Loadout preset** | Default |
| **Trait** | Cold Blooded |
| **Default playstyle** | Aggressive |

---

### 2. "Haze" — Second Entry

> Seka paskui Entry, išnaudoja chaosą. Dūmų granata uždengia judėjimą, o pats tradina killus iš antro plano. Stiprus Shooting ir Decision Making.

| Stat | Value |
|------|------:|
| Shooting | 72 |
| Awareness | 50 |
| Teamwork | 48 |
| Utility Handling | 45 |
| Decision Making | 62 |
| Luck | 55 |

| | |
|---|---|
| **Side** | ATK |
| **Role** | Second Entry |
| **Gadget** | Smoke Grenade |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | AR |
| **Secondary weapon** | Pistol |
| **Armor** | Medium |
| **Loadout preset** | Default |
| **Trait** | Tunnel Vision |
| **Default playstyle** | Aggressive |

---

### 3. "Watcher" — Support

> Komandos akys ir ausys. Dronas visada ore, info visada yra. Remiasi Teamwork ir Awareness, o ne tiesiogine ugnimi. Kelia visos komandos efektyvumą.

| Stat | Value |
|------|------:|
| Shooting | 45 |
| Awareness | 72 |
| Teamwork | 75 |
| Utility Handling | 68 |
| Decision Making | 62 |
| Luck | 48 |

| | |
|---|---|
| **Side** | ATK |
| **Role** | Support |
| **Gadget** | Drone |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | AR |
| **Secondary weapon** | Pistol |
| **Armor** | Medium |
| **Loadout preset** | Default |
| **Trait** | Shot Caller |
| **Default playstyle** | Team-first |

---

### 4. "Volt" — Utility Specialist

> Anti-gadget ekspertas. EMP granata išjungia DEF elektroninę apsaugą, atverdamas kelią komandai. Dominuoja Utility ir Decision Making statuose.

| Stat | Value |
|------|------:|
| Shooting | 50 |
| Awareness | 65 |
| Teamwork | 55 |
| Utility Handling | 80 |
| Decision Making | 70 |
| Luck | 45 |

| | |
|---|---|
| **Side** | ATK |
| **Role** | Utility Specialist |
| **Gadget** | EMP Grenade |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | AR |
| **Secondary weapon** | Pistol |
| **Armor** | Light |
| **Loadout preset** | Default |
| **Trait** | Drone Expert |
| **Default playstyle** | Calculated |

---

### 5. "Mirage" — Flex

> Universalus operatorius, prisitaikantis prie bet kokios situacijos. Nėra geriausias niekur, bet nėra ir silpniausia grandis. Nestabilus – kartais dominuoja, kartais pralošia.

| Stat | Value |
|------|------:|
| Shooting | 62 |
| Awareness | 60 |
| Teamwork | 58 |
| Utility Handling | 55 |
| Decision Making | 62 |
| Luck | 58 |

| | |
|---|---|
| **Side** | ATK |
| **Role** | Flex |
| **Gadget** | Scout Drone |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | AR |
| **Secondary weapon** | Pistol |
| **Armor** | Medium |
| **Loadout preset** | Default |
| **Trait** | Unstable |
| **Default playstyle** | Adaptive |

---

## 🔵 DEF Operators

---

### 6. "Fortress" — Anchor

> Neišjudinamas site'o sargas. Sustiprina sienas, laiko poziciją, neleidžia ATK prasibrauti. Veteranas, kurio patirtis sumažina spaudimo efektą.

| Stat | Value |
|------|------:|
| Shooting | 70 |
| Awareness | 58 |
| Teamwork | 52 |
| Utility Handling | 55 |
| Decision Making | 72 |
| Luck | 50 |

| | |
|---|---|
| **Side** | DEF |
| **Role** | Anchor |
| **Gadget** | Reinforcement Panel |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | DMR |
| **Secondary weapon** | Pistol |
| **Armor** | Heavy |
| **Loadout preset** | Default |
| **Trait** | Veteran |
| **Default playstyle** | Slow & Steady |

---

### 7. "Jackal" — Roamer

> Agresyvus judantis gynėjas. Nelieka vietoje – judėjimas ir informacija yra jo ginklai. Proximity Alarm įspėja apie ATK pozicijas, o pats kerta iš netikėtų kampų.

| Stat | Value |
|------|------:|
| Shooting | 75 |
| Awareness | 68 |
| Teamwork | 40 |
| Utility Handling | 42 |
| Decision Making | 55 |
| Luck | 58 |

| | |
|---|---|
| **Side** | DEF |
| **Role** | Roamer |
| **Gadget** | Proximity Alarm |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | SMG |
| **Secondary weapon** | Pistol |
| **Armor** | Light |
| **Loadout preset** | Default |
| **Trait** | Aggressive |
| **Default playstyle** | Aggressive |

---

### 8. "Shade" — Lurker

> Tylus ir kantrus. Laukia kol ATK praeina, tada kerta iš užnugario. Flank Wire trap'as praneša ir sulėtina priešus, o pats pasirenka idealų momentą atakuoti.

| Stat | Value |
|------|------:|
| Shooting | 65 |
| Awareness | 72 |
| Teamwork | 42 |
| Utility Handling | 48 |
| Decision Making | 66 |
| Luck | 52 |

| | |
|---|---|
| **Side** | DEF |
| **Role** | Lurker |
| **Gadget** | Flank Wire |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | SMG |
| **Secondary weapon** | Pistol |
| **Armor** | Light |
| **Loadout preset** | Default |
| **Trait** | Cold Blooded |
| **Default playstyle** | Opportunistic |

---

### 9. "Wire" — Trap Specialist

> Kontroliuoja erdvę ir praėjimus. Barbed Wire verčia ATK eiti norima kryptimi ir sukelia garsą. Utility Handling aukščiausia komandoje – trap'ai visada efektyvūs.

| Stat | Value |
|------|------:|
| Shooting | 48 |
| Awareness | 58 |
| Teamwork | 52 |
| Utility Handling | 78 |
| Decision Making | 68 |
| Luck | 45 |

| | |
|---|---|
| **Side** | DEF |
| **Role** | Trap Specialist |
| **Gadget** | Barbed Wire |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | Shotgun |
| **Secondary weapon** | Pistol |
| **Armor** | Medium |
| **Loadout preset** | Default |
| **Trait** | Fortifier |
| **Default playstyle** | Slow & Steady |

---

### 10. "Lens" — Support Defender

> DEF pusės informacinis centras. Camera Network padengia visą map'ą, o patsai koordinuoja komandos veiksmus. Silpniausias asmeniniuose fight'uose, bet stipriausias komandinio efekto.

| Stat | Value |
|------|------:|
| Shooting | 42 |
| Awareness | 70 |
| Teamwork | 75 |
| Utility Handling | 70 |
| Decision Making | 62 |
| Luck | 48 |

| | |
|---|---|
| **Side** | DEF |
| **Role** | Support Defender |
| **Gadget** | Camera Network |
| **Gadget tier** | 1 (Standard) |
| **Primary weapon** | AR |
| **Secondary weapon** | Pistol |
| **Armor** | Medium |
| **Loadout preset** | Default |
| **Trait** | Shot Caller |
| **Default playstyle** | Team-first |

---

## 📊 Suvestinė

### ATK Squad

| # | Callsign | Role | Shooting | Awareness | Teamwork | Utility | Decision | Luck | Total |
|---|----------|------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | Entry | 78 | 52 | 45 | 48 | 55 | 60 | 338 |
| 2 | Haze | Second Entry | 72 | 50 | 48 | 45 | 62 | 55 | 332 |
| 3 | Watcher | Support | 45 | 72 | 75 | 68 | 62 | 48 | 370 |
| 4 | Volt | Utility Specialist | 50 | 65 | 55 | 80 | 70 | 45 | 365 |
| 5 | Mirage | Flex | 62 | 60 | 58 | 55 | 62 | 58 | 355 |
| | **ATK Average** | | **61.4** | **59.8** | **56.2** | **59.2** | **62.2** | **53.2** | **352** |

### DEF Squad

| # | Callsign | Role | Shooting | Awareness | Teamwork | Utility | Decision | Luck | Total |
|---|----------|------|---:|---:|---:|---:|---:|---:|---:|
| 6 | Fortress | Anchor | 70 | 58 | 52 | 55 | 72 | 50 | 357 |
| 7 | Jackal | Roamer | 75 | 68 | 40 | 42 | 55 | 58 | 338 |
| 8 | Shade | Lurker | 65 | 72 | 42 | 48 | 66 | 52 | 345 |
| 9 | Wire | Trap Specialist | 48 | 58 | 52 | 78 | 68 | 45 | 349 |
| 10 | Lens | Support Defender | 42 | 70 | 75 | 70 | 62 | 48 | 367 |
| | **DEF Average** | | **60.0** | **65.2** | **52.2** | **58.6** | **64.6** | **50.6** | **351.2** |

---

## 🎯 Dizaino principai

1. **Stat fokusas atitinka role** — Entry/Second Entry/Roamer turi aukščiausius Shooting; Support/Support Defender — aukščiausius Teamwork; Utility Specialist/Trap Specialist — aukščiausius Utility Handling
2. **Stat totalai balansuoti** — nuo 332 iki 370. Kovinės rolės turi mažesnius totalus, bet ryškesnius peak'us
3. **Trait'ai atitinka role** — pagal Traits.md rekomendacijas (Cold Blooded → Entry/Lurker, Shot Caller → Support, Fortifier → Trap Specialist, ir t.t.)
4. **Playstyle'ai atitinka role** — Aggressive Entry/Roamer, Calculated Utility Specialist, Adaptive tik Flex, Team-first Support operatoriams
5. **MVP gadgetai** — po 1 gadgetą per role, pagal Gadgets.md simplified MVP lentelę
6. **Ginklai atitinka role logiką** — SMG/Shotgun CQB rolėms (Entry, Roamer, Lurker), AR universalioms, DMR Anchor'ui (kampų laikymas)
7. **Šarvai pagal mobilumą** — Light agresyvioms/mobiloms rolėms, Heavy Anchor'ui, Medium visa kita

---

## 📐 Effective Stats (Base + Playstyle)

> Pagal Formula.md Section 7. Tai yra tikrasis stat'as, kurį formulė naudoja skaičiuodama `OperatorScore`.
> Generated from `demo/data.js` with `Engine.effectiveStats({ ...op, trait: null })`, the same values `demo/engine.test.js` checks (`mvpDraftBaseSituationScores`). Shown: base + playstyle (+ item tier stats, 0 at tier 1). Not shown: traits (e.g. Haze's Tunnel Vision `sh +3, aw −3`, Shot Caller `tw +2` for the whole side), intel and fatigue, which apply during the round (Formula.md §4). Every playstyle nets +4.

### ATK Effective Stats

| # | Callsign | Playstyle | Shooting | Awareness | Teamwork | Utility | Decision | Luck | ES Total |
|---|----------|-----------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | Aggressive (+8Sh, -2Aw, -2Tw, -1Dc, +1Lk) | 86 | 50 | 43 | 48 | 54 | 61 | 342 |
| 2 | Haze | Aggressive (+8Sh, -2Aw, -2Tw, -1Dc, +1Lk) | 80 | 48 | 46 | 45 | 61 | 56 | 336 |
| 3 | Watcher | Team-first (-4Sh, -1Aw, +6Tw, +4Ut, -1Dc) | 41 | 71 | 81 | 72 | 61 | 48 | 374 |
| 4 | Volt | Calculated (-3Sh, +5Aw, +5Dc, -3Lk) | 47 | 70 | 55 | 80 | 75 | 42 | 369 |
| 5 | Mirage | Adaptive (+1Sh, +1Aw, +1Tw, +1Dc) | 63 | 61 | 59 | 55 | 63 | 58 | 359 |

### DEF Effective Stats

| # | Callsign | Playstyle | Shooting | Awareness | Teamwork | Utility | Decision | Luck | ES Total |
|---|----------|-----------|---:|---:|---:|---:|---:|---:|---:|
| 6 | Fortress | Slow & Steady (-3Sh, +2Aw, +5Dc) | 67 | 60 | 52 | 55 | 77 | 50 | 361 |
| 7 | Jackal | Aggressive (+8Sh, -2Aw, -2Tw, -1Dc, +1Lk) | 83 | 66 | 38 | 42 | 54 | 59 | 342 |
| 8 | Shade | Opportunistic (+4Sh, -6Tw, +2Dc, +4Lk) | 69 | 72 | 36 | 48 | 68 | 56 | 349 |
| 9 | Wire | Slow & Steady (-3Sh, +2Aw, +5Dc) | 45 | 60 | 52 | 78 | 73 | 45 | 353 |
| 10 | Lens | Team-first (-4Sh, -1Aw, +6Tw, +4Ut, -1Dc) | 38 | 69 | 81 | 74 | 61 | 48 | 371 |

---

## 🔫 Gear Fit Reference (Formula.md Section 16)

> Weapon class ir Armor fit bonusai/penalty pagal zoną ir situaciją.

### Weapon Class Fit (per operator)

| # | Callsign | Weapon class | Strong zones (+6) | Weak zones (-6) | Neutral (+4/+2) |
|---|----------|---|---|---|---|
| 1 | Breach | SMG | Entry, Hallway, Stairs | Exterior, Power position | — |
| 2 | Haze | AR | Entry, Hallway, Rotation, Site (+4) | — | — |
| 3 | Watcher | AR | Entry, Hallway, Rotation, Site (+4) | — | — |
| 4 | Volt | AR | Entry, Hallway, Rotation, Site (+4) | — | — |
| 5 | Mirage | AR | Entry, Hallway, Rotation, Site (+4) | — | — |
| 6 | Fortress | DMR | Exterior, Power position, Open site | Hallway, Stairs | — |
| 7 | Jackal | SMG | Entry, Hallway, Stairs | Exterior, Power position | — |
| 8 | Shade | SMG | Entry, Hallway, Stairs | Exterior, Power position | — |
| 9 | Wire | Shotgun | Entry, Hallway, Stairs | Exterior, Power position | — |
| 10 | Lens | AR | Entry, Hallway, Rotation, Site (+4) | — | — |

> Visi operatoriai turi Pistol kaip secondary → visur +2, jokio penalty.

### Armor Fit (per operator)

| # | Callsign | Armor | Strong situations (+4) | Weak situations (-2 / -3) |
|---|----------|---|---|---|
| 1 | Breach | Light | Reposition, flank-heavy | Site hold, Objective (-2) |
| 2 | Haze | Medium | All-round (+2) | — |
| 3 | Watcher | Medium | All-round (+2) | — |
| 4 | Volt | Light | Reposition, flank-heavy | Site hold, Objective (-2) |
| 5 | Mirage | Medium | All-round (+2) | — |
| 6 | Fortress | Heavy | Gunfight, Objective, Site hold | Breach (-3), Reposition (-3) |
| 7 | Jackal | Light | Reposition, flank-heavy | Site hold, Objective (-2) |
| 8 | Shade | Light | Reposition, flank-heavy | Site hold, Objective (-2) |
| 9 | Wire | Medium | All-round (+2) | — |
| 10 | Lens | Medium | All-round (+2) | — |

---

## 🎯 Phase II Engagement Roles (Formula.md Section 9)

> Kurie operatoriai tiesiogiai dalyvauja Entry fazėje (step 2). Kiti prisijungia tik Phase III.
> `ENTRY_SETUPS` in `demo/data.js`. ATK always uses one line-up; DEF picks hold the breach (`breach`) or hold the site (`site`) before each round. Opponents pick by archetype: Rush `breach`, Tactical `site`, others at random.

| Line-up | Fight (scored, can kill and die) | Gadget support only | Not engaged |
|---|---|---|---|
| ATK | **Breach** (Entry), **Haze** (Second Entry) | **Volt** (Utility Specialist) | Watcher (Support), Mirage (Flex) |
| DEF `breach` | **Fortress** (Anchor), **Wire** (Trap Specialist) | **Lens** (Support Defender) | Jackal (Roamer), Shade (Lurker) |
| DEF `site` | **Jackal** (Roamer), **Wire** (Trap Specialist) | **Lens** (Support Defender) | Fortress (Anchor), Shade (Lurker) |

---

## 📡 Intel Phase Reference (Formula.md Section 8)

> Intel role multiplieriai ir gadget intel bonusai šiam rosteriui.

### ATK Intel Contributors

| Callsign | Role | Intel mult | Gadget intel bonus |
|----------|------|---:|---:|
| Breach | Entry | 0.85 | 0 (Breaching Charge) |
| Haze | Second Entry | 0.90 | 0 (Smoke Grenade) |
| Watcher | Support | **1.25** | **+8** (Drone) |
| Volt | Utility Specialist | **1.15** | +2 (EMP Grenade) |
| Mirage | Flex | 1.05 | +5 (Scout Drone) |
| | | | **ATK gadget total: +15** |

### DEF Intel Contributors

| Callsign | Role | Intel mult | Gadget intel bonus |
|----------|------|---:|---:|
| Fortress | Anchor | 1.00 | 0 (Reinforcement Panel) |
| Jackal | Roamer | 1.10 | +5 (Proximity Alarm) |
| Shade | Lurker | 1.10 | +4 (Flank Wire) |
| Wire | Trap Specialist | 1.05 | 0 (Barbed Wire) |
| Lens | Support Defender | **1.20** | **+8** (Camera Network) |
| | | | **DEF gadget total: +17** |

> Gadget intel bonus is the gadget's Info value × the tier multiplier (× 1.00 at tier 1). Volt's Drone Expert trait adds +4 more in the intel step.

---

## 🧬 Traits (implemented)

> One trait per operator, `TRAITS` in `demo/data.js`, applied by the `trait` contributor (Formula.md §19.1).

| Trait | Effect | When | This roster |
|---|---|---|---|
| Cold Blooded | Shooting +3, Decision +2 | Clutch situation | Breach, Shade |
| Tunnel Vision | Shooting +3, Awareness −3 | always | Haze |
| Shot Caller | Teamwork +2 for every alive teammate (owner included) | while alive, every step incl. intel | Watcher, Lens |
| Breacher | Utility +3, Shooting +2 | Breach situation | — |
| Aggressive | Shooting +4, casualty risk × 1.5 | Entry phase | Jackal (only fights the Entry step when DEF holds the site) |
| Unstable | all stats ± the same roll, −6 to +6 | every step incl. intel | Mirage |
| Veteran | all stats +3 (cancels fatigue) | step ≥ 9 (`cleanupFrom`) | Fortress |
| Drone Expert | +4 flat | intel step | Volt |
| Fortifier | Utility +3 | DEF in Objective or Utility | Wire |

---

## ⚠️ Loadout Preset (Formula.md Section 16.3)

> Formula naudoja `LoadoutPresetBonus(o, t)` kaip dalį `GearFitBonus`. MVP versijoje loadout preset sistema dar nesukurta.

$$
LoadoutPresetBonus = 0 \quad \text{(MVP default — jokio bonus/penalty)}
$$

Visi operatoriai turi `Loadout preset: Default`. Kai loadout sistema bus sukurta, kiekvienas preset'as turės savo bonusus per situaciją.

---

## 🎯 Gadget Situation Bonuses per Operator (Formula.md Section 15.1)

> Kiekvieno operatoriaus gadget'o bonus per situacijos tipą. Tai yra `PhaseGadgetBonus(o, t)` dalis formulėje.
> Tier is a multiplier on these values: `GADGET_TIER_MULT` × 1.00 / 1.03 / 1.06 / 1.09 / 1.12 / 1.15 for tiers 1–6 (all MVP operators tier 1, so × 1.00). `GadgetSpaceMult` is 0.90 / 1.00 / 1.10 by the zone's space type (Formula.md §15.2).

| # | Callsign | Gadget | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|--------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | Breaching Charge | 0 | **+8** | 0 | 0 | 0 | +4 | 0 |
| 2 | Haze | Smoke Grenade | 0 | +4 | +4 | +2 | +2 | **+6** | +2 |
| 3 | Watcher | Drone | **+8** | +2 | 0 | +2 | 0 | +2 | 0 |
| 4 | Volt | EMP Grenade | +2 | +6 | **+8** | 0 | 0 | +4 | 0 |
| 5 | Mirage | Scout Drone | +5 | +1 | 0 | +2 | 0 | +1 | 0 |
| 6 | Fortress | Reinforcement Panel | 0 | +6 | +2 | 0 | 0 | **+8** | 0 |
| 7 | Jackal | Proximity Alarm | +5 | +1 | +1 | +4 | 0 | +2 | +1 |
| 8 | Shade | Flank Wire | +4 | 0 | +3 | **+5** | 0 | +2 | +2 |
| 9 | Wire | Barbed Wire | 0 | +5 | **+7** | +2 | 0 | +4 | 0 |
| 10 | Lens | Camera Network | **+8** | +2 | +2 | +1 | 0 | +4 | 0 |

---

## 🔄 Role × Situation Multipliers per Operator (Formula.md Section 13)

> `RoleMult(o, t)` — role fit bonus/penalty kiekvienoje situacijoje. Daugiklis taikomas ant `BaseSituationScore`.

| # | Callsign | Role | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | Entry | 0.95 | **1.20** | 0.95 | 1.05 | **1.15** | 0.95 | 1.10 |
| 2 | Haze | Second Entry | 0.95 | **1.15** | 1.00 | 1.05 | **1.10** | 1.00 | 1.10 |
| 3 | Watcher | Support | **1.15** | 0.95 | 1.10 | 1.00 | 0.95 | **1.15** | 0.95 |
| 4 | Volt | Utility Specialist | 1.10 | 1.10 | **1.20** | 1.00 | 1.00 | **1.15** | 0.95 |
| 5 | Mirage | Flex | 1.00 | 1.00 | 1.00 | **1.15** | 1.00 | 1.10 | 1.10 |
| 6 | Fortress | Anchor | 1.00 | 1.10 | 1.00 | 0.90 | **1.10** | **1.20** | 1.10 |
| 7 | Jackal | Roamer | 1.10 | 1.00 | 0.95 | **1.15** | **1.15** | 0.90 | 1.00 |
| 8 | Shade | Lurker | 1.10 | 0.95 | 1.00 | **1.15** | 1.05 | 0.95 | **1.15** |
| 9 | Wire | Trap Specialist | 1.00 | 1.10 | **1.20** | 0.95 | 1.00 | 1.05 | 0.95 |
| 10 | Lens | Support Defender | **1.15** | 1.00 | **1.15** | 0.95 | 0.95 | **1.15** | 0.95 |

---

## 📊 BaseSituationScore per Operator (Formula.md Section 12)

> `BaseSituationScore(o, t) = Σ W(t,s) × ES(o,s)` — svertinė statų suma pagal situacijos tipą.
> Naudojami **Effective Stats** (su playstyle bonusais). Tai yra skaičius **prieš** RoleMult ir GadgetBonus.

### ATK

| # | Callsign | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | 51.50 | 61.60 | 51.90 | 54.20 | **67.20** | 52.80 | **66.75** |
| 2 | Haze | 51.05 | 60.20 | 50.80 | 54.70 | **64.95** | 53.10 | **64.10** |
| 3 | Watcher | **68.55** | 58.90 | 67.15 | 65.25 | 54.70 | **67.55** | 53.45 |
| 4 | Volt | **67.95** | 61.80 | **69.80** | 63.65 | 56.10 | 65.55 | 55.70 |
| 5 | Mirage | 59.75 | 60.30 | 58.20 | 60.70 | **61.70** | 59.75 | **61.10** |

### DEF

| # | Callsign | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|---:|---:|---:|---:|---:|---:|---:|
| 6 | Fortress | 60.20 | **62.70** | 58.85 | 62.10 | **63.90** | 60.60 | **62.70** |
| 7 | Jackal | 55.70 | 60.40 | 50.75 | 57.20 | **68.35** | 53.15 | **67.00** |
| 8 | Shade | 60.25 | 60.30 | 55.25 | 60.70 | **64.85** | 56.30 | **64.00** |
| 9 | Wire | **62.85** | 59.40 | **67.00** | 59.55 | 52.90 | 61.95 | 53.45 |
| 10 | Lens | **68.00** | 58.20 | **67.60** | 64.45 | 52.95 | 67.25 | 52.05 |

---

## 📊 BaseSituationScore × RoleMult per Operator

> Galutinis skaičius **prieš** GadgetBonus ir GearFitBonus pridėjimą.
> `BaseSituationScore(o,t) × RoleMult(o,t)` — tai pagrindinis `OperatorScore` komponentas.

### ATK

| # | Callsign | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|---:|---:|---:|---:|---:|---:|---:|
| 1 | Breach | 48.92 | **73.92** | 49.30 | 56.91 | **77.28** | 50.16 | 73.43 |
| 2 | Haze | 48.50 | 69.23 | 50.80 | 57.44 | **71.45** | 53.10 | **70.51** |
| 3 | Watcher | **78.83** | 55.96 | 73.87 | 65.25 | 51.97 | **77.68** | 50.78 |
| 4 | Volt | 74.74 | 67.98 | **83.76** | 63.65 | 56.10 | **75.38** | 52.91 |
| 5 | Mirage | 59.75 | 60.30 | 58.20 | **69.80** | 61.70 | 65.73 | **67.21** |

### DEF

| # | Callsign | Info | Breach | Utility | Reposition | Gunfight | Objective | Clutch |
|---|----------|---:|---:|---:|---:|---:|---:|---:|
| 6 | Fortress | 60.20 | 68.97 | 58.85 | 55.89 | **70.29** | **72.72** | 68.97 |
| 7 | Jackal | 61.27 | 60.40 | 48.21 | 65.78 | **78.60** | 47.84 | **67.00** |
| 8 | Shade | 66.28 | 57.29 | 55.25 | **69.80** | 68.09 | 53.48 | **73.60** |
| 9 | Wire | 62.85 | **65.34** | **80.40** | 56.57 | 52.90 | 65.05 | 50.78 |
| 10 | Lens | **78.20** | 58.20 | **77.74** | 61.23 | 50.30 | 77.34 | 49.45 |

---

## 🚨 Formula Threshold Flags

> Formulė naudoja konkrečius stat threshold'us specialiems efektams. Čia surašyta kurie operatoriai juos atitinka.

### Cleanup Intensity Bonus (Formula.md Section 11)

> Jei operatoriaus **base Luck > 50** → **+2 Shooting, +2 Decision** Phase IV metu (ant fatigue -3).

| # | Callsign | Base Luck | Qualifies? |
|---|----------|---:|---|
| 1 | Breach | 60 | ✅ **Taip** |
| 2 | Haze | 55 | ✅ **Taip** |
| 3 | Watcher | 48 | ❌ Ne |
| 4 | Volt | 45 | ❌ Ne |
| 5 | Mirage | 58 | ✅ **Taip** |
| 6 | Fortress | 50 | ❌ Ne (> 50, ne ≥ 50) |
| 7 | Jackal | 58 | ✅ **Taip** |
| 8 | Shade | 52 | ✅ **Taip** |
| 9 | Wire | 45 | ❌ Ne |
| 10 | Lens | 48 | ❌ Ne |

> ATK: 3/5 qualify | DEF: 2/5 qualify — nedidelis ATK advantage Cleanup fazėje.

### Kill Intel Bonus / Carry-over Awareness (Formula.md Sections 9 & 23.3)

> Not implemented (skipped on purpose, Formula.md §5 and §23.3): worth ≈ 0.2 points against the ±18 random roll.

---

## ✅ Formula Variable Checklist

> Pilnas kintamųjų sąrašas pagal Formula.md ir jų statusas šiame dokumente.

### Per-operator duomenys (Section 3)

| Kintamasis | Statusas | Pastaba |
|---|---|---|
| `Role` | ✅ Apibrėžtas | Kiekvieno operatoriaus profilyje |
| `Side (ATK/DEF)` | ✅ Apibrėžtas | Kiekvieno operatoriaus profilyje |
| `Base stats (6 MVP)` | ✅ Apibrėžtas | Stat lentelės + suvestinė |
| `Selected playstyle` | ✅ Apibrėžtas | Default playstyle per operator |
| `Selected loadout preset` | ✅ Apibrėžtas | `Default` (MVP: bonus = 0) |
| `id` | ✅ Implemented | `r01`–`r10`; generated operators `g<n>` |
| `MVP gadget` | ✅ Apibrėžtas | Role-locked, po 1 per role; object `{ class, tier }` |
| `Gadget tier` | ✅ Implemented | `gadget.tier`, multiplier × 1.00–1.15 (tier 1 = × 1.00) |
| `Weapon class` | ✅ Apibrėžtas | SMG/AR/DMR/Shotgun + Pistol; `primary`, `secondary` as `{ class, tier }` |
| `Weapon tier` | ✅ Implemented | primary tier → Shooting +0/+0/+1/+1/+1/+2; secondary tier no effect yet |
| `Armor type` | ✅ Apibrėžtas | Light/Medium/Heavy; `armor` as `{ class, tier }` |
| `Armor tier` | ✅ Implemented | Awareness and Decision +0/+0/+0/+1/+1/+1 |
| `Trait` | ✅ Implemented | 9 traits, effects in the Traits section above |
| `active` | ⏳ WP8 in progress | role's active ability (`ACTIVES`), no effect unless armed for the round |
| `alive` | 🔄 Runtime | Pradžioje visi alive, keičiasi per round |
| `Intel(o,s)` | 🔄 Runtime | Skaičiuojama Phase I metu, pradžia = 0 |
| `CarryOver(o,s)` | ❌ Not implemented | Skipped on purpose (Formula.md §23.3) |

### Apskaičiuoti duomenys (static, prieš round)

| Kintamasis | Statusas | Pastaba |
|---|---|---|
| `ES(o,s)` — Effective Stats | ✅ Apskaičiuota | Base + Playstyle + item tier stats; traits, team, intel and fatigue at runtime (Formula.md §4) |
| `BaseSituationScore(o,t)` | ✅ Apskaičiuota | Per operator × 7 situacijos |
| `BaseSitScore × RoleMult` | ✅ Apskaičiuota | Pagrindinis OperatorScore komponentas |
| `PhaseGadgetBonus(o,t)` | ✅ Lentelė | Per operator × 7 situacijos |
| `RoleMult(o,t)` | ✅ Lentelė | Per operator × 7 situacijos |
| `WeaponFit(o,z)` | ✅ Reference | Strong/Weak zones per weapon class |
| `ArmorFit(o,t)` | ✅ Reference | Strong/Weak situations per armor |
| `LoadoutPresetBonus(o,t)` | ✅ Apibrėžtas | = 0 (MVP default) |
| `GadgetTierMult(o)` | ✅ Implemented | × 1.00 (Tier 1); replaces the flat `GadgetTierBonus` |
| `IntelRoleMult(role_o)` | ✅ Lentelė | Per operator |
| Cleanup Luck threshold | ✅ Flags | Base Luck > 50 check |
| Awareness > 60 threshold | ❌ Not implemented | Kill intel bonus skipped (Formula.md §5) |

### Runtime / situaciniai kintamieji (ne operator duomenys)

| Kintamasis | Formulės sekcija | Pastaba |
|---|---|---|
| `ZoneRoleMult(o,z)` | Section 14.1 | Priklauso nuo aktyvios zonos tipo |
| `GadgetSpaceMult(o,space)` | Section 15.2 | Priklauso nuo zone space tipo |
| `ZoneControlBonus(side,zc)` | Section 14.2 | `3 × status`, status −1 / 0 / +1 (DEF gets the opposite sign) |
| `NumbersBonus(side)` | Section 17 | `4 × (alive - enemyAlive)` |
| `MomentumBonus(side)` | Section 18 | +2 if the side won the previous step |
| `RandomBonus(side)` | Section 21 | `random(-18, +18)` |
| `TraitAdd`, `team`, `risk` | Section 19.1, 23.4 | trait contributions, see Traits section |
| `defSetup` | Section 9 | DEF line-up `breach` / `site` per round |

> **Visos formulės reikalingos reikšmės dabar yra šiame dokumente arba aiškiai pažymėtos kaip runtime.**
