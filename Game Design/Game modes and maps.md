# Game Modes & Maps

Round v2 (Plan v2, delivered 2026-10-29). Every rule and number here is what `demo/maps.js` and `demo/engine.js` run; the formulas are in [[Formula]] §9, §10, §14 and §23.

---

## Game Modes

| Mode | Objective | In the demo |
|------|-----------|-------------|
| **Bomb / Plant** | ATK plants the bomb on the site. DEF defuses or eliminates ATK before detonation. | yes, one site per map (a second site is a later step) |
| **Hostage** | ATK extracts the hostage from a defended location. DEF protects and prevents extraction. | not implemented |

---

## The map model: a graph of zones

A map is a single floor drawn top-down, cut into **zones** (rooms, corridors, yards) joined by **doors** (edges). Operators stand in zones and move one zone per step along the edges; a fight happens in a zone where an ATK group and a defender meet. The whole map is visible at once in the floor-plan view.

```js
MAPS2['Meridian Office Tower'] = {
  size: [800, 520],                    // SVG units
  spawns: ['ext-s', 'ext-w', 'ext-e'], // Exterior zones where ATK starts
  site: 'site',                        // the one bomb site
  zones: { 'lobby': { label: 'Main lobby', type: 'Entry', space: 'Narrow', poly: [[x, y], ...], anchor: [x, y] }, ... },
  edges: [['ext-s', 'lobby'], ...],    // undirected doors
  doors: [['ext-s', 'lobby', [400, 460]], ...], // where each door is drawn
}
```

- Every map has 14–18 zones, 2–3 Exterior spawns, exactly one Site, at least **three edge-disjoint spawn→site paths** and at least one **flank**: a path whose last zone before the site differs from those of the two shortest paths. `node demo/engine.test.js` checks all of it, plus that rooms do not overlap and that every door sits on a shared wall.
- `Engine.paths(map, from, to, k)` returns the k shortest simple paths, `Engine.dist(map, a, b)` the hop distance, `Engine.route(map, from, to, avoid)` the shortest path around one zone (used by reroutes).

### Zone types

The type sets the space type, the default situation of a fight there (Formula.md §14.3), the role fit (§14.1) and the weapon fit (§16.1).

| Zone type | Space | Default situation | On the maps |
|------|---|---|-------------|
| **Exterior** | Open | Gunfight | spawns: streets, yards, loading areas |
| **Entry** | Narrow | Breach | doors, windows, loading bays: the first room after a spawn |
| **Hallway** | Narrow | Gunfight | corridors, tunnels, galleries |
| **Stairs** | Narrow | Gunfight | stairwells, ladders |
| **Rotation** | Connector | Reposition | connector rooms between lanes |
| **Power** | Open | Gunfight | open floors and high-value rooms |
| **Site** | Fortified | Objective | the bomb site |

### Zone control

Every zone has its own status: `+1` ATK-held, `0` contested, `−1` DEF control, `−2` reinforced. Spawns start at +1, reinforced zones at −2, every other zone at −1. A fight moves the status toward its winner; an empty zone that a group enters falls at once (a reinforced one a step later); a zone at +1 is taken, and taking the site plants the bomb (Formula.md §23.1). The zone control bonus (±3 per side) reads the fight zone's status.

---

## How zones affect operators

### Role performance by zone type

| Zone | Favored roles (× 1.10) | Disadvantaged roles (× 0.90) |
|------|--------------|---------------------|
| Exterior | Roamer, Lurker | Anchor, Trap Specialist |
| Entry / Hallway | Entry, Second Entry, Trap Specialist | Support Defender, Anchor |
| Stairs | — | — |
| Rotation | Roamer, Lurker, Flex | Anchor, Utility Specialist |
| Power | Support, Utility Specialist | Entry |
| Site | Anchor, Support Defender | Roamer, Lurker |

"Long Range operators" are not an MVP role; the DMR's +6 in Exterior, Power and Site zones carries that idea (Formula.md §16.1).

### Gadget effectiveness by space type

| Space type | Boosted gadgets (× 1.10) | Weakened gadgets (× 0.90) |
|------------|----------------|-----------------|
| Narrow (Entry, Hallway, Stairs) | Flashbang, Barbed Wire, Freeze Trap, Deployable Shield | Smoke Grenade, Cover Smoke Launcher |
| Open (Exterior, Power) | Smoke Grenade, Drone, Intel Beacon, Recon Pulse | Flashbang, Laser Trip Mine |
| Fortified (Site) | Thermite Charge, EMP Grenade, Breaching Charge | Motion Sensor, Decoy Device |
| Connector (Rotation) | Proximity Alarm, Flank Wire, Ambush Grenade | Reinforcement Panel |

