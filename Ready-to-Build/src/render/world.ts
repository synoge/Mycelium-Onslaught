import { GameMap, Point, ROAD_STROKE_WIDTH } from '../map/map';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE } from '../main';

export class WorldRenderer {
  private scale: number = RENDER_SCALE;
  private terrainPattern: CanvasPattern | null = null;
  private terrainImage: HTMLImageElement | null = null;
  private sporeMotes: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

  constructor(scale: number = RENDER_SCALE) {
    this.scale = scale;
    this.initTerrainImage();
    this.initSporeMotes();
  }

  private initTerrainImage(): void {
    if (typeof window !== 'undefined') {
      this.terrainImage = new Image();
      this.terrainImage.src = '/assets/terrain_texture.jpg';
      this.terrainImage.onload = () => {
        // Cached on first render with valid context
      };
    }
  }

  private initSporeMotes(): void {
    // non-balance: 30 drifting ambient spore motes
    const moteCount = 30;
    for (let i = 0; i < moteCount; i++) {
      // non-balance: vertical drift velocity base 4 and spread 8
      const vyBase = 4;
      // non-balance: vertical drift velocity base 4 and spread 8
      const vySpread = 8;
      // non-balance: alpha base 0.2
      const alphaBase = 0.2;

      this.sporeMotes.push({
        x: Math.random() * LOGICAL_WIDTH,
        y: Math.random() * LOGICAL_HEIGHT,
        // non-balance: drift velocity
        vx: (Math.random() - 0.5) * 6,
        vy: -vyBase - Math.random() * vySpread,
        // non-balance: mote size
        size: 1 + Math.random() * 2,
        alpha: alphaBase + Math.random() * 0.5,
      });
    }
  }

  public setScale(scale: number): void {
    this.scale = Math.floor(scale);
  }

  public getScale(): number {
    return this.scale;
  }

  /**
   * Constructs an organic, smooth spline curve path through the waypoints with rounded fillet corners.
   */
  private buildOrganicSmoothPath(ctx: CanvasRenderingContext2D, waypoints: Point[]): void {
    if (waypoints.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);

    if (waypoints.length === 1) return;
    if (waypoints.length === 2) {
      ctx.lineTo(waypoints[1].x, waypoints[1].y);
      return;
    }

    for (let i = 1; i < waypoints.length - 1; i++) {
      const p0 = waypoints[i - 1];
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];

      const d1 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
      const d2 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

      // non-balance: organic fillet corner radius 18px
      const maxRadius = 18;
      // non-balance: corner segment ratio 2.3
      const segRatio = 2.3;
      const r = Math.min(maxRadius, d1 / segRatio, d2 / segRatio);

      if (d1 === 0 || d2 === 0 || r <= 1) {
        ctx.lineTo(p1.x, p1.y);
        continue;
      }

      // Point before corner
      const t1x = p1.x - ((p1.x - p0.x) / d1) * r;
      const t1y = p1.y - ((p1.y - p0.y) / d1) * r;

      // Point after corner
      const t2x = p1.x + ((p2.x - p1.x) / d2) * r;
      const t2y = p1.y + ((p2.y - p1.y) / d2) * r;

      ctx.lineTo(t1x, t1y);
      ctx.quadraticCurveTo(p1.x, p1.y, t2x, t2y);
    }

