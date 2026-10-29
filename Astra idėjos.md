# Astra Ideas

**Project:** Squad Sim  
**Review date:** 2026-10-29  
**Baseline:** the current V4 implementation and the approved, not yet implemented V5 plan  
**Purpose:** a researched expansion backlog, with implementation paths and acceptance criteria

This document proposes work. It does not change the accepted V5 decisions, implement features, or claim that the ideas below have already been tested. The recommendations distinguish improvements to V5's execution from features that belong in later releases.

**Reading guide:** start with [the recommended direction](#1-recommended-direction), then [V5 rule contracts](#4-v5-rule-contracts-to-settle-before-implementation). Browse [planning and UI](#5-planning-ui-and-quality-of-life-ideas), [replays](#6-replay-learning-and-decision-analysis), [tactics](#7-tactical-depth-and-opponent-behavior), [maps and modes](#8-maps-modes-and-playable-content), and [management](#9-squad-management-progression-and-the-broader-game) by interest. Use [work packages](#12-implementation-architecture-and-order) to turn the ideas into a delivery plan, and [sources](#14-research-sources-and-how-to-use-them) to follow the research.

## 1. Recommended direction

The strongest opportunity is to make Squad Sim a **tactical squad-management game in which players can understand, test, and improve their decisions**. The existing room-and-door simulation already provides a useful foundation: local numbers matter, movement has capacity limits, gadgets change routes, and splitting a team has consequences.

The next large gain is not another list of stat bonuses. It is a clearer connection between:

> the plan the player intended → what each operator actually did → what information was available → why the round ended → what to try next.

My recommended sequence is:

1. **Finish V5 and settle its remaining rule ambiguities.** Planting, defusing, information boundaries, and the new orders need precise behavior before balance measurements are meaningful.
2. **Make planning comfortable and reversible within a phase.** Add an inspector, helpful validation, group leadership controls, undo, and a usable mobile map.
3. **Make replays teach the game.** Show movement delays, support, objective actions, and the difference between known information and hindsight.
4. **Create a small tactical laboratory.** Let players compare plans after a round, share reproducible scenarios, and learn through short challenges.
5. **Add a compact management loop.** A reserve roster, understandable recruitment, and a short season should precede a large base, economy, and sponsor simulation.
6. **Expand content through validated data.** More equipment, maps, objectives, and community scenarios become safer once imports, rules versions, and editor validation are reliable.

Keep the current lightweight browser architecture while delivering these steps. A framework migration, 3D renderer, or backend would not solve the most visible problems today.

### Priority and effort notation

- **P0:** a prerequisite for trustworthy V5 behavior or persistent data.
- **P1:** the first improvements after the V5 baseline is stable.
- **P2:** a worthwhile subsequent release.
- **P3:** an experiment or long-term option.
- **S:** a contained UI or data change with existing contracts.
- **M:** a feature spanning several current components.
- **L:** new state, replay, simulation, or persistence contracts.
- **XL:** a substantial new subsystem or service.

Effort labels are relative planning estimates, not delivery promises. Dependencies matter more than the labels.

## 2. What was reviewed

### 2.1 Documentation: all 24 existing Markdown files

| File | What it contributes to this review |
|---|---|
| [Analysis & Agent Plan](<Analysis & Agent Plan.md>) | The initial demo implementation plan and early assumptions; useful history, not a description of all current behavior. |
| [Development notes](<Development notes.md>) | Runtime expectations, editing conventions, and testing notes; some version references need refreshing. |
| [Formula](<Formula.md>) | The scoring model, successive balance reports, and design decisions; contains both historical and current formulas. |
| [Web Game](<Web Game.md>) | Browser demo requirements and presentation ideas; several limits predate V4. |
| [MVP draft](<MVP/MVP draft.md>) | The initial roster, abilities, equipment, and combat calculations. |
| [Plan V2](<Plan v2 - Tactical depth and clarity.md>) | Tactical depth, explanations, equipment advice, and earlier balance targets. |
| [Plan V3](<Plan v3 - Visual clarity and animation.md>) | Playback and visual communication. |
| [Plan V4](<Plan v4 - Doors, rooms and real choices.md>) | The current spatial model: doors, capacities, per-operator movement, support, and reinforcement constraints. |
| [Plan V5](<Plan v5 - Smarter rounds, planning QOL, R6 identity.md>) | Approved upcoming work, its Q1–Q19 decisions, implementation packages, and balance requirements. |
| [Base](<Game Design/Base.md>) | Long-term facilities, construction, storage, and management ambitions. |
| [Combat system](<Game Design/Combat system.md>) | The intended connection between tactics, operator quality, and simulated encounters. |
| [Economy](<Game Design/Economy.md>) | Resource flows and the future management economy. |
| [Game modes and maps](<Game Design/Game modes and maps.md>) | Mode and map ambitions; some descriptions use older combat abstractions. |
| [Items](<Game Design/Items.md>) | Equipment categories and longer-term item progression. |
| [Recruitment system](<Game Design/Recruitment system.md>) | Scouting and roster acquisition. |
| [Season structure](<Game Design/Season structure.md>) | The preference to begin with generated matches and expand later. |
| [Sponsors](<Game Design/Sponsors.md>) | Future contracts, rewards, and organizational progression. |
| [Gadgets](<Operators/Gadgets.md>) | Gadget identities, role associations, and proposed interactions. |
| [Role system](<Operators/Role system.md>) | Operator responsibilities and team composition. |
| [Stats](<Operators/Stats.md>) | The six-stat model and its intended meaning. |
| [Traits](<Operators/Traits.md>) | Personality and specialization beyond raw stats. |
| [Campaign & side missions](<Progression/Campaign & side missions.md>) | Connected missions and secondary activities. |
| [Progression](<Progression/Progression.md>) | Long-term player and squad development. |
| [Roadmap](<Roadmap/Roadmap.md>) | The original sequence of larger systems; several earlier milestones have already been exceeded. |

### 2.2 Code, assets, and the running application

The review covered the 13 JavaScript files in `demo/`, including `engine.test.js`; the HTML entry point; all three stylesheets; the historical `baseline.txt`; and the repository's editor metadata and canvas. The empty canvas and editor workspace state do not add gameplay requirements.

The relevant responsibilities are:

| Current files | Responsibility |
|---|---|
| `data.js`, `catalog.js` | Rules, roster, roles, traits, abilities, equipment, modifiers, and tuning constants. |
| `maps.js` | Three polygonal floor plans and their zone/door graphs. |
| `engine.js` | Validation, routes, combat, movement, intel, AI plans, match state, and simulation. |
| `plan.js`, `plan.css` | SVG floor plans, interactions, and planning visuals. |
| `ui.js`, `index.html`, `style.css` | Navigation, planning state, match flow, simulator, and page composition. |
| `cards.js`, `cards.css`, `squad.js` | Operator cards, stat explanations, equipment advice, and squad editing. |
| `playback.js`, `narrate.js`, `visuals.js` | Playback, reports, text narration, and shared visual elements. |
| `ladder.js` | Seven-match ladder progression and local persistence. |
| `engine.test.js` | Formula, simulation, validation, ability, and map checks; optional balance/reporting paths. |

There are **390 image assets** under `demo/`. The R6 asset collection includes 78 portraits, 78 icons, 84 primary weapons, **34 secondary weapons**, 14 gadgets, and 76 unique-ability images. This is an asset inventory, not a claim that every image was individually inspected or that every pictured item has implemented rules. The V5 reference to 32 secondary weapons should be reconciled with the directory's current 34.

The running match-planning screen was inspected at **1440 × 1000** and **390 × 844**:

- Neither inspected viewport had whole-page horizontal overflow.
- On mobile, the map rendered at approximately **324 × 238 CSS pixels**.
- A mobile planning table had approximately **427 pixels of content inside a 322-pixel scroll area**.
- The abilities, planning controls, and full operator cards create a long vertical journey on a phone.
- The inspected pages produced no JavaScript page errors.

These are observations from a limited UI inspection, not a full accessibility audit or cross-browser certification. Earlier in this environment setup, `node demo/engine.test.js --routes`, a full-match browser smoke check, and a ten-match simulator smoke check passed. The expensive `--sens` run was not completed during that setup, so historical sensitivity results remain historical evidence.

## 3. Current reality and the most important gaps

### 3.1 What already exists

This is a dependency-free, static JavaScript browser game with Node-compatible engine exports. It already has:

- Ten player operators: five attackers and five defenders, with six stats, roles, traits, playstyles, equipment, and abilities.
- Generated opponents with four archetypes and configurable quality.
- Three maps with a single objective site each.
- Best-of-seven matches, alternating sides, and one-use-per-match abilities.
- One to five attacking groups, with one to three operators per group.
- Per-operator movement, door capacity, room capacity, queues, adjacent support, and rerouting.
- Reinforcements, traps, cameras, drones, breaching, smoke, and EMP interactions.
- Animated replay, playback speeds, a step table, combat breakdowns, equipment advice, and a simulation screen.
- A seven-match ladder with local persistence.

Stat tooltips, keyboard activation of map elements, dark-mode styling, reduced-motion support, card/table views, and replay speed controls already exist in some form. The ideas below improve their coverage and usability instead of treating them as missing features.

The base, economy, sponsorship, recruitment progression, campaign, and season documents mostly describe **future systems**. They should not be treated as dependencies that the current demo already provides.

### 3.2 V5 already owns these features

Do not count the following as new Astra features:

- ATK Push / Hold / Help orders and DEF Hold / Roam / Fall back orders.
- Revised plant/defuse rules.
- Recon followed by tactical planning, with explicit locks.
- Drone carriers, drone opportunity costs, scout drones, route drones, and shoot-down rules.
- Removing pre-round plan odds and normal-play example selectors.
- The DEV random-plan action.
- R6 names, portraits, icons, and identity pickers.
- Squad/settings persistence, an Options page, save import/export, and scoped resets.
- An editable armory catalog that is **not yet connected to combat**.
- A wider desktop layout and pointer-based drag-and-drop with a click alternative.
- The generated Rush Anchor weapon-class correction.

V5 explicitly does **not** save an in-progress match. Match resumption below is a later option, not an unannounced addition to V5.

### 3.3 Findings that should shape future decisions

| Finding in the current implementation | Why it matters | Recommended response |
|---|---|---|
| Drone placement can update revealed information before a commitment. | Repeated edits can become free reconnaissance. | Complete V5's lock, then make all undo and save behavior respect that information boundary. |
| Plan odds run 300 simulations after a short timeout on the main thread. | A timer delays computation; it does not move it off the UI thread. | V5 removes planning odds; later move post-round analysis and the simulator to a worker or chunked fallback. |
| Planning changes can remove off-path gadget placements. | A valid edit can silently undo an earlier decision. | Show what changed, why it changed, and an undo action. |
| Group leadership comes from the first operator. | Reordering membership will affect V5's default orders, even if the player thinks it is cosmetic. | Show the leader and distinguish leadership from entrance order. |
| Support is assigned to fights in zone iteration order. | When one supporter could help two fights, data ordering can affect the result. | Define an explicit, deterministic support-allocation rule before expanding reactive behavior. |
| A supporter affects combat but receives no equivalent support contribution in the current direct-fight bookkeeping. | Kill-focused reports can undervalue useful support operators. | Record factual support, intel, utility, and objective contributions separately. |
| A weak supporter can lower the weighted team average; the numbers bonus is capped. | A player may reasonably expect any support to help, while the formula can behave differently. | Reproduce the edge case and choose an explicit rule: allow and explain it, permit declining support, or redesign the contribution formula with balance tests. |
| The “why” report selects a late fight as decisive. | The last notable fight is not proof of the cause of a timeout or objective result. | Explain the actual terminal condition first; treat turning-point selection as a heuristic. |
| Seeded rounds coexist with a global generated-ID counter and mutable input state. | A seed alone is not a portable replay or bug report. | Capture normalized inputs, stable IDs, map/rules versions, and relevant RNG state. |
| The ladder stores summary presentation and handles some incompatible saves by discarding them. | Rich replay, migrations, and user-created content need a safer data contract. | Persist structured results; validate and preserve a recoverable backup before migration/reset. |
| New names and imported armory fields will meet existing HTML-string rendering. | User content must not be interpreted as markup or executable content. | Render text safely and resolve images through approved asset IDs. |

### 3.4 Documentation drift to resolve

Preserve old analysis, but mark its scope. It is useful history only if readers can distinguish it from the active rules.

1. **Stat scale:** Formula contains an older cap-1000/uncapped note, while current code uses a cap of 100 and V5 keeps the 0–100 scale. Flat bonuses mean that multiplying stats by ten is not a harmless display change.
2. **Situation shares:** Formula's older V2 distribution differs from the current V4 distribution in `DATA.SITUATION_SHARE`: `[0, .051, .162, .085, .218, .408, .076]`. Advice and balance explanations must name the distribution they use.
3. **Templates and group limits:** historical documents contain older setup names, group splits, and limits. Current code permits five groups of up to three operators; V5 removes templates from normal play while retaining test fixtures.
4. **Spatial rules:** zone-level reinforcement and older control descriptions must not be confused with V4's door-based reinforcement and current control range.
5. **Roadmap milestones:** “no portraits” or “no browser implementation” descriptions are historical; they should not guide current sequencing.
6. **Test artifacts:** the V5 plan references `ui-headless-v4.js`, but that file is not present in the checked-out repository. Supply a reproducible browser smoke script when implementing those checks instead of relying on an unavailable artifact.

**Implementation approach:** add a short “active rules and historical sections” index during the V5 documentation pass. Link rules to constants and semantic tests. Avoid copying the same numeric table into several documents. This review adds only this ideas document; it does not rewrite the older files.

## 4. V5 rule contracts to settle before implementation

These are refinements to accepted V5 features, not a replacement V5 plan.

### V5-C1 — Specify objective actions as a state machine

**Priority P0 · Effort M · Touches:** `engine.js`, `data.js`, tests, replay events.

“Plant at the end of a step” and “the planter does not fight that step” need a common timeline. A participant cannot retroactively lose combat participation after its score has already affected the fight.

Recommended contract:

1. Resolve legal movement for the step.
2. Determine objective-action eligibility from an explicit snapshot and choose a deterministic actor.
3. Reserve that actor's action; exclude it from both direct combat and adjacent support for that step.
4. Resolve combat and consequences.
5. Cancel, continue, or complete the objective action using documented survival, location, and count conditions.
6. Apply the terminal-result precedence once.

Keep the actor physically present for room capacity. Explicitly decide whether it counts toward local numerical advantage and plant/defuse eligibility; excluding it from the average alone is insufficient. Handle a side with no remaining combat participants without dividing by zero.

Define interruption when the actor dies, leaves, or loses the required numerical condition; whether progress resets; and how an actor is chosen when several are eligible. Also resolve:

- Defuse completion on the same step as detonation.
- Plant completion on the last allowed pre-plant step.
- Elimination of all attackers after planting: does the existing immediate DEF elimination victory remain, or does the bomb still require a defuse?
- Elimination of all defenders during planting.
- A one-versus-one site encounter and an uncontested site.

Do not assume the answers should copy Rainbow Six. This is an abstract simulator with its own accepted rules.

**Acceptance:** small scenario tests cover each precedence case, and replay emits `plantStarted`, `plantInterrupted`, `plantCompleted`, and equivalent defuse events.

### V5-C2 — Define who knows what

**Priority P0 · Effort M · Touches:** briefing, recon, AI inputs, UI, tests.

Use a player-visible view of the state for planning aids and AI decisions. The simulator can retain complete state internally, but suggestions, validation warnings, estimated routes, and opponent behavior must use only their allowed information.

For example, “this door is known reinforced” is a valid warning. “Your route will hit an undiscovered trap” is an information leak. A camera observation can become stale; it must not automatically follow a moving enemy.

**Acceptance:** change an unrevealed defender position or trap in a fixture. Before observation, visible planning advice and AI choices supplied with the same knowledge must remain unchanged.

### V5-C3 — Make recon commitment idempotent

**Priority P0 · Effort M · Touches:** recon state, UI transitions, persistence.

`Lock recon` must consume the selected resources and produce one immutable result for that round. Double-clicks, re-renders, or revisiting the tab must not create additional draws. Before the lock, editing drone paths must reveal nothing. After the lock, drone choices remain committed while permitted tactical edits remain available.

Freeze the committed payload and assign a recon transaction ID. Undo restores tactical edits within the current phase; it does not return to an unobserved past. V5 does not persist active matches, so distinguish “reopening this screen” from a full reload, which currently abandons that match.

**Acceptance:** repeated dispatch of the same recon commitment yields the same resource state and visible result.

### V5-C4 — Resolve drone edge cases and “half-value” utility

**Priority P0 · Effort M · Touches:** recon rules and validation.

Specify whether route battery counts the spawn, revisits, or only newly entered rooms; whether reinforced doors block the route; what cameras can detect; and whether the Awareness threshold uses base or modified stats. Resolve shoot-down once per intended observation opportunity, in a stable order, rather than accidentally once per alert defender.

“Keep your gadget at half value” also needs a per-gadget definition. Half of a smoke score bonus is straightforward; opening half a reinforced door is not. Choose whether a binary gadget retains only a passive half bonus or gets a specific reduced-use behavior. Document that choice without quietly changing the accepted drone economy.

For the 40–60% three-drone reveal target, count **unique** detected defenders and traps, report them separately, state how zero-trap rounds are handled, and distinguish “occupied” from exact identity/location information.

**Acceptance:** two drones inspecting the same room do not double-count coverage; removing or reordering unrelated operators does not create accidental extra recon attempts.

### V5-C5 — Bound help, retreat, and support behavior

**Priority P0 · Effort M · Touches:** movement, orders, combat allocation.

Define target choice, ties, blocked routes, a full destination room, dead teammates, and the end of a Help detour. A helper must not switch targets indefinitely or move through multiple doors for free. Falling back must respect door and room capacities.

Decide whether movement into a support position can provide support in the same step, and apply the rule symmetrically. An operator must not provide full support to two fights or simultaneously fight, plant, and support.

Prefer a small finite set of states such as `followingRoute`, `holding`, `helping`, and `returningToRoute`, with a reason recorded for each transition.

**Acceptance:** help cycles terminate, all movements remain legal, and equivalent maps with a different object-key insertion order do not acquire an unintended support advantage.

### V5-C6 — Make order defaults and group identity explicit

**Priority P0 · Effort S–M · Touches:** planning state and AI.

A Veteran Entry operator satisfies both Push and Hold examples. Specify precedence. Show whether the displayed order is a default or a player override, and do not erase an override when the leader changes.

Give groups stable IDs independent of their array position. Removing Group 2 must not cause an old “help Group 3” reference to target a different group.

**Acceptance:** moving an operator, changing leader, deleting a group, and restoring an edit all produce predictable orders and valid references.

### V5-C7 — Separate catalog editing from combat rules

**Priority P0 · Effort M · Touches:** planned armory, store, identity, cards.

The V5 armory is a catalog editor. It includes pictured classes that the current engine does not support. Display an item's state clearly: catalog-only, mapped to an existing class, or available under a later experimental ruleset.

Use stable IDs for operator identity, portrait, icon, and weapon. A display-name change must not alter save references, gadget ownership, ability availability, or ladder results. A random identity picker needs a defined fallback when its unused pool is exhausted.

**Acceptance:** editing an armory modifier cannot silently change a match; unsupported classes cannot become playable through an import; names are not identity keys.

### V5-C8 — Treat save import as a transaction

**Priority P0 · Effort M · Touches:** planned `store.js`, Options, ladder integration.

Parse, validate, migrate a copy, show the affected categories, then commit. Check schema version, bounded input size, finite numbers, allowed ranges/classes, unique IDs, and valid asset references. Keep a recoverable previous save when migration or replacement is involved.

Use explicit property copies rather than merging arbitrary imported objects into application state. Display imported strings as text. Handle disabled storage, quota failures, invalid JSON, and unsupported future versions with a useful export/recovery path.

Keep ladder state separate as V5 specifies. Make clear which squad snapshot an ongoing ladder uses when the ordinary squad is edited or reset.

**Acceptance:** a failed import leaves the old working state intact; opening a save containing HTML-like names displays literal text.

### V5-C9 — Preserve the intended AI and tuning scope

**Priority P0 · Effort M · Touches:** plan generation, balance reports.

V5 says plans are built afresh each round, while the current pool is fixed per map/archetype. Implement and test the intended change rather than retaining the same six choices behind a renamed UI.

Measure the accepted V5 targets on both mirror games and genuinely staggered split scenarios. Report the existing power-budget and Office Tower flank concerns alongside the results. A timeout percentage is a diagnostic, not a reason to manufacture frustrating timeouts to satisfy a lower bound.

Post-round “this plan won X%” must state the comparison population: against the actual revealed setup, against sampled legal setups, or against an archetype. These are different questions.

**Acceptance:** reports include rules version, map, scenario family, sample count, seeds, and uncertainty; rule failures are not hidden inside aggregate win rates.

## 5. Planning, UI, and quality-of-life ideas

### UX-01 — A phase bar and a compact readiness summary

**P1 · S–M · Depends on:** V5 phase contracts.

Show `Recon → Plan → Round → Review`, the current side, round score, time rule, and the one action that advances the phase. Keep a compact summary near the map: assigned operators, complete routes, available utility, selected abilities, and outstanding errors.

**How:** derive readiness from the same validators used by the engine. Return structured problems with IDs and affected objects instead of showing only an exception string. Selecting “2 operators unassigned” should focus those operators.

**Done when:** a new player can tell why Lock in is unavailable without searching through several panels. An incomplete new plan should look like work in progress rather than an immediate red failure.

### UX-02 — A contextual inspector beside the map

**P1 · M · Touches:** `ui.js`, `plan.js`, planning CSS.

Selecting an operator, group, room, or door opens a compact inspector with only relevant actions. A door shows known reinforcement, legal utility targets, and route crossings. A group shows members, leader, order, route, and arrival estimate.

**How:** store selection separately from the plan; render a shared inspector from selected entity ID and player-visible state. Keep the map stable while updating the inspector. On mobile, use a bottom sheet with a short collapsed summary.

**Done when:** placing a gadget and inspecting its cost do not require scrolling between a long table and the map.

### UX-03 — Phase-aware undo and redo

**P1 · M · Depends on:** V5-C2/C3.

Support undo for operator assignment, path edits, gadget placements, orders, and defensive setup. One drag should produce one undo entry.

**How:** represent edits as commands with before/after values, stable IDs, and phase IDs. A small bounded history is enough. Reset history at irreversible information commitments; do not restore earlier hidden information, RNG state, or consumed recon resources.

**Done when:** “changed route, lost a gadget target, undo” restores the complete prior tactical edit without rerolling recon. Keyboard shortcuts must ignore focused text fields.

### UX-04 — Actionable change feedback

**P1 · S · Touches:** planning mutations and validation.

When a route edit removes a now-invalid smoke placement, show “Smoke removed: that room is no longer on Group 2's route” with Undo and Reassign. Show blockers near the affected object and in the readiness summary.

**How:** let command application return a list of dependent changes. Separate hard invalidity from optional warnings such as overlapping smoke or a long route. Let users knowingly accept valid, unusual tactics.

**Done when:** no previously selected resource disappears without an explanation; warnings never expose hidden enemy state.

### UX-05 — A route timeline with honest arrival estimates

**P1 · M · Depends on:** movement rules and player-view filtering.

Display each group's expected path as a short strip: spawn, room, door queue, room, site. Show the gap between planned arrivals and shared bottlenecks.

**How:** run a non-combat movement projection using known doors, own formation, and capacity rules. Label it “earliest arrival” or an interval under stated assumptions. Mark unknown resistance instead of predicting exact enemy delays.

**Done when:** players can see why two similarly long paths may arrive at different times, without receiving a disguised pre-round win probability.

### UX-06 — Visible group leadership and entrance order

**P1 · M · Depends on:** V5-C6.

Show a leader badge and numbered entry positions. Give each group a stable color, number, and optional short name. Distinguish selecting a leader from changing which operator crosses a door first.

**How:** initially expose the current member order explicitly. If separate leadership is introduced, store `leaderId` and `entryOrder` with validation that both refer to current members. Do not make the new leader an unexplained combat multiplier.

**Done when:** a player can place a breacher first, preserve a support-oriented order, and understand both decisions before the round.

### UX-07 — Map layers, zoom, and readable targets

**P1 · M · Touches:** SVG interaction and CSS.

Add toggles for routes, operator names, utility, known intel, support links, and capacity markers. Provide zoom in/out, fit map, pan controls, and a quick focus on selection.

**How:** keep the logical map coordinates unchanged and transform the viewport. Convert pointer coordinates through the inverse SVG transform. Separate visible door glyph size from the interaction target; targets need to remain usable in screen pixels.

The current door hit circle has a radius of 11 SVG units. At the inspected mobile map scale, that circle alone spans only about 9 CSS pixels. Other drawn elements may also receive hits, but this illustrates why wider desktop layout is insufficient.

**Done when:** touch users can select adjacent doors accurately without changing the map geometry or accidentally dragging the page. Aim for approximately 44 CSS-pixel controls where layout allows; this is a project usability target, not a quotation of the WCAG source below.

### UX-08 — A mobile planning workspace

**P1 · M · Depends on:** UX-02/07.

On narrow screens, keep the map and current task prominent. Use compact operator chips and an expandable inspector; replace the wide placement table with one operator's actions at a time. Put Lock in and readiness in a compact action area that does not cover the map.

**How:** preserve one underlying plan state across desktop and mobile layouts. Maintain focus and scroll position when switching selection. Offer a full-map view with a clear exit.

**Done when:** the full recon-and-plan flow works at 390 pixels with no required horizontal table scrolling and without opening all five full operator cards.

### UX-09 — Complete the accessibility paths

**P1 · M · Builds on:** existing keyboard activation and reduced-motion support.

Provide a tap-select/tap-destination alternative to every drag action, plus a complete keyboard route through the same commands. Add clear focus, selected-state text, useful control labels, and non-color group markers.

**How:** reuse commands across pointer, keyboard, and inspector controls. Avoid full-panel replacement that discards focus after each edit. Support Escape to cancel placement, a concise live status region, and touch-accessible explanations. Preserve reduced motion in future effects.

The W3C dragging guidance explicitly distinguishes a single-pointer alternative from keyboard support; both need attention [S5].

**Done when:** a player can prepare and lock a legal ATK and DEF plan using a keyboard, and separately using taps without dragging.

### UX-10 — Better loadout comparison

**P1 · M · Touches:** cards, catalog, future armory mapping.

Compare two weapons or playstyles in a readable panel: six-stat deltas, role legality, affected situations, and meaningful tradeoffs. Allow contexts such as “entry on this map” and “late objective fight.”

**How:** reuse scoring functions, but label the assumptions. Current equipment advice is an expected-score estimate, not a probability of winning; it omits some live team and tactical effects. Show rounding and avoid presenting tiny differences as strong recommendations.

**Done when:** players can explain why a DMR and SMG suit different jobs, and a catalog-only armory item cannot be mistaken for an equipped combat item.

### UX-11 — Personal playbooks, after V5

**P2 · M · Explicit design extension:** V5 removes normal-play example templates.

Later, let players save **their own** plans with a name, map version, side, short note, and tags such as “slow split” or “camera denial.” This is a deliberate later decision about player-authored plans; do not reintroduce the removed Examples dropdown during V5.

**How:** store plans using role/slot references with a preview of roster remapping. Validate against current topology and rules; mark outdated plans and explain repairs. Recon placements in a playbook must not include previous observations.

**Done when:** loading a plan cannot reveal old enemy information or silently assign missing operators to arbitrary groups.

### UX-12 — Small controls that remove repeated friction

**P1–P2 · S individually · Touches:** UI settings and commands.

Add a searchable shortcut sheet, selectable UI density, readable abbreviation glossary, pinned favorite equipment, and optional subtle audio cues with mute controls. Remember per-view display preferences through V5's existing settings store.

Clarify Auto-play rest: display whether the current prepared round is honored or replaced by AI planning. Guard an actual loss of substantial unsaved preparation with a recoverable draft or a targeted confirmation, without adding confirmation dialogs to ordinary edits.

**Done when:** the next action is predictable; repeated play requires fewer clicks while all controls remain discoverable without shortcuts.

## 6. Replay, learning, and decision analysis

### RE-01 — Explain the actual outcome first

**P1 · M · Touches:** engine result metadata, `narrate.js`, `ui.js`.

Start review with a factual statement: “Time expired before a plant completed,” “The defuse completed,” or “All defenders were eliminated.” Then show two or three relevant events with links into the replay.

**How:** add structured outcome evidence, such as final objective progress, actor interruption, surviving operators, and timer state. Select explanatory events by their relationship to that condition. A “turning point” can remain a useful heuristic if labeled accordingly.

**Done when:** a timeout report does not imply that the final kill was necessarily decisive, and every factual explanation can be traced to an event.

### RE-02 — Explain what each operator was doing

**P1 · M · Depends on:** structured movement/action events.

Add a per-operator action lane: moving, queued, holding, helping, supporting, fighting, planting, defusing, or eliminated. Clicking a delay highlights the door or occupied destination.

**How:** record reason codes when the engine makes a decision. Render “waiting: door capacity” from those codes instead of reconstructing intent from final positions. Show the intended path and actual path together only when requested.

**Done when:** the player can answer “Why did this group arrive late?” and “Why did this operator stay outside?” without reading raw combat tables.

### RE-03 — Switch between hindsight and player knowledge

**P1 · M–L · Depends on:** V5-C2 and observation events.

Offer two replay views: complete post-round analysis and “what your team knew at this step.” In the latter, unseen enemies remain hidden and stale observations show a last-seen marker.

**How:** store time-stamped observations separately from physical state. Reconstruct knowledge by replaying those observations. Do not derive historical knowledge from the final complete state.

**Done when:** reviewing an ambush shows whether it was predictable from the available intel. The complete view is available after the round under an explicit review rule, not exposed during planning.

### RE-04 — A searchable event timeline

**P1 · M · Builds on:** existing playback controls and step table.

Add next/previous important event, direct step selection, filters for fights/utility/objective/movement, and “follow this operator.” Let players compare the same room at two steps.

**How:** index structured events by step, type, entity, and zone. Keep playback state independent of animation duration so skipping and changing speed do not alter the simulation.

**Done when:** a player can jump directly to the failed plant or first blocked door; reduced-motion mode still communicates the same event sequence.

### RE-05 — Useful contribution reports

**P1 · M · Touches:** engine bookkeeping and match summary.

Show distinct achievements: direct fights, support appearances, successful breaches, traps avoided or disarmed, unique useful observations, plants/defuses, and survival. Consider awards such as “Objective specialist” or “Utility support” alongside kills.

**How:** derive factual counters from events. Keep participation and inferred value separate: “supported three fights” is measurable; “won the round for the team” usually is not. Avoid granting repeated credit for rediscovering the same stationary opponent.

**Done when:** a support operator can receive visible recognition without needing a kill. Any eventual XP formula uses bounded, objective-aligned contributions rather than farmable raw event counts.

### RE-06 — Export a reproducible match or scenario

**P1–P2 · L · Depends on:** stable snapshots and schema versions.

Add “Export replay” and “Copy scenario code.” A compact export can contain the initial snapshot and seed; a more durable export can also include resolved events for viewing when the old engine is unavailable.

**How:** include schema version, ruleset identifier, map identifier/version, rosters with stable IDs, plans, recon commitments, ability state, and seeds. Validate size and references on import. Distinguish replay viewing from re-simulation.

**Done when:** importing on a clean browser reproduces the same supported-version outcome. A mismatched ruleset reports incompatibility rather than pretending to verify the old result. Local replay files should exclude unrelated saves or machine information.

### RE-07 — Post-round “what if?” comparisons

**P2 · L · Depends on:** RE-06 and a responsive simulator.

Let a player change one decision after review: a route, group order, smoke target, or ability choice. Compare the original and variant over a declared seed set.

**How:** clone the initial round inputs, make the chosen edit, and run both alternatives over paired samples. Show the outcome distribution, objective completion, casualties, and arrival times. A shared root seed reduces some noise but does not guarantee matching later random events when the action sequence diverges.

**Done when:** the UI says “estimated over N samples under these assumptions,” distinguishes the actual defense from sampled defenses, and never overwrites the completed ladder result.

### RE-08 — A coach that teaches one thing at a time

**P2 · M · Depends on:** RE-01/02/05.

After a match, offer one or two concrete observations: “Both groups entered through the same site door,” “The breacher remained behind the blocked front,” or “Three abilities were never armed.”

**How:** start with transparent event-based rules and links to the relevant moments. Distinguish an observation from advice: unused abilities may be intentional, and splitting is not universally better. Offer a targeted practice scenario rather than a large generic tips panel.

**Done when:** coaching explains its evidence, avoids repeated irrelevant tips, and never asserts that one changed decision would certainly have won.

## 7. Tactical depth and opponent behavior

The best tactical additions change decisions that players can see. Avoid stacking new hidden multipliers onto an already rich score formula.

### TAC-01 — Limited conditional orders

**P2 · L · Depends on:** stable V5 orders and RE-02.

Extend the three V5 behaviors with one optional contingency per group: “if blocked and no breacher is available, use the alternate route,” or “if the teammate is eliminated, regroup at this room.”

**How:** use a small allowlisted condition/action catalog. Conditions read the group's legitimate knowledge; actions go through ordinary movement and resource validation. Display the active condition and the reason it fired.

**Done when:** the player gains a meaningful contingency without writing scripts or managing a large behavior tree. Rules terminate and cannot refer to a hidden enemy's exact state.

### TAC-02 — Explicit synchronization and rendezvous

**P2 · M–L · Builds on:** V5 Hold and Help.

Allow two groups to share a rendezvous marker or an entry trigger such as “enter when Group B reaches its staging room.” Include a maximum wait and a fallback.

**How:** reference stable group and zone IDs; detect cycles in dependencies. Estimate timing using own information. Make the timeout behavior visible before lock-in.

**Done when:** a deliberately coordinated split is possible without infinite waiting. This should be introduced only if V5's simpler Hold behavior still leaves a meaningful unmet need.

### TAC-03 — Formation as a tactical choice

**P2 · M · Depends on:** UX-06.

Make entrance order matter explicitly: a breacher leads a reinforced approach, a stronger fighter enters first, or a support operator stays one room behind. Start with position in the queue; do not add arbitrary formation bonuses.

**How:** respect member order at each constrained crossing and define what happens after the leader dies or a path changes. Later, an optional “rear support” instruction could preserve adjacent support at the cost of fewer local fighters.

**Done when:** the same roster can make a different, understandable tradeoff through formation, and rear support cannot help through a closed reinforced door.

### TAC-04 — An interaction matrix for utility

**P1–P2 · M · Touches:** data, gadget rules, inspector, tests.

Publish a compact matrix: what reveals a trap, what disables it, what opens a reinforced door, and what smoke changes. Distinguish the project's actual EMP behavior from expectations created by R6 imagery.

**How:** centralize applicable interactions in data and expose the same definitions to tooltips and validation. Mark “reveals,” “disables,” “removes,” and “bypasses” separately. Add mechanics one interaction at a time.

**Done when:** players can predict legal combinations, and a tooltip cannot promise camera denial that the engine has not implemented.

### TAC-05 — Temporary utility with visible timing

**P2 · L · Depends on:** event/action timing.

Experiment with finite smoke duration, temporary electronic disruption, or a delayed breach. This can make timing as important as placement.

**How:** give effects an activation step, expiration step, area, and explicit stacking rule. Add a timeline preview. Introduce only one timed effect first and compare against the current persistent-round effect.

**Done when:** a player can tell when an effect will be active, and waiting out utility is a legitimate tactical response. This changes balance substantially and should not be slipped into a UI-only release.

### TAC-06 — Information with age and provenance

**P2 · M · Depends on:** V5 recon and RE-03.

Display “seen by route drone at step 0,” “heard movement last step,” or “camera contact lost.” Separate exact identity, occupied-room reports, and inferred presence.

**How:** represent an observation with source, step, subject or region, and certainty category. Begin with deterministic categories rather than invented probability percentages. Let observations age without silently becoming false certainties.

**Done when:** players understand why old intel can be wrong. Deception, decoys, or false reports should be a later explicit mechanic with discoverable counters.

### TAC-07 — Opponents with visible tactical habits

**P2 · M · Builds on:** existing Balanced, Rush, Tactical, and Utility-heavy archetypes.

Make archetypes differ through route selection, willingness to split, help thresholds, recon allocation, and utility timing. Provide a short scouting description based on their design or observed past matches.

**How:** add bounded policy parameters rather than separate copies of the engine. Keep decisions deterministic for a given snapshot and seed. Record which policy was used in analysis exports.

**Done when:** players can recognize and counter an opponent's habits without the AI needing hidden information or inflated stats.

### TAC-08 — Transparent difficulty presets

**P2 · M · Depends on:** TAC-07 and balanced fixtures.

Offer a few difficulty presets with understandable differences: opponent stat quality, planning competence, and optional player assistance. Keep these dimensions visible.

**How:** use the same rule engine, legal recon, and capacity constraints at every difficulty. A more competent planner can evaluate more legal candidates using only its own information. Record difficulty in results.

**Done when:** difficulty does not secretly grant map knowledge or change a die result. The player can choose equal-stat tactical practice separately from fighting stronger operators.

### TAC-09 — Learn from the opponent within a match

**P3 · L · Depends on:** knowledge model and distinct policies.

Allow an opponent to react to observed repeated routes across rounds: reinforce a frequently used approach or keep a roamer near a commonly exploited flank.

**How:** retain only information that the opponent could have observed in prior rounds. Add a bounded policy preference, not exact knowledge of the current plan. Tell the player through a scouting note that the opponent has adjusted.

**Done when:** adaptation encourages variation while remaining explainable and seeded. Preserve a non-adaptive mode for balance comparisons and training.

### TAC-10 — Bounded pressure or suppression experiments

**P3 · L · Explicit experiment:** this is not currently a health or ammunition simulator.

If fights feel too binary after V5, test a short-lived “pinned” state that delays movement or limits support, with a clear recovery condition. This may produce tactical consequences without introducing full HP, projectile, and ammunition systems.

**How:** prototype behind a separate ruleset, define who can apply it, cap its duration, and log the effect. Test for permanent suppression loops and excessive timeouts.

**Done when:** playtests show better decisions and readability, not simply longer rounds. Reject the feature if it mainly adds another hidden penalty.

## 8. Maps, modes, and playable content

### MAP-01 — A tactical training course

**P1 · M · Depends on:** reproducible scenario inputs.

Build six short lessons using existing mechanics: door queues, safe split timing, drone opportunity cost, breach routing, adjacent support, and planting under pressure.

**How:** define fixed rosters, maps, seeds, allowed edits, and success predicates in data. Show the lesson's objective, let the player try, then replay the relevant events. Start with deterministic cases that do not demand a lucky result.

**Done when:** each lesson teaches one rule and completes in a short session. The first course needs no new map or combat mechanic.

### MAP-02 — A challenge and puzzle library

**P2 · M · Builds on:** MAP-01.

Create optional puzzles such as “win with one drone,” “reach the site through two distinct doors,” or “complete a defuse after a fallback.” Offer completion tiers based on tactical constraints rather than only kills.

**How:** package a scenario with editable fields, evaluation rules, version, and an author explanation. Validate challenges independently of the normal ladder.

**Done when:** challenges have reproducible initial conditions and no unintended dependence on an earlier user's local squad edits.

### MAP-03 — Rotating seeded operations

**P2 · M · Depends on:** versioned scenarios.

A daily or weekly operation can keep the game fresh with a fixed roster, map, and tactical constraint. An offline implementation can derive the scenario from a date and rules version.

**How:** define a stable rotation table or generator; show the operation code and time basis. Keep local best results and allow replay of previous operations.

**Done when:** devices using the same version and operation code receive the same challenge. An offline date-based challenge does not imply a trusted leaderboard or protection against clock changes.

### MAP-04 — More maps through a validator-first workflow

**P2 · L · Builds on:** the existing map geometry tests.

Add maps with distinct tactical questions: a central support hub, several short exposed approaches, a long flank with strong utility opportunities, or narrow connections that create real queue tradeoffs.

**How:** build a development editor or import format around existing zones, polygons, anchors, doors, and spawns. Reuse checks for overlap, shared walls, reachability, door coordinates, capacity effects, and multiple approaches. Preview valid reinforcement combinations.

**Done when:** a content author can see why a map is invalid before opening a match. Assess route diversity and support influence as well as appearance; room count alone does not create tactical depth.

### MAP-05 — Alternate objective locations

**P2–P3 · L · Requires a deliberate engine extension.**

Let the same building support a small number of alternate site configurations. This increases replayability without requiring a completely new visual map.

**How:** replace assumptions around a single `map.site` with an active objective configuration. Update route generation, validation, AI, controls, replay, and tests together. Start with one active site selected before the round, not simultaneous multi-site planting.

**Done when:** every active site is reachable under legal reinforcement rules and has measured tactical variety. Do not add a second site marker while leaving pathfinding and win conditions hard-coded to the first.

### MAP-06 — Carefully bounded destruction and verticality

**P3 · XL · Depends on:** topology versions and MAP-04.

Consider predetermined breachable walls or hatches that create new graph edges. Later, connect floors through explicit stairs and hatches.

**How:** represent inactive, authored connections with activation rules, cost, visibility, and capacity. Revalidate route caches and AI when topology changes. A floor selector must preserve cross-floor context and make support restrictions explicit.

**Done when:** opening a connection changes a useful decision and is clearly shown in replay. Avoid free-form destruction or 3D simulation until authored graph changes prove worthwhile.

### MAP-07 — Objective variants with small first steps

**P3 · L–XL · Depends on:** a generalized objective contract.

Possible variants include an extraction route, carrying an item to an exit, defending a terminal for several steps, or a short sequence of two objectives.

**How:** define an objective interface for eligibility, progress, interruption, terminal outcome, UI text, and replay events. Prototype one variant using the existing room graph. Build AI and tests for that objective before exposing it in random play.

**Done when:** victory depends on the advertised objective, and the variant creates a different planning problem. Avoid “new modes” that merely rename the bomb while using contradictory rules.

### MAP-08 — A short linked operation

**P2 · L · Connects to:** the existing campaign and side-mission documents.

Create a three-mission operation: reconnaissance, a main assault, and an extraction or defense. Choices can alter the next mission's available intel, equipment budget, or opponent approach.

**How:** carry a small explicit operation state between scenarios. Provide branch previews where the player is meant to understand the consequences. Keep ordinary skirmish rules unchanged.

**Done when:** the sequence feels connected without requiring the complete base and economic systems. Persistent-unit campaigns in Wesnoth are a useful reference for continuity, not a reason to copy its campaign length or death rules [S4].

## 9. Squad management, progression, and the broader game

These ideas develop the existing design documents. Recruitment, bases, sponsors, and campaigns are already part of the project's vision; the contribution here is a smaller implementation order and more concrete player decisions.

### MG-01 — A reserve roster and real lineup selection

**P2 · L · Depends on:** stable identities, saves, and lineup validation.

Add a small reserve pool so the player can select five attackers and five defenders with different strengths. Begin with a few meaningful alternatives rather than dozens of near-identical operators.

**How:** separate owned operators from the active match roster. Validate side eligibility, squad size, and supported role composition. Freeze the lineup for a match or competition under an explicit rule.

**Done when:** replacing an operator changes a tactical option, and card, ability, plan, and save references remain valid. Decide deliberately whether duplicate roles are allowed; current generation assumes one operator per role.

### MG-02 — Recruitment with understandable uncertainty

**P2 · L · Depends on:** MG-01 and a minimal resource budget.

Present a small set of candidates with known role, indicative strengths, and scouting uncertainty. Let the player spend scouting effort to narrow what is unknown.

**How:** store the candidate's underlying generated attributes once. Reveal ranges or categories through scouting stages; do not reroll the candidate when opening the screen. Explain the cost and what the next scouting step reveals.

**Done when:** recruitment is a choice between fit, price, and uncertainty. A candidate is not mysteriously different after purchase.

### MG-03 — Horizontal training and specialization

**P2 · L · Depends on:** MG-01 and progression rules.

Develop specialists through bounded choices: a better late-round trait, a different supported utility option, or a playstyle specialization. Prefer tradeoffs to unlimited stat inflation.

**How:** retain the 0–100 cap and existing modifier budgets. Add small branching unlocks with clear compatibility rules and respec behavior. Keep fixed-roster training and challenge modes available.

**Done when:** an experienced operator feels distinct without making tactical decisions irrelevant against a newer roster.

### MG-04 — Operator relationships with visible consequences

**P3 · L · Depends on:** MG-01/03.

A pair could become effective at synchronized entry or coordinated support after working together. A conflicting pair might require a clearer leader order rather than receiving a mysterious global penalty.

**How:** track a bounded relationship state based on meaningful shared participation. Prefer an observable behavior or a small capped contribution; expose the rule in the lineup screen.

**Done when:** relationships create roster choices without making one permanent five-person squad mandatory. Avoid opaque morale multipliers that explain every unexpected loss after the fact.

### MG-05 — Fatigue and recovery only in the appropriate mode

**P3 · L · Depends on:** a season/campaign loop.

Optional fatigue or injury can make reserves matter in a management campaign. Ordinary skirmish elimination should not silently become permanent death.

**How:** define competition-level recovery rules, durations measured in matches or events, and predictable medical support. Separate these from the current within-round cleanup fatigue.

**Done when:** the player can plan rotation and recovery without waiting for a real-world timer. Permanent death, if ever offered, should be an explicit campaign setting with a suitable restart/recovery policy.

### MG-06 — A compact season before a full organization simulator

**P2 · L · Builds on:** the current seven-match ladder.

Turn a short competition into a coherent season: fixtures, standings, rival summaries, a few roster decisions, and a final result. Generated opponents can remain the foundation.

**How:** use a deterministic schedule, stable opponent rosters, and clear tie-breakers. Resolve each fixture once. Freeze the competition ruleset and roster policy, and persist structured results.

**Done when:** finishing a season creates a satisfying arc without needing construction queues, sponsorship tiers, or a transfer market first.

### MG-07 — Economy forecasts and fair reward handling

**P2–P3 · L · Depends on:** MG-06 and idempotent persistence.

Before adding many currencies, introduce a small budget with clear sources and costs. Show the next few expected commitments and the consequence of a recruitment or upgrade decision.

**How:** use an append-only transaction record or equivalent validated ledger with unique reward IDs. Preview purchases and guarantee that revisiting a result screen cannot grant rewards twice. Test recovery after a save failure.

The original storage design can discard overflow. A claimable overflow inbox is an optional revision worth considering, because silent reward loss is frustrating. If storage pressure is intentional, show the loss before the player commits.

**Done when:** players can explain where money came from, why it was spent, and what they can afford next.

### MG-08 — A base that unlocks decisions

**P3 · XL · Connects to:** Base and Economy documents.

Give facilities concrete functions: a training room unlocks a specialization choice, an analysis room unlocks richer scouting, and an armory unlocks a loadout slot or supported customization.

**How:** start with a small menu of facilities and opportunity costs. Prototype upgrades paid in season events or match milestones before introducing real-time construction. This is a proposed revision to timer-oriented elements of the original vision, not an existing rule.

**Done when:** each building changes what the player can decide. A base should earn its screen time through gameplay instead of becoming a series of passive percentage increases.

### MG-09 — Sponsors aligned with winning well

**P3 · L · Depends on:** MG-06/07 and contribution events.

Offer a small selection of contracts with transparent requirements and tradeoffs: use a reserve operator, complete a tactical challenge, or achieve a season objective.

**How:** derive progress from existing result events, cap repeatable rewards, and keep the main competitive goal dominant. Preview whether a contract applies to skirmish, season, or training.

**Done when:** a sponsor does not reward farming kills, deliberately prolonging rounds, or sacrificing a winnable match. Flavor and cosmetics can provide rewards without escalating combat power.

### MG-10 — Equipment identity without an item treadmill

**P2–P3 · L · Depends on:** validated armory-to-engine mapping.

Develop a small number of weapon families with recognizable tradeoffs, then consider limited attachments, sidegrades, favorite loadouts, and role-based kits. The existing within-class modifier differences are intentionally small; more names alone will not add much depth.

**How:** define supported classes and budgets first. Introduce one attachment slot or one family-specific decision, not a full rarity/loot system. Make the comparison explain any actual change in situations, support, or utility.

**Done when:** the equipment choice has a reason beyond a green “+1,” and importing the large art catalog does not instantly create dozens of unbalanced playable items.

## 10. Technical foundations that make the ideas practical

### SYS-01 — Versioned rules and stable identifiers

**P0 foundation / P1 expansion · M–L.**

Use a ruleset identifier and schema version across scenarios, saves, replays, and balance reports. Keep operator identity, cosmetic identity, equipment identity, group identity, and display names separate.

**How:** add a small normalization/validation layer around the current data. Retain the existing pure scoring functions. Snapshot the effective rules used by an experiment or identify an immutable known version; an arbitrary version string alone does not preserve an old ruleset.

**Acceptance:** a renamed operator retains its ability and match references; a modified experimental catalog cannot be mistaken for the default competition rules.

### SYS-02 — Reproducibility beyond a single seed

**P1 · L · Enables:** scenarios, replay sharing, comparisons, reproducible bug reports.

Make a round's normalized inputs self-contained. Seed generation of opponents, identity selection, AI plans, recon, and combat explicitly. Avoid allowing UI rendering or opening a tooltip to consume gameplay randomness.

**How:** first capture every input required by the current engine. Later, separate random streams by purpose, and consider event-keyed draws where stable event identity exists. Allocate entity IDs within the scenario instead of relying on a process-global generated counter.

**Acceptance:** a fresh process can reproduce a supported snapshot; changing playback speed has no effect on combat; canceling a simulation does not change the next live match's random state.

### SYS-03 — Structured events with a clear state boundary

**P1 · L · Builds on:** existing round logs.

The engine already produces substantial logs. Extend them with stable, versioned semantic events rather than rewriting the entire application into a new event framework.

**How:** log decisions when they occur, with actor, step, source/destination, reason, and visibility. Keep raw simulation state, player-visible observations, and presentation text separate. Persist results as data; generate HTML when rendering.

A possible event shape is:

```json
{
  "eventVersion": 1,
  "id": "round-3:step-4:move-2",
  "step": 4,
  "type": "movementBlocked",
  "actorIds": ["operator-4"],
  "groupId": "group-b",
  "zoneId": "hall-n",
  "doorId": "hall-n|site",
  "reason": "doorCapacity",
  "visibleTo": ["ATK"]
}
```

This is an illustrative proposal, not a format currently accepted by the engine. The visibility policy must be evaluated by the simulation/knowledge layer, not trusted from imported data.

**Acceptance:** narration, contribution reports, playback markers, and debugging use the same factual event. Consider checkpoints only if replay reconstruction actually becomes expensive.

### SYS-04 — Run large simulations without blocking the UI

**P1 · M–L · Touches:** simulator and post-round analysis.

Use a Web Worker for the HTTP-served application. The current classic-script structure can support a dedicated worker that imports the necessary data, map, and engine scripts in a defined order. MDN documents message-based worker communication and the separation from DOM access [S6].

**How:**

1. Send a serializable snapshot, seed list, ruleset ID, and job ID.
2. Return progress and aggregate results in batches.
3. Keep full round logs only for selected examples; otherwise release them after aggregating.
4. Allow cancellation and ignore stale responses from older jobs.
5. Preserve a chunked main-thread fallback for direct `file://` use or unavailable workers.

The fallback should yield between small batches. A single `setTimeout` around thousands of matches does not provide responsiveness. Performance targets need measurement on named devices.

**Acceptance:** Run, Cancel, navigation, and progress remain responsive during a large simulation; worker and fallback produce the same result for the same inputs.

### SYS-05 — Save recovery and optional match resumption

**P0 import reliability / P2 active-match resume · L.**

First complete V5's scoped persistence. Later, offer “Continue match” with an explicit snapshot of the current phase and committed information.

**How:** capture round number, score, ability usage, seeded opponent/plan state, phase, recon result, tactical draft, and rules version. Define recovery at phase boundaries before attempting animation-level resumption. Commit snapshots atomically where the storage API permits, and preserve a last-known-valid backup.

Use localStorage for small settings and draft state. Consider IndexedDB for a growing replay library; do not move everything merely because another API exists.

**Acceptance:** a restored match cannot reroll committed recon or receive a duplicate ladder reward. Unsupported snapshots remain exportable. This feature is explicitly deferred beyond V5's “no in-progress match save” decision.

### SYS-06 — Tests that protect player-facing rules

**P0–P1 · M–L · Builds on:** the substantial current engine suite.

Keep the existing checks and add focused tests at the new boundaries: objective timing, knowledge, resource use, order termination, import, and UI input paths.

Some current checks reconstruct many details of the engine. Those are valuable consistency checks, but a matching reconstruction can share the same mistaken assumption. Supplement them with small independently specified scenarios and invariants.

**How:** maintain quick semantic tests, a short browser smoke path, and separately invoked statistical reports. Use generated legal plans for broad invariant coverage. Preserve intentional entrance order while varying irrelevant map/object insertion order.

**Acceptance:** failures identify a rule and scenario. Large balance runs report uncertainty and are not the only way to discover a simple invalid state.

### SYS-07 — Data packs and a controlled content pipeline

**P2–P3 · L · Enables:** authored scenarios, map sharing, equipment variants.

Use data-only packs for maps, cosmetics, challenges, and supported rule parameters. OpenRA's mapping/mod documentation is a useful example of treating content creation as a first-class workflow [S1].

**How:** give each pack an ID, version, required rules version, asset manifest, and bounded validated data. Reject arbitrary JavaScript in ordinary imported packs. Keep experimental balance separate from standard saves and competition results.

Create an asset manifest that maps stable IDs to existing local files, records dimensions, and tracks source/usage information. This supports broken-image checks, alternative visual themes, and replacing borrowed identity assets if a later release needs original art.

**Acceptance:** installing a pack cannot overwrite unrelated progress, and an incompatible pack fails with an explanation before a match starts.

### SYS-08 — Optional installable offline mode

**P2–P3 · M–L · Depends on:** stable deployment and versioned assets.

For an HTTP/HTTPS deployment, consider a manifest and service worker so players can install the app and launch cached content offline.

**How:** cache a coherent app version; show when an update is ready; activate updates between matches. Keep saves outside disposable asset caches and provide a cache-recovery path.

**Acceptance:** an offline launch loads matching engine and data versions. Direct `file://` operation remains its own supported path; service workers require an appropriate served context and do not solve local-file browser restrictions.

### SYS-09 — Asynchronous competition as a later social feature

**P3 · XL · Depends on:** validated snapshots, deterministic simulation, and a service.

The game is a good candidate for “submit a defense, let another player attack it,” a private challenge league, or shared fixed-roster tournaments.

**How:** begin with local file exchange and unranked challenges. A trusted online competition would need authenticated submissions, server-side rule validation and result computation, versioned competitions, and a policy for hidden plans. A downloaded defense cannot remain secret from a determined client owner.

**Acceptance:** local edited results are never represented as server-verified rankings. Build this only after single-player planning and replay are enjoyable; real-time PvP would be a separate, much larger product decision.

### SYS-10 — A practical developer scenario workbench

**P1–P2 · M · Builds on:** DEV random plan and existing simulator.

Add development tools to load a fixture, set the seed, inspect per-step state, force a known objective situation, and export a minimal reproduction.

**How:** keep these controls in a separate development panel. Reuse the same validators and scenario format. Add comparison of actual versus expected events for a chosen fixture.

**Acceptance:** investigating “the planter fought while planting” takes one reproducible scenario rather than many random matches. Development controls do not silently alter ordinary ladder results.

## 11. Additional ideas worth keeping in the backlog

These are smaller or more speculative opportunities. They should be selected by observed player needs, not implemented as a checklist.

| Idea | Player value | Smallest implementation and constraint | Priority |
|---|---|---|---|
| Searchable in-game rulebook | Answers terminology questions without leaving a match. | Short articles linked from the actual mechanic; expose current constants where appropriate. | P1 |
| A first-run guided match | Helps users move from blank planning to a complete round. | Highlight one control at a time; use a fixed training scenario; allow skip and replay. | P1 |
| Explicit resource accounting | Makes drone-versus-gadget tradeoffs readable. | Per-operator “committed / available / consumed” badges derived from V5 state. | P1 |
| Two-way selection links | Makes reports easier to navigate. | Clicking a name in a report highlights the token; clicking a token filters its events. | P1 |
| A concise match journal | Gives the ladder a history players can understand. | Structured round summaries with opponent, map, outcome, and optional notes. | P2 |
| Replay bookmarks and annotations | Supports learning and sharing. | Store step references and plain-text notes separately from immutable replay data. | P2 |
| Personal performance trends | Shows whether decisions are improving. | Track objective success, arrival gaps, utility use, and matchup context locally; avoid a single unexplained skill score. | P2 |
| Side-by-side roster comparison | Makes recruitment and lineup changes faster. | Compare role coverage, supported equipment, and situation scores with explicit assumptions. | P2 |
| Favorite operators and loadout labels | Reduces repeated searching. | Tags and saved legal equipment selections; show invalid items after a rules update. | P2 |
| Bulk editing with preview | Makes large rosters manageable. | Preview all affected operators and skipped incompatibilities; apply as one undoable action. | P2 |
| Map familiarization mode | Teaches geometry without combat pressure. | Free inspection of routes, legal doors, room capacity, and reinforcement constraints. | P1–P2 |
| Draft or veto before a series | Adds strategic variety to competitive sets. | Start with choosing one of the existing maps; defer elaborate bans until there is enough content. | P2 |
| Cosmetic team identity | Makes a persistent squad feel personal. | Team name, colors, badge, and theme manifest; preserve readable contrast and stable IDs. | P2 |
| Sound with a tactical purpose | Makes important events easier to notice. | Distinct optional cues for phase change, objective action, and error; no information unavailable visually. | P2 |
| Text-size and contrast presets | Makes dense management screens easier to use. | CSS variables and layout checks at larger text sizes; retain manual settings. | P1 |
| Localization-ready strings | Supports future languages without duplicating screens. | Move user-facing strings into keyed dictionaries as components are touched; keep engine identifiers stable. | P2 |
| Lightweight replay export image | Helps players share a tactical moment. | Export a selected map frame plus a short event caption; keep replay JSON as the reproducible source. | P2 |
| Achievement collection | Gives optional goals beyond winning. | Event-based milestones with bounded counters; avoid chores that encourage sabotaging matches. | P3 |
| Rival teams and short narrative briefs | Adds personality without a large story engine. | Seeded team identity and authored briefings tied to real upcoming modifiers. | P2–P3 |
| Challenge creation from a replay | Turns interesting losses into reusable content. | Export initial state plus allowed edits and an objective; validate before sharing. | P2–P3 |
| Scenario mutators | Tests new strategic situations cheaply. | A limited list such as fewer recon slots or a fixed utility budget; separate ruleset and explicit briefing. | P3 |
| Practice without random combat variation | Helps isolate a scoring or positioning rule. | A clearly labeled deterministic training ruleset; never mix its results with ordinary balance reports. | P2 |
| Optional match draft recovery | Prevents accidental loss of preparation. | Save only the permitted current-phase draft; respect recon commitment and V5's active-match boundary. | P2 |
| Local diagnostics export | Makes bug reports actionable. | App/rules version, scenario, relevant error, and optional replay; preview contents and exclude unrelated storage. | P1–P2 |

## 12. Implementation architecture and order

### 12.1 Keep responsibilities small

The current global-script architecture can evolve incrementally. New filenames below are **proposed**, not files that already exist or a requirement to split every component immediately.

| Concern | Existing home | Suggested evolution |
|---|---|---|
| Rules and catalog | `data.js`, `catalog.js` | Versioned definitions and shared validation; V5's `armory.js` stays a separate catalog until explicitly mapped. |
| Simulation | `engine.js` | Extract a pure recon/order/objective helper only when its contract is stable. Keep one authoritative implementation of movement and combat. |
| Planning state | `ui.js` | A small `planning-state.js` reducer for commands, phase transitions, selection, and undo. |
| Knowledge | briefing/reveal logic in engine and UI | A `knowledge.js` or equivalent pure player-view function used by advice and AI. |
| Persistence | `ladder.js`, planned V5 `store.js` | Explicit schemas, transactions, recovery, and later replay storage. |
| Replays | `playback.js`, `narrate.js` | Structured events and a shared event index; optional `replay.js` serialization helpers. |
| Analysis | simulator code in `ui.js` | `sim-worker.js` plus a transport-independent job runner and fallback. |
| Content | `maps.js`, data constants | Versioned scenarios and a validator used by training, import, and development tools. |

The useful dependency direction is:

```text
Validated rules + map + roster + committed inputs + seed
                         |
                         v
                    Simulation
                         |
               state + factual events
                    /          \
                   v            v
          player knowledge    post-round analysis
                   |            |
                   v            v
          planning/replay UI   reports/comparisons
```

Planning commands affect the next committed input. Rendering does not mutate simulation state or draw gameplay randomness. An observation filter limits information before it reaches advice or a restricted replay view.

Phase-oriented state and explicit logs are established patterns in turn-based game tooling, including boardgame.io [S3]. The architectural lesson is useful here without adopting its framework or multiplayer stack.

### 12.2 Proposed work packages after the accepted V5 packages

The names below are delivery milestones, not instructions to create agents or perform parallel work.

| Package | Scope | Main files or boundaries | Depends on | Reviewable result |
|---|---|---|---|---|
| A — V5 contract closure | Resolve V5-C1–C9 and align the accepted plan with exact semantics. | V5 document, engine contracts, focused tests. | Existing V5 decisions. | Tiny fixtures demonstrate each ambiguous rule and its chosen answer. |
| B — Planning comfort | UX-01–04 and visible group leadership. | Planning UI, command state, validator output. | A and V5 implementation. | Prepare either side, fix an error, undo a dependent change, lock correctly. |
| C — Mobile and accessible input | UX-07–09, text sizing, keyboard/tap completeness. | SVG transform/input, inspector, planning CSS. | B. | Complete ATK and DEF planning at desktop and phone widths through all input modes. |
| D — Understandable review | RE-01–05 and essential event reasons. | Engine events, narration, playback, reports. | A; event additions can be delivered with the relevant V5 mechanic. | Explain a queue, a help action, support, and a canceled objective from one replay. |
| E — Tactical laboratory | SYS-02/04, RE-06/07, scenario workbench. | Snapshot schema, simulator runner/worker, export/import. | D and validated schemas. | Reproduce a scenario on a clean load and compare a variant without blocking the UI. |
| F — Training and challenges | MAP-01–03, first-run guide, rulebook. | Scenario data, objective checks, learning UI. | D; sharing requires E. | A complete six-lesson course and a small challenge collection. |
| G — Deeper tactics | Select two of TAC-01–09 based on playtests. | Orders, utility, knowledge, opponent policies. | Stable V5 balance and E. | New decisions with visible causes and measured counterplay. |
| H — First management loop | MG-01/02/06 and a minimal MG-07 budget. | Roster ownership, recruitment, competition state, persistence. | Stable identities and reliable saves. | Play a short season, recruit an alternative, change a legal lineup, receive rewards once. |
| I — Content expansion | MAP-04/05 and validated content packs. | Map schema/editor, pathfinding, AI, validation. | E and proven map variety. | An authored new map or site variant with full rules and geometry checks. |

### 12.3 Suggested release slices

**V5: approved scope plus precise contracts.** Finish the accepted orders, objectives, recon, persistence, identity, armory catalog, and layout work. Include the validation needed to make those features reliable.

**V5.1: clarity and comfort.** Prioritize planning feedback, undo, visible leader/order state, mobile interaction, outcome explanations, and contribution reporting. A worker-backed simulator can join this release if analysis is already causing noticeable UI stalls.

**V6: learnable tactical depth.** Deliver training, scenario sharing, post-round comparisons, and a small selection of deeper orders or utility interactions. Use the laboratory to decide which ideas deserve permanent rules.

**V7: a compact manager game.** Add reserves, recruitment, a short season, and one understandable budget. Expand the base and sponsors only after this loop is enjoyable.

These version labels are proposals for sequencing. They are not new commitments or replacements for the existing roadmap.

## 13. Validation: how to know an idea works

### 13.1 Correctness and trust

| Area | Concrete scenarios to verify |
|---|---|
| Objective actions | Empty site; one versus one; last-step plant; actor dies; numerical condition changes; defuse and detonation coincide; post-plant elimination. |
| Resource use | Drone/gadget tradeoff; half-value behavior per class; duplicate lock; consumed ability; invalid imported equipment; multiple utility targets. |
| Movement | Full room; full door; breach crossing limit; fallen leader; help target dies; blocked fallback; multiple fights competing for support. |
| Information | Unseen defender movement; stale camera contact; shot-down drone; two drones observing one room; advice built from hidden state; undo after recon. |
| Persistence | Corrupted JSON; unsupported version; blocked storage; quota failure; failed migration; duplicate rewards; cosmetic rename; ladder/squad reset interaction. |
| Replay | Same inputs on a clean run; historical knowledge; skip/speed changes; incomplete old-format export; unsupported rules version. |
| Input | Mouse drag; tap-select/tap-target; keyboard-only; canceled drag; lost focus; small viewport; larger text; reduced motion. |

Keep semantic assertions small and independent. For example, test that a reserved planter does not appear in combat or support participants, rather than reproducing the entire combat function in the expected result.

### 13.2 Balance and statistical reporting

Retain the accepted V5 mirror and staggered-split targets, but report enough context to interpret them:

- Rules version, map, sides, roster quality, archetypes, plan-generation policy, and seed list.
- Number of matches and rounds, with per-map and per-scenario results.
- ATK win rate, ending distribution, plant attempts/completions/interruptions, and defuse attempts.
- Arrival gaps, door/room queue delays, frequency of Help/Hold/Fall back, and retreat loops.
- Recon coverage of unique defenders and traps, exact versus occupied-only observations, and utility sacrificed.
- Flank advantage, role/weapon legality, and the existing power-budget concerns.

Use confidence intervals or repeated seed batches. Rounds within one match are related through score, side sequence, and ability use, so do not automatically treat every round as an independent sample. A match-level or clustered analysis is more appropriate for many comparisons.

For an A/B feature test, keep the roster/map/scenario distribution comparable. Record paired seeds where useful, and recognize that changed decisions may change later random draw sequences. A single lucky replay is an illustration, not evidence that a new tactic is stronger.

Do not tune only to the average. A good global result can hide a broken map, a dominant loadout, or a staggered-split failure.

### 13.3 Player-experience measures

Use small, observed playtests before building a large telemetry system. Suggested questions and measures:

| Question | Observable evidence |
|---|---|
| Can a new player create a valid plan? | Completion without assistance; errors encountered; time spent finding the blocked action. |
| Can the player explain a loss? | Their account matches the actual outcome condition and at least one relevant event. |
| Does the new order create control? | The player predicts its trigger and notices when it changes behavior. |
| Is mobile planning practical? | A complete recon and plan at 390-pixel width without mis-selecting doors or hunting through a wide table. |
| Does comparison teach anything? | The player makes a justified second attempt instead of repeatedly rerolling the same plan. |
| Does progression create choices? | Different recruits or upgrades are selected for explainable tactical reasons. |
| Is the simulator responsive? | Progress updates arrive; Cancel and navigation work while a large job is active. |

Set numerical UX targets after collecting a baseline. The viewport measurements in this review are real observations; future completion-time or usability targets should not be presented as already measured.

## 14. Research sources and how to use them

The external research used public primary documentation accessed on **2026-10-29**, including the projects' official GitHub documentation. These sources establish examples and implementation patterns; they do not prove that a feature will be enjoyable in Squad Sim.

| Ref | Source | Relevant evidence | Application here |
|---|---|---|---|
| S1 | [OpenRA README](https://github.com/OpenRA/OpenRA/blob/bleed/README.md) | Documents mapping, custom rules, missions, and mod-development resources. | A validator-first map/content workflow, authored scenarios, and clean data boundaries. |
| S2 | [OpenRA: Playing the game](https://github.com/OpenRA/OpenRA/wiki/Playing-the-game) | Recommends recorded-game analysis, learning hotkeys, and deliberate map navigation. | Replay as a teaching tool; searchable controls; usable pan/zoom. |
| S3 | [boardgame.io README](https://github.com/boardgameio/boardgame.io/blob/main/README.md) | Describes turn phases, game-state management, logs/time travel, AI, and multiplayer tooling. | Explicit phase transitions and replayable state; no framework adoption is required. |
| S4 | [Battle for Wesnoth manual](https://github.com/wesnoth/wesnoth/blob/master/doc/manual/manual.txt) | Describes linked campaigns, carrying units forward, recruitment/recall, and movement previews. | A small connected operation, meaningful reserves, and readable route predictions. |
| S5 | [W3C: Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), checked through its [official source](https://github.com/w3c/wcag/blob/main/understanding/22/dragging-movements.html) | Explains the need for single-pointer alternatives to dragging and distinguishes them from keyboard accessibility. | Tap-select/tap-destination and complete keyboard controls for planning. |
| S6 | [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), checked through its [official source](https://github.com/mdn/content/blob/main/files/en-us/web/api/web_workers_api/using_web_workers/index.md) | Describes background execution, messaging, script loading, DOM separation, and worker termination. | Responsive simulation jobs with progress, cancellation, and a local-file fallback. |

OpenRA's replay-learning guidance [S2] is particularly relevant: Squad Sim already generates the detailed events needed for analysis. Its opportunity is to present those events as understandable decisions instead of requiring the player to infer everything from tables.

## 15. What to defer, and the first ten decisions to make

### Defer until the smaller loop is proven

- A real-time multiplayer backend and public ranked ladder.
- A large economy with many currencies, markets, taxes, and maintenance systems.
- Mandatory real-world waiting for construction or recovery.
- Full 3D combat, physical bullets, unrestricted destruction, and multi-floor maps in the same release.
- Hundreds of playable weapons imported directly from the image collection.
- More core stats or a move away from the accepted 0–100 scale.
- A general-purpose scripting language for player orders.
- Hidden difficulty adjustments or AI access to unrevealed plans.
- Large libraries of random traits that mostly add indistinguishable bonuses.
- A technology rewrite whose benefits are not tied to a measured problem.

These features could each become a separate project. The current game can gain substantial depth through clearer information, a few meaningful tactical choices, and reusable content.

### First ten decisions

1. **Choose the exact objective step order and terminal-result precedence** before implementing plant/defuse.
2. **Define recon's knowledge and commitment boundaries**, including half-value binary gadgets.
3. **Choose deterministic order, help, and support tie-breaking rules**, with visible leadership.
4. **Decide the save/import contract and stable IDs**, keeping the armory catalog separate from combat.
5. **Implement structured planning validation and one contextual inspector** before adding more controls.
6. **Add phase-aware undo and explicit dependent-change feedback.**
7. **Make the mobile map and non-drag input paths practical.**
8. **Explain outcomes, actions, and contributions from factual events.**
9. **Build reproducible scenarios and a responsive post-round analysis runner.**
10. **Use a short training course and playtests to choose between deeper tactics and the first season/roster loop.**

The desired result is a game where a player can formulate a plan, understand its execution, learn from a result, and return with a better idea. That foundation will make later recruitment, equipment, maps, campaigns, and social features substantially more valuable.
