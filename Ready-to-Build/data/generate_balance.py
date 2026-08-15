#!/usr/bin/env python3
"""
Mycelium Onslaught — balance generator.

Every number the game ships is produced here from a small parameter set.
Nothing is hand-authored, so the tables are (a) originally derived,
(b) tunable in one place, and (c) verifiable by recomputation — the
adversarial review gate re-runs this and diffs, rather than eyeballing
constants.

Architecture
------------
There are only two kinds of input:

  DESIGN TARGETS   what we want to be true (build cost, cost to reach
                   combo-capable, how fast a family climbs)
  CURVE SHAPES     how a stat moves per level

Everything else — every cost in the game — is SOLVED from those.
No cost is typed in by hand, which is what stops the reference
implementation's failure mode where cost-per-damage silently collapsed
by 24x up the ladder and made the top of every ladder a non-decision.

Run:  python3 generate_balance.py > balance.json
"""
import json, math

# ======================================================================
# 1. POWER MODEL — one scalar so every stat is priced on the same basis
# ======================================================================
R_REF = 120.0

def power(dmg, rate_rpm, rng):
    """Sustained threat. Range enters as a square root: more reach buys
    more time-on-target, but with diminishing value."""
    return dmg * (rate_rpm / 60.0) * math.sqrt(rng / R_REF)

# ======================================================================
# 2. FAMILIES
# ======================================================================
#   phi          damage multiplier per level — the family's climb rate
#   kappa, lam   levels-constants for the asymptotic range / rate curves
#   build        DESIGN TARGET: cost to place one
#   bloom_ppp    DESIGN TARGET: price per unit power at combo-capable.
#                This is the fairness dial between families — it, not
#                absolute cost, is what decides whether a family is a
#                good deal. Absolute bloom cost is derived from it.
FAMILIES = {
    "puffball": dict(
        label="Puffball Battery", colour="cyan",
        d0=9,   r0=118, f0=126, r_inf=232, f_inf=290,
        phi=1.74, kappa=3.4, lam=3.0, build=12,  bloom_ppp=1.30,
    ),
    "foxfire": dict(
        label="Foxfire Lantern", colour="green",
        d0=21,  r0=104, f0=68,  r_inf=340, f_inf=196,
        phi=1.78, kappa=4.6, lam=3.8, build=17,  bloom_ppp=1.10,
    ),
    "artillery": dict(
        label="Artillery Cap", colour="crimson",
        d0=58,  r0=196, f0=44,  r_inf=372, f_inf=152,
        phi=1.84, kappa=4.0, lam=3.4, build=26,  bloom_ppp=1.55,
    ),
    "cordyceps": dict(
        label="Cordyceps Spire", colour="amber",
        d0=34,  r0=76,  f0=62,  r_inf=178, f_inf=184,
        phi=1.72, kappa=3.0, lam=3.2, build=40,  bloom_ppp=1.75,
    ),
    "inky_cap": dict(
        label="Inky Cap Mortar", colour="violet",
        d0=28,  r0=130, f0=52,  r_inf=260, f_inf=140,
        phi=1.76, kappa=3.6, lam=3.2, build=32,  bloom_ppp=1.40,
    ),
    "polypore": dict(
        label="Polypore Shield", colour="teal",
        d0=16,  r0=110, f0=80,  r_inf=220, f_inf=200,
        phi=1.73, kappa=3.2, lam=3.5, build=45,  bloom_ppp=1.65,
    ),
    "stinkhorn": dict(
        label="Lattice Stinkhorn", colour="coral",
        d0=20,  r0=95,  f0=90,  r_inf=190, f_inf=220,
        phi=1.75, kappa=3.0, lam=3.6, build=28,  bloom_ppp=1.35,
    ),
    "ghost_pipe": dict(
        label="Ghost Pipe Leech", colour="silver",
        d0=24,  r0=125, f0=60,  r_inf=250, f_inf=160,
        phi=1.77, kappa=3.8, lam=3.4, build=36,  bloom_ppp=1.45,
    ),
    "lions_mane": dict(
        label="Lion's Mane Disruptor", colour="azure",
        d0=45,  r0=140, f0=48,  r_inf=280, f_inf=130,
        phi=1.80, kappa=4.2, lam=3.2, build=52,  bloom_ppp=1.80,
    ),
}

SIGMA = 1.065      # cost-per-power squeeze per upgrade level
BLOOM_LEVEL = 8    # damage level at which a tower becomes combo-capable
LADDER_SHOWN = 14  # ladders are unbounded; this is how far we tabulate

