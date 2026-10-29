# Plan v5 — Smarter rounds, planning QOL, R6 identity (2026-10-29)

Written for the agents that will execute §4, after the designer answers §6.
Status: **ready to launch.** Q1–Q19 answered 2026-10-29; the answers are folded into §3 (drone types in §3.4, the DEV random plan button in §3.4). Nothing implemented yet. Builds on v4.

---

## 1. What the designer asked for

1. **Smarter attackers.** When a team splits over two paths, the group on the shorter path reaches the site first, meets more defenders and dies, while the other group is still stuck on traps, reinforcements or roamers. A group that arrives first should decide by its role and trait: go help teammates, keep rushing, or hold its zone.
2. **Smarter defenders.** A roamer under pressure should get help or fall back to rooms next to teammates. A fight in a room next to the site should be supported by the defenders on the site.
3. **Planning lock-in.** Today the attacker can change the plan, see new answers immediately, and change again until every trap and reinforcement is known. Using intel or a gadget needs a **Lock in** button: it reveals the defender information, and the plan can no longer change.
4. **Planning QOL.** Drag and drop for operators and gadgets on the DEF planning screen (and in planning generally) instead of click-click. A wider page: on desktop the gadget table does not fit today (screenshot: horizontal scrollbar in "Traps and cameras").
5. **Memory.** Changes to the ATK and DEF squads persist locally. A separate **Options** page, like Simulator or Ladder, with a "Reset memory" button.
6. **R6 identity.** The demo becomes a Rainbow Six imitation for now: operator names, icons and portraits from `demo/R6S_Operators`. The player can change an operator's icon and portrait. Weapons and gadgets keep this game's own rules.
7. **Armory page.** A new page listing every weapon (and gadget) from the asset folder as JSON with the stats it gives, viewable and editable. Not wired into the game yet.
8. **Plant rule.** Many of the designer's games end on time out even with three attackers on the site, because nobody plants. Proposed rule: the attackers may plant when they are at least as many as the defenders on the site; if defenders outnumber them, no plant, they fight. Check the balance of this.

---

## 2. Findings from the code (2026-10-29)

| Topic             | What the code does today                                                                                                                                                                                                                                                        | Consequence                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plant             | The bomb is planted only when site control reaches +1, which needs an ATK fight win from below +1 (`engine.js` `take`, line ~753) or an empty site. Marginal wins move control by 1, so DEF wins and ATK wins ping-pong the status.                                         | Attackers can stand on the site for several steps without planting; with `maxSteps` 11 the round times out. AI-vs-AI mirror shows 6.4% time outs (114 of 1,771 rounds), but player plans that split and arrive staggered hit this far more often. |
| Group sync        | A group one step from the site waits at most `syncWait` 2 steps, only for groups heading to *other* site doors, then goes in alone.                                                                                                                                         | Matches the designer's complaint: after 2 steps the first group enters alone. There is no "help" or "hold" behaviour.                                                                                                                               |
| DEF rotation      | Roamers move toward spotted groups; anchors hold until the plant; one holder rotates after a Dominant ATK win. Site defenders already count as supporters of an adjacent room only if they stand in an adjacent room, not when they are on the site and the fight is next door. | "Site defenders help the room next to the site" is partly there (supporters across one door at 0.7) but not for operators who are themselves in a contested site.                                                                                   |
| Reveal timing     | `Engine.reveal` is called live while the attacker places drones; the plan can be edited freely after.                                                                                                                                                                         | Exactly the exploit described in §1.3.                                                                                                                                                                                                             |
| Difficulty label  | `planOdds` re-runs 300 rounds against a typical defence on every plan change.                                                                                                                                                                                                 | It is a second instant-feedback loop: the player can tune a plan against the simulator before committing.                                                                                                                                           |
| Persistence       | Only the ladder saves (`squadsim.ladder.v1`, with the player squad when a ladder match starts). Squad edits outside the ladder are lost on reload.                                                                                                                            | §1.5.                                                                                                                                                                                                                                              |
| Page width        | `--page: 1440px` caps the content; planning tables have long text columns.                                                                                                                                                                                                    | Screenshot overflow.                                                                                                                                                                                                                                |
| Assets            | `demo/R6S_Operators`: 78 portraits (300×500 PNG) at the root, 78 icons (201×201) in `icons/`, same file names; `guns and gadgets/`: 84 primary weapons, 32 secondary weapons, 14 gadgets, 76 unique abilities (290×100 PNG). 8.6 MB.                                   | Enough for every roster and generated operator. Side (ATK/DEF) is not in the files; it has to come from a table.                                                                                                                                    |
| Names             | The roster has a DEF operator called "Jackal", which is an attacker in R6.                                                                                                                                                                                                      | Resolved by the R6 mapping (§3.5).                                                                                                                                                                                                                 |
| Bugs carried over | Generated Rush anchors get a Shotgun that `ROLE_CLASSES` forbids. Two soft targets from v4 (power budget +6.7, Office Tower flank +15.7).                                                                                                                                     | Fixed in WP-K.                                                                                                                                                                                                                                      |

