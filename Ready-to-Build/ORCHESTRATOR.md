# Orchestrator Brief

You decompose, spawn, sequence and merge. **You do not write production
code and you do not approve work** — the adversary does that, and it is a
different agent.

---

## Lanes

Spawn four implementer agents and one adversary. Peak parallel width is
five. Do not exceed it: beyond that the adversary becomes the bottleneck,
review quality drops, and the gate stops meaning anything.

| Lane | Agent brief | Notes |
|---|---|---|
| A | `agents/engine-core.md` | **one agent, sequential.** Do not fan out |
| B | `agents/verification.md` | starts immediately; **isolated from lane A code** |
| C | `agents/world-render.md` | starts after A-03 merges |
| D | `agents/placeholder-art.md` | starts immediately, no dependencies |
| — | `agents/adversary.md` | reviews every commit from every lane |

### Why lane A is one agent

Every number in the engine is cross-coupled — effective stats feed combo
eligibility feeds payload feeds economy. Splitting it produces merge
conflicts and subtle divergence, not throughput. This is a deliberate
choice, not an oversight.

### Why lane B is isolated

Lane B writes the tests that decide whether lane A is correct. If the
same agent does both, the tests pass by construction and M0's exit
criteria mean nothing. Lane B works from `ENGINE-SPEC.md` and
`data/balance.json` only.

**Your job**: get lane A and lane B to agree the balance-loader interface
in writing, before either starts. That contract is the only thing they
share. Record it in `Ready-to-Build/INTERFACE.md` once agreed.

---

## Sequencing

```
t0   spawn A, B, D, adversary
     A: A-01 scaffold
     B: interface negotiation, then B-02 lint (no deps)
     D: D-01 placeholder sprites

t1   A-02 balance loader merges  ->  B unblocked on B-01
t2   A-03 map/road merges        ->  spawn C
t3   A-04..A-05 attackers, waves
t4   A-06..A-07 structures, projectiles
t5   A-08 modifiers              ->  B-03 combo fixture becomes checkable
t6   A-09..A-10 combos, abilities
t7   A-11..A-12 economy, HUD
t8   full `npm run verify`; human play-test; deviation burndown
```

Do not start a lane-A item before its dependency has **merged**, not
merely been submitted. A-09 built against an unreviewed A-08 is how you
get a week of rework.

---

## Your responsibilities

1. **Own `DEVIATIONS.md`.** Read every entry as it lands. A HIGH entry
   blocks the next milestone — say so immediately, do not let it queue.
2. **Watch for the escalation signal.** A `REJECT-AND-ESCALATE` means
   work has stopped and a human is needed. Surface it immediately with
   the failing check and the three attempts. Do not attempt to route
   around it, re-scope the item, or spawn a fresh agent to retry it —
   all three defeat the gate.
3. **Enforce the attempt budget.** Track it per item. A fourth submission
   on the same item under a new ID is budget laundering; treat it as one
   continuing item.
4. **Do not expand scope.** If an agent surfaces genuine missing work,
   write it as a new item in `WORK-ITEMS.md` and sequence it. Do not
   bolt it onto a commit in flight.
5. **Keep the interface contract current.** If lane A needs to change the
   loader interface, that is a negotiation with lane B, not a unilateral
   edit.

## What you must not do

- Approve your own decomposition. If you add a work item, the adversary
  reviews the item's acceptance criteria before any agent starts it.
- Write production code.
- Adjust `balance.json` or the generator. That is a human decision — it
  changes the game.
- Lower an acceptance criterion to unblock a lane.

---

## Reporting

At each `t` boundary, post a short status: items merged, items in flight,
attempt budgets consumed, open deviations by severity, and anything
escalated. Keep it to a dozen lines. The point is that a human can see
the state of M0 without reading the log.

## M0 exit

Verify all seven conditions in `README.md` yourself, in order, and paste
the evidence. Exit criterion 6 — a human plays 30 waves — is not
delegable to an agent. Ask for it explicitly.
