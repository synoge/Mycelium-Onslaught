import { FamilyColour, FamilyKey } from '../interfaces';

// Family colors
export const FAMILY_COLORS: Record<FamilyColour, string> = {
  cyan: '#2de2e6',    // Puffball (cyan-teal)
  green: '#00ff66',   // Foxfire (acid green)
  crimson: '#ff0055', // Artillery (crimson-magenta)
  amber: '#ffaa00',   // Cordyceps (amber-gold)
};

export class SpriteRenderer {
  /**
   * Renders a tower placeholder sprite centered at (x, y) with radius r.
   */
  public renderTower(
    ctx: CanvasRenderingContext2D,
    familyKey: FamilyKey,
    colour: FamilyColour,
    x: number,
    y: number,
    // non-balance: default placeholder render radius in logical pixels
    radius: number = 16,
    isComboCapable: boolean = false,
    freakoutActive: boolean = false
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const baseColor = freakoutActive ? '#ffffff' : FAMILY_COLORS[colour];

    // Combo-capable glow halo if level >= 8
    if (isComboCapable) {
      ctx.beginPath();
      // non-balance: visual bloom radius padding in logical pixels
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = colour === 'cyan' ? 'rgba(45, 226, 230, 0.25)' :
                      colour === 'green' ? 'rgba(0, 255, 102, 0.25)' :
                      colour === 'crimson' ? 'rgba(255, 0, 85, 0.25)' :
                      'rgba(255, 170, 0, 0.25)';
      ctx.fill();
    }

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    switch (familyKey) {
      case 'puffball': // Wide low dome, no stalk
        ctx.beginPath();
        // non-balance: visual silhouette width and height multipliers
        ctx.ellipse(0, 2, radius * 1.2, radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'foxfire': // Tall thin stalk, small cap
        // Stalk
        ctx.beginPath();
        // non-balance: visual stalk dimensions
        ctx.rect(-3, -2, 6, radius + 4);
        ctx.fill();
        ctx.stroke();
        // Small cap
        ctx.beginPath();
        // non-balance: visual cap dimensions
        ctx.ellipse(0, -radius * 0.6, radius * 0.65, radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'artillery': // Fat speckled dome + thick stalk
        // Thick stalk
        ctx.beginPath();
        // non-balance: visual thick stalk dimensions
        ctx.rect(-6, 0, 12, radius);
        ctx.fill();
        ctx.stroke();
        // Fat domed cap
        ctx.beginPath();
        // non-balance: visual domed cap dimensions
        ctx.arc(0, -2, radius * 0.95, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Speckling dots
        ctx.fillStyle = '#ffffff';
        // non-balance: visual speckle dots
        ctx.fillRect(-6, -6, 3, 3);
        // non-balance: visual speckle dots
        ctx.fillRect(3, -6, 3, 3);
        // non-balance: visual speckle dots
        ctx.fillRect(-2, -10, 3, 3);
        break;

      case 'cordyceps': // Antler-like branching spike, no cap
        ctx.beginPath();
        // Central spike
        // non-balance: visual antler central spike
        ctx.moveTo(0, radius);
        // non-balance: visual antler central spike
        ctx.lineTo(0, -radius);
        // Left branch
        ctx.moveTo(0, 2);
        // non-balance: visual antler branches
        ctx.lineTo(-radius * 0.7, -radius * 0.4);
        // non-balance: visual antler branches
        ctx.lineTo(-radius * 0.8, -radius * 0.8);
        // Right branch
        ctx.moveTo(0, -2);
        // non-balance: visual antler branches
        ctx.lineTo(radius * 0.7, -radius * 0.6);
        // non-balance: visual antler branches
        ctx.lineTo(radius * 0.8, -radius);
        // non-balance: line width
        ctx.lineWidth = 3;
        ctx.strokeStyle = baseColor;
        ctx.stroke();
        ctx.lineWidth = 1;
        break;
    }

    ctx.restore();
  }

  /**
   * Renders a modifier structure placeholder (low and wide, 96x96 class).
   */
  public renderModifier(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    // non-balance: default placeholder render radius in logical pixels
    radius: number = 16
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Low wide compost mound / mycelial node
    ctx.fillStyle = '#4a3b32';
    ctx.strokeStyle = '#8c7355';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // non-balance: visual low-wide modifier dimensions
    ctx.ellipse(0, 2, radius * 1.1, radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central pulsing node
    ctx.fillStyle = '#a68a68';
    ctx.beginPath();
    // non-balance: visual center core radius
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Radiating filament accents
    ctx.strokeStyle = 'rgba(166, 138, 104, 0.6)';
    ctx.lineWidth = 1;
    // non-balance: visual filament lines
    ctx.beginPath();
    ctx.moveTo(-radius * 0.8, 0);
    ctx.lineTo(radius * 0.8, 0);
    ctx.moveTo(0, -radius * 0.4);
    ctx.lineTo(0, radius * 0.4);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders an attacker sprite centered at (x, y).
   */
  public renderAttacker(
    ctx: CanvasRenderingContext2D,
    tier: number,
    cycle: number,
    x: number,
    y: number,
    angle: number,
    healthPercent: number,
    isSlowed: boolean = false
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Repoint check per tier (tiers 1, 3, 4, 5, 7, 8 rotate; 0, 2, 6 do not)
    // non-balance: repoint tier indices
    const rotates = ![0, 2, 6].includes(tier);
    if (rotates) {
      ctx.rotate(angle);
    }

    // Determine size band from PRD §3.1:
    // Tiers 0-2: 48px (r = 10)
    // Tiers 3-6: 64px (r = 14)
    // Tiers 7-8: 80px (r = 18)
    // non-balance: visual radius for attacker tiers
    const r = tier <= 2 ? 10 : tier <= 6 ? 14 : 18;

    // Base tier colors / silhouettes
    ctx.fillStyle = isSlowed ? '#6b8ca6' : cycle > 1 ? '#d66a63' : '#a8b1bd';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    if (tier === 0) {
      // Radially symmetric ant column
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    } else if (tier === 1) {
      // Ground beetle with head
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
    } else if (tier === 2) {
      // Field rat
      ctx.ellipse(0, 0, r * 0.9, r * 0.6, 0, 0, Math.PI * 2);
    // non-balance: tier 4 fox with brush tail
    } else if (tier === 4) {
      // non-balance: visual fox ellipse
      ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
      // non-balance: brush tail rect
      ctx.rect(-r * 1.3, -2, 6, 4);
    // non-balance: tier 7+ human/hazmat
    } else if (tier >= 7) {
      ctx.rect(-r * 0.6, -r * 0.7, r * 1.2, r * 1.4);
    } else {
      // Generic beast / bird
      ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Render Health Percentage above attacker (ENGINE-SPEC §3.3)
    ctx.save();
    // non-balance: visual health label offset
    ctx.translate(x, y - r - 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${healthPercent}%`, 0, 0);
    ctx.restore();
  }

  /**
   * Renders the Base / Core with 10 pulsing spore life nodes.
   */
  public renderBase(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    livesRemaining: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Swollen primordial fruiting mass
    ctx.fillStyle = '#301b28';
    ctx.strokeStyle = '#632b49';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // non-balance: visual base core radius
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 10 Spore Nodes ringing the core
    // non-balance: 10 discrete life nodes
    const totalNodes = 10;
    // non-balance: node ring radius
    const ringRadius = 30;

    for (let i = 0; i < totalNodes; i++) {
      const theta = (i / totalNodes) * Math.PI * 2;
      const nx = Math.cos(theta) * ringRadius;
      const ny = Math.sin(theta) * ringRadius;

      ctx.beginPath();
      // non-balance: node circle radius
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);

      if (i < livesRemaining) {
        // Active pulsing life node
        ctx.fillStyle = '#00ffaa';
        ctx.shadowColor = '#00ffaa';
        // non-balance: visual glow blur for active life nodes
        ctx.shadowBlur = 6;
      } else {
        // Extinguished / greyed out node
        ctx.fillStyle = '#3a3a3a';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }

    ctx.restore();
  }
}