---

## 3. Design (proposals; the questions in §6 can change them)

### 3.1 Attacker orders when a group arrives early

Each ATK group gets an **order** for the moment it reaches a site door (or its last zone) while another group is still 2 or more steps out:

| Order          | Behaviour                                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Push** | Enters at once (today's behaviour after the wait).                                                                                                                                                                      |
| **Hold** | Holds its zone and the door: does not enter, fights anything that comes through, counts as a supporter of a fight on the other side of its door. Goes in when another group enters the site or after `holdMax` steps. |
| **Help** | Reroutes toward the nearest zone where another ATK group is fighting or stuck (trap, block, roamer), joins that fight as fighter or supporter, then continues on that group's path.                                     |

The **default order** comes from the group leader (first operator) by role and trait: Entry / Second Entry / trait Aggressive → Push; Support, Utility Specialist, Flex → Help; anyone with trait Veteran or Calculated playstyle → Hold. The player can override the order per group in planning (one select). AI opponents use the defaults with a small random swap so rounds differ.

### 3.2 Defender mutual support

- **Fall back.** A roamer in a fight it is losing (it lost the last fight, or faces 2+ attackers alone) retreats one zone toward the nearest teammate instead of fighting again, unless its order is Hold.
- **Help.** When a defender is in a fight within 1 zone of a teammate who is not fighting, that teammate moves to the adjacent zone (if capacity allows) and supports, or enters if the fight is on the site.
- **Site supports the outside.** Defenders standing on the site support any fight in a room that shares a door with the site (0.7 as today), even if they would otherwise be holding. They do not leave the site before the plant unless they are roamers.
- Per-defender order in planning: **Hold / Roam / Fall back** (replaces the Roam checkbox).

### 3.3 Plant and defuse

- **Plant:** at the end of a step, if ATK alive in the site ≥ 1 and ≥ DEF alive in the site, ATK may plant. Planting takes `plantSteps` (1) step: the planter does not fight that step (does not count in the average), the others do. If DEF outnumbers ATK in the site, no plant, the fight continues.
- **Defuse (symmetric):** after the plant, DEF defuses when DEF alive in the site ≥ ATK alive in the site and DEF spends `defuseSteps` (1) step with a defuser not fighting; the existing "status −1 defuses" rule is removed so both follow the same count rule.
- Balance levers: `plantSteps`, `defuseSteps`, `bombSteps`, and whether a tie counts. Targets: time outs 5–12% in the mirror **and** in a new "staggered split" scenario set (two groups whose path lengths differ by 2+), elimination 45–65%, bomb endings 25–45%, mirror ATK 45–55%.

### 3.4 Planning lock-in and the drone economy

Two phases for the attacker, one for the defender:

1. **Recon (ATK):** choose who carries drones and where they go. Nothing is revealed until **Lock recon**; then the drones report and recon placements are final.
2. **Plan (ATK):** groups, paths, breach / smoke / EMP targets, orders, abilities, using only what recon and intel revealed. **Lock in** starts the round. No edits after.
3. **DEF:** setup, then **Lock in**.

**Drone economy (designer's note on Q4):** drones are not limited to the two operators whose gadget is a drone. Any attacker may take a drone, but it costs something, so recon is a trade-off. Proposed rule (Q17):

- Every ATK operator has one **planning slot**: its own gadget *or* a drone. Taking a drone means that operator's own gadget (breach charge, smoke, EMP…) is not available this round.
- Support (Drone) and Flex (Scout Drone) keep their drone as their own gadget, so they recon for free.
- Playstyle Calculated or Team-first lets an operator carry a drone **and** keep its gadget at half value (the designer's "if the playstyle allows it").

**Two drone types (Q18, designer's answer).** Each drone carrier picks the type in recon:

| Type | How it is placed | What it reveals |
|---|---|---|
| **Scout drone** | sent to one zone | that zone and its doors: defenders standing there, traps and reinforcements on those doors, cameras |
| **Route drone** | a path from a spawn, drawn on the plan like a group path | every zone on the path up to its battery, each with its doors, same detail as the scout drone |

- **Battery:** a route drone covers at most `droneBattery = round(zones / 4)` zones (4 on the 15–16-zone maps); Support's own Drone gets +1.
- **Shoot-down:** in every zone the drone reaches, an alert defender (Awareness 65+) or a camera covering it shoots the drone down with `droneShootChance` (30%). A scout drone shot down reports only "occupied"; a route drone stops there, reports that zone as "occupied" and reveals nothing beyond it.
- **Balance target:** a team that spends 3 drones should learn about half of the defenders and traps on average (40–60%), measured in the test over AI-vs-AI rounds; tune `droneShootChance` and `droneBattery` to hit it.

The difficulty label (`planOdds`) is removed from planning and shown after the round as "this plan won X% in simulation".

**No templates in play (designer's note on Q5).** The "Examples" dropdowns are removed from both planning screens and from the AI: every round is planned from scratch, the AI builds its plans from the map, intel and its squad (the v4 pools stay, generated fresh per round). For testing, a **DEV random plan** button replaces today's "Suggest setup / Examples / Pick an example…" block on both planning screens (Q19 answer); it fills the screen with a random valid plan or setup the player can still edit before locking in. The A/B/C and S/P/R templates survive only inside the balance test.

### 3.5 R6 identity

- New `identity.js`: for every roster operator a name, portrait and icon from `demo/R6S_Operators`; a side table for all 78 names (ATK or DEF, from R6). Proposed roster mapping (Q11):

| Today    | Role               | R6 name  |
| -------- | ------------------ | -------- |
| Breach   | Entry              | Ash      |
| Haze     | Second Entry       | Sledge   |
| Watcher  | Support            | Twitch   |
| Volt     | Utility Specialist | Thatcher |
| Mirage   | Flex               | Iana     |
| Fortress | Anchor             | Rook     |
| Jackal   | Roamer             | Vigil    |
| Shade    | Lurker             | Caveira  |
| Wire     | Trap Specialist    | Kapkan   |
| Lens     | Support Defender   | Valkyrie |

- Generated opponents take unused R6 names of their side, with matching portrait and icon.
- Cards use the 300×500 portrait; floor-plan tokens use the 201×201 icon.
- **Pickers:** on each card, "Change portrait" and "Change icon" open a gallery of the 78 images; the choice is saved (§3.6).
- The old `placeholders/` folder stays until the new assets are wired, then is deleted (Q13).

### 3.6 Memory and the Options page

- New `store.js`: one versioned localStorage key `squadsim.v5` holding the player squad (playstyle, weapons, sidearm, name, portrait, icon per operator), UI settings (playback speed, open panels, table/card view), and the armory edits (§3.7). The ladder keeps its own key.
- Every change saves (debounced). On load the saved squad replaces the roster.
- New **Options** tab: Reset squad, Reset ladder, Reset armory edits, Reset everything (each with an inline confirm), plus Export / Import of the whole save as a JSON file the player downloads or picks.

### 3.7 Armory page

- New `armory.js` with `ARMORY = { primary: [...], secondary: [...], gadgets: [...], abilities: [...] }` generated from the folder: `{ id, name, image, class, mods: { sh, aw, tw, ut, dc, lk }, notes }`. Class and mods start empty or from a heuristic by weapon family (SMG, AR, DMR, Shotgun, LMG, Pistol, Machine pistol, Revolver), to be edited.
- It is a `.js` file, not `.json`, because the page runs from `file://` and browsers block `fetch` of local JSON there. The page shows and exports it as JSON.
- **Armory tab:** grid of cards with image, name, class, the six mods; inline edit; filter by category and class; edits saved through `store.js`; Export JSON; "Reset to file".
- Not used by the engine yet.

### 3.8 Wider layout and drag and drop

- Page width: fluid to 1920 px; planning becomes two columns on desktop (floor plan left, tools right), one column below 1100 px. Tool tables become compact rows with the long description in a tooltip, so nothing scrolls sideways.
- Drag and drop with Pointer Events (mouse and touch): DEF: drag an operator token onto a zone; drag a trap or camera chip onto a door or zone; drag a reinforcement chip onto a door. ATK: drag an operator onto a group card; drag a gadget chip onto a zone or door. Invalid targets show a red outline and the reason. Click-click stays as a fallback for keyboard users.

---

## 4. Agent packages

Rules as before: vanilla JS in `demo/`, no dependencies, no code comments, English identifiers and UI text, no git. `node demo/engine.test.js --routes --sens` green and the headless UI script (`ui-headless-v4.js`, updated per package) printing ALL OK at every hand-off. The coordinator verifies each hand-off and integrates `index.html` lines.

| #    | Package                                                                                                                                                                                                             | Owns                                                                                                                 | After                          | Model / effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------- |
| WP-K | Engine: ATK orders (§3.1), DEF support and fall back (§3.2), plant and defuse rule (§3.3), recon/plan split in `briefing` (§3.4), Rush anchor weapon fix, staggered-split test scenarios, targets; Formula.md | `engine.js`, `data.js`, `engine.test.js`, `Formula.md`                                                       | —                             | Opus high      |
| WP-M | Identity, memory, Options page: `identity.js`, `store.js`, card portrait/icon pickers, Options tab content                                                                                                      | new `identity.js`, new `store.js`, new `options.js`, `cards.js`, `cards.css`, `squad.js`, `catalog.js` | —                             | Opus medium    |
| WP-N | Armory page: generate `armory.js` from the folder, Armory tab with edit, filter, export                                                                                                                           | new `armory.js`, new `armory-page.js`, new `armory.css`                                                        | — (store.js API agreed below) | Opus medium    |
| WP-L | Planning UI: lock-in flow, order selects, wider two-column layout, drag and drop, tool tables without overflow, playback lines for orders, plant/defuse                                                             | `ui.js`, `plan.js`, `plan.css`, `playback.js`, `narrate.js`, `style.css`                                 | WP-K (API), WP-M (store)       | Opus high      |

Order: **WP-K ∥ WP-M ∥ WP-N**, then **WP-L**. The coordinator wires the tabs in `index.html` after WP-M and WP-N.

Frozen interfaces so the parallel packages fit:

- `Store.get(key, fallback)`, `Store.set(key, value)`, `Store.reset(key | 'all')`, `Store.export()` → JSON string, `Store.import(json)`. Keys: `squad`, `settings`, `armory`.
- `Identity.apply(ops)` sets `name`, `portrait`, `icon` from the saved choice or the defaults; `Identity.gallery()` → `[{ name, side, portrait, icon }]`.
- Engine: plan groups gain `order: 'push' | 'hold' | 'help'`; plan gains `recon: { opId: { type: 'scout', zone } | { type: 'route', path } }` validated against the slot rule and the battery; setup `orders: { opId: 'hold' | 'roam' | 'fallback' }` replaces `roam`; `briefing(match, { recon })` returns the reveal for the locked recon; the step log gains `planting`, `defusing`, `orders` events (`hold`, `help`, `fallback`, `support`).

---

## 5. Risks

- The plant rule shifts the whole balance; WP-K must re-run the template matrix and the v4 targets, not only time outs.
- Help orders and DEF fall back create more movement and longer rounds; `maxSteps` may need to rise, which interacts with the time-out target.
- 8.6 MB of PNGs loaded at once would slow the page; galleries and the armory must lazy-load images (`loading="lazy"`).
- R6 names and art are third-party IP: fine for a private demo, must be replaced before anything is published (the designer already plans this).
- The UI has never been seen in a real browser by anyone but the designer; screenshots from the designer remain the only visual check.

---

## 6. Questions for the designer

Answer with the option letter, or write your own. The recommended option is first.

**Q1. Plant at equal numbers.**
a) *Recommended.* ATK may plant when ATK in the site ≥ DEF in the site; planting takes 1 step during which the planter does not fight.

**Q2. Defuse.**
a) *Recommended.* Symmetric: DEF defuses when DEF in the site ≥ ATK in the site, 1 step, the defuser does not fight. The old "control −1 defuses" rule goes.

**Q3. Who chooses the early-arrival order (Push / Hold / Help)?**
a) *Recommended.* Default from the group leader's role and trait; the player can override it per group in planning.

**Q4. Recon lock-in for the attacker.**
a) *Recommended.* Two locks: Lock recon (drones placed, then reveal), then plan with what you learned, Lock in. bet manau priklauso kiek nori tiek gali pasiimti dronu jeigu operatoriu palystyle tia leidzia, tiesiog prarandamos kitos glaimybes yra. bet bendeai paemus dronus is pradziu turi panaudoti kad galetum suzinoti info tik tada planuoti, bet dar tada manua dronu balansavimo reikia, kad kiek info dronas gali suzinoti ir pamatyti, nes manau glai buti per daug op

**Q5. The difficulty label during planning.**
a) *Recommended.* Remove it from planning; show "this plan won X% in simulation" after the round. bet manau duok man random plan varianto mygtuka, kol testuojuosi kad galeciau greitai pasiziureti random strategija tavo generuota, ar viskas gerai veikia kaip noriu, bet susifokusuok kad zaidimas neturetu templates, turi kiekviena karta planuoti is naujo

