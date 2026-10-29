# Item System

Items are split into categories and quality tiers. Each item type provides stats bonuses that are logically tied to what that item is – armor improves survivability, not damage; weapons improve combat performance, not awareness, and so on.

---

## Quality Tiers

| Tier | Name | Description |
|------|------|-------------|
| **1** | Standard | No stat bonus or a very minor one. Cheapest and easiest to obtain. Starting gear. |
| **2** | Advanced | Noticeable stat improvements. Purchasable through the auction or match prizes. |
| **3** | Professional | The best gear obtainable through normal means. Auction, market, mission rewards. |
| **4** | Mastercraft | The best items you can produce yourself. Cannot be bought – must be crafted at your base. Quality scales with how well your base facilities, organization level, and sponsor requirements are met. Higher requirements unlock better crafted variants. |
| **5** | Unique | Stronger items tied to specific operators. Cannot be manufactured – only upgraded at the base if both the facility and the operator meet the requirements. Not transferable. |
| **6** | Sponsor Exclusive | Items provided by top 5 major sponsors through their exclusive market or mission rewards. Not always the strongest numerically, but reflect the sponsor's identity and values. Cannot be bought or sold. Unique to each sponsor. |

---

## Item Categories

### Weapons

**Primary**
- SMG
- DMR (Designated Marksman Rifle)
- AR (Assault Rifle)
- Bolt-action rifle
- Shotgun

**Secondary**
- Pistol
- Compact shotgun
- Auto pistol
- Revolver

> Weapons affect combat stats: Shooting, Close / Mid / Long range modifiers.

> Sidearms never penalize operator strength. In the MVP the Pistol gives a flat +2 in every zone, with no weak zones; future pistol attachments only add value.

---

### Armor

- **Light** – maximum mobility, minimal protection
- **Medium** – balanced survivability and movement
- **Heavy** – highest protection, reduced speed and reaction

> Armor affects survivability and composure under fire. Does not affect damage output.

---

### Gadgets

Gadgets follow the role-lock system defined in [[Operators/Gadgets]].  
Quality tier applies to gadgets as well – a higher tier Breaching Charge may carry more charges or have a wider blast radius, a higher tier Drone may have longer range or better detection, etc.

---

### Gun Accessories *(planned – not in MVP)*

Accessories will have a meaningful impact on stats in later versions.

| Accessory | Affects |
|-----------|---------|
| Sight | Accuracy at mid / long range |
| Laser sight / Flashlight | Close range performance, reaction |
| Magazine | Ammo capacity, reload speed |
| Foregrip | Recoil control, stability |
| Stock | Control under sustained fire |
| Bullet type | Damage profile, armor penetration |
| Compensator / Flash hider / Suppressor | Noise, recoil, concealment |

---

## Crafting System (Tier 4 – Mastercraft)

Tier 4 Crafted items cannot be found in the auction or bought anywhere. They can only be produced at your base and represent the peak of what your organization is capable of building.


---

## Acquiring Items

Items are obtained through the same demand-based auction system used for operator recruitment. See [[Economy]] for the full bidding mechanic.

| Method | Description |
|--------|-------------|
| Auction | Randomly listed items at set intervals, bid against AI competitors |
| Match prizes | Gear rewards after winning matches or tournaments |
| Base crafting | Tier 4 items crafted at your base – requires facilities, org level, and sponsor standing |
| Sponsor rewards | Tier 6 exclusive items from major sponsor contracts or missions |
| Base upgrading | Tier 5 unique items can be upgraded (not created) at the base, operator must qualify |

---

## Stat logic rules

- **Weapons** → affect Shooting, range modifiers, Reaction
- **Armor** → affects survivability, Composure, movement-related penalties
- **Gadgets** → affect Utility Handling efficiency and situation-specific bonuses
- **Accessories** → fine-tune existing weapon stats (no cross-category effects)
- No item can grant a bonus that is logically unrelated to its type
- Sidearms never penalize: their fit bonus is never negative

---

## MVP implementation

Items are objects `{ class, tier }` (`gadget`, `armor` on each operator in `demo/data.js`); weapons are `{ id, class, tier }` (`primary`, `secondary`), where `id` is a `WEAPON_CATALOG` entry. Fit tables are keyed by class; the tier adds a small, separate effect; the weapon's catalog mods trade stat points. The MVP roster is tier 1 everywhere.

| Tier | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| Primary weapon: Shooting (`WEAPON_TIER_SH`) | +0 | +0 | +1 | +1 | +1 | +2 |
| Armor: Awareness and Decision each (`ARMOR_TIER`) | +0 | +0 | +0 | +1 | +1 | +1 |
| Gadget: × its situation value (`GADGET_TIER_MULT`) | × 1.00 | × 1.03 | × 1.06 | × 1.09 | × 1.12 | × 1.15 |

