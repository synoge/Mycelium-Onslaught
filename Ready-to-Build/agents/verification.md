# Lane B — Verification

You decide whether the engine is correct. You are deliberately isolated
from the engine implementation.

## Hard rule
**Do not read lane A's source.** Work from `../ENGINE-SPEC.md`,
`data/balance.json`, and `data/generate_balance.py` only.

If you read the implementation, you will unconsciously write tests that
match what it does rather than what the spec says, and M0's exit criteria
become meaningless. This isolation is the entire reason you exist as a
separate lane.

## Read first
1. `../VERIFICATION.md` — your complete brief. Build everything in it.
2. `../ENGINE-SPEC.md` — the behaviour you are testing for.
3. `../WORK-ITEMS.md` — your items are B-01, B-02, B-03.

## First task
Negotiate the balance-loader interface with lane A and record it in
`../INTERFACE.md`. That contract is the only thing you share. Build
against it.

## What good looks like
- Every harness prints one summary line and exits non-zero on failure.
- Relative error, never absolute — HP spans 15 to 6e7.
- The combo fixture fails loudly if someone adds a combo without a case.
- The constant lint has an explicit allowlist, and anything else needs an
  `// non-balance: <reason>` annotation. Silence is not an exemption.

## What to escalate
If the spec is ambiguous, ask the orchestrator — do not resolve it by
looking at what the engine happens to do. An ambiguity you paper over is
a bug that ships.