**Q6. Defender orders.**
a) *Recommended.* Per defender: Hold / Roam / Fall back, chosen in DEF planning; AI uses role defaults.

**Q7. Drag and drop scope.**
a) *Recommended.* DEF planning and ATK planning (operators, gadgets, reinforcements), with click-click kept as a fallback.

**Q8. Page width.**
a) *Recommended.* Fluid up to 1920 px, two-column planning on desktop.

**Q9. What is remembered.**
a) *Recommended.* Squad edits (playstyle, weapons, names, portraits, icons), UI settings and armory edits. Not a match in progress.

**Q10. Options page.**
a) *Recommended.* Reset squad / ladder / armory / everything, plus Export and Import of the save file.

**Q11. R6 roster mapping.** The table in §3.5.
a) *Recommended.* Use it as proposed.

**Q12. Generated opponents.**
a) *Recommended.* Unused R6 names of their side, with matching portrait and icon.

**Q13. The old `demo/placeholders` folder.**
a) *Recommended.* Delete it once the R6 assets are wired.

**Q14. Armory contents.**
a) *Recommended.* All four folders: primary (84), secondary (32), gadgets (14), unique abilities (76); weapons get class plus the six stat mods, gadgets and abilities get a notes field and mods.

**Q15. Armory starting values.**
a) *Recommended.* Class and mods pre-filled by weapon family (SMG, AR, DMR, Shotgun, LMG, Pistol, Machine pistol, Revolver) from the current catalog's ranges, for you to edit.

