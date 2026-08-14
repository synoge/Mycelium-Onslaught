import { MultiSystemAccumulator } from './core/ticker';
import { PRNG } from './core/prng';

// Logical playfield constants from ENGINE-SPEC §1
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const LOGICAL_WIDTH = 720;
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const LOGICAL_HEIGHT = 480;
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const RENDER_SCALE = 2; // 2x baseline

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private accumulator: MultiSystemAccumulator;
  private prng: PRNG;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    this.accumulator = new MultiSystemAccumulator();
    this.prng = new PRNG(1);

    this.setupCanvas();
  }

  private setupCanvas(): void {
    // Setup physical render dimensions (2x integer scale)
    this.canvas.width = LOGICAL_WIDTH * RENDER_SCALE;
    this.canvas.height = LOGICAL_HEIGHT * RENDER_SCALE;
    this.canvas.style.width = `${LOGICAL_WIDTH}px`;
    this.canvas.style.height = `${LOGICAL_HEIGHT}px`;

    // Disable image smoothing for crisp pixel rendering
    this.ctx.imageSmoothingEnabled = false;
  }

  public start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  public stop(): void {
    this.isRunning = false;
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaMs = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Advance simulation through fixed-timestep accumulator
    this.accumulator.advance(deltaMs, {
      onMovementTick: () => {
        // Movement updates
      },
      onTowerTick: () => {
        // Tower target acquisition / firing
      },
      onSpawningTick: () => {
        // Attacker spawning
      },
    });

    // Render at display refresh rate
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  public render(): void {
    this.ctx.save();
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // Clear screen (dark forest floor background)
    this.ctx.fillStyle = '#14181f';
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Render stub grid & info
    this.ctx.strokeStyle = '#222933';
    this.ctx.lineWidth = 1;
    // non-balance: visual grid step in logical space
    for (let x = 0; x < LOGICAL_WIDTH; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, LOGICAL_HEIGHT);
      this.ctx.stroke();
    }
    // non-balance: visual grid step in logical space
    for (let y = 0; y < LOGICAL_HEIGHT; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(LOGICAL_WIDTH, y);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#58a6ff';
    this.ctx.font = '16px monospace';
    // non-balance: stub text render position
    const textX = 20;
    // non-balance: stub text render position
    const textY = 30;
    this.ctx.fillText('Mycelium Onslaught - M0 Engine Scaffold', textX, textY);

    this.ctx.restore();
  }
}

// Auto-boot if running in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      const engine = new GameEngine(canvas);
      engine.start();
    }
  });
}
