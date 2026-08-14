# M0 Work Items

Thirteen items across four lanes. Each names its lane, its dependencies,
its spec anchor, and acceptance criteria the adversary will enumerate
one by one.

**Every commit message must cite its item ID and spec anchor.** A commit
without a citation fails `ADVERSARY.md` check 1 immediately, without
further review.

Lanes:

| Lane | Agent | Runs |
|---|---|---|
| **A** | engine-core | sequential, one owner |
| **B** | verification | parallel from the start, **must not read lane A code** |
| **C** | world-render | parallel after A-03 |
| **D** | placeholder-art | parallel from the start |

---

## Lane A — engine core

One agent owns all of these, in order. Do not fan out: every number here
is cross-coupled, and parallelism produces merge pain rather than speed.

### A-01 · Project scaffold
**Depends on** nothing · **Spec** README
- TypeScript, web canvas, no framework requirement.
- `npm run dev`, `npm run build`, `npm test` all work from a clean clone.
- Seeded PRNG module. `Math.random` is banned repo-wide by lint.
- Fixed-timestep accumulator harness with a 12-tick-per-frame cap.

**Accept when**: clean clone builds and runs; a stub scene renders; the
tick harness has a unit test proving identical output at 30 fps and
144 fps.

### A-02 · Balance loader
**Depends on** A-01 · **Spec** §4.1, README
- Loads and validates `data/balance.json` at startup; hard-fails on
  schema mismatch rather than defaulting.
- Typed accessors for families, difficulties, modifiers, combos, constants.
- Ladder extension beyond the tabulated 14 levels via the published
  closed form using `phi`, `cost_coefficient`, `sigma`.

**Accept when**: every value the game reads comes through this module;
level-20 damage and cost match the closed form to 1e-9; a corrupted
`balance.json` fails loudly at boot.

### A-03 · Map and road
**Depends on** A-02 · **Spec** §2
- Load `data/maps.json`. **Reverse waypoints on load** — spawn is the
  last stored point.
- Distance-to-polyline for build legality; 28 px stroke, half-width 14.
- Continuous placement, no grid.

**Accept when**: all 13 maps load; for each, the spawn is on the field
edge and the final waypoint is adjacent to the base; a point on the road
centreline is illegal and one 20 px off it is legal.

### A-04 · Attacker system
**Depends on** A-03 · **Spec** §3
- Waypoint traversal at `move_speed`, seeded jitter to 19 px.
- HP/bounty per §3.2, computed **incrementally** per wave.
- Health percentage display, base hit, life loss, run end.

**Accept when**: a 200-wave headless run matches the generator's HP and
bounty to 1e-9 on all four difficulties; jitter is reproducible from seed.

### A-05 · Wave system
**Depends on** A-04 · **Spec** §3.1
- Auto-send timer, manual send, **overlapping waves**.
- Tier and cycle derivation.

**Accept when**: sending 5 waves early puts 50 attackers on the road
concurrently and the auto-timer is unaffected.

### A-06 · Structure core
**Depends on** A-02 · **Spec** §4
- Placement, three upgrade tracks, effective-stat formula, fire interval.
- Eight targeting modes, target lock, directional cone.

**Accept when**: `eff` matches §4.2 including the 0.2 floor and the
`max(0, …)` outer clamp; each targeting mode picks the provably correct
attacker in a fixture with 6 candidates.

### A-07 · Projectiles and damage
**Depends on** A-06, A-04 · **Spec** §4
- Travel, impact, damage application, kill → bounty.

**Accept when**: total damage dealt over a scripted run equals total
damage received across all attackers, to 1e-9.

### A-08 · Modifier system
**Depends on** A-06 · **Spec** §5
- Range-based application, additive accumulators, `combo_mult` carried.
- Recompute on build/sell/relocate/upgrade. **Never poll.**

**Accept when**: two Nutrient Beds give ×1.90 not ×2.10; selling one
restores the prior value exactly; a profiler shows zero recomputation on
an idle frame.

### A-09 · Combo system
**Depends on** A-08, A-07 · **Spec** §6
- Bloom eligibility at level 8, 70 px cluster detection excluding self.
- **Declarative dispatch** by `(specificity, yield)` — not an if-else chain.
- Payload from contributor damage × yield × combo_mult.

**Accept when**: the dispatch fixture in `VERIFICATION.md` passes in full;
all 20 combos are reachable; payload from a level-8 cluster is strictly
less than from a level-12 cluster of the same shape.

### A-10 · Signature abilities
**Depends on** A-09 · **Spec** §7
- Laser chain recursion with per-shot claim marks, holding pattern,
  freak-out scheduling, slow.

**Accept when**: a 4-Foxfire line out-damages a 4-Foxfire star of the same
count; no structure contributes twice to one shot; freak-out interval
shortens measurably with rate level.

### A-11 · Economy
**Depends on** A-06 · **Spec** §8
- Build, upgrade, sell at resale, relocate at `6 ×` build cost.

**Accept when**: build → upgrade ×3 → sell returns exactly
`floor(total_spent × resale)`; sinkhole removals award nothing.

### A-12 · Minimal HUD
**Depends on** A-11, A-05 · **Spec** §1, PRD §4.3
- Cash, lives, wave, cycle + tier, next-wave timer, send-now.
- Build rack, upgrade buttons, range ring, selection.
- **Functional only.** This is not the M5 shell — no styling work.

**Accept when**: a human can play 30 waves using only the HUD.

---

## Lane B — verification

**This lane must not read lane A's implementation.** It works from
`ENGINE-SPEC.md`, `data/balance.json` and the generator alone. An
implementer writing its own acceptance tests marks its own homework;
that is what this separation prevents.

### B-01 · Parity harness
**Depends on** A-02's published loader interface only (agree the interface
up front, then build against it) · **Spec** `VERIFICATION.md`

**Accept when**: `npm run verify:parity` runs 200 waves headless on all
four difficulties and reports max relative error per curve.

### B-02 · Constant lint
**Depends on** nothing · **Spec** `VERIFICATION.md` §3

**Accept when**: `npm run lint:constants` flags any numeric literal in
game code that appears in `balance.json`, with an allowlist for genuine
non-balance numbers (array indices, 0/1, tick constants from §1.1).

### B-03 · Dispatch and reachability fixture
**Depends on** nothing · **Spec** §6.2, `VERIFICATION.md` §4

**Accept when**: the fixture asserts all 20 combos reachable and covers
every dispatch case in the table; it fails loudly if a combo is added
without a test.

---

## Lane C — world render

### C-01 · Road and terrain render
**Depends on** A-03 · **Spec** §2
- Stroked polyline at 28 px, integer scaling, no logical-space distortion.

**Accept when**: all 13 maps render correctly at 2× and 3×; a logical
distance measured on screen equals `logical × scale` exactly.

---

## Lane D — placeholder art

### D-01 · Placeholder sprite set
**Depends on** nothing · **Spec** §9

Flat coloured shapes, correct sizes, correct family colours, distinct
silhouettes. Explicitly **not** the reskin — that is M1.

**Accept when**: four family colours distinguishable in greyscale; sizes
match the PRD sprite spec so M1 can drop in without layout change.

---

## Dependency graph

```
A-01 ──► A-02 ──► A-03 ──► A-04 ──► A-05
           │        │                 │
           │        └────► C-01       │
           └────► A-06 ──► A-07 ──────┤
                    ├────► A-08 ──► A-09 ──► A-10
                    └────► A-11 ──────────► A-12
B-01 (needs A-02 interface only) ─┐
B-02, B-03, D-01 (no deps) ───────┴─► gate M0 exit
```
