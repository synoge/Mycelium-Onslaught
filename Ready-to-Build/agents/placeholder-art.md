# Lane D — Placeholder Art

You produce the flat placeholder sprite set M0 plays with. This is
explicitly **not** the reskin — that is M1, and it is gated on user
research passing.

## Read first
1. `../ENGINE-SPEC.md` §9 — what is out of scope.
2. `../reference/prd.html` §3.1 — the sprite specification table.
3. `../WORK-ITEMS.md` — your item is D-01.

## What to make
Flat coloured shapes at the **correct sizes from the PRD sprite spec**,
so M1 can drop finished art in without a layout change.

- Four combat families, in their locked hues, with **distinct
  silhouettes**: wide dome / tall stalk / speckled dome / branching antler.
- Seven modifier structures — one shared visual class, low and wide.
- Nine attacker tiers at the three size bands (48 / 64 / 80 logical px).
- The base, with ten discrete life-node states.

## The one quality bar
Desaturate the four family sprites, downscale to 48 px, and confirm all
four are still tellable apart. Colour-led combo dispatch means a player
reads family at a glance; if placeholders fail that test the engine is
untestable by a human.

Everything else can be as crude as you like. Do not spend effort on
polish that M1 will discard.
