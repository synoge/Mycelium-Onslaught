import rawBalance from '../data/balance.json';
import rawMaps from '../data/maps.json';
import { soundEngine } from './audio/sound';
import { DifficultyKey, RawBalanceJSON } from './interfaces';
import { distance, isBuildLegal, loadAllMaps, MapDataRaw } from './map/map';
import { SpriteRenderer } from './render/sprites';
import { VFXEngine } from './render/vfx';
import { WorldRenderer } from './render/world';
import { GameInstance } from './sim/game_instance';
import { CodexUI } from './ui/codex';
import { HUD } from './ui/hud';
import { GameShell } from './ui/shell';

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
  private vfxEngine: VFXEngine;
  private hud: HUD;
  private codexUI: CodexUI;
  private shell: GameShell;

  private allMaps: ReturnType<typeof loadAllMaps>;
  private currentMapName: string = 'Classic';
  private currentDifficulty: DifficultyKey = 'bloom';
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private animTimeMs: number = 0;

  // Smooth Cursor-Centered Camera Zoom & Pan
  public cameraZoom: number = 1.0;
  public cameraPanX: number = 0;
  public cameraPanY: number = 0;
  private isDraggingPan: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragPanStartX: number = 0;
  private dragPanStartY: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    topBarEl: HTMLElement,
    bottomBarEl: HTMLElement,
    shellOverlayEl: HTMLElement,
    codexOverlayEl: HTMLElement
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas rendering context');
    }
    this.ctx = context;

    this.allMaps = loadAllMaps(rawMaps as unknown as Record<string, MapDataRaw>);
    this.worldRenderer = new WorldRenderer(RENDER_SCALE);
    this.spriteRenderer = new SpriteRenderer();
    this.vfxEngine = new VFXEngine();

    const currentMap = this.allMaps[this.currentMapName];
    this.game = new GameInstance(1, this.currentDifficulty, currentMap, rawBalance as unknown as RawBalanceJSON);
    this.hud = new HUD(this.game, topBarEl, bottomBarEl);
    this.codexUI = new CodexUI(codexOverlayEl, this.game.loader);

    this.shell = new GameShell(shellOverlayEl, this.allMaps, {
      onStartGame: (mapName, difficulty) => this.startNewGame(mapName, difficulty),
      onOpenCodex: () => this.openCodex(),
      onToggleSound: () => soundEngine.toggleMute(),
      onSetSpeed: (speed) => { this.hud.currentSpeed = speed; },
      onRestart: () => this.startNewGame(this.currentMapName, this.currentDifficulty),
    });

    this.hud.onOpenCodex = () => this.openCodex();
    this.hud.onOpenMenu = () => this.shell.showScreen('title');

    // Hook HUD Zoom controls
    this.hud.onZoomIn = () => this.adjustZoom(1.2);
    this.hud.onZoomOut = () => this.adjustZoom(0.83);
    this.hud.onZoomReset = () => {
      this.cameraZoom = 1.0;
      this.cameraPanX = 0;
      this.cameraPanY = 0;
      this.clampPan();
    };

    this.hookCombatEvents();
    this.setupCanvas();
    this.setupEventListeners();
  }

  private hookCombatEvents(): void {
    this.game.combatManager.events = {
      onLaserFired: (source, target, damage, chainHops) => {
        soundEngine.playLaser();
        // non-balance: laser beam width
        const laserW = 3;
        this.vfxEngine.spawnLaserBeam(source.x, source.y, target.x, target.y, '#00ff66', laserW, chainHops);
      },
      onComboFired: (comboResult, target) => {
        soundEngine.playComboFlourish();
        this.vfxEngine.triggerComboVFX(comboResult.combo.key, target.x, target.y);
      },
      onProjectileLaunched: () => {
        soundEngine.playMortarLaunch();
      },
      onProjectileImpacted: (x, y, splashRadius) => {
        soundEngine.playExplosion();
        // non-balance: impact particle burst 15
        this.vfxEngine.spawnParticleBurst(x, y, 15, ['#ff0055', '#ffaa00', '#ffffff'], 20, 80, 2, 4);
        if (splashRadius > 0) {
          // non-balance: impact shockwave
          this.vfxEngine.spawnShockwave(x, y, splashRadius, '#ff0055', 2, 300);
        }
      },
      onCausticPuddleSpawned: (puddle) => {
        // non-balance: puddle shockwave
        this.vfxEngine.spawnShockwave(puddle.x, puddle.y, puddle.radius, '#c77dff', 2, 400);
      },
      onNeuralArcFired: (source, chainTargets) => {
        soundEngine.playLaser();
        const allPoints = [{ x: source.x, y: source.y }, ...chainTargets];
        this.vfxEngine.spawnNeuralArc(allPoints, '#00b4d8');
      },
      onKineticLeechFired: (source, target, bonusGold) => {
        soundEngine.playLaser();
        // non-balance: kinetic beam width 2
        this.vfxEngine.spawnLaserBeam(source.x, source.y, target.x, target.y, '#e0e1dd', 2);
        if (bonusGold > 0) {
          // non-balance: float text offset 12
          this.vfxEngine.spawnFloatingText(target.x, target.y - 12, `+$${Math.floor(bonusGold)}`, '#ffd700');
        }
      },
      onAttackerKilled: (attacker) => {
        // non-balance: death particle burst 8
        this.vfxEngine.spawnParticleBurst(attacker.x, attacker.y, 8, ['#ffffff', '#a8b1bd', '#6b8ca6'], 10, 40, 1.5, 3);
        // non-balance: float text offset 10
        this.vfxEngine.spawnFloatingText(attacker.x, attacker.y - 10, `+$${Math.floor(attacker.bounty)}`, '#3fb950');
      },
    };
  }

  public openCodex(): void {
    const codexEl = document.getElementById('codex-overlay');
    if (codexEl) {
      codexEl.style.display = 'flex';
      this.codexUI.render();
    }
  }

  public startNewGame(mapName: string, difficulty: DifficultyKey): void {
    this.currentMapName = mapName;
    this.currentDifficulty = difficulty;
    const map = this.allMaps[mapName];
    this.game = new GameInstance(Date.now(), difficulty, map, rawBalance as unknown as RawBalanceJSON);
    this.hud.setGameInstance(this.game);
    this.hookCombatEvents();
    this.shell.showScreen('playing');
    this.cameraZoom = 1.0;
    this.cameraPanX = 0;
    this.cameraPanY = 0;
  }

  private setupCanvas(): void {
    this.canvas.width = LOGICAL_WIDTH * RENDER_SCALE;
    this.canvas.height = LOGICAL_HEIGHT * RENDER_SCALE;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx.imageSmoothingEnabled = false;
  }

  public screenToLogical(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const normalizedX = (screenX / rect.width) * LOGICAL_WIDTH;
    const normalizedY = (screenY / rect.height) * LOGICAL_HEIGHT;

    const centerX = LOGICAL_WIDTH / 2;
    const centerY = LOGICAL_HEIGHT / 2;

    const worldX = (normalizedX - centerX - this.cameraPanX) / this.cameraZoom + centerX;
    const worldY = (normalizedY - centerY - this.cameraPanY) / this.cameraZoom + centerY;

    return { x: worldX, y: worldY };
  }

  public adjustZoom(factor: number, clientX?: number, clientY?: number): void {
    const oldZoom = this.cameraZoom;
    // non-balance: min zoom 1.0, max zoom 2.5
    const minZoom = 1.0;
    // non-balance: min zoom 1.0, max zoom 2.5
    const maxZoom = 2.5;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, this.cameraZoom * factor));

    if (clientX !== undefined && clientY !== undefined) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseNormX = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
      const mouseNormY = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
      const centerX = LOGICAL_WIDTH / 2;
      const centerY = LOGICAL_HEIGHT / 2;

      // Adjust pan to keep cursor point stationary
      this.cameraPanX = mouseNormX - centerX - (mouseNormX - centerX - this.cameraPanX) * (newZoom / oldZoom);
      this.cameraPanY = mouseNormY - centerY - (mouseNormY - centerY - this.cameraPanY) * (newZoom / oldZoom);
    }

    this.cameraZoom = newZoom;
    this.clampPan();
  }

  private clampPan(): void {
    if (this.cameraZoom <= 1.0) {
      this.cameraPanX = 0;
      this.cameraPanY = 0;
      return;
    }
    const maxPanX = ((LOGICAL_WIDTH * this.cameraZoom - LOGICAL_WIDTH) / 2);
    const maxPanY = ((LOGICAL_HEIGHT * this.cameraZoom - LOGICAL_HEIGHT) / 2);

    this.cameraPanX = Math.max(-maxPanX, Math.min(maxPanX, this.cameraPanX));
    this.cameraPanY = Math.max(-maxPanY, Math.min(maxPanY, this.cameraPanY));
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (this.isDraggingPan) {
        const dx = (e.clientX - this.dragStartX) * (LOGICAL_WIDTH / rect.width);
        const dy = (e.clientY - this.dragStartY) * (LOGICAL_HEIGHT / rect.height);
        this.cameraPanX = this.dragPanStartX + dx;
        this.cameraPanY = this.dragPanStartY + dy;
        this.clampPan();
        return;
      }

      const worldPos = this.screenToLogical(clientX, clientY);
      this.hud.mousePos.x = worldPos.x;
      this.hud.mousePos.y = worldPos.y;
      this.hud.isHoveringCanvas = true;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      // Middle click (1) or Right click (2) initiates drag pan
      if (e.button === 1 || e.button === 2) {
        this.isDraggingPan = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragPanStartX = this.cameraPanX;
        this.dragPanStartY = this.cameraPanY;
        e.preventDefault();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1 || e.button === 2) {
        this.isDraggingPan = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Smooth Mouse Wheel Zoom
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        this.adjustZoom(factor, e.clientX, e.clientY);
      },
      { passive: false }
    );

    this.canvas.addEventListener('mouseleave', () => {
      this.hud.isHoveringCanvas = false;
      this.isDraggingPan = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.isDraggingPan) return;
      const { x, y } = this.hud.mousePos;

      // 1. Placing a combat tower
      if (this.hud.placingFamily) {
        try {
          soundEngine.playUpgrade();
          this.game.buildTower(this.hud.placingFamily, x, y);
          // non-balance: build particle burst 12
          this.vfxEngine.spawnParticleBurst(x, y, 12, ['#00f5d4', '#ffffff'], 20, 60, 2, 4);
          this.hud.placingFamily = null;
        } catch (err) {
          console.warn('Cannot place tower here:', err);
        }
        return;
      }

      // 2. Placing a modifier
      if (this.hud.placingModifier) {
        try {
          soundEngine.playUpgrade();
          this.game.buildModifier(this.hud.placingModifier, x, y);
          // non-balance: build particle burst 12
          this.vfxEngine.spawnParticleBurst(x, y, 12, ['#ffd166', '#ffffff'], 20, 60, 2, 4);
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
            soundEngine.playUpgrade();
            this.game.economyManager.relocateTower(this.game.selectedTower);
            this.game.selectedTower.x = x;
            this.game.selectedTower.y = y;
            this.game.modifierManager.onStructureChanged();
            // non-balance: relocate particle burst 16
            this.vfxEngine.spawnParticleBurst(x, y, 16, ['#ffaa00', '#ffffff'], 20, 70, 2, 4);
            this.hud.isRelocating = false;
          } catch (err) {
            console.warn('Cannot relocate here:', err);
          }
        } else if (this.game.selectedModifier) {
          try {
            soundEngine.playUpgrade();
            this.game.economyManager.relocateModifier(this.game.selectedModifier);
            this.game.selectedModifier.x = x;
            this.game.selectedModifier.y = y;
            this.game.modifierManager.onStructureChanged();
            // non-balance: relocate particle burst 16
            this.vfxEngine.spawnParticleBurst(x, y, 16, ['#ffaa00', '#ffffff'], 20, 70, 2, 4);
            this.hud.isRelocating = false;
          } catch (err) {
            console.warn('Cannot relocate here:', err);
          }
        }
        return;
      }

      // 4. Hit testing existing structures for selection
      // non-balance: selection hit radius in logical pixels 20
      const selectHitRadius = 20;

      let clickedTower = null;
      for (const t of this.game.combatManager.towers) {
        if (distance({ x, y }, { x: t.x, y: t.y }) <= selectHitRadius) {
          clickedTower = t;
          break;
        }
      }

      if (clickedTower) {
        soundEngine.playUIClick();
        this.game.selectedTower = clickedTower;
        this.game.selectedModifier = null;
        this.hud.updateSelectionPanel(true);
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
        soundEngine.playUIClick();
        this.game.selectedModifier = clickedMod;
        this.game.selectedTower = null;
        this.hud.updateSelectionPanel(true);
        return;
      }

      // Clicking empty area deselects
      if (this.game.selectedTower || this.game.selectedModifier) {
        this.game.selectedTower = null;
        this.game.selectedModifier = null;
        this.hud.updateSelectionPanel(true);
      }
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(now: number): void {
    if (!this.isRunning) return;

    // non-balance: frame delta cap 100ms
    const deltaMs = Math.min(100, now - this.lastTime);
    this.lastTime = now;
    this.animTimeMs += deltaMs;

    if (this.shell.currentScreen === 'playing') {
      const simDeltaMs = deltaMs * this.hud.currentSpeed;
      this.game.step(simDeltaMs);
      this.vfxEngine.update(simDeltaMs);

      const w = Math.max(1, this.game.waveManager.currentWaveNum);
      // non-balance: 9 tiers per cycle
      const tier = (w - 1) % 9;
      soundEngine.updateTension(this.game.economyManager.lives, tier);

      if (this.game.economyManager.isGameOver) {
        this.shell.showScreen('game_over');
      }
    }

    // Render frame
    this.render();

    // Update HUD display
    this.hud.update();

    requestAnimationFrame((t) => this.loop(t));
  }

  public render(): void {
    this.ctx.save();

    // Screen shake offset
    if (this.vfxEngine.screenShakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.vfxEngine.screenShakeAmount;
      const sy = (Math.random() - 0.5) * this.vfxEngine.screenShakeAmount;
      this.ctx.translate(sx, sy);
    }

    // Apply Camera Zoom and Pan centered on playfield
    this.ctx.translate(
      (LOGICAL_WIDTH * RENDER_SCALE) / 2 + this.cameraPanX * RENDER_SCALE,
      (LOGICAL_HEIGHT * RENDER_SCALE) / 2 + this.cameraPanY * RENDER_SCALE
    );
    this.ctx.scale(this.cameraZoom, this.cameraZoom);
    this.ctx.translate(
      (-LOGICAL_WIDTH * RENDER_SCALE) / 2,
      (-LOGICAL_HEIGHT * RENDER_SCALE) / 2
    );

    // 1. Render World & Map Road
    this.worldRenderer.render(this.ctx, this.game.map, this.animTimeMs);

    this.ctx.save();
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // 2. Render Base / Core with 10 Spore Nodes
    this.spriteRenderer.renderBase(
      this.ctx,
      this.game.map.base.x,
      this.game.map.base.y,
      this.game.economyManager.lives,
      this.animTimeMs
    );

    // 3. Render Modifiers
    for (const mod of this.game.modifierManager['modifiers']) {
      this.ctx.beginPath();
      this.ctx.arc(mod.x, mod.y, mod.range, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(166, 138, 104, 0.08)';
      this.ctx.strokeStyle = 'rgba(166, 138, 104, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.fill();
      this.ctx.stroke();

      this.spriteRenderer.renderModifier(this.ctx, mod.name, mod.x, mod.y, mod.footprintRadius, this.animTimeMs);
    }

    // 4. Ghost Mycelium Overlay
    if (this.hud.showGhostMycelium || this.hud.placingFamily || this.hud.placingModifier) {
      for (const t of this.game.combatManager.towers) {
        this.spriteRenderer.renderGhostMycelium(this.ctx, t.x, t.y, t.footprintRadius, this.animTimeMs);
      }
    }

    // 5. Render Caustic Puddles (Inky Cap)
    this.vfxEngine.renderCausticPuddles(this.ctx, this.game.combatManager.causticPuddles);

    // 6. Render Combat Towers & Auras
    for (const tower of this.game.combatManager.towers) {
      const isSelected = this.game.selectedTower?.id === tower.id;

      // Polypore Forcefield Dome Visual
      if (tower.familyKey === 'polypore') {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, tower.getEffectiveRange(), 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 245, 212, 0.06)';
        this.ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Stinkhorn Miasma Cloud Visual
      if (tower.familyKey === 'stinkhorn') {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, tower.getEffectiveRange(), 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 89, 100, 0.06)';
        this.ctx.strokeStyle = 'rgba(255, 89, 100, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Range indicator and targeting reticle for selected tower
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(tower.x, tower.y, tower.getEffectiveRange(), 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(88, 166, 255, 0.08)';
        this.ctx.strokeStyle = '#58a6ff';
        this.ctx.lineWidth = 1.5;
        this.ctx.fill();
        this.ctx.stroke();

        if (tower.currentTarget && !tower.currentTarget.isDead && !tower.currentTarget.reachedBase) {
          this.vfxEngine.renderTargetLockReticle(
            this.ctx,
            tower.x,
            tower.y,
            tower.currentTarget.x,
            tower.currentTarget.y,
            this.animTimeMs
          );
        }

        // 70px Combo Radius Ring
        if (tower.isComboCapable()) {
          this.ctx.beginPath();
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
        tower.freakoutActive,
        this.animTimeMs,
        tower.orbitingProjectiles
      );
    }

    // 7. Render Attackers
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
          atk.moveSpeed < atk.moveSpeedInit,
          this.animTimeMs
        );
      }
    }

    // 8. Render Projectiles
    for (const proj of this.game.combatManager.projectiles) {
      if (!proj.isDead) {
        this.ctx.beginPath();
        // non-balance: projectile render radius 4
        this.ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fill();
      }
    }

    // 9. Render VFX
    this.vfxEngine.render(this.ctx);

    // 10. Hover Placement Preview & Pre-Placement Combo Golden Threads
    if ((this.hud.placingFamily || this.hud.placingModifier || this.hud.isRelocating) && this.hud.isHoveringCanvas) {
      const p = this.hud.mousePos;
      // non-balance: footprint radius 16
      const fp = 16;
      const allStructures = [
        ...this.game.combatManager.towers.map((t) => ({ x: t.x, y: t.y, footprintRadius: t.footprintRadius })),
        // non-balance: modifier footprint radius 16
        ...this.game.modifierManager['modifiers'].map((m) => ({ x: m.x, y: m.y, footprintRadius: 16 })),
      ];

      const legal = isBuildLegal(p, fp, this.game.map, allStructures);

      if (this.hud.placingFamily) {
        const comboDist = this.game.loader.constants.combo_radius;
        const nearbyTowers = this.game.combatManager.towers.filter(
          (t) => distance(p, { x: t.x, y: t.y }) <= comboDist
        );
        this.vfxEngine.renderPrePlacementComboThreads(this.ctx, p.x, p.y, nearbyTowers);
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, fp, 0, Math.PI * 2);
      this.ctx.fillStyle = legal ? 'rgba(46, 226, 230, 0.35)' : 'rgba(255, 0, 85, 0.45)';
      this.ctx.strokeStyle = legal ? '#2de2e6' : '#ff0055';
      this.ctx.lineWidth = 2;
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.ctx.restore();
  }
}

// Bootstrap
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const topBar = document.getElementById('hud-top') as HTMLElement;
    const bottomBar = document.getElementById('hud-bottom') as HTMLElement;
    const shellOverlay = document.getElementById('shell-overlay') as HTMLElement;
    const codexOverlay = document.getElementById('codex-overlay') as HTMLElement;

    if (canvas && topBar && bottomBar && shellOverlay && codexOverlay) {
      const app = new MyceliumGameApp(canvas, topBar, bottomBar, shellOverlay, codexOverlay);
      app.start();
    }
  });
}
