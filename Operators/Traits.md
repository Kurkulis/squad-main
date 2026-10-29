# Traits

Traits represent an operator's instincts, personality, and hard-earned habits. They are passive modifiers that activate in specific situations – especially in high-pressure moments like clutches, long match streaks, and high-stakes rounds.

Traits were planned as a later-update feature. **They are now implemented in the demo** (decision Q7: 9 passive traits first, one active ability per operator later). Each MVP operator has one trait (`op.trait`); generated operators copy their role template's trait.

---

## Current trait list

| Trait | Effect | Best on |
|-------|--------|--------|
| **Cold Blooded** | Increased performance in clutch situations | Entry, Lurker |
| **Tunnel Vision** | +Shooting, -Awareness | Entry, Second Entry |
| **Shot Caller** | +Teamwork for the entire squad while this operator is alive | Support, Support Defender |
| **Breacher** | Bonus effectiveness in breach situations | Entry, Utility Specialist |
| **Aggressive** | Stronger entry performance, but higher casualty risk | Entry, Roamer |
| **Unstable** | Randomly peaks or collapses – high variance operator | Any |
| **Veteran** | Reduced performance penalty under pressure and fatigue | Anchor, Support |
| **Drone Expert** | Stronger info gathering during the ATK phase | Support, Utility Specialist |
| **Fortifier** | Better DEF setup effectiveness | Anchor, Trap Specialist |

---

## MVP implementation

`TRAITS` in `demo/data.js`, applied by the `trait` contributor (Formula.md §19.1). Each trait is within about ±3 stat points or one conditional effect.

| Trait | Implemented effect | When | MVP roster | Measured (trait off, round-win change) |
|---|---|---|---|---:|
| Cold Blooded | Shooting +3, Decision +2 | Clutch situation | Breach, Shade | +0.2 |
| Tunnel Vision | Shooting +3, Awareness −3 | always | Haze | +0.2 |
| Shot Caller | Teamwork +2 for every alive operator of the side | while alive, every step incl. intel | Watcher, Lens | −1.0 |
| Breacher | Utility +3, Shooting +2 | Breach situation | — (on Breach instead of Cold Blooded: −0.3) | — |
| Aggressive | Shooting +4, casualty risk × 1.5 | Entry phase | Jackal | +0.6 |
| Unstable | every stat ± the same roll, −6 to +6, from the round's generator | every step incl. intel | Mirage | +0.0 |
| Veteran | all stats +3 (cancels the −3 fatigue) | step ≥ 9 (`cleanupFrom`) | Fortress | −1.9 |
| Drone Expert | +4 flat | intel step (Info) | Volt | +0.5 |
| Fortifier | Utility +3 | DEF in Objective or Utility | Wire | −0.2 |

Measured with `node demo/engine.test.js --sens` on round v2, 2026-10-29 (MVP roster vs a quality-58.6 Balanced opponent, 2000 matches per row; noise about ±1 point). All traits off: −4.2. Single traits are flavour; Veteran (−1.9) and Shot Caller (−1.0) are the only ones at or above noise.

**Power budget (Q3):** a fully equipped squad (every item tier 6, traits on) should beat a bare one (tier 1, no traits) by +7 to +13 round-win points. Measured on round v2: +10.5 (seed 777). The test fails outside the band. Full table: Formula.md §29.

---

## Design notes

- Each operator should have **one trait** assigned (possibly two for high-tier operators)
- Traits should feel like a personality descriptor, not just a stat buff
- Negative side effects on traits (like Tunnel Vision's awareness penalty) make roster decisions more interesting
- **Unstable** is intentionally high-risk – some players will love it, some will avoid it

---

## Planned additions *(todo)*

- Traits that interact with specific gadgets (e.g. a Drone Expert should synergize with Scout Drone or Intel Beacon)
- Traits that trigger based on round history (e.g. performs better after a loss streak)
- Negative traits that appear as operators age or get injured
- Trait unlocking through operator progression and leveling