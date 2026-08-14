# The Commit Gate

Nothing reaches the main branch without an adversary verdict. The
adversary checks **conformance to the spec**, and nothing else.

Its job is not to be a second author with veto power. Every finding must
cite a spec section or a failing check. "I would have done it differently"
is not a finding.

---

## 1. Checklist — every commit, in order

```
1. SPEC ANCHOR   Does the commit cite its work-item ID and spec section?
                 No citation -> REVISE immediately, without further review.

2. MECHANICS     (a) python3 data/generate_balance.py | diff - data/balance.json
                     Non-empty -> FAIL.
                 (b) npm run lint:constants
                     Any hit -> FAIL.
                 (c) Any locked system from ENGINE-SPEC altered?
                     (dispatch rule, stacking math, tick model, determinism)
                     Yes -> FAIL.
                 A failure here is NOT subject to the attempt budget.
                 See §3.

3. ACCEPTANCE    Enumerate every acceptance criterion on the work item as
                 met / unmet. Not "looks good" — one line per criterion.

4. TESTS         Do existing tests pass? Is there a new test for new
                 behaviour? Lane A may not modify lane B's tests.

5. SCOPE         Anything here NOT required by the cited item?
                 Unrequested additions -> REVISE.

6. DETERMINISM   Does the change introduce Math.random, wall-clock reads
                 outside the tick accumulator, or iteration over an
                 unordered collection? -> treat as check 2(c).
```

## 2. Verdicts

| Verdict | Meaning |
|---|---|
| `PASS` | all checks met — merge |
| `REVISE` | one or more unmet — return with specifics, decrement budget |
| `PASS-WITH-DEBT` | budget exhausted — merge **and** log. Available for checks 1, 3, 4, 5 only |
| `REJECT-AND-ESCALATE` | check 2 or 6 failed at attempt 3 — does not merge, is not logged as debt, goes to a human. Terminal |

## 3. Attempt budget

An implementer gets its initial submission plus **two corrections**.

```
submission 1  ->  PASS  ->  merge
              ->  REVISE (budget 2 -> 1)   v
submission 2  ->  PASS  ->  merge
              ->  REVISE (budget 1 -> 0)   v
submission 3  ->  PASS  ->  merge
              ->  budget exhausted -> PASS-WITH-DEBT -> merge + DEVIATIONS.md

// The adversary MAY NOT issue REVISE at submission 3.
// It MAY complete trivial mechanical fixes itself at that point
// (formatting, a missing test name) and must log what it touched.
```

### The mechanics path is separate and never rejoins the above

```
check 2 or 6 fails  ->  attempt 1  ->  REVISE
                    ->  attempt 2  ->  REVISE
                    ->  attempt 3  ->  REJECT-AND-ESCALATE  ->  human. Stop.
```

**Absolute. No force-pass path exists.** A mechanics violation is never
force-passed, under any circumstance, at any attempt count, by any agent.
The adversary has no discretion and no override here. It may not:

- accept a mechanics change as debt,
- fix it itself,
- reclassify it to a lower severity to unblock a queue,
- or wave it through because the milestone is late.

The forced pass exists to stop agents deadlocking on polish. Balance data
and determinism are not polish. If submission 3 still fails check 2 or 6,
the work stops and a human decides.

## 4. What the adversary may not do

- **No rewriting.** It reports unmet criteria; the implementer fixes them.
  The sole exception is the trivial-fix allowance at submission 3, which
  must be logged.
- **No taste vetoes.** Every `REVISE` cites a spec section or a failing
  command.
- **No scope expansion.** It may not require work the cited item does not
  call for. Genuine missing work becomes a new item for the orchestrator,
  not a condition on this commit.
- **No silent standards.** If it applies a rule, that rule must be in
  `ENGINE-SPEC.md` or `WORK-ITEMS.md`. Otherwise the spec gets amended
  first, by a human.
- **No reviewing its own work.** If the adversary applied a trivial fix,
  a second adversary instance reviews that fix.

## 5. Deviation log

Every `PASS-WITH-DEBT` appends one entry to `DEVIATIONS.md` at the repo
root. Append-only. Entries are never deleted — they are closed with a
follow-up commit reference. Template in `templates/DEVIATIONS.md`.

| Severity | Meaning | Handling |
|---|---|---|
| `LOW` | cosmetic or documentation | batch, fix opportunistically |
| `MEDIUM` | affects behaviour, feel or accessibility | close before the milestone that depends on it ships |
| `HIGH` | affects a system another item builds on | blocks the next milestone until closed |
| `CRITICAL` | — | cannot occur by construction |

There is no `CRITICAL` row in this log, ever: a mechanics violation is
escalated and never merges, so it never becomes debt. **If a `CRITICAL`
entry appears, the gate itself has failed** — stop work and audit the
protocol before resuming.

## 6. Verdict format

Use `templates/verdict.md`. Post it as the review comment on the commit.
A verdict without enumerated criteria is not a verdict.
