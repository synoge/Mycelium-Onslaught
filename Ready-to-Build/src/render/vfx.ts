// Visual Effects & Particle Engine for Mycelium Onslaught (M4 + Polish)

export interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  maxLife: number;
  life: number;
}

export interface ShockwaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lineWidth: number;
  alpha: number;
  decay: number;
}

export interface LaserBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  alpha: number;
  chainHops?: { x: number; y: number }[];
}

export interface NeuralArcEffect {
  points: { x: number; y: number }[];
  color: string;
  alpha: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

export interface ScorchMark {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export interface HyphaeFilament {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  alpha: number;
}

export class VFXEngine {
  private particles: VisualParticle[] = [];
  private shockwaves: ShockwaveEffect[] = [];
  private lasers: LaserBeam[] = [];
  private neuralArcs: NeuralArcEffect[] = [];
  private floatingTexts: FloatingText[] = [];
  private scorchMarks: ScorchMark[] = [];
  private hyphaeFilaments: HyphaeFilament[] = [];

  public screenShakeAmount: number = 0;

  /**
   * Triggers a screen shake impulse.
   */
  public addScreenShake(amount: number): void {
    // non-balance: max screen shake limit
    const maxShake = 15;
    this.screenShakeAmount = Math.min(maxShake, this.screenShakeAmount + amount);
  }

  /**
   * Spawns scorched ground marks on lasers and craters (Option C).
   */
  public spawnScorchMark(
    x: number,
    y: number,
    // non-balance: default scorch radius
    radius: number = 8,
    color: string = 'rgba(0, 255, 102, 0.4)'
  ): void {
    // non-balance: max scorch marks limit
    const maxMarks = 50;
    if (this.scorchMarks.length > maxMarks) {
      this.scorchMarks.shift();
    }
    this.scorchMarks.push({
      x,
      y,
      radius,
      color,
      alpha: 1.0,
    });
  }

  /**
   * Grows organic mycelial hyphae threads into the soil around active fungal structures (Option C).
   */
  public addHyphaeGrowth(originX: number, originY: number, count: number = 2): void {
    // non-balance: max hyphae threads limit
    const maxThreads = 120;
    if (this.hyphaeFilaments.length > maxThreads) {
      this.hyphaeFilaments.shift();
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // non-balance: branch length base 12 and spread 20
      const lenBase = 12;
      // non-balance: branch length base 12 and spread 20
      const lenSpread = 20;
      const length = lenBase + Math.random() * lenSpread;
      const x2 = originX + Math.cos(angle) * length;
      const y2 = originY + Math.sin(angle) * length;

      this.hyphaeFilaments.push({
        x1: originX,
        y1: originY,
        x2,
        y2,
        color: '#2de2e6',
        alpha: 0.3 + Math.random() * 0.3,
      });
    }
  }