**Q16. The two soft balance targets from v4** (power budget +6.7 vs floor 7, Office Tower flank +15.7 vs band ±10).
a) *Recommended.* WP-K re-measures them after the plant rule and re-hardens them if they land in band; otherwise reports.

---

## 7. Follow-up questions (from the notes on Q4 and Q5)

**Q17. What does taking a drone cost?**
a) *Recommended.* One planning slot per attacker: drone or own gadget. Support and Flex recon for free. Calculated or Team-first playstyle keeps the own gadget at half value next to the drone.

**Q18. How strong is one drone?**
a) *Recommended.* Only the zone it is sent to and that zone's doors; 30% chance to be shot down by an alert defender (Awareness 65+) or a camera in that zone, leaving only "occupied". panadom padaryti du dronu variantus, vienas kuris  kaip tu rekomenduoji veikia, kitas turi pasirinkti kelia kuriuo vaziuoja ir pamato kiek vaziuoja kambariu,balansui turbut turim padaryti max kambariu skaiciu, tai priklausamai nuo map kambariu skaiciaus jis turi ir atitinkama baterijos kiek jis gali nuvaziuoti, bet zinoma yra galimybe kad ji nusaus anksciau laiko

**Q19. Where does the Random plan button live?**
a) vietoj "Suggest setupExamplesPick an example…Example: Stack siteExample: SpreadExample: RoamPlace every defender, then reinforce doors and set traps and cameras." sitos dalies kur yra mache, turi buti tiesiog buti DEV RANDOM PLAN mygtukas

**Answers (2026-10-29):** Q17 a. Q18: two drone types, scout (one zone, as recommended) and route (a path limited by a battery that scales with the map's zone count, can be shot down early) — folded into §3.4. Q19: a "DEV random plan" button replaces the Suggest / Examples block on the planning screens — folded into §3.4.