---

## Maps

Three maps. Vantage Secondary School and Crosspoint Mall are retired for now. The paths below come from `Engine.paths`; "independent" means edge-disjoint (no door used twice), and the flank is the path the test plays against the shortest one (Formula.md §29). The "Role strengths / weaknesses" lines are design intent; the simulation applies only the zone-level fit above.

### 1. Meridian Office Tower
*High-rise corporate office: long corridors, open floor, glass partitions.* 16 zones, 26 doors.

| id | Label | Type |
|---|---|---|
| `ext-s` | Main street | Exterior (spawn) |
| `ext-w` | Fire escape | Exterior (spawn) |
| `ext-e` | Service alley | Exterior (spawn) |
| `archives` | Archive stacks | Hallway |
| `break` | Break room | Rotation |
| `stairs` | Fire stairs | Stairs |
| `hall-w` | West corridor | Hallway |
| `glass` | Glass conference | Rotation |
| `site` | Executive boardroom | Site |
| `hall-n` | North corridor | Hallway |
| `open` | Open office floor | Power |
| `lobby` | Main lobby | Entry |
| `hall-e` | East corridor | Hallway |
| `exec` | Corner office | Power |
| `vent` | Vent shaft | Entry |
| `mail` | Mail room | Entry |

- Site neighbours: `hall-n`, `glass`, `hall-e`.
- Shortest paths: from `ext-e` 3 hops (`ext-e > mail > hall-e > site`, or through `vent`); from `ext-s` and `ext-w` 4 hops.
- Three independent paths: `ext-s > lobby > open > hall-n > site` · `ext-w > stairs > hall-w > glass > site` · `ext-e > mail > hall-e > site`.
- Flank: `ext-s > lobby > open > hall-n > site` (enters through the North corridor; both shortest paths enter through the East corridor).
- Character: the east side (mail room, vent shaft, corner office) is the short way in; the west wing (fire stairs, break room, archives, glass conference) is the long way round. Role strengths: Support Defender, Lurker; weaknesses: Trap Specialist (many entry points), Roamer.

### 2. St. Mora Hospital
*Hospital complex: open reception, long wards, narrow service tunnels.* 16 zones, 24 doors.

| id | Label | Type |
|---|---|---|
| `ext-n` | Garden courtyard | Exterior (spawn) |
| `ext-w` | Service yard | Exterior (spawn) |
| `ext-s` | Ambulance bay | Exterior (spawn) |
| `gate` | Tunnel entrance | Entry |
| `tunnel` | Service tunnel | Hallway |
| `stairs` | Stairwell | Stairs |
| `window` | Ward window | Entry |
| `ward` | North ward | Hallway |
| `pharmacy` | Pharmacy | Power |
| `hall` | Ward corridor | Hallway |
| `reception` | Reception | Power |
| `entrance` | Main entrance | Entry |
| `lift` | Lift lobby | Rotation |
| `site` | Operating theatre | Site |
| `scrub` | Scrub room | Rotation |
| `ambulance` | Ambulance doors | Entry |

- Site neighbours: `hall`, `lift`, `scrub`.
- Shortest paths: from `ext-s` and `ext-n` 3 hops; from `ext-w` 5 hops (`ext-w > gate > tunnel > stairs > hall > site`, the tunnel route).
- Three independent paths: `ext-s > entrance > lift > site` · `ext-s > ambulance > scrub > site` · `ext-n > window > hall > site`.
- Flank: `ext-n > window > hall > site` (through the Ward corridor; the two shortest enter through the Lift lobby and the Scrub room).
- Character: the south front (main entrance, ambulance doors) is short and direct; the garden window and the service tunnel come in from the north and west. Role strengths: Roamer, Utility Specialist, Second Entry; weaknesses: Support Defender (too spread out).

### 3. Ironfield Factory
*Industrial plant: loading bay, machinery cover, catwalk connector.* 15 zones, 25 doors.

| id | Label | Type |
|---|---|---|
| `ext-e` | Truck yard | Exterior (spawn) |
| `ext-s` | Rail siding | Exterior (spawn) |
| `site` | Control room | Site |
| `gantry` | Gantry | Power |
| `catwalk` | Catwalk | Rotation |
| `ladder` | Catwalk ladder | Stairs |
| `boiler` | Boiler room | Hallway |
| `floor` | Factory floor | Power |
| `press` | Press line | Entry |
| `locker` | Locker room | Rotation |
| `pipes` | Pipe gallery | Hallway |
| `rail` | Rail door | Entry |
| `assembly` | Assembly line | Hallway |
| `forklift` | Forklift lane | Rotation |
| `bay` | Loading bay | Entry |