  /**
   * Spawns a burst of directional or radial particles.
   */
  public spawnParticleBurst(
    x: number,
    y: number,
    // non-balance: particle count
    count: number,
    colors: string[],
    // non-balance: min speed
    minSpeed: number = 20,
    // non-balance: max speed
    maxSpeed: number = 80,
    // non-balance: min size
    minSize: number = 2,
    // non-balance: max size
    maxSize: number = 5
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = minSize + Math.random() * (maxSize - minSize);
      // non-balance: particle lifetime base 300ms spread 400ms
      const lifeBase = 300;
      // non-balance: particle lifetime base 300ms spread 400ms
      const lifeSpread = 400;
      const maxLife = lifeBase + Math.random() * lifeSpread;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        alpha: 1.0,
        decay: 1.0 / (maxLife / 16.6),
        maxLife,
        life: maxLife,
      });
    }
  }

  /**
   * Spawns an expanding shockwave ring.
   */
  public spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    // non-balance: shockwave line width
    lineWidth: number = 3,
    // non-balance: duration ms
    durationMs: number = 400
  ): void {
    this.shockwaves.push({
      x,
      y,
      // non-balance: start radius
      radius: 2,
      maxRadius,
      color,
      lineWidth,
      alpha: 1.0,
      decay: 1.0 / (durationMs / 16.6),
    });
  }

  /**
   * Spawns an animated laser beam shot with optional chain hops.
   */
  public spawnLaserBeam(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string = '#00ff66',
    // non-balance: laser width
    width: number = 3,
    chainHops?: { x: number; y: number }[]
  ): void {
    this.lasers.push({
      startX,
      startY,
      endX,
      endY,
      color,
      width,
      alpha: 1.0,
      chainHops,
    });
    // non-balance: laser scorch mark radius 6
    const laserScorchRadius = 6;
    this.spawnScorchMark(endX, endY, laserScorchRadius, 'rgba(0, 255, 102, 0.5)');
  }

  /**
   * Spawns electric synapse lightning arcs for Lion's Mane.
   */
  public spawnNeuralArc(points: { x: number; y: number }[], color: string = '#00b4d8'): void {
    this.neuralArcs.push({
      points,
      color,
      alpha: 1.0,
    });
  }

  /**
   * Spawns floating combat text (bounty, combo name, damage).
   */
  public spawnFloatingText(x: number, y: number, text: string, color: string = '#ffd700'): void {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      alpha: 1.0,
      // non-balance: float speed
      vy: -25,
      // non-balance: text lifetime 800ms
      life: 800,
    });
  }

  /**
   * Triggers specialized visual effects for all 20 combos.
   */
  public triggerComboVFX(comboKey: string, x: number, y: number): void {
    // non-balance: screen shake amount 6
    const shakeImpulse = 6;
    this.addScreenShake(shakeImpulse);
    // non-balance: combo name floating text offset 16
    this.spawnFloatingText(x, y - 16, comboKey.toUpperCase().replace(/_/g, ' '), '#ffd700');

    switch (comboKey) {
      case 'sporeshell':
      case 'heavy_sporeshell':
      case 'sclerotium':
      case 'deep_sclerotium':
        // non-balance: combo shockwave radius 60
        this.spawnShockwave(x, y, 60, '#2de2e6', 4, 500);
        // non-balance: particle count 24
        this.spawnParticleBurst(x, y, 24, ['#2de2e6', '#ffffff', '#134e5e'], 40, 140, 2, 6);
        break;

      case 'bloom_cannon':
      case 'heavy_bloom_cannon':
        // non-balance: combo shockwave radius 80
        this.spawnShockwave(x, y, 80, '#00ff66', 5, 600);
        // non-balance: particle count 30
        this.spawnParticleBurst(x, y, 30, ['#00ff66', '#ffffff', '#71f7f9'], 50, 160, 3, 7);
        break;

      case 'fruiting_detonation':
        // non-balance: combo shockwave radius 110
        this.spawnShockwave(x, y, 110, '#ff0055', 6, 800);
        // non-balance: particle count 40
        this.spawnParticleBurst(x, y, 40, ['#ff0055', '#ffaa00', '#ffffff'], 60, 200, 3, 8);
        break;

      case 'mycelial_sinkhole':
        // non-balance: combo shockwave radius 90
        this.spawnShockwave(x, y, 90, '#ffaa00', 4, 1000);
        // non-balance: particle count 35
        this.spawnParticleBurst(x, y, 35, ['#ffaa00', '#1c221a', '#00ff66'], 30, 120, 2, 6);
        break;

      default:
        // non-balance: default combo shockwave radius 65
        this.spawnShockwave(x, y, 65, '#ffd700', 3, 500);
        // non-balance: default particle count 20
        this.spawnParticleBurst(x, y, 20, ['#ffd700', '#2de2e6', '#ff0055'], 40, 130, 2, 5);
        break;
    }
  }

  /**
   * Advances all VFX simulation timers and positions.
   */
  public update(deltaMs: number): void {
    // non-balance: time conversion
    const dt = deltaMs / 1000;

    // Decay screen shake
    if (this.screenShakeAmount > 0) {
      // non-balance: shake decay rate
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 25);
    }

    // Decay scorch marks
    for (let i = this.scorchMarks.length - 1; i >= 0; i--) {
      const sm = this.scorchMarks[i];
      // non-balance: scorch mark lifetime decay ~12s
      sm.alpha -= deltaMs / 12000;
      if (sm.alpha <= 0) {
        this.scorchMarks.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaMs;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      // non-balance: expansion speed
      s.radius += (s.maxRadius - s.radius) * (deltaMs / 200);
      // non-balance: frame step scaling
      s.alpha -= s.decay * (deltaMs / 16.6);

      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      // non-balance: laser fade rate
      l.alpha -= deltaMs / 180;
      if (l.alpha <= 0) {
        this.lasers.splice(i, 1);
      }
    }

    // Update neural arcs
    for (let i = this.neuralArcs.length - 1; i >= 0; i--) {
      const arc = this.neuralArcs[i];
      // non-balance: neural arc fade rate
      arc.alpha -= deltaMs / 240;
      if (arc.alpha <= 0) {
        this.neuralArcs.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= deltaMs;
      // non-balance: 800ms float lifetime
      ft.alpha = Math.max(0, ft.life / 800);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Renders pre-placement combo proximity golden threads (Option A).
   */
  public renderPrePlacementComboThreads(
    ctx: CanvasRenderingContext2D,
    hoverX: number,
    hoverY: number,
    nearbyTowers: { x: number; y: number }[]
  ): void {
    if (nearbyTowers.length === 0) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 1.5;
    // non-balance: dash pattern
    ctx.setLineDash([4, 3]);

    for (const t of nearbyTowers) {
      ctx.beginPath();
      ctx.moveTo(hoverX, hoverY);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();

      // Node ring
      ctx.beginPath();
      // non-balance: node ring radius
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Renders target lock-on tracking reticle (Option B).
   */
  public renderTargetLockReticle(
    ctx: CanvasRenderingContext2D,
    towerX: number,
    towerY: number,
    targetX: number,
    targetY: number,
    animTimeMs: number = 0
  ): void {
    ctx.save();

    // 1. Subtle dotted tracking line
    ctx.beginPath();
    ctx.moveTo(towerX, towerY);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
    ctx.lineWidth = 1;
    // non-balance: tracking dash
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Rotating lock-on reticle around target
    ctx.translate(targetX, targetY);
    // non-balance: reticle rotation speed
    ctx.rotate(animTimeMs * 0.003);

    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // non-balance: reticle radius
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    // non-balance: crosshair line segment bounds
    const innerTick = 10;
    // non-balance: crosshair line segment bounds
    const outerTick = 16;

    ctx.beginPath();
    ctx.moveTo(-outerTick, 0); ctx.lineTo(-innerTick, 0);
    ctx.moveTo(innerTick, 0); ctx.lineTo(outerTick, 0);
    ctx.moveTo(0, -outerTick); ctx.lineTo(0, -innerTick);
    ctx.moveTo(0, innerTick); ctx.lineTo(0, outerTick);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders Caustic Ink Puddles (Inky Cap Void Ground Denial).
   */
  public renderCausticPuddles(
    ctx: CanvasRenderingContext2D,
    puddles: { x: number; y: number; radius: number; durationMs: number; maxDurationMs: number }[]
  ): void {
    for (const p of puddles) {
      const lifeRatio = Math.max(0, p.durationMs / p.maxDurationMs);
      ctx.save();
      // non-balance: puddle base alpha 0.65
      ctx.globalAlpha = 0.65 * lifeRatio;
      ctx.fillStyle = '#1b002c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Caustic violet rim
      ctx.strokeStyle = '#c77dff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bubbling inner ripple
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5 * lifeRatio, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Renders all active VFX, Scorch marks, Hyphae networks, and Particles onto the canvas.
   */
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Render Substrate Mycelial Hyphae Creep
    for (const h of this.hyphaeFilaments) {
      ctx.save();
      ctx.globalAlpha = h.alpha * 0.3;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render Ground Scorch Marks
    for (const sm of this.scorchMarks) {
      ctx.save();
      ctx.globalAlpha = sm.alpha * 0.5;
      ctx.fillStyle = sm.color;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Render Shockwaves
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Render Lasers (with bloom and chain hops)
    for (const l of this.lasers) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, l.alpha);
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = l.color;
      // non-balance: laser glow blur 8
      const glowBlur = 8;
      ctx.shadowBlur = glowBlur;

      ctx.beginPath();
      ctx.moveTo(l.startX, l.startY);
      ctx.lineTo(l.endX, l.endY);
      ctx.stroke();

      // Render recursive chain hops
      if (l.chainHops && l.chainHops.length > 0) {
        let prev = { x: l.startX, y: l.startY };
        for (const hop of l.chainHops) {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(hop.x, hop.y);
          ctx.stroke();
          prev = hop;
        }
      }
      ctx.restore();
    }

    // 5. Render Neural Lightning Synapse Arcs (Lion's Mane)
    for (const arc of this.neuralArcs) {
      if (arc.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, arc.alpha);
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = arc.color;
      // non-balance: neural glow blur 6
      const neuralBlur = 6;
      ctx.shadowBlur = neuralBlur;
      ctx.beginPath();
      for (let i = 0; i < arc.points.length; i++) {
        const pt = arc.points[i];
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          const prev = arc.points[i - 1];
          // non-balance: mid-point jitter spread 8
          const jitterSpread = 8;
          const midX = (prev.x + pt.x) / 2 + (Math.random() - 0.5) * jitterSpread;
          const midY = (prev.y + pt.y) / 2 + (Math.random() - 0.5) * jitterSpread;
          ctx.lineTo(midX, midY);
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // 6. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Render Floating Text
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      // non-balance: text shadow blur 4
      const textBlur = 4;
      ctx.shadowBlur = textBlur;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
