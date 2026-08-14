# Ready to Build — M0

**Milestone M0: Mechanics parity.** A playable, correct tower defence driven
entirely by generated balance data, with placeholder art. No reskin work
happens in M0 — that is M1 onward.

> Separating mechanics from art means a failure here is unambiguously an
> engine bug, and a failure at M1 is unambiguously an art problem. Mixing
> them produces the worst debugging experience available.

---

## Read in this order

| File | Who reads it | What it is |
|---|---|---|
| `README.md` | everyone | this file |
| `ENGINE-SPEC.md` | everyone | **normative.** Every formula, table and rule M0 implements |
| `WORK-ITEMS.md` | orchestrator, implementers | the 13 items, each with acceptance criteria |
| `ADVERSARY.md` | adversary, everyone | the commit gate. Non-negotiable |
| `VERIFICATION.md` | verification lane | the parity harness spec |
| `ORCHESTRATOR.md` | orchestrator | lane assignment and sequencing |
| `agents/*.md` | each agent | the brief you paste in to start a lane |
| `reference/prd.html` | anyone needing context | full product requirements |

## What is already decided

Do not re-litigate these. They are settled in the PRD.

- **Balance is generated, never authored.** `data/generate_balance.py` emits
  `data/balance.json`. That file is the single source of every number.
  No balance constant may appear in game code. Ever.
- **Systems are locked** (PRD §1.3): colour-led combo dispatch, additive
  modifier stacking with a 0.2 floor, three independent upgrade tracks,
  endless compounding waves, per-system tick rates in milliseconds.
- **Target platform**: web canvas, TypeScript. (PRD D1 default.)
- **Maps ship as data.** `data/maps.json`, 13 polylines. Do not re-author.

## The gate, in one paragraph

Nothing merges on an implementer's own say-so. Every commit goes to the
adversary, which checks it against `ENGINE-SPEC.md` and the item's
acceptance criteria. An implementer gets its first submission plus **two
corrections**; on the third the adversary must pass it and log the shortfall
to `DEVIATIONS.md`. **The single exception is a mechanics violation** — a
hard-coded balance number, a drifted `balance.json`, or a change to a locked
system. Those are never force-passed, never logged as debt, and always
escalated to a human. Full detail in `ADVERSARY.md`.

## Exit condition

M0 is done when all of the following hold:

1. A headless 200-wave run on each of the four difficulties reproduces the
   generator's HP, bounty and cost curves to within 1e-9 relative error.
2. `npm run lint:constants` reports zero hard-coded balance numbers.
3. `python3 data/generate_balance.py | diff - data/balance.json` is empty.
4. All 13 maps load, render, and are traversable end to end.
5. All 20 combos are reachable in the sandbox harness.
6. A human has played 30 waves on Bloom without hitting a crash or a
   visibly wrong behaviour.
7. Zero open HIGH deviations.

## Quick start

```bash
cd Ready-to-Build
python3 data/generate_balance.py | diff - data/balance.json   # must be empty
```

If that diff is not empty, stop. The committed data does not match the
generator and nothing built on it can be trusted.