# ======================================================================
# 3. LADDER SHAPES
# ======================================================================
def dmg_at(F, n):
    """Unbounded geometric — there is always a next damage purchase."""
    return F["d0"] * F["phi"] ** n

def rng_at(F, n):
    """Asymptotic — unbounded range would break the game."""
    return F["r_inf"] - (F["r_inf"] - F["r0"]) * math.exp(-n / F["kappa"])

def rate_at(F, n):
    """Asymptotic — fire rate cannot outrun the simulation tick."""
    return F["f_inf"] - (F["f_inf"] - F["f0"]) * math.exp(-n / F["lam"])

def rel_gain(F, stat, n):
    """Power gained by level n -> n+1, as a FRACTION of the family's base
    power. Relative, not absolute — this is what keeps a high-damage
    family from having ladder costs an order of magnitude out of line."""
    base = power(F["d0"], F["f0"], F["r0"])
    lv = {"damage": 0, "range": 0, "rate": 0}
    lv[stat] = n
    a = power(dmg_at(F, lv["damage"]), rate_at(F, lv["rate"]), rng_at(F, lv["range"]))
    lv[stat] = n + 1
    b = power(dmg_at(F, lv["damage"]), rate_at(F, lv["rate"]), rng_at(F, lv["range"]))
    return (b - a) / base

def bloom_target(F):
    """Absolute cost to reach combo-capable, derived from the family's
    declared price-per-power. Stating the RATIO as the design input and
    deriving the absolute is what keeps families comparable as sidegrades
    instead of accidentally making one strictly the best deal."""
    return power(dmg_at(F, BLOOM_LEVEL), F["f0"], F["r0"]) * F["bloom_ppp"]

def solve_k(F):
    """Solve the family's cost coefficient from its bloom target.

    bloom_target = k * sum_{n<BLOOM} rel_gain(damage, n) * SIGMA**n
    so k falls straight out. Design intent in, cost curve out."""
    s = sum(rel_gain(F, "damage", n) * SIGMA ** n for n in range(BLOOM_LEVEL))
    return bloom_target(F) / s

def upgrade_cost(F, stat, n, k):
    return max(1, round(k * rel_gain(F, stat, n) * SIGMA ** n))

def ladder(F, stat, k, levels=LADDER_SHOWN):
    fn = {"damage": dmg_at, "range": rng_at, "rate": rate_at}[stat]
    rows, cum = [], 0
    for n in range(levels):
        c = upgrade_cost(F, stat, n, k)
        cum += c
        rows.append(dict(level=n + 1, value=round(fn(F, n + 1), 1),
                         cost=c, cumulative=cum))
    return rows

# ======================================================================
# 4. WAVE CURVE
# ======================================================================
#   g(w)      = g_inf + (g0 - g_inf) * exp(-(w-1)/tau)   smooth, no cliffs
#   HP(w)     = H0 * prod g(k)
#   bounty(w) = rho * HP(w)
#
# Bounty proportional to HP is the central fix. The reference paid a flat
# $wave_number per kill while HP compounded, so income fell behind threat
# by orders of magnitude and the economy stopped existing around wave 60.
# Here a kill returns a fixed fraction of the biomass destroyed — which is
# also exactly what a fungus does.
DIFFICULTIES = {
    "sprout":   dict(label="Sprout",   g0=1.215, g_inf=1.022, tau=52, rho=0.075, speed=58, sigma=1.052, start_cash=52),
    "bloom":    dict(label="Bloom",    g0=1.255, g_inf=1.030, tau=46, rho=0.062, speed=62, sigma=1.065, start_cash=44),
    "spread":   dict(label="Spread",   g0=1.300, g_inf=1.041, tau=40, rho=0.052, speed=76, sigma=1.078, start_cash=38),
    "dominion": dict(label="Dominion", g0=1.345, g_inf=1.058, tau=34, rho=0.044, speed=82, sigma=1.092, start_cash=32),
}
H0 = 12.0

def growth(D, w):
    return D["g_inf"] + (D["g0"] - D["g_inf"]) * math.exp(-(w - 1) / D["tau"])

def wave_curve(D, upto=200):
    hp, out = H0, []
    for w in range(1, upto + 1):
        hp *= growth(D, w)
        out.append(dict(wave=w, hp=hp, bounty=D["rho"] * hp, growth=growth(D, w)))
    return out

