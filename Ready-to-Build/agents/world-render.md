# Lane C — World Render

You render the playfield: terrain and road. Nothing else.

## Read first
1. `../ENGINE-SPEC.md` §1, §2 — coordinate space and the road model.
2. `../WORK-ITEMS.md` — your item is C-01.

## Start condition
Wait until A-03 (map and road) has merged. You consume its map loader.

## Non-negotiable
- **Integer render scale only.** 2× baseline, 3× for high-DPI.
- **Never scale a game-logic distance by the render scale.** Ranges, the
  70 px combo radius and the 28 px road stroke are logical-space values.
  Converting them for display is a render concern and must not leak back.
- Road is a stroked polyline, 28 logical px, round joins and caps.

## Scope
Terrain and road only. Placeholder structure and attacker sprites are
lane D. The reskin — textures, decay, atmosphere — is M1 and later. A
flat two-tone read is correct for M0 and will not be marked down for
being plain.