- Site neighbours: `gantry`, `boiler`, `locker`. The site sits in the north-west corner, away from both spawns.
- Shortest paths: from `ext-s` 3 hops (`ext-s > rail > boiler > site`); from `ext-e` 4 hops (`ext-e > ladder > catwalk > gantry > site`).
- Three independent paths: `ext-e > ladder > catwalk > gantry > site` · `ext-e > press > floor > boiler > site` · `ext-s > rail > boiler > locker > site`.
- Flank: `ext-s > rail > boiler > locker > site` (through the Locker room; the two shortest enter through the Boiler room and the Gantry).
- Character: the catwalk runs over the factory floor to the gantry; the boiler room is the hub the southern routes touch. Role strengths: Roamer, Utility Specialist, Flex; weaknesses: Anchor, Support Defender (many angles).

---

## Planning phase (step 0)

Every round starts with a planning phase, resolved in this order: **DEF setup → intel → ATK plan** (Formula.md §9). Placements reset every round. The player makes the setup when defending and the plan when attacking; the opponent uses its archetype template.

### DEF setup

- **Positions.** Every DEF operator stands on a zone that is not a spawn and fights there. The default puts the Anchor and the Support Defender on the site.
- **Reinforcements.** 2 per round, on distinct non-spawn zones. A reinforced zone starts at −2, so it needs one more ATK win to fall, and ATK gets −6 in Breach and Objective fights there. An ATK breach gadget on the zone cancels it; taking the zone removes it.
- **Traps.** One per DEF operator with a trap gadget (Barbed Wire: Trap Specialist; Flank Wire: Lurker), on distinct non-spawn zones. The first group to enter gets −4 on every stat for that step, cannot take the zone that step, and DEF learns where it is.
- **Roam.** Flagged defenders move one zone per step toward the nearest ATK group; the others hold. A Dominant ATK win anywhere also sets the closest free holder (not on the site) roaming. After the plant every defender converges on the site.

### Intel reveal

Intel is rolled after the DEF setup. When ATK wins it, the bucket decides what ATK sees before it plans: below 3 nothing; 3 to 6 the reinforcements; 6 to 10 reinforcements and traps; 10 or more also every DEF position. When DEF wins, ATK learns nothing. DEF sees the ATK spawns, never the groups.

### ATK plan

- **Groups.** 1 to 3 groups; every ATK operator in exactly one. Each group walks its own simple path from a spawn to the site along the doors; the planning screen offers the shortest paths and lets the player click zones to edit.
- **Sync.** Before the plant a group waits in the room next to the site until every other group holds its own, then all go in on the same step.
- **Reroute.** A group that loses a fight Clear or Dominant in a zone it has not taken falls back one zone and takes the shortest path around that zone, if that costs at most 3 extra steps.
- **Gadget placement.** Spent in planning on a zone of the operator's own path. Drone, Scout Drone, Camera Network: reveal the DEF positions in that zone and its neighbours. Breaching Charge, Thermite Charge, EMP Grenade: cancel a reinforcement there. Smoke Grenade: +7 to ATK in Breach and Objective fights there. An operator that places its gadget loses its per-situation gadget bonus for the round; one that keeps it gets half.

### AI templates

| DEF | Setup | ATK | Plan |
|---|---|---|---|
| S — Stack site (Tactical) | all five on the site; reinforce and trap the two busiest site neighbours | A — One lane (Rush) | all five on the cheapest path |
| P — Spread (Utility-heavy) | Roamer, Lurker, Trap Specialist on the site neighbours; traps on the chokes after the spawns | B — Split (Tactical) | 3 + 2 on two paths through different site neighbours |
| R — Roam (Rush) | as P, Roamer and Lurker roam | C — Flank (Utility-heavy) | 2 + 1 + 2 on three paths; the costliest (the flank) gets Utility Specialist + Flex |

Balanced opponents and the mirror draw a template each round. Balance per map and template pair: Formula.md §29.

---

## Design rules

- Every map has at least three independent ways to the site and a flank, so one lane with all five is a choice, not the default; no ATK or DEF template may win 55% or more on average, or be the best on every map (Formula.md §32).
- Every map has open and narrow zones, so gadget and weapon fit always matter.
- One site per map for now; the site's neighbours are where defences spread, reinforce and trap.
- Two floors, Hostage mode and map-level role strengths are out of scope for the demo.