# ======================================================================
# 5. MODIFIERS
# ======================================================================
MULT_FLOOR = 0.2
REF_FAMILY, REF_LEVEL = "artillery", BLOOM_LEVEL   # modifiers matter at bloom

#  name, dmg_m, rng_m, rate_m, rng_add, combo_m, premium
#  combo_m: multiplier on combo yield. This is the fix for the reference's
#  dominant-exchanger problem — there, an exchanger bought the same +100%
#  damage for 41% of the enhancer's price, and its rate/range penalty cost
#  nothing inside a combo cluster where towers exist only to trigger. Here
#  exchangers also cut combo yield, so the trade bites in every context.
MODIFIERS = [
    ("Hyphal Relay",       0.00,  0.00,  0.00,  96,  1.00, 1.00),
    ("Nutrient Bed",       0.45,  0.00,  0.00,   0,  1.00, 1.00),
    ("Enzyme Gland",       0.00,  0.00,  1.10,   0,  1.00, 1.00),
    ("Amatoxin Vat",       1.05,  0.00,  0.00,   0,  1.00, 1.00),
    ("Fermentation Vent", -0.38, -0.12,  0.66,   0,  0.92, 0.58),
    ("Rhizomorph Runner",  0.00,  0.00, -0.22,  94,  0.94, 0.62),
    ("Amatoxin Still",     1.05, -0.28, -0.28,   0,  0.85, 0.66),
]

def modifier_cost(dm, rm, fm, ra, premium, k_ref):
    """Priced off the GROSS power the modifier grants on the reference
    tower — never the net. Netting is what floored the reference-style
    exchangers to nothing, since they give back nearly what they take.
    `premium` < 1 then discounts for the penalties carried."""
    F = FAMILIES[REF_FAMILY]
    base = power(F["d0"], F["f0"], F["r0"])
    d, f, r = dmg_at(F, REF_LEVEL), rate_at(F, REF_LEVEL), rng_at(F, REF_LEVEL)
    gross = power(d * (1 + max(0, dm)),
                  f * (1 + max(0, fm)),
                  (r + max(0, ra)) * (1 + max(0, rm)))
    gain = (gross - power(d, f, r)) / base
    return max(1, round(k_ref * gain * SIGMA ** REF_LEVEL * premium))

# ======================================================================
# 6. COMBOS
# ======================================================================
# payload = sum(contributor effective damage) * yield * product(combo_m)
#
# The reference used flat constants (5,000,000 and so on) regardless of
# how upgraded the contributing towers were, so a barely-upgraded cluster
# fired exactly as hard as a maxed one and the late game collapsed into
# combos-only. Deriving from contributors means the ladder never dies.
# Each combo DECLARES what it needs. Dispatch is a rule, not a hand-ordered
# if-else chain: among combos whose lead matches the firing tower and whose
# requirements are all met by the surrounding counts, the most specific wins
# (highest total towers required), tie-broken by yield. Adding a combo never
# requires re-ordering anything, and there is no unreachable-entry class of
# bug — reachability is checkable by construction.
#   key, lead, requires{}, yield, recharge_ms
COMBOS = [
    ("sporeshell",             "cyan",    {"crimson":1},                        3.4,  5000),
    ("paralytic_sporeshell",   "cyan",    {"crimson":1,"amber":1},              3.1,  5000),
    ("lumen_sporeshell",       "cyan",    {"crimson":1,"green":1},              4.2, 10000),
    ("heavy_sporeshell",       "cyan",    {"crimson":2},                        4.6,  6200),
    ("heavy_lumen_sporeshell", "cyan",    {"crimson":2,"green":1},              5.5, 11400),
    ("sclerotium",             "cyan",    {"cyan":1},                           5.8,  7000),
    ("deep_sclerotium",        "cyan",    {"cyan":1,"crimson":1},               7.6,  7000),
    ("paralytic_sclerotium",   "cyan",    {"cyan":1,"amber":1},                 6.9,  7000),
    ("sporeshell_sclerotium",  "cyan",    {"cyan":1,"crimson":2},               8.4,  8000),
    ("lumen_sporeshell_scler", "cyan",    {"cyan":1,"crimson":2,"green":1},    10.2, 10800),
    ("bloom_cannon",           "green",   {"crimson":1,"cyan":1},               6.2,  9000),
    ("heavy_bloom_cannon",     "green",   {"crimson":2,"cyan":1},               8.1,  9000),
    ("lumen_packet",           "crimson", {"green":1},                          2.2,  3000),
    ("paralytic_packet",       "crimson", {"amber":1},                          2.4,  3000),
    ("cordyceps_cloud",        "crimson", {"green":1,"cyan":1},                 1.1,  5000),
    ("enzymatic_burn",         "crimson", {"crimson":1,"amber":1,"cyan":1},     4.4,  6500),
    ("fruiting_detonation",    "crimson", {"cyan":2},                          12.5,  7400),
    ("paralytic_bloom_cannon", "amber",   {"crimson":1,"cyan":1},               6.2,  9000),
    ("spore_shockwave",        "amber",   {"amber":1,"cyan":1,"green":1},       3.0,  9000),
    ("mycelial_sinkhole",      "amber",   {"amber":2,"green":1},                0.0, 20000),
]

