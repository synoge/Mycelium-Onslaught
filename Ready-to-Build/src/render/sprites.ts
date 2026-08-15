import { FamilyColour, FamilyKey } from '../interfaces';

export const FAMILY_COLORS: Record<FamilyColour, string> = {
  cyan: '#2de2e6',    // Puffball (cyan-teal, 175-195 deg)
  green: '#00ff66',   // Foxfire (acid green, 80-105 deg)
  crimson: '#ff0055', // Artillery (crimson-magenta, 340-5 deg)
  amber: '#ffaa00',   // Cordyceps (amber-gold, 38-52 deg)
  violet: '#c77dff',  // Inky Cap (violet)
  teal: '#00f5d4',    // Polypore (teal)
  coral: '#ff5964',   // Stinkhorn (coral)
  silver: '#e0e1dd',  // Ghost Pipe (silver)
  azure: '#00b4d8',   // Lion's Mane (azure)
};

export class SpriteRenderer {
  private towerImages: Partial<Record<FamilyKey, HTMLImageElement>> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      const families: FamilyKey[] = [
        'puffball',
        'foxfire',
        'artillery',
        'cordyceps',
        'inky_cap',
        'polypore',
        'stinkhorn',
        'ghost_pipe',
        'lions_mane',
      ];
      for (const fam of families) {
        const img = new Image();
        img.src = `/assets/tower_${fam}.jpg`;
        this.towerImages[fam] = img;
      }
    }
  }

  /**
   * Renders a fully-authored HD Fungal Combat Tower with breathing animation,
   * upgrade tiers, firing recoil, and freakout/overdrive states.
   */
  public renderTower(
    ctx: CanvasRenderingContext2D,
    familyKey: FamilyKey,
    colour: FamilyColour,
    x: number,
    y: number,
    // non-balance: default radius
    radius: number = 16,
    isComboCapable: boolean = false,
    freakoutActive: boolean = false,
    // non-balance: animation time
    animTimeMs: number = 0,
    orbitingCount: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Desynchronized 0.5Hz organic breathing swell (PRD §3.6)
    // non-balance: breathing frequency 0.5 Hz
    const breathFreq = 0.003;
    // non-balance: breathing phase calculation
    const breathPhase = (x * 7 + y * 13) % 1000;
    // non-balance: breathing amplitude
    const breath = 1.0 + Math.sin((animTimeMs + breathPhase) * breathFreq) * 0.05;

    const baseColor = freakoutActive ? '#ffffff' : FAMILY_COLORS[colour];

    // Check for HD Illustrated Specimen Asset
    const img = this.towerImages[familyKey];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.scale(breath, breath);

      // 1. Toned-Down Gunmetal Containment Bezel / Base
      ctx.beginPath();
      // non-balance: bezel radius offset 3
      const bezelOffset = 3;
      ctx.arc(0, 0, radius + bezelOffset, 0, Math.PI * 2);
      ctx.fillStyle = '#10161f';
      ctx.fill();
      ctx.strokeStyle = '#27313f';
      // non-balance: bezel line width
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Circular Clipped HD Specimen Illustration
      ctx.save();
      ctx.beginPath();
      // non-balance: image clip offset 1
      const clipOffset = 1;
      ctx.arc(0, 0, radius + clipOffset, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, -radius - clipOffset, -radius - clipOffset, (radius + clipOffset) * 2, (radius + clipOffset) * 2);
      ctx.restore();

      // 3. Subtle Toned-Down Accent Rim (soft muted border matching family)
      ctx.beginPath();
      ctx.arc(0, 0, radius + clipOffset, 0, Math.PI * 2);
      ctx.strokeStyle = colour === 'cyan' ? 'rgba(45, 226, 230, 0.45)' :
                        colour === 'green' ? 'rgba(0, 255, 102, 0.45)' :
                        colour === 'crimson' ? 'rgba(255, 0, 85, 0.45)' :
                        'rgba(255, 170, 0, 0.45)';
      // non-balance: accent rim line width 1
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Overdrive Lightning / Freakout Aura
      if (freakoutActive) {
        ctx.beginPath();
        // non-balance: freakout aura radius offset 6
        const freakoutAuraOffset = 6;
        ctx.arc(0, 0, radius + freakoutAuraOffset, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        // non-balance: dash pattern
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // 5. Artillery Orbiting Spore Mortars
      if (familyKey === 'artillery' && orbitingCount > 0) {
        for (let i = 0; i < orbitingCount; i++) {
          // non-balance: orbit speed factor 0.004
          const orbitAngle = animTimeMs * 0.004 + (i * Math.PI * 2) / orbitingCount;
          // non-balance: orbit radius offset 8
          const orbitDist = radius + 8;
          const ox = Math.cos(orbitAngle) * orbitDist;
          const oy = Math.sin(orbitAngle) * orbitDist;
          ctx.beginPath();
          // non-balance: mortar orb radius 4
          const orbRadius = 4;
          ctx.arc(ox, oy, orbRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#ffaa00';
          ctx.shadowColor = '#ff0055';
          // non-balance: mortar glow blur 8
          const orbGlow = 8;
          ctx.shadowBlur = orbGlow;
          ctx.fill();
        }
      }

      ctx.restore();
      return;
    }

    // 1. Underground Mycelial Mat (Root base)
    ctx.beginPath();
    // non-balance: root base ellipse
    ctx.ellipse(0, radius * 0.6, radius * 1.15 * breath, radius * 0.45 * breath, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c221a';
    ctx.fill();
    ctx.strokeStyle = '#2b3829';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Combo Halo Glow (when level >= 8)
    if (isComboCapable) {
      ctx.save();
      ctx.beginPath();
      // non-balance: visual bloom radius
      ctx.arc(0, 0, (radius + 6) * breath, 0, Math.PI * 2);
      ctx.fillStyle = colour === 'cyan' ? 'rgba(45, 226, 230, 0.25)' :
                      colour === 'green' ? 'rgba(0, 255, 102, 0.25)' :
                      colour === 'crimson' ? 'rgba(255, 0, 85, 0.25)' :
                      'rgba(255, 170, 0, 0.25)';
      ctx.shadowColor = baseColor;
      // non-balance: shadow blur
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }

    // 3. Fungal Body Rendering
    switch (familyKey) {
      case 'puffball': {
        // Calvatia gigantea - Wide low domed peridium, top spore pore
        ctx.save();
        ctx.scale(breath, breath);

        // Lower body shadow
        ctx.beginPath();
        // non-balance: puffball body ellipse
        ctx.ellipse(0, 2, radius * 1.25, radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#134e5e';
        ctx.fill();

        // Main dome body
        ctx.beginPath();
        // non-balance: puffball dome ellipse
        ctx.ellipse(0, -1, radius * 1.15, radius * 0.75, 0, 0, Math.PI * 2);
        ctx.fillStyle = freakoutActive ? '#e0ffff' : '#2de2e6';
        ctx.strokeStyle = '#71f7f9';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Spore Dehiscence Pore (top opening)
        ctx.beginPath();
        // non-balance: top pore
        ctx.ellipse(0, -radius * 0.5, radius * 0.35, radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#0f3a47';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Warted peridium texture speckles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        // non-balance: speckles
        ctx.fillRect(-radius * 0.6, 0, 2, 2);
        // non-balance: speckles
        ctx.fillRect(radius * 0.5, 0, 2, 2);
        // non-balance: speckles
        ctx.fillRect(-radius * 0.2, radius * 0.2, 2, 2);
        // non-balance: speckles
        ctx.fillRect(radius * 0.2, radius * 0.15, 2, 2);
        ctx.restore();
        break;
      }

      case 'foxfire': {
        // Panellus stiptus - Tall thin fibrous stalk, bioluminescent gill underside, flared cap
        ctx.save();
        ctx.scale(breath, breath);

        // Fibrous Stalk
        ctx.beginPath();
        // non-balance: stalk dimensions
        ctx.moveTo(-3, radius * 0.5);
        // non-balance: stalk dimensions
        ctx.lineTo(-2, -radius * 0.4);
        // non-balance: stalk dimensions
        ctx.lineTo(2, -radius * 0.4);
        // non-balance: stalk dimensions
        ctx.lineTo(3, radius * 0.5);
        ctx.closePath();
        ctx.fillStyle = '#006622';
        ctx.fill();
        ctx.strokeStyle = '#009933';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bioluminescent Gills Underside (Emissive green core)
        ctx.beginPath();
        // non-balance: gill ellipse
        ctx.ellipse(0, -radius * 0.35, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = freakoutActive ? '#ffffff' : '#39ff14';
        ctx.shadowColor = '#00ff66';
        // non-balance: glow blur
        ctx.shadowBlur = 8;
        ctx.fill();

        // Flared Cap
        ctx.beginPath();
        // non-balance: cap ellipse
        ctx.ellipse(0, -radius * 0.55, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = freakoutActive ? '#ffffff' : '#00ff66';
        ctx.strokeStyle = '#a6ffb2';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();

        // Glowing center apex spore node
        ctx.beginPath();
        // non-balance: apex bead
        ctx.arc(0, -radius * 0.6, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'artillery': {
        // Amanita muscaria / Sphaerobolus - Fat speckled dome, volva base, mortar barrel
        ctx.save();
        ctx.scale(breath, breath);

        // Volva Base Ring
        ctx.beginPath();
        // non-balance: volva base
        ctx.ellipse(0, radius * 0.4, radius * 0.65, radius * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e6e6e6';
        ctx.fill();

        // Thick Stalk
        ctx.beginPath();
        // non-balance: thick stalk
        ctx.rect(-5, -radius * 0.1, 10, radius * 0.5);
        ctx.fillStyle = '#d9d9d9';
        ctx.strokeStyle = '#bfbfbf';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        // Annular Ring
        ctx.beginPath();
        // non-balance: stalk ring
        ctx.ellipse(0, radius * 0.05, 7, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Fat Speckled Domed Cap
        ctx.beginPath();
        // non-balance: domed cap arc
        ctx.arc(0, -radius * 0.2, radius * 0.95, Math.PI, 0, false);
        ctx.closePath();
        ctx.fillStyle = freakoutActive ? '#ffffff' : '#ff0055';
        ctx.strokeStyle = '#ff6699';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // High-contrast white veil warts / speckling
        ctx.fillStyle = '#ffffff';
        // non-balance: speckle dots
        ctx.fillRect(-6, -radius * 0.5, 3, 3);
        // non-balance: speckle dots
        ctx.fillRect(3, -radius * 0.5, 3, 3);
        // non-balance: speckle dots
        ctx.fillRect(-2, -radius * 0.8, 3, 3);
        // non-balance: speckle dots
        ctx.fillRect(-8, -radius * 0.3, 2, 2);
        // non-balance: speckle dots
        ctx.fillRect(6, -radius * 0.3, 2, 2);

        // Orbiting holding pattern projectiles (ENGINE-SPEC §7.2)
        if (orbitingCount > 0) {
          for (let i = 0; i < orbitingCount; i++) {
            // non-balance: orbit angle calculation
            const orbAngle = (animTimeMs * 0.004) + (i * Math.PI * 2) / 4;
            // non-balance: orbit radius
            const orbDist = radius + 8;
            const ox = Math.cos(orbAngle) * orbDist;
            const oy = Math.sin(orbAngle) * (orbDist * 0.5) - radius * 0.3;

            ctx.beginPath();
            // non-balance: orbiting spore packet size
            ctx.arc(ox, oy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff0055';
            // non-balance: glow
            ctx.shadowBlur = 5;
            ctx.fill();
          }
        }
        ctx.restore();
        break;
      }

      case 'cordyceps': {
        // Ophiocordyceps unilateralis - Antler-like branching golden spikes, no cap
        ctx.save();
        ctx.scale(breath, breath);

        ctx.strokeStyle = freakoutActive ? '#ffffff' : '#ffaa00';
        ctx.lineCap = 'round';
        // non-balance: antler line width
        ctx.lineWidth = 3.5;

        // Central Spike
        ctx.beginPath();
        // non-balance: central spike
        ctx.moveTo(0, radius * 0.5);
        // non-balance: central spike
        ctx.lineTo(0, -radius * 0.9);
        ctx.stroke();

        // Left Branch
        ctx.beginPath();
        // non-balance: left branch
        ctx.moveTo(0, 0);
        // non-balance: left branch
        ctx.quadraticCurveTo(-radius * 0.5, -radius * 0.3, -radius * 0.75, -radius * 0.7);
        ctx.stroke();

        // Right Branch
        ctx.beginPath();
        // non-balance: right branch
        ctx.moveTo(0, -radius * 0.2);
        // non-balance: right branch
        ctx.quadraticCurveTo(radius * 0.5, -radius * 0.5, radius * 0.75, -radius * 0.85);
        ctx.stroke();

        // Glowing Perithecia Bumps (Amber spore nodes)
        ctx.fillStyle = '#ffffff';
        // non-balance: perithecia beads
        ctx.beginPath();
        // non-balance: perithecia beads
        ctx.arc(0, -radius * 0.9, 2.5, 0, Math.PI * 2);
        // non-balance: perithecia beads
        ctx.arc(-radius * 0.75, -radius * 0.7, 2, 0, Math.PI * 2);
        // non-balance: perithecia beads
        ctx.arc(radius * 0.75, -radius * 0.85, 2, 0, Math.PI * 2);
        ctx.shadowColor = '#ffaa00';
        // non-balance: glow
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Renders Support Modifier structures (7 distinct varieties, PRD §2.2).
   */
  public renderModifier(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    // non-balance: radius
    radius: number = 16,
    // non-balance: anim time
    animTimeMs: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // non-balance: pulse frequency
    const pulse = 1.0 + Math.sin(animTimeMs * 0.003) * 0.06;

    // Underground mound base
    ctx.fillStyle = '#2c221a';
    ctx.strokeStyle = '#4a3b32';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // non-balance: modifier base
    ctx.ellipse(0, 2, radius * 1.15, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (name.includes('Relay')) {
      // Hyphal Relay - Gossamer white thread node with radiating filaments
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1;
      // non-balance: radiating threads count
      const threadCount = 6;
      for (let i = 0; i < threadCount; i++) {
        // non-balance: thread angle
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // non-balance: thread endpoints
        ctx.lineTo(Math.cos(ang) * radius * 0.9, Math.sin(ang) * radius * 0.5);
        ctx.stroke();
      }
      ctx.beginPath();
      // non-balance: relay core node
      ctx.arc(0, 0, 4.5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      // non-balance: glow blur
      ctx.shadowBlur = 6;
      ctx.fill();
    } else if (name.includes('Nutrient')) {
      // Nutrient Bed - Dark compost mound with rising organic steam vesicles
      ctx.fillStyle = '#3d2817';
      ctx.beginPath();
      // non-balance: mound
      ctx.arc(0, 0, radius * 0.7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ff88';
      // non-balance: nutrient dots
      ctx.fillRect(-4, -3, 2, 2);
      // non-balance: nutrient dots
      ctx.fillRect(3, -2, 2, 2);
      // non-balance: nutrient dots
      ctx.fillRect(0, 2, 2, 2);
    } else if (name.includes('Enzyme')) {
      // Enzyme Gland - Wet glossy pulsating biological sac
      ctx.beginPath();
      // non-balance: gland sac
      ctx.ellipse(0, -1, radius * 0.65 * pulse, radius * 0.5 * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8338ec';
      ctx.strokeStyle = '#c77dff';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    } else if (name.includes('Vat') || name.includes('Still')) {
      // Amatoxin Vat / Still - Pale Death Cap ring with sunken venom basin
      ctx.beginPath();
      // non-balance: basin
      ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#d90429';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
      // Venom pool
      ctx.beginPath();
      // non-balance: venom inner pool
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#70e000';
      ctx.fill();
    } else if (name.includes('Vent')) {
      // Fermentation Vent - Bubbling volcanic fissure venting gas
      ctx.beginPath();
      // non-balance: vent fissure
      ctx.ellipse(0, 0, radius * 0.7, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b35';
      ctx.fill();
      // Vent bubble
      ctx.beginPath();
      // non-balance: gas bubble
      ctx.arc(0, -4 * pulse, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f7c59f';
      ctx.fill();
    } else {
      // Rhizomorph Runner - Braided black cords radiating outward
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // non-balance: runner cords
      ctx.moveTo(-radius * 0.9, 0);
      // non-balance: runner cords
      ctx.lineTo(radius * 0.9, 0);
      ctx.stroke();
      ctx.beginPath();
      // non-balance: center core
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff9f1c';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders Apex and Utility structures (PRD §2.3).
   */
  public renderApex(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    // non-balance: radius
    radius: number = 20,
    // non-balance: anim time
    animTimeMs: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Large apex landmark base
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1b263b';
    ctx.strokeStyle = '#415a77';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Central apex crystal / cannon barrel
    ctx.beginPath();
    // non-balance: apex crystal
    ctx.rect(-4, -radius * 0.8, 8, radius * 1.6);
    ctx.fillStyle = '#e0e1dd';
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders Ghost Mycelium subterranean build-mode overlay (PRD §2.3).
   */
  public renderGhostMycelium(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    // non-balance: radius
    radius: number = 16,
    // non-balance: anim time
    animTimeMs: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Subterranean faint bioluminescent web
    // non-balance: glow pulsation
    const glow = 0.5 + Math.sin(animTimeMs * 0.005) * 0.3;
    ctx.strokeStyle = `rgba(0, 255, 200, ${glow})`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // non-balance: web ray count
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      // non-balance: ray angle
      const ang = (i * Math.PI) / 4;
      ctx.moveTo(0, 0);
      // non-balance: ray endpoints
      ctx.lineTo(Math.cos(ang) * radius * 1.2, Math.sin(ang) * radius * 1.2);
    }
    ctx.stroke();

    ctx.beginPath();
    // non-balance: center core
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00f5d4';
    ctx.shadowColor = '#00f5d4';
    // non-balance: glow
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders an authored HD Attacker Sprite across all 9 Tiers, Gait Cycles,
   * Heading Orientations, and Cycle Accessory Overlays (PRD §2.4, §3.1).
   */
  public renderAttacker(
    ctx: CanvasRenderingContext2D,
    tier: number,
    cycle: number,
    x: number,
    y: number,
    angle: number,
    healthPercent: number,
    isSlowed: boolean = false,
    // non-balance: anim time
    animTimeMs: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Repoint check (tiers 1, 3, 4, 5, 7, 8 rotate to face heading; 0, 2, 6 do not)
    // non-balance: non-rotating tiers
    const rotates = ![0, 2, 6].includes(tier);
    if (rotates) {
      ctx.rotate(angle);
    }

    // Determine size band from PRD §3.1:
    // Tiers 0-2: 48px (r = 10)
    // Tiers 3-6: 64px (r = 14)
    // Tiers 7-8: 80px (r = 18)
    // non-balance: tier radius
    const r = tier <= 2 ? 10 : tier <= 6 ? 14 : 18;

    // Gait animation oscillation (crawl/walk cycle)
    // non-balance: crawl frequency
    const crawlWobble = Math.sin(animTimeMs * 0.012 + x * 0.1) * 0.15;

    // Base body styling
    ctx.fillStyle = isSlowed ? '#6b8ca6' : '#a8b1bd';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    switch (tier) {
      case 0: { // Carpenter Ant Column (radially symmetric, top-down)
        ctx.save();
        ctx.rotate(crawlWobble);
        // Head, Thorax, Abdomen
        ctx.beginPath();
        // non-balance: ant body segments
        ctx.arc(-r * 0.4, 0, r * 0.35, 0, Math.PI * 2);
        // non-balance: ant body segments
        ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
        // non-balance: ant body segments
        ctx.arc(r * 0.45, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#457b9d' : '#2b2d42';
        ctx.fill();

        // 6 Articulated Legs
        ctx.strokeStyle = '#1d3557';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // non-balance: leg lines
        ctx.moveTo(-r * 0.2, -r * 0.6); ctx.lineTo(-r * 0.2, r * 0.6);
        // non-balance: leg lines
        ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.7);
        // non-balance: leg lines
        ctx.moveTo(r * 0.2, -r * 0.6); ctx.lineTo(r * 0.2, r * 0.6);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 1: { // Ground Beetle (Armored chitinous carapace, distinct head & mandibles)
        ctx.beginPath();
        // non-balance: beetle shell
        ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#457b9d' : '#1b4332';
        ctx.strokeStyle = '#52b788';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();

        // Head & Mandibles
        ctx.beginPath();
        // non-balance: head
        ctx.arc(r * 0.65, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#081c15';
        ctx.fill();
        // Mandible pincers
        ctx.strokeStyle = '#d8f3dc';
        ctx.beginPath();
        // non-balance: pincers
        ctx.moveTo(r * 0.7, -3); ctx.lineTo(r * 1.0, -1);
        // non-balance: pincers
        ctx.moveTo(r * 0.7, 3); ctx.lineTo(r * 1.0, 1);
        ctx.stroke();
        break;
      }

      // non-balance: tier 2 case
      case 2: { // Field Rat (Scurrying top-down rodent, whiskers, trailing tail)
        ctx.beginPath();
        // Body
        // non-balance: rat body
        ctx.ellipse(0, 0, r * 0.85, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#6c757d' : '#495057';
        ctx.fill();

        // Snout
        ctx.beginPath();
        // non-balance: snout
        ctx.moveTo(r * 0.6, -r * 0.3);
        // non-balance: snout
        ctx.lineTo(r * 1.05, 0);
        // non-balance: snout
        ctx.lineTo(r * 0.6, r * 0.3);
        ctx.fillStyle = '#f8edeb';
        ctx.fill();

        // Trailing tail
        ctx.beginPath();
        // non-balance: tail
        ctx.moveTo(-r * 0.8, 0);
        // non-balance: tail
        ctx.quadraticCurveTo(-r * 1.2, crawlWobble * 10, -r * 1.5, crawlWobble * 15);
        ctx.strokeStyle = '#ffb5a7';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      }

      // non-balance: tier 3 case
      case 3: { // Crow (Walking corvid with folded wing feathers, sharp beak)
        ctx.beginPath();
        // Body & Wings
        // non-balance: crow body
        ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#212529' : '#111111';
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        // Head & Beak
        ctx.beginPath();
        // non-balance: crow head
        ctx.arc(r * 0.6, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.beginPath();
        // non-balance: beak
        ctx.moveTo(r * 0.7, -2);
        // non-balance: beak
        ctx.lineTo(r * 1.15, 0);
        // non-balance: beak
        ctx.lineTo(r * 0.7, 2);
        ctx.fillStyle = '#e9ecef';
        ctx.fill();
        break;
      }

      // non-balance: tier 4 case
      case 4: { // Fox (Sleek canine silhouette with broad brush tail)
        ctx.beginPath();
        // Sleek body
        // non-balance: fox body
        ctx.ellipse(0, 0, r * 0.95, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#9a8c98' : '#e07a5f';
        ctx.fill();

        // Head & Ears
        ctx.beginPath();
        // non-balance: head
        ctx.arc(r * 0.7, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#d00000';
        ctx.fill();

        // Brush Tail with white tip
        ctx.beginPath();
        // non-balance: brush tail
        ctx.ellipse(-r * 1.1, 0, r * 0.45, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e07a5f';
        ctx.fill();
        ctx.beginPath();
        // non-balance: white tail tip
        ctx.arc(-r * 1.4, 0, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        break;
      }

      // non-balance: tier 5 case
      case 5: { // Wild Boar (Heavy broad-shouldered silhouette, white tusks)
        ctx.beginPath();
        // Heavy body
        // non-balance: boar body
        ctx.ellipse(0, 0, r * 1.05, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSlowed ? '#5c677d' : '#3d342f';
        ctx.strokeStyle = '#221a15';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Forward White Tusks
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // non-balance: tusks
        ctx.moveTo(r * 0.7, -r * 0.4); ctx.lineTo(r * 1.15, -r * 0.5);
        // non-balance: tusks
        ctx.moveTo(r * 0.7, r * 0.4); ctx.lineTo(r * 1.15, r * 0.5);
        ctx.stroke();
        break;
      }

      // non-balance: tier 6 case
      case 6: { // K9 Handler Unit (Tactical dog + soldier duo, repoint: false)
        // Handler Body
        ctx.beginPath();
        // non-balance: handler soldier
        ctx.rect(-r * 0.6, -r * 0.6, r * 0.7, r * 1.2);
        ctx.fillStyle = isSlowed ? '#495057' : '#2b2d42';
        ctx.fill();

        // K9 Scout Dog
        ctx.beginPath();
        // non-balance: scout dog
        ctx.ellipse(r * 0.4, 0, r * 0.45, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#6c584c';
        ctx.fill();
        break;
      }

      // non-balance: tier 7 case
      case 7: { // Field Researcher (Civilian lab coat, respirator, clipboard)
        ctx.beginPath();
        // Lab Coat
        // non-balance: lab coat
        ctx.rect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        ctx.fillStyle = isSlowed ? '#ced4da' : '#f8f9fa';
        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        // Respirator Mask & Visor
        ctx.beginPath();
        // non-balance: respirator
        ctx.arc(r * 0.4, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00b4d8';
        ctx.fill();
        break;
      }

      // non-balance: tier 8 case
      case 8: { // Hazmat Trooper (Apex sealed containment suit, visor glow)
        ctx.beginPath();
        // Heavy bio-suit
        // non-balance: hazmat suit
        ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        ctx.fillStyle = isSlowed ? '#adb5bd' : '#ffb703';
        ctx.strokeStyle = '#fb8500';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Glowing Cyan Visor Aperture
        ctx.beginPath();
        // non-balance: visor
        ctx.rect(r * 0.2, -3, 4, 6);
        ctx.fillStyle = '#00f5d4';
        ctx.shadowColor = '#00f5d4';
        // non-balance: glow
        ctx.shadowBlur = 6;
        ctx.fill();
        break;
      }
    }

    // Cycle Accessory Overlay (PRD §2.4)
    if (cycle === 2) {
      // Cycle 2 Tech Accent (Amber scanner / sensor beacon)
      ctx.fillStyle = '#ffd166';
      // non-balance: tech accent
      ctx.fillRect(-2, -r * 0.8, 4, 3);
    // non-balance: cycle 3 threshold
    } else if (cycle >= 3) {
      // Cycle 3+ Fungal-Resistance Bio-Gear (Sealed containment joint filters)
      ctx.strokeStyle = '#06d6a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // non-balance: bio filter ring
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Render Health Percentage above attacker (ENGINE-SPEC §3.3)
    ctx.save();
    // non-balance: health offset
    ctx.translate(x, y - r - 7);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    // non-balance: shadow
    ctx.shadowBlur = 3;
    ctx.fillText(`${healthPercent}%`, 0, 0);
    ctx.restore();
  }

  /**
   * Renders the Base / Core as Design 5: Alien Chitinous Embryonic Bio-Pod.
   * Features a living alien embryo suspended in bioluminescent containment fluid,
   * gentle floating when healthy, and erratic twitch spasms with warning glows when taking damage.
   */
  public renderBase(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    livesRemaining: number,
    // non-balance: anim time
    animTimeMs: number = 0
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // non-balance: maximum core lives
    const maxLives = 10;
    const missingLives = Math.max(0, maxLives - livesRemaining);
    // non-balance: damage ratio 0.0 to 1.0
    const damageRatio = missingLives / (maxLives - 1);
    const isCritical = livesRemaining <= 2;

    // 1. Ambient Occlusion Floor Shadow
    ctx.beginPath();
    // non-balance: pod base shadow radii
    ctx.ellipse(0, 16, 36, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 8, 12, 0.75)';
    ctx.fill();

    // 2. Outer Chitinous Biomechanical Exoskeleton & Horn Carapace
    ctx.save();
    // non-balance: subtle pod hull breathing
    const hullPulse = 1.0 + Math.sin(animTimeMs * 0.002) * 0.015;
    ctx.scale(hullPulse, hullPulse);

    // Chitin horn / rear armature
    ctx.beginPath();
    // non-balance: horn move
    ctx.moveTo(10, 24);
    // non-balance: horn curve coordinates
    ctx.bezierCurveTo(34, 18, 38, -12, 28, -32);
    // non-balance: horn curve coordinates
    ctx.bezierCurveTo(18, -42, 6, -38, 2, -28);
    // non-balance: horn curve coordinates
    ctx.bezierCurveTo(10, -22, 18, -8, 14, 16);
    ctx.closePath();
    ctx.fillStyle = isCritical ? '#2d141e' : '#141c26';
    ctx.strokeStyle = isCritical ? '#ff0055' : '#27384c';
    // non-balance: horn outline width
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Chitin plates segmentation ribs
    // non-balance: plate ribs
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      // non-balance: rib offsets
      const ribY = -20 + r * 10;
      // non-balance: rib start
      ctx.moveTo(14, ribY);
      // non-balance: rib end
      ctx.lineTo(26, ribY + 4);
      ctx.strokeStyle = isCritical ? 'rgba(255, 0, 85, 0.4)' : 'rgba(88, 166, 255, 0.3)';
      // non-balance: rib line width
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Front Chitin Mandible / Ventral Armature
    ctx.beginPath();
    // non-balance: front mandible start
    ctx.moveTo(-16, 22);
    // non-balance: front armature bezier
    ctx.bezierCurveTo(-32, 16, -34, -4, -26, -18);
    // non-balance: front armature bezier
    ctx.bezierCurveTo(-20, -26, -14, -22, -10, -12);
    // non-balance: front armature bezier
    ctx.bezierCurveTo(-14, 0, -14, 14, -12, 22);
    ctx.closePath();
    ctx.fillStyle = isCritical ? '#25101a' : '#101720';
    ctx.strokeStyle = isCritical ? '#ff0055' : '#222f40';
    // non-balance: mandible line width
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Base Mounting Collar & Hydraulic Conduits
    ctx.beginPath();
    // non-balance: mounting collar
    ctx.ellipse(0, 18, 24, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0e14';
    ctx.strokeStyle = isCritical ? '#ff5964' : '#58a6ff';
    // non-balance: collar line width
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Hydraulic Bio-Tubes along base
    ctx.beginPath();
    // non-balance: bio tube start
    ctx.moveTo(-18, 18);
    // non-balance: bio tube bezier
    ctx.bezierCurveTo(-12, 28, 12, 28, 18, 18);
    ctx.strokeStyle = isCritical ? '#ff0055' : '#00f5d4';
    // non-balance: tube line width
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();

    // 3. Translucent Bio-Hazard Incubation Fluid Chamber
    ctx.save();
    ctx.beginPath();
    // non-balance: incubation vessel ellipse
    ctx.ellipse(0, -2, 20, 26, 0, 0, Math.PI * 2);

    // Amniotic Fluid Gradient
    // non-balance: fluid gradient coordinates
    const fluidGrad = ctx.createRadialGradient(-4, -6, 2, 0, -2, 26);
    if (isCritical) {
      // non-balance: critical color stops
      fluidGrad.addColorStop(0, 'rgba(255, 77, 109, 0.45)');
      // non-balance: critical color stops
      fluidGrad.addColorStop(0.7, 'rgba(128, 0, 32, 0.65)');
      fluidGrad.addColorStop(1, 'rgba(40, 0, 12, 0.9)');
    } else {
      // non-balance: healthy color stops
      fluidGrad.addColorStop(0, 'rgba(0, 245, 212, 0.4)');
      // non-balance: healthy color stops
      fluidGrad.addColorStop(0.65, 'rgba(0, 128, 100, 0.55)');
      fluidGrad.addColorStop(1, 'rgba(5, 30, 25, 0.85)');
    }
    ctx.fillStyle = fluidGrad;
    ctx.strokeStyle = isCritical ? '#ff0055' : '#00f5d4';
    // non-balance: vessel rim width
    ctx.lineWidth = 2;
    ctx.shadowColor = isCritical ? '#ff0055' : '#00f5d4';
    // non-balance: glow blur
    ctx.shadowBlur = isCritical ? 14 : 10;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rising Microscopic Incubation Bubbles
    // non-balance: bubble count 5
    const bubbleCount = 5;
    for (let b = 0; b < bubbleCount; b++) {
      // non-balance: bubble time offset
      const bubbleTime = (animTimeMs * 0.001 + b * 1.6) % 2.0;
      // non-balance: bubble y pos
      const by = 16 - bubbleTime * 18;
      // non-balance: bubble x wobble
      const bx = Math.sin(animTimeMs * 0.003 + b * 2.1) * 8;
      ctx.beginPath();
      // non-balance: bubble size
      ctx.arc(bx, by, 1.2 + (b % 2) * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = isCritical ? 'rgba(255, 180, 190, 0.6)' : 'rgba(200, 255, 240, 0.7)';
      ctx.fill();
    }

    // 4. Living Alien Embryo Entity
    // Movement Dynamics: Slow undulating float when healthy, erratic spasming twitches when hit
    // non-balance: slow float x
    const slowX = Math.sin(animTimeMs * 0.0012) * 2.2;
    // non-balance: slow float y
    const slowY = Math.cos(animTimeMs * 0.0016) * 1.8;
    // non-balance: slow rot
    const slowRot = Math.sin(animTimeMs * 0.0008) * 0.10;

    // non-balance: erratic twitch multipliers
    const twitchFreq1 = 0.006 + damageRatio * 0.018;
    // non-balance: erratic twitch multipliers
    const twitchFreq2 = 0.016 + damageRatio * 0.032;
    // non-balance: twitch amplitude
    const twitchAmp = damageRatio * 6.5;
    // non-balance: erratic offsets
    const erraticX = Math.sin(animTimeMs * twitchFreq1) * twitchAmp + Math.sin(animTimeMs * twitchFreq2 * 2.1) * (damageRatio * 3.0);
    // non-balance: erratic offsets
    const erraticY = Math.cos(animTimeMs * twitchFreq1 * 1.4) * twitchAmp + Math.cos(animTimeMs * twitchFreq2 * 1.8) * (damageRatio * 3.0);
    // non-balance: erratic rot
    const erraticRot = Math.sin(animTimeMs * twitchFreq1 * 1.6) * (damageRatio * 0.4);

    const embryoX = slowX + erraticX;
    // non-balance: base embryo Y offset -2
    const embryoY = -2 + slowY + erraticY;
    const embryoRot = slowRot + erraticRot;

    // Heartbeat / breath scaling (accelerates sharply with damage)
    // non-balance: heartbeat speed scaling
    const heartbeatSpeed = 0.0025 + damageRatio * 0.014;
    // non-balance: breath oscillation amplitude
    const breathAmp = 0.04 + damageRatio * 0.12;
    const breathScale = 1.0 + Math.sin(animTimeMs * heartbeatSpeed) * breathAmp;

    ctx.save();
    ctx.translate(embryoX, embryoY);
    ctx.rotate(embryoRot);
    ctx.scale(breathScale, breathScale);

    // Neural Umbilical Cord (attaches embryo to pod wall)
    ctx.beginPath();
    // non-balance: cord start
    ctx.moveTo(0, 16);
    // non-balance: umbilical control point
    ctx.quadraticCurveTo(-6, 8, 2, 0);
    ctx.strokeStyle = isCritical ? 'rgba(255, 0, 85, 0.7)' : 'rgba(0, 245, 212, 0.6)';
    // non-balance: cord width
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Embryo Silhouette (Curled fetal spine, head, tail)
    ctx.beginPath();
    // Head
    // non-balance: embryo head ellipse
    ctx.ellipse(0, -6, 7.5, 6.5, -0.2, 0, Math.PI * 2);
    // Curled Spine Body
    // non-balance: embryo spine move
    ctx.moveTo(3, -2);
    // non-balance: embryo spine bezier
    ctx.bezierCurveTo(8, 2, 6, 9, 0, 11);
    // non-balance: embryo spine bezier
    ctx.bezierCurveTo(-5, 12, -7, 6, -3, 2);
    ctx.closePath();

    ctx.fillStyle = isCritical ? '#4a0818' : '#0a2e26';
    ctx.strokeStyle = isCritical ? '#ff4d6d' : '#2de2e6';
    // non-balance: embryo outline width
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    // Glowing Bioluminescent Neural Core / Eye
    ctx.beginPath();
    // non-balance: embryo eye position
    ctx.arc(-2, -7, 2, 0, Math.PI * 2);
    ctx.fillStyle = isCritical ? '#ff0055' : '#00f5d4';
    ctx.shadowColor = isCritical ? '#ff0055' : '#00f5d4';
    // non-balance: eye glow blur
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Internal Neural Veins
    ctx.beginPath();
    // non-balance: neural vein start
    ctx.moveTo(0, -3);
    // non-balance: neural vein curve
    ctx.quadraticCurveTo(3, 4, -1, 8);
    ctx.strokeStyle = isCritical ? '#ff758f' : '#71f7f9';
    // non-balance: vein width
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore(); // Restore embryo transform

    // Glass Reflection Curvature Highlight
    ctx.beginPath();
    // non-balance: glass highlight arc
    ctx.arc(-6, -8, 14, -Math.PI * 0.4, Math.PI * 0.1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    // non-balance: glass highlight width
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore(); // Restore fluid vessel transform

    // 5. 10 Surrounding Spore Life Nodes (Bio-Cell Pod Batteries)
    // non-balance: total nodes
    const totalNodes = 10;
    // non-balance: ring radius 38
    const ringRadius = 38;

    for (let i = 0; i < totalNodes; i++) {
      const theta = (i / totalNodes) * Math.PI * 2;
      const nx = Math.cos(theta) * ringRadius;
      const ny = Math.sin(theta) * ringRadius;

      ctx.beginPath();
      // non-balance: spore node radius
      ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);

      if (i < livesRemaining) {
        // Active glowing spore life node
        ctx.fillStyle = isCritical ? '#ff0055' : '#00f5d4';
        ctx.shadowColor = isCritical ? '#ff0055' : '#00f5d4';
        // non-balance: glow blur
        ctx.shadowBlur = 8;
      } else {
        // Extinguished / greyed-out spore node
        ctx.fillStyle = '#1a202c';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
