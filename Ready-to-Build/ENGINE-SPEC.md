# Engine Spec — normative

Everything in this file is binding. Where this file and any other document
disagree, this file wins for M0 implementation. Where this file is silent,
ask the orchestrator — do not invent.

All balance values referenced as `balance.<path>` come from
`data/balance.json`. **Never transcribe one into code.**

---

## 1. Coordinate space and time

| | |
|---|---|
| Logical playfield | `720 × 480` |
| Render scale | integer only; 2× baseline (`1440 × 960`), 3× for high-DPI |
| Origin | top-left, y down |
| All distances | logical pixels (range 118 means 118 logical px) |

Map polylines, ranges, and the combo radius are all authored in logical
space. Never scale a game-logic distance by the render scale.

### 1.1 Tick rates

Systems tick on independent fixed intervals, driven by an accumulator
against wall-clock milliseconds — **not** by the render loop.

| System | Interval |
|---|---|
| Render | display refresh (uncapped) |
| Attacker movement | 64 ms |
| Tower logic (acquire, fire, recharge) | 70 ms |
| Modifier recomputation | on change only, never polled |
| Wave spawning | 200 ms |

A tick must produce identical results regardless of frame rate. If the
tab is backgrounded for 3 s, the accumulator runs the missed ticks
(capped at 12 per frame to avoid a spiral of death) rather than taking
one large timestep.

### 1.2 Determinism

M0 must be deterministic given `(seed, difficulty, map, input log)`.

- One seeded PRNG instance. No `Math.random()` anywhere.
- Iterate collections in insertion order; never rely on object key order.
- No floating-point accumulation of positions across ticks where an exact
  recomputation is available.

This is what makes the parity harness meaningful. Non-determinism is a
mechanics violation under `ADVERSARY.md` check 2.

---

## 2. Maps

`data/maps.json` — 13 entries keyed by display name.

```json
{ "Classic": { "base": {"x":574.9,"y":75.7},
               "waypoints": [ {"x":574.4,"y":129.1}, ... ] } }
```

- **Waypoints are stored base-first. Reverse them on load.** The spawn is
  the *last* stored point; for Classic that is `(0, 446.2)`, off the left
  edge of a 720-wide field.
- `start_point` = reversed list index 0.
- Attackers walk indices `0 → n-1`. Reaching past `n-1` is a base hit.
- Road is the polyline stroked at **28 logical px**, round joins and caps.

### 2.1 Build legality

A structure may be placed at `p` if and only if:

1. `p` is inside the playfield, inset by the structure's footprint radius.
2. `distanceToPolyline(p, road) > roadHalfWidth + footprintRadius`
   where `roadHalfWidth = 14`.
3. `p` does not overlap the base footprint.
4. `p` does not overlap an existing structure.

There is **no grid**. Placement is continuous. This is load-bearing: the
70 px combo radius and laser-chain geometry are skill expressions
precisely because placement is free.

---

## 3. Waves and attackers

### 3.1 Wave progression

```
on wave start:
  wave_num += 1
  hp     = balance.difficulties[d].params applied per §3.2
  bounty = rho * hp
  spawn `balance.constants.wave_size` attackers,
        `balance.constants.spawn_interval_ms` apart
```

Waves auto-send every `balance.constants.wave_interval_ms`, or immediately
on player request. **Waves overlap** — sending early does not cancel or
delay the timer for the next one. Multiple waves on the road at once is
the intended core strategy.

### 3.2 HP and bounty

```
g(w)      = g_inf + (g0 - g_inf) * exp(-(w - 1) / tau)
HP(w)     = base_hp * product over k=1..w of g(k)
bounty(w) = rho * HP(w)
```

Parameters per difficulty in `balance.difficulties.<key>.params`.
Compute `HP` incrementally (multiply the running value each wave) — do not
re-evaluate the product from 1 each time, and do not use `pow` on an
averaged rate. The harness checks this to 1e-9.

### 3.3 Attacker

| Field | Value |
|---|---|
| `energy`, `energy_start` | `HP(w)` |
| `move_speed`, `move_speed_init` | `balance.difficulties[d].params.speed` |
| `bounty` | `bounty(w)` |
| `tier` | `(wave - 1) % 9` |
| `cycle` | `floor((wave - 1) / 9) + 1` |
| waypoint jitter | up to 19 px perpendicular offset, seeded per attacker |

**Health display** is a percentage: `ceil(energy / energy_start * 100)`,
rendered above the sprite. Not raw HP — it must read identically at wave 3
and wave 300.

Reaching the base: lose 1 life, remove the attacker, award nothing.
At 0 lives the run ends.

### 3.4 Poison

```
apply:    move_speed = max(5, move_speed / poison_divisor)
recover:  move_speed += 2 per movement tick, clamped to move_speed_init
```

Poison does not stack multiplicatively — reapplying sets the divisor
result again from current speed, floored at 5.

---

## 4. Structures

Four combat families (`balance.families`), seven modifiers
(`balance.modifiers`), plus the apex and utility structures (M3, not M0 —
but do not design them out).

### 4.1 Three upgrade tracks

Damage, range and rate are independent. Level `n` values come straight
from `balance.families.<f>.ladders.<track>[n-1]`.

- **Damage is unbounded.** Ladders in `balance.json` are tabulated to 14
  levels; beyond that, extend with the published closed form
  `D(n) = d0 * phi^n` and `cost(n) = k * relGain(n) * sigma^n`. The
  generator emits `phi`, `cost_coefficient` and `sigma` for exactly this.
- **Range and rate are asymptotic** to `caps.range` / `caps.rate`. They
  never reach the cap; cost keeps climbing as the gain shrinks.

Buying a level is atomic: deduct cost, increment level, recompute effective
stats, notify combo/link/modifier observers.