def dispatch(lead, counts):
    """Reference implementation of combo selection. Counts EXCLUDE the
    firing tower. Returns the combo key or None."""
    ok = [c for c in COMBOS if c[1] == lead
          and all(counts.get(k, 0) >= v for k, v in c[2].items())]
    if not ok:
        return None
    return max(ok, key=lambda c: (sum(c[2].values()), c[3]))[0]

# ======================================================================
# 7. EMIT
# ======================================================================
def build():
    ks = {k: solve_k(F) for k, F in FAMILIES.items()}
    out = {
        "_generated_by": "generate_balance.py",
        "_note": "All values derived. Edit parameters, never tables.",
        "power_model": {"formula": "damage * (rate_rpm/60) * sqrt(range/120)",
                        "range_reference": R_REF},
        "constants": {
            "sigma": SIGMA, "bloom_level": BLOOM_LEVEL,
            "mult_floor": MULT_FLOOR, "base_hp": H0,
            "wave_size": 10, "lives": 10, "combo_radius": 70,
            "resale": 0.65, "relocate_cost_x_build": 6,
            "wave_interval_ms": 18000, "spawn_interval_ms": 640,
        },
        "families": {}, "difficulties": {}, "modifiers": [], "combos": [],
    }

    for key, F in FAMILIES.items():
        k, p0 = ks[key], power(F["d0"], F["f0"], F["r0"])
        out["families"][key] = {
            "label": F["label"], "colour": F["colour"],
            "build_cost": F["build"],
            "base": {"damage": F["d0"], "range": F["r0"], "rate": F["f0"]},
            "base_power": round(p0, 2),
            "cost_per_base_power": round(F["build"] / p0, 3),
            "caps": {"range": F["r_inf"], "rate": F["f_inf"]},
            "phi": F["phi"], "bloom_price_per_power": F["bloom_ppp"],
            "cost_coefficient": round(k, 2),
            "bloom_cost": sum(r["cost"] for r in ladder(F, "damage", k, BLOOM_LEVEL)),
            "power_at_bloom": round(power(dmg_at(F, BLOOM_LEVEL), F["f0"], F["r0"]), 1),
            "ladders": {s: ladder(F, s, k) for s in ("damage", "range", "rate")},
        }

    for key, D in DIFFICULTIES.items():
        c = wave_curve(D)
        out["difficulties"][key] = {
            "label": D["label"], "params": D,
            "samples": [{"wave": r["wave"], "hp": round(r["hp"], 1),
                         "bounty": round(r["bounty"], 2),
                         "wave_income": round(r["bounty"] * 10, 2),
                         "growth": round(r["growth"], 4)}
                        for r in c if r["wave"] in
                        (1, 5, 10, 20, 30, 50, 75, 100, 150, 200)],
        }

    k_ref = ks[REF_FAMILY]
    for name, dm, rm, fm, ra, cm, pr in MODIFIERS:
        out["modifiers"].append({
            "name": name, "cost": modifier_cost(dm, rm, fm, ra, pr, k_ref),
            "damage_mult": dm, "range_mult": rm, "rate_mult": fm,
            "range_added": ra, "combo_mult": cm,
        })

    for key, lead, req, yld, rc in COMBOS:
        out["combos"].append({"key": key, "lead": lead, "requires": req,
                              "specificity": sum(req.values()),
                              "yield": yld, "recharge_ms": rc})
    out["combo_dispatch_rule"] = (
        "Among combos whose lead == firing tower colour and whose every "
        "requirement is met by surrounding combo-capable towers (EXCLUDING "
        "the firing tower), select max by (specificity, yield).")
    return out


if __name__ == "__main__":
    print(json.dumps(build(), indent=1))