- Secondary weapon tier has no effect yet.
- Class fit: weapon by zone (SMG/Shotgun +6 in Entry, Hallway, Stairs, −6 in Exterior, Power; AR +4 in Entry, Hallway, Rotation, Site; DMR +6 in Exterior, Power, Site, −6 in Hallway, Stairs; Pistol +2 everywhere), armor by situation (Light, Medium, Heavy). Full tables: Formula.md §15–§16.
- Bolt-action rifle, the other secondaries and accessories are not in the MVP.

### Weapons catalog

`WEAPON_CATALOG` in `demo/catalog.js` (Formula.md §16.5): three weapons per primary class and two pistols. Each weapon is a class (zone fit and tier as above) plus stat `mods` that are added to the operator's effective stats in every situation, the intel roll included. Mods are integers from −4 to +4 and sum to 0 or +1, so a weapon trades one stat for another instead of adding power.

| id | Name | Class | Shooting | Awareness | Teamwork | Utility | Decision | Luck | Net |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `smg-vector` | Vector .45 | SMG | +4 | −2 | 0 | 0 | −2 | 0 | 0 |
| `smg-mp5` | MP5 SD | SMG | −2 | +3 | +1 | 0 | −1 | 0 | +1 |
| `smg-p90` | P90 | SMG | +1 | −2 | +2 | +1 | −2 | 0 | 0 |
| `ar-m4` | M4 Carbine | AR | +1 | −1 | −2 | 0 | +2 | 0 | 0 |
| `ar-ak` | AK-12 | AR | +3 | −2 | 0 | −2 | 0 | +1 | 0 |
| `ar-aug` | AUG Optic | AR | −1 | +2 | 0 | 0 | +1 | −1 | +1 |
| `dmr-sr25` | SR-25 | DMR | +3 | −2 | −2 | 0 | +1 | 0 | 0 |
| `dmr-mk14` | Mk14 EBR | DMR | −1 | +3 | 0 | −2 | +1 | 0 | +1 |
| `dmr-svd` | SVD | DMR | +4 | 0 | −3 | 0 | −3 | +2 | 0 |
| `sg-m870` | M870 Pump | Shotgun | +3 | −1 | 0 | −1 | −2 | +1 | 0 |
| `sg-spas` | SPAS-12 | Shotgun | +1 | −2 | 0 | +3 | −2 | 0 | 0 |
| `sg-saiga` | Saiga-12 | Shotgun | +4 | −2 | +1 | 0 | −3 | 0 | 0 |
| `pistol-m9` | M9 | Pistol | 0 | 0 | 0 | 0 | +1 | 0 | +1 |
| `pistol-de` | Desert Eagle | Pistol | +2 | −1 | 0 | 0 | 0 | 0 | +1 |

MVP roster defaults: Breach and Jackal Vector .45, Haze AK-12, Watcher and Lens AUG Optic, Volt and Mirage M4 Carbine, Fortress SR-25, Shade MP5 SD, Wire SPAS-12; every sidearm is the M9. Generated opponents draw a random weapon of their archetype's class. One swap within a class moves the round win by less than one point (Formula.md §29); the class, through its zone fit, matters more.

### Role → weapon class

`ROLE_CLASSES` in `demo/catalog.js`. The weapon select on the operator card offers every catalog weapon of these classes, with a live preview of the effective stats and the score; the sidearm select offers both pistols.

| Roles | Allowed primary classes |
|---|---|
| Entry, Second Entry, Roamer | SMG, Shotgun, AR |
| Support, Utility Specialist, Flex, Support Defender | AR, SMG |
| Trap Specialist | AR, SMG, Shotgun (Shotgun because the MVP roster's Wire carries one) |
| Anchor, Lurker | DMR, AR, SMG |

**Power budget (Q3).** 1 stat point on all six stats is worth about 1 score point, and the best-of-7 format doubles any round edge, so item tiers must stay small. Target: a fully equipped squad (every item tier 6, traits on) beats a bare one (tier 1, no traits) by +7 to +13 round-win points. Measured with `node demo/engine.test.js --sens` on round v2 (seed 777): +10.5; per category at tier 6: primary +2.4, armor +2.2, gadget +1.2, all items +6.2. The first tier tables (weapon +0…+3, armor +0…+2, gadget × 1.0…× 1.5) measured +22.4 on round v1 and were halved. See Formula.md §29.