### 4.2 Effective stats

```
eff(stat) = max(0, (base + sum(added)) * max(mult_floor, 1 + sum(mult)))
```

`mult_floor` is `balance.constants.mult_floor` (0.2).

- Accumulators start at `added = 0`, `mult = 0` (so the multiplier term
  starts at 1.0).
- **Multipliers sum, they do not compose.** Two +45% modifiers give
  ×1.90, not ×2.10. This is deliberate and is a locked system.
- Recompute on *any* neighbour change: build, sell, relocate, upgrade.
  Never poll.

```
fire_interval_ms = 60000 / eff(rate)      // rate is shots per 60 s
```

### 4.3 Targeting

Eight modes, cycled by the player: `near`, `far`, `weak`, `strong`,
`slow`, `fast`, `old`, `young`. `old`/`young` sort by time alive.

`target_lock` on: keep the current target until it dies or leaves range.
Off: re-acquire every shot.

Directional cone: `wide` / `medium` / `narrow` / `full`, aimable. A tower
only acquires targets inside its cone.

---

## 5. Modifiers

Modifiers never fire. Each contributes to every combat structure whose
**centre** lies within the modifier's range.

From `balance.modifiers[]`:

| Field | Applies to |
|---|---|
| `damage_mult`, `range_mult`, `rate_mult` | the `mult` accumulator |
| `range_added` | the `added` accumulator for range |
| `combo_mult` | multiplies combo payload — see §6.3 |

Range for the purpose of "in range" uses the *modifier's own* effective
range, which is itself upgradeable.

Apex structures set `modify_possible = false` and ignore modifiers.

---

## 6. Combos

### 6.1 Eligibility

A structure is **combo-capable** when its damage track level is
`>= balance.constants.bloom_level` (8). Range and rate are irrelevant.

Uniform across families by design — the reference implementation gated on
"damage maxed", which cost wildly different amounts per family and made
entry to the combo game unfair.

### 6.2 Cluster and dispatch

When a combo-capable structure acquires a target and its combo recharge
has elapsed:

1. Count combo-capable structures within
   `balance.constants.combo_radius` (70 px), **excluding itself**, by
   colour, and only counting those that could currently fire.
2. Select a combo by the rule in `balance.combo_dispatch_rule`:

```
candidates = combos where lead == this.colour
                    and every requires[c] <= counts[c]
selected   = max(candidates, key = (specificity, yield))
```

`specificity` is the total towers required. **This is a rule, not an
ordered if-else chain.** Adding a combo must never require re-ordering,
and there must be no unreachable entries — the generator asserts all 20
are reachable and the harness re-checks it.

3. Fire the combo *instead of* the normal shot, and consume the
   contributing structures' combo readiness.

### 6.3 Payload

```
payload = sum(contributor eff(damage)) * combo.yield * product(combo_mult)
```

where contributors are the firing structure plus the ones its requirement
consumed, and `combo_mult` is the product over modifiers affecting the
firing structure.

Payload therefore **scales with cluster investment**. A barely-bloomed
cluster fires weakly; a heavily upgraded one fires hard. Flat payloads
would kill the upgrade ladder in the late game.

`mycelial_sinkhole` has `yield: 0` — it deals no damage. It removes
attackers within its radius for its duration and **awards no bounty**.

### 6.4 Recharge

Each combo has its own `recharge_ms`, independent of the firing
structure's weapon rate.

---

## 7. Signature abilities

### 7.1 Laser chain — Foxfire only

```
linkFire(target):
  if no unclaimed links in range: fire normally; return eff(damage)
  mark self claimed
  damage = eff(damage)
  for each linked Foxfire in range not yet claimed this shot:
      damage += neighbour.linkFire(target) * 1.25
  return damage
```

Claim marks reset each shot. A structure contributes at most once per
shot. Chain *shape* matters as much as length because the multiplier
compounds through the recursion — this is intended.

### 7.2 Holding pattern — Artillery only

At `range level >= 3` **and** `rate level >= 3`, keep up to 4 projectiles
orbiting the structure, pre-launched. On acquisition they strike
immediately rather than incurring launch travel time.

### 7.3 Freak-out — Puffball and Cordyceps

At `damage level >= 4` **and** `rate level >= 4`:

```
first:  now + 60000
next:   now + space/2 + rand(0, space/2) - rate_level * rate_mult * 1000
during: damage x3, rate x4, for 5000 ms, with a visible pre-warning
```

`space` = 80000 ms, `rate_mult` = 4. Rate upgrades therefore both raise
sustained output and shorten the gap between bursts.

### 7.4 Slow — Cordyceps only

```
divisor = max(1, poison_max * damage_upgrade_percent / 100)
```

`poison_max` = 10. Applied per §3.4.

---

## 8. Economy

| Action | Effect |
|---|---|
| Kill | `+bounty(wave)` |
| Build | `-balance.families[f].build_cost` |
| Upgrade | `-ladders[track][n].cost` |
| Sell | `+floor(total_spent * balance.constants.resale)` |
| Relocate | `-build_cost * balance.constants.relocate_cost_x_build` |
| Sinkhole removal | nothing |

`total_spent` is build cost plus every upgrade bought, before resale.
Relocation scales with what is being moved — a flat fee is punishing
early and free late.

Starting cash: `balance.difficulties[d].params.start_cash`.

---

## 9. What M0 does *not* include

Out of scope. Do not build these; do not design them out either.

- Any reskin art. Placeholder shapes only (§ see `agents/world-render.md`).
- Apex and utility structures (Sniper / Fusion / Railgun / Targeter /
  Ghost Mycelium) — M3.
- The game shell: title, map select, info panel, game over — M5.
- Audio — M6.
- Map editor, mods UI, score submission.
