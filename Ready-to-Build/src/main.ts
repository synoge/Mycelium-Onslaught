import rawBalance from '../data/balance.json';
import rawMaps from '../data/maps.json';
import { DifficultyKey, RawBalanceJSON } from './interfaces';
import { distance, isBuildLegal, loadAllMaps, MapDataRaw } from './map/map';
import { SpriteRenderer } from './render/sprites';
import { WorldRenderer } from './render/world';
import { GameInstance } from './sim/game_instance';
import { HUD } from './ui/hud';

// Logical playfield constants from ENGINE-SPEC §1
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const LOGICAL_WIDTH = 720;
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const LOGICAL_HEIGHT = 480;
// non-balance: coordinate space constants from ENGINE-SPEC §1
export const RENDER_SCALE = 2; // 2x baseline

export class MyceliumGameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: GameInstance;
  private worldRenderer: WorldRenderer;
  private spriteRenderer: SpriteRenderer;
  private hud: HUD;

  private allMaps: ReturnType<typeof loadAllMaps>;
  private currentMapName: string = 'Classic';
  private currentDifficulty: DifficultyKey = 'bloom';
  private lastTime: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, topBarEl: HTMLElement, bottomBarEl: HTMLElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas rendering context');
    }
    this.ctx = context;

    this.allMaps = loadAllMaps(rawMaps as unknown as Record<string, MapDataRaw>);
    this.worldRenderer = new WorldRenderer(RENDER_SCALE);
    this.spriteRenderer = new SpriteRenderer();

    const currentMap = this.allMaps[this.currentMapName];
    this.game = new GameInstance(1, this.currentDifficulty, currentMap, rawBalance as unknown as RawBalanceJSON);
    this.hud = new HUD(this.game, topBarEl, bottomBarEl);

    this.setupCanvas();
    this.setupEventListeners();
  }

  private setupCanvas(): void {
    this.canvas.width = LOGICAL_WIDTH * RENDER_SCALE;
    this.canvas.height = LOGICAL_HEIGHT * RENDER_SCALE;
    this.canvas.style.width = `${LOGICAL_WIDTH}px`;
    this.canvas.style.height = `${LOGICAL_HEIGHT}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      // Convert physical client pixels to logical pixels
      this.hud.mousePos.x = (clientX / rect.width) * LOGICAL_WIDTH;
      this.hud.mousePos.y = (clientY / rect.height) * LOGICAL_HEIGHT;
      this.hud.isHoveringCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hud.isHoveringCanvas = false;
    });

    this.canvas.addEventListener('click', () => {
      const { x, y } = this.hud.mousePos;

      // 1. Placing a combat tower
      if (this.hud.placingFamily) {
        try {
          this.game.buildTower(this.hud.placingFamily, x, y);
          this.hud.placingFamily = null;
        } catch (err) {
          console.warn('Cannot place tower here:', err);
        }
        return;
      }

      // 2. Placing a modifier
      if (this.hud.placingModifier) {
        try {
          this.game.buildModifier(this.hud.placingModifier, x, y);
          this.hud.placingModifier = null;
        } catch (err) {
          console.warn('Cannot place modifier here:', err);
        }
        return;
      }

      // 3. Relocating selected structure
      if (this.hud.isRelocating) {
        if (this.game.selectedTower) {
          try {
            this.game.economyManager.relocateTower(this.game.selectedTower);
            this.game.selectedTower.x = x;
            this.game.selectedTower.y = y;
            this.game.modifierManager.onStructureChanged();
            this.hud.isRelocating = false;
          } catch (err) {
            console.warn('Cannot relocate here:', err);
          }
        } else if (this.game.selectedModifier) {
          try {
            this.game.economyManager.relocateModifier(this.game.selectedModifier);
            this.game.selectedModifier.x = x;
            this.game.selectedModifier.y = y;
            this.game.modifierManager.onStructureChanged();
            this.hud.isRelocating = false;
          } catch (err) {
            console.warn('Cannot relocate here:', err);
          }
        }
        return;
      }

      // 4. Hit testing existing structures for selection
      // non-balance: selection hit radius in logical pixels
      const selectHitRadius = 20;

      let clickedTower = null;
      for (const t of this.game.combatManager.towers) {
        if (distance({ x, y }, { x: t.x, y: t.y }) <= selectHitRadius) {
          clickedTower = t;
          break;
        }
      }

      if (clickedTower) {
        this.game.selectedTower = clickedTower;
        this.game.selectedModifier = null;
        this.hud.updateSelectionPanel();
        return;
      }

      let clickedMod = null;
      for (const m of this.game.modifierManager['modifiers']) {
        if (distance({ x, y }, { x: m.x, y: m.y }) <= selectHitRadius) {
          clickedMod = m;
          break;
        }
      }

      if (clickedMod) {
        this.game.selectedModifier = clickedMod;
        this.game.selectedTower = null;
        this.hud.updateSelectionPanel();
        return;
      }

      // Deselect if clicked empty area
      this.game.selectedTower = null;
      this.game.selectedModifier = null;
      this.hud.updateSelectionPanel();
    });
  }

  public start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaMs = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Advance simulation
    this.game.step(deltaMs);

    // Render frame
    this.render();

    // Update HUD display
    this.hud.update();

    requestAnimationFrame((t) => this.loop(t));
  }

  public render(): void {
    // 1. Render World & Map Road
    this.worldRenderer.render(this.ctx, this.game.map);

    this.ctx.save();
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // 2. Render Base / Core with 10 Spore Nodes
    this.spriteRenderer.renderBase(
      this.ctx,
      this.game.map.base.x,
      this.game.map.base.y,
      this.game.economyManager.lives
    );

    // 3. Render Modifiers
    for (const mod of this.game.modifierManager['modifiers']) {
      // Range aura
      this.ctx.beginPath();
      this.ctx.arc(mod.x, mod.y, mod.range, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(166, 138, 104, 0.08)';
      this.ctx.strokeStyle = 'rgba(166, 138, 104, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.fill();
      this.ctx.stroke();

      this.spriteRenderer.renderModifier(this.ctx, mod.name, mod.x, mod.y, mod.footprintRadius);
    }

    // 4. Render Combat Towers
    for (const tower of this.game.combatManager.towers) {
      const isSelected = this.game.selectedTower?.id === tower.id;

      // Range indicator for selected tower
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, tower.getEffectiveRange(), 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(88, 166, 255, 0.1)';
        this.ctx.strokeStyle = '#58a6ff';
        this.ctx.lineWidth = 1.5;
        this.ctx.fill();
        this.ctx.stroke();

        // 70px Combo Radius Ring if combo-capable (level >= 8)
        if (tower.isComboCapable()) {
          this.ctx.beginPath();
          // non-balance: combo radius from balance constant
          const comboRad = this.game.loader.constants.combo_radius;
          this.ctx.arc(tower.x, tower.y, comboRad, 0, Math.PI * 2);
          this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          // non-balance: dash pattern
          this.ctx.setLineDash([4, 4]);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
        }
      }

      this.spriteRenderer.renderTower(
        this.ctx,
        tower.familyKey,
        tower.colour,
        tower.x,
        tower.y,
        tower.footprintRadius,
        tower.isComboCapable(),
        tower.freakoutActive
      );
    }

    // 5. Render Attackers
    for (const atk of this.game.waveManager.attackers) {
      if (!atk.isDead && !atk.reachedBase) {
        this.spriteRenderer.renderAttacker(
          this.ctx,
          atk.tier,
          atk.cycle,
          atk.x,
          atk.y,
          atk.headingAngle,
          atk.getHealthPercent(),
          atk.moveSpeed < atk.moveSpeedInit
        );
      }
    }

    // 6. Render Projectiles
    for (const proj of this.game.combatManager.projectiles) {
      if (!proj.isDead) {
        this.ctx.beginPath();
        // non-balance: projectile render radius
        ctxArc(this.ctx, proj.x, proj.y, 4);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fill();
      }
    }

    // 7. Hover Placement Preview
    if ((this.hud.placingFamily || this.hud.placingModifier || this.hud.isRelocating) && this.hud.isHoveringCanvas) {
      const p = this.hud.mousePos;
      // non-balance: footprint radius
      const fp = 16;
      const allStructures = [
        ...this.game.combatManager.towers.map((t) => ({ x: t.x, y: t.y, footprintRadius: t.footprintRadius })),
        // non-balance: footprint radius
        ...this.game.modifierManager['modifiers'].map((m) => ({ x: m.x, y: m.y, footprintRadius: 16 })),
      ];

      const legal = isBuildLegal(p, fp, this.game.map, allStructures);

      // Footprint ring
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, fp, 0, Math.PI * 2);
      this.ctx.fillStyle = legal ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)';
      this.ctx.strokeStyle = legal ? '#2ecc71' : '#e74c3c';
      this.ctx.lineWidth = 2;
      this.ctx.fill();
      this.ctx.stroke();

      // Estimated range ring
      // non-balance: fallback preview range
      let previewRange = 100;
      if (this.hud.placingFamily) {
        previewRange = this.game.loader.getFamily(this.hud.placingFamily).base.range;
      } else if (this.hud.placingModifier) {
        // non-balance: modifier base range
        previewRange = 80;
      }
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, previewRange, 0, Math.PI * 2);
      this.ctx.strokeStyle = legal ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // 8. Game Over Overlay
    if (this.game.economyManager.isGameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      this.ctx.fillStyle = '#ff4d4d';
      this.ctx.font = '32px monospace';
      this.ctx.textAlign = 'center';
      // non-balance: game over text offset
      const textOffset = 20;
      this.ctx.fillText('CORE BREACHED - GAME OVER', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - textOffset);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(`Waves Survived: ${this.game.waveManager.currentWaveNum}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + textOffset);
    }

    this.ctx.restore();
  }
}

function ctxArc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// Auto-boot if in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const topBar = document.getElementById('hud-top');
    const bottomBar = document.getElementById('hud-bottom');
    if (canvas && topBar && bottomBar) {
      const app = new MyceliumGameApp(canvas, topBar, bottomBar);
      app.start();
    }
  });
}
