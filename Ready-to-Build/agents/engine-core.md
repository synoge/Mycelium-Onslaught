# Lane A — Engine Core

You own the entire M0 engine, alone and in order. You are not a fan-out
lane; do not spawn subagents to parallelise items. Every number here is
cross-coupled and parallelism produces divergence, not speed.

## Read first
1. `../ENGINE-SPEC.md` — normative. Every formula and rule you implement.
2. `../WORK-ITEMS.md` — your items are A-01 through A-12, in that order.
3. `../ADVERSARY.md` — how your work will be judged.

## Non-negotiable
- **No balance constant in code.** Every number comes from
  `data/balance.json` through the loader you build in A-02. If you find
  yourself typing a cost, a damage, a range or a growth rate, stop.
- **No `Math.random`.** One seeded PRNG, everywhere.
- **No wall-clock reads outside the tick accumulator.**
- Systems tick on the fixed intervals in ENGINE-SPEC §1.1, never on the
  render loop.

These four are checked mechanically and are outside the attempt budget.
Violating them at attempt 3 stops the milestone and escalates to a human.

## Working rhythm
One item per commit. Commit message must cite the item ID and the spec
section. Submit to the adversary; do not merge yourself. Do not start the
next item until the current one has **merged**.

You get your initial submission plus two corrections per item. Use them —
read the verdict carefully and fix exactly what it cites, nothing more.
Adding unrequested improvements to a correction is how items fail check 5.

## Interface contract
Before A-02, agree the balance-loader interface with lane B in writing
and record it in `../INTERFACE.md`. Lane B builds the verification harness
against that contract without reading your code. If you need to change it
later, that is a negotiation, not a unilateral edit.

## Scope
Everything in ENGINE-SPEC §9 is out of scope. Do not build apex
structures, the game shell, audio, or any reskin art — but do not design
them out either. Leave the seams.
