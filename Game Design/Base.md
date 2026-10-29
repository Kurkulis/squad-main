
The base is your organization's headquarters. It is where operators are trained, gear is crafted and upgraded, and your overall operational capability grows. Base development is a long-term investment – the more you build, the more options open up across every other system.

---

## Base levels

The base itself has an overall level that gates what can be built inside it. Reaching a level threshold requires spending money and in-game time – it is not free. Higher base levels unlock new rooms and higher upgrade tiers for existing ones.

Base levels, thresholds, and costs are **to be defined** – see [To do](#to-do).

---

## Construction rules

- **One room at a time.** Only one room can be built or upgraded simultaneously. Starting a new construction cancels or queues behind the current one.
- **Takes time.** Each build or upgrade has a completion timer, similar to Clash of Clans. The higher the upgrade level, the longer it takes.
- **Costs money.** Each build and upgrade has a cost paid upfront. Exact values are to be defined.

---

## Rooms

### 🟢 Starting room

| Room | Starting level | Function |
|------|---------------|----------|
| **Storage** | Level 1 | Holds all items in your inventory. See [Storage system](#storage-system) below. |

All other rooms must be constructed during gameplay.

---

### 🔵 Buildable rooms

#### Combat Training Room
Dedicated to **Combat stats**: Shooting, Close/Mid/Long Range modifiers, Reaction.

- Operators are assigned here for a training session of set duration
- Higher room level = faster training, higher stat ceiling reachable
- Only one operator can train per room at a time at lower levels *(capacity scaling to be defined)*

#### Tactical Training Room
Dedicated to **Tactical stats**: Awareness, Decision Making, Utility Handling, Discipline, Teamwork.

- Same session-based system as Combat Training Room
- Scenario drills that simulate round situations
- Higher room level unlocks more advanced drills targeting specific tactical stats

#### Mental Conditioning Room
Dedicated to **Mental / Hidden stats**: Clutch, Composure, Aggression, Consistency.

- Addresses operator mental performance and pressure resilience
- Also used to recover Composure and Consistency after difficult match streaks
- Higher room level reduces recovery time and unlocks deeper conditioning sessions

#### Workshop
Used to craft and upgrade items by combining duplicates or scrapping lower-tier versions.

**Core mechanic (CS:GO-style):**
Combine a set number of the same item or same attachment type to produce a higher quality version.

- Example: combine 4× Standard SMGs → 1× Advanced SMG
- Example: combine 3× Advanced Foregrips → 1× Professional Foregrip
- The exact combine ratios scale with quality tier – higher tier requires more inputs

Higher workshop level unlocks:
- Larger item combine ratios (more efficient crafting)
- Access to Tier 4 Custom item crafting *(detailed system – to be expanded in future update)*
- Tier 5 Unique item upgrades for qualified operators

> Detailed crafting formulas and tier unlock requirements will be defined in a later update.

#### Intel Room
Required for researching item blueprints before they can be crafted in the Workshop.

- Without Intel Room, Workshop is limited to basic combine crafting
- Higher level = faster research, access to rarer blueprints

---

## Storage system

Inspired by Escape from Tarkov's stash system. Your storage has a **fixed grid capacity** that determines how many items you can hold at once.

### How it works

- Each item occupies a number of grid slots based on its size
- Primary weapons take more space than secondary weapons or gadgets
- Consumables and attachments are smaller
- When storage is full, new items cannot be acquired until space is freed

### Managing storage

- **Sell** items you no longer need (through the auction or direct sell)
- **Scrap** items to convert them into crafting materials for the Workshop
- **Combine** duplicate items in the Workshop to free up slots while increasing quality
- **Stash overflow** is not allowed – you must actively manage your inventory

### Storage levels

| Level | Grid size | Notes |
|-------|-----------|-------|
| 1 | Small *(exact size – to be defined)* | Starting size. Very limited. |
| 2 | Medium | First upgrade – fits a full active roster's gear comfortably |
| 3 | Large | Comfortable hoarding, stacking duplicates for crafting |
| 4 | Max | *(to be defined)* |

Upgrading storage requires base construction time and money.

---

## Staff

Only one staff role is active for now. More may be added in later updates.

| Staff member | Role | Effect |
|--------------|------|--------|
| **Scout / Recruiter** | Recruitment | Finds better operator candidates, shorter search time, higher stat accuracy on returned candidates. Scout quality level affects results. |

Scout is hired and paid a salary – tracked in [[Economy]].

---

## Starting state

On day one the player has:
- **Storage Room – Level 1** only
- No other rooms built
- No staff hired
- All other rooms must be constructed by spending money and waiting

---

## ❓ Open questions

- How many operators can train simultaneously at higher room levels?
- Is there a base capacity limit for total operators housed?
- Can two different room *types* be upgraded simultaneously, or strictly one at a time?
- Visual: does the base have a top-down layout view or just a room list?

---

## 📋 To do

- [ ] Define base overall levels and upgrade thresholds (how much money / how many matches)
- [ ] Define base level capacity – what each base level unlocks (max rooms, max staff, etc.)
- [ ] Define construction costs and build times for each room and each upgrade level
- [ ] Define storage grid sizes per level
- [ ] Define Workshop combine ratios per tier (how many inputs → one output)
- [ ] Define Tier 4 Custom crafting formula in detail
- [ ] Define training session durations and stat gain rates per room level
- [ ] Decide staff expansion (who gets added after Scout, and when)