    const last = waypoints[waypoints.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  /**
   * Renders the subterranean containment sector terrain, organic mycelial conduit road, and spore ambiance.
   */
  public render(ctx: CanvasRenderingContext2D, map: GameMap, animTimeMs: number = 0): void {
    ctx.save();
    ctx.scale(this.scale, this.scale);

    // 1. Terrain Background: Textured Subterranean Bedrock
    if (this.terrainImage && this.terrainImage.complete && this.terrainImage.naturalWidth > 0) {
      if (!this.terrainPattern) {
        this.terrainPattern = ctx.createPattern(this.terrainImage, 'repeat');
      }
      if (this.terrainPattern) {
        ctx.fillStyle = this.terrainPattern;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      } else {
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      }
    } else {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }

    // Subterranean dark vignette / ambient shadow
    // non-balance: inner vignette radius 100
    const innerVignette = 100;
    // non-balance: outer vignette radius 400
    const outerVignette = 400;
    const grad = ctx.createRadialGradient(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      innerVignette,
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2,
      outerVignette
    );
    grad.addColorStop(0, 'rgba(10, 14, 20, 0.4)');
    grad.addColorStop(1, 'rgba(5, 7, 10, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Subtle tactical coordinate gridlines
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.04)';
    ctx.lineWidth = 1;
    // non-balance: visual grid step in logical space
    for (let x = 0; x <= LOGICAL_WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, LOGICAL_HEIGHT);
      ctx.stroke();
    }
    // non-balance: visual grid step in logical space
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LOGICAL_WIDTH, y);
      ctx.stroke();
    }

    // 2. Road Rendering: Organic Subterranean Chitin/Metallic Trench & Bioluminescent Vein
    if (map.waypoints.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Layer A: Deep Earthen Bedrock Cavity Shadow
      this.buildOrganicSmoothPath(ctx, map.waypoints);
      // non-balance: cavity shadow width offset 10
      const shadowOffset = 10;
      ctx.lineWidth = ROAD_STROKE_WIDTH + shadowOffset;
      ctx.strokeStyle = 'rgba(7, 10, 15, 0.95)';
      ctx.stroke();

      // Layer B: Organic Chitinous / Metallic Containment Trench Curb
      this.buildOrganicSmoothPath(ctx, map.waypoints);
      // non-balance: curb width offset 4
      const curbOffset = 4;
      ctx.lineWidth = ROAD_STROKE_WIDTH + curbOffset;
      ctx.strokeStyle = '#18212c';
      ctx.stroke();

      // Layer C: Eroded Channel Trench Bed
      this.buildOrganicSmoothPath(ctx, map.waypoints);
      ctx.lineWidth = ROAD_STROKE_WIDTH;
      ctx.strokeStyle = '#0f151e';
      ctx.stroke();

      // Layer D: Organic Glowing Bioluminescent Mycelial Vein / Coolant Runnel
      this.buildOrganicSmoothPath(ctx, map.waypoints);
      // non-balance: coolant vein width 3.5
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.7)';
      ctx.shadowColor = '#00f5d4';
      // non-balance: vein glow blur 6
      const glowBlur = 6;
      ctx.shadowBlur = glowBlur;
      // non-balance: dash pattern for organic pulse flow
      ctx.setLineDash([10, 8]);
      // non-balance: fluid animation speed
      ctx.lineDashOffset = -animTimeMs * 0.015;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Layer E: Soft Spawn Breach Glow Indicator at Waypoint 0
      const spawnWp = map.waypoints[0];
      ctx.beginPath();
      // non-balance: spawn glow radius 16
      const spawnGlowRad = 16;
      ctx.arc(spawnWp.x, spawnWp.y, spawnGlowRad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.18)';
      ctx.fill();
    }

    // 3. Ambient Floating Bioluminescent Spore Motes
    for (const mote of this.sporeMotes) {
      mote.x += mote.vx * 0.016;
      mote.y += mote.vy * 0.016;
      if (mote.y < 0) {
        mote.y = LOGICAL_HEIGHT;
        mote.x = Math.random() * LOGICAL_WIDTH;
      }
      if (mote.x < 0) mote.x = LOGICAL_WIDTH;
      if (mote.x > LOGICAL_WIDTH) mote.x = 0;

      ctx.save();
      ctx.globalAlpha = mote.alpha;
      ctx.fillStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4';
      // non-balance: mote glow blur 4
      const moteBlur = 4;
      ctx.shadowBlur = moteBlur;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
