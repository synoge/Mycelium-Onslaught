import { GameMap, ROAD_STROKE_WIDTH } from '../map/map';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE } from '../main';

export class WorldRenderer {
  private scale: number = RENDER_SCALE;

  constructor(scale: number = RENDER_SCALE) {
    this.scale = scale;
  }

  public setScale(scale: number): void {
    this.scale = Math.floor(scale);
  }

  public getScale(): number {
    return this.scale;
  }

  /**
   * Renders the terrain and road for a given map to the canvas context.
   * Coordinate space transformation is applied strictly at render time.
   */
  public render(ctx: CanvasRenderingContext2D, map: GameMap): void {
    ctx.save();
    ctx.scale(this.scale, this.scale);

    // 1. Terrain Background (Dark forest floor)
    ctx.fillStyle = '#11161d';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Subtle background organic grid/texture
    ctx.strokeStyle = '#182029';
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

    // 2. Road Rendering (Compacted trail with rotting wood tone)
    if (map.waypoints.length > 1) {
      // Road border / shadow
      ctx.beginPath();
      ctx.moveTo(map.waypoints[0].x, map.waypoints[0].y);
      for (let i = 1; i < map.waypoints.length; i++) {
        ctx.lineTo(map.waypoints[i].x, map.waypoints[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Outer road edge
      // non-balance: visual road border padding
      ctx.lineWidth = ROAD_STROKE_WIDTH + 4;
      ctx.strokeStyle = '#1b1d1a';
      ctx.stroke();

      // Main road fill: stroked polyline at exactly 28 logical px
      ctx.lineWidth = ROAD_STROKE_WIDTH;
      ctx.strokeStyle = '#383226'; // Compacted earth and rotting wood
      ctx.stroke();

      // Road centerline dashes (subtle path groove)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#473f30';
      // non-balance: visual dash pattern for road centerline
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
