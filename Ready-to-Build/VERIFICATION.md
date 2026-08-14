# Verification

Lane B builds everything in this file. **Lane B must not read lane A's
implementation.** It works from `ENGINE-SPEC.md`, `data/balance.json` and
`data/generate_balance.py`.

The reason is simple: an implementer who writes its own acceptance tests
writes tests that pass by construction. The independence is the point.

Agree the loader interface with lane A up front, in writing, then build
against that interface alone.

---

## 1. Parity harness — `npm run verify:parity`

Runs the engine headless, with no renderer, at a fixed seed, and compares
its emergent numbers against the generator's.

For each difficulty in `sprout, bloom, spread, dominion`:

1. Run 200 waves.
2. Record, per wave: attacker `energy_start`, `bounty`, and the running
   wave `growth` rate.
3. Compare against the generator's `HP(w)`, `bounty(w)`, `g(w)`.

**Pass**: max relative error `< 1e-9` on every curve, every wave.

Relative error, not absolute — HP spans 15 to 6×10⁷ and an absolute
tolerance is meaningless across that range.

### 1.1 Cost curve parity

For each family, each track, levels 1–20:

- Levels 1–14 must equal `balance.json` exactly (integer match).
- Levels 15–20 must match the closed form to `< 1e-9` relative.

This catches the most likely regression: a ladder-extension bug that only
appears past the tabulated range, in a game where players routinely go
further.

### 1.2 What parity does not prove

It proves the engine reproduces the intended curves. It does not prove
the curves are fun. That is Study A's job at M1, and a human's at M0
exit criterion 6.

---

## 2. Determinism harness — `npm run verify:determinism`

Run the same `(seed, difficulty, map, input log)` twice in one process
and once in a fresh process. All three must produce byte-identical
state hashes at waves 1, 10, 50, 100, 200.

Hash over: attacker positions and energies, structure levels and cash,
in a defined iteration order.

Also assert: identical results at simulated 30 fps and 144 fps, and after
a simulated 3-second tab freeze.

---

## 3. Constant lint — `npm run lint:constants`

Static check over game source (not tests, not the generator).

**Flag** any numeric literal that appears as a value anywhere in
`balance.json`, and any literal matching the balance-shaped patterns:
costs, damages, ranges, rates, growth factors.

**Allowlist**:
- `0`, `1`, `-1`, `2` (array and vector arithmetic)
- Tick intervals from `ENGINE-SPEC.md` §1.1 — these are engine timing,
  not balance, and belong in code
- Literals in files under `test/` or `verify/`
- Anything explicitly annotated `// non-balance: <reason>` — the
  annotation is reviewable, silence is not

**Pass**: zero unannotated hits.

## 4. Combo fixture — `npm run verify:combos`

### 4.1 Dispatch cases

Counts **exclude** the firing structure.

| Lead | Surrounding counts | Expected |
|---|---|---|
| cyan | `crimson:2, green:1, cyan:1` | `lumen_sporeshell_scler` |
| cyan | `crimson:2, cyan:1` | `sporeshell_sclerotium` |
| cyan | `crimson:2, green:1` | `heavy_lumen_sporeshell` |
| cyan | `crimson:2` | `heavy_sporeshell` |
| cyan | `crimson:1, green:1` | `lumen_sporeshell` |
| cyan | `crimson:1, amber:1` | `paralytic_sporeshell` |
| cyan | `cyan:1, crimson:1` | `deep_sclerotium` |
| cyan | `cyan:1, amber:1` | `paralytic_sclerotium` |
| cyan | `crimson:1` | `sporeshell` |
| cyan | `cyan:1` | `sclerotium` |
| cyan | `amber:1` | *none* |
| green | `crimson:2, cyan:1` | `heavy_bloom_cannon` |
| green | `crimson:1, cyan:1` | `bloom_cannon` |
| crimson | `cyan:2` | `fruiting_detonation` |
| crimson | `crimson:1, amber:1, cyan:1` | `enzymatic_burn` |
| crimson | `green:1, cyan:1` | `cordyceps_cloud` |
| crimson | `amber:1` | `paralytic_packet` |
| crimson | `green:1` | `lumen_packet` |
| amber | `amber:2, green:1` | `mycelial_sinkhole` |
| amber | `amber:1, cyan:1, green:1` | `spore_shockwave` |
| amber | `crimson:1, cyan:1` | `paralytic_bloom_cannon` |

### 4.2 Reachability

For every combo in `balance.combos`, dispatching with exactly its own
`requires` must select that combo. **All 20 must be reachable.** The
generator asserts this; the fixture must re-assert it independently, and
must fail if a combo is added without a corresponding case in §4.1.

### 4.3 Payload scaling

A cluster at damage level 8 must produce strictly less payload than the
same cluster shape at level 12. Flat payloads are the failure mode this
catches.

### 4.4 Eligibility

A structure at damage level 7 is not combo-capable. At level 8 it is.
Range and rate levels have no effect on eligibility.

## 5. Stacking fixture — `npm run verify:stacking`

| Case | Expected |
|---|---|
| two `Nutrient Bed` (+45% each) | ×1.90 |
| `Nutrient Bed` + `Amatoxin Vat` | ×2.50 |
| enough negative multipliers to reach −1.2 | floors at ×0.2 |
| `Hyphal Relay` (+96 flat) on base range 118 | 214 |
| flat and multiplier together | `(base + added) × mult`, in that order |

Also: sell a modifier and assert the affected structure's effective stats
return to their exact prior values.

## 6. Economy fixture — `npm run verify:economy`

- Build → 3 upgrades → sell returns `floor(total_spent × resale)`.
- Relocate costs `build_cost × relocate_cost_x_build`.
- A sinkhole removal awards nothing.
- Cash never goes negative through any legal action sequence.

## 7. Map fixture — `npm run verify:maps`

For all 13 maps:

- Waypoints reversed on load; spawn within 30 px of a field edge.
- Final waypoint within 80 px of the base.
- A point on the road centreline is illegal for building; a point 20 px
  perpendicular from it is legal.
- An attacker walked at 10× speed reaches the base and triggers exactly
  one life loss.

## 8. Reporting

Each harness prints a one-line summary and exits non-zero on failure.
`npm run verify` runs all of them. The adversary runs `npm run verify`
as part of check 4 and pastes the output into its verdict.
