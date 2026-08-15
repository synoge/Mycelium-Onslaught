import { DifficultyKey } from '../interfaces';
import { GameMap, Point } from '../map/map';
import { soundEngine } from '../audio/sound';

export type GameStateScreen = 'title' | 'map_select' | 'playing' | 'game_over' | 'victory';

export interface ShellCallbacks {
  onStartGame: (mapName: string, difficulty: DifficultyKey) => void;
  onOpenCodex: () => void;
  onToggleSound: () => boolean;
  onSetSpeed: (speedMultiplier: number) => void;
  onRestart: () => void;
}

export class GameShell {
  private overlayEl: HTMLElement;
  private allMaps: Record<string, GameMap>;
  private callbacks: ShellCallbacks;

  public currentScreen: GameStateScreen = 'title';
  public selectedMapName: string = 'Classic';
  public selectedDifficulty: DifficultyKey = 'bloom';
  public isMuted: boolean = false;
  public speedMultiplier: number = 1;

  constructor(
    overlayEl: HTMLElement,
    allMaps: Record<string, GameMap>,
    callbacks: ShellCallbacks
  ) {
    this.overlayEl = overlayEl;
    this.allMaps = allMaps;
    this.callbacks = callbacks;

    this.render();
  }

  public showScreen(screen: GameStateScreen): void {
    this.currentScreen = screen;
    this.render();
  }

  public render(): void {
    if (this.currentScreen === 'playing') {
      this.overlayEl.style.display = 'none';
      return;
    }

    this.overlayEl.style.display = 'flex';
    this.overlayEl.style.position = 'absolute';
    this.overlayEl.style.top = '0';
    this.overlayEl.style.left = '0';
    this.overlayEl.style.width = '100%';
    this.overlayEl.style.height = '100%';
    this.overlayEl.style.justifyContent = 'center';
    this.overlayEl.style.alignItems = 'center';
    this.overlayEl.style.zIndex = '100';

    if (this.currentScreen === 'title') {
      this.renderTitleScreen();
    } else if (this.currentScreen === 'map_select') {
      this.renderMapSelectScreen();
    } else if (this.currentScreen === 'game_over') {
      this.renderGameOverScreen();
    }
  }

  private renderTitleScreen(): void {
    this.overlayEl.innerHTML = `
      <div style="position: absolute; inset: 0; background: url('/assets/title_banner.jpg') center/cover no-repeat; filter: brightness(0.35);"></div>
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(14, 20, 27, 0.4) 0%, rgba(5, 8, 12, 0.95) 100%);"></div>

      <div style="position: relative; z-index: 10; text-align: center; max-width: 720px; width: 90%; color: #fff; padding: 32px 36px; border: 1px solid rgba(88, 166, 255, 0.3); border-radius: 12px; background: rgba(14, 18, 24, 0.88); backdrop-filter: blur(14px); box-shadow: 0 20px 50px rgba(0,0,0,0.85);">
        <div style="display: inline-block; font-size: 12px; letter-spacing: 4px; color: #00f5d4; font-weight: 700; background: rgba(0, 245, 212, 0.1); border: 1px solid rgba(0, 245, 212, 0.3); padding: 4px 16px; border-radius: 20px; margin-bottom: 14px;">
          BIO-HAZARD CONTAINMENT PROTOCOL
        </div>
        <h1 style="font-size: 46px; letter-spacing: 4px; margin: 0 0 12px 0; color: #f0f6fc; text-shadow: 0 0 28px rgba(0, 245, 212, 0.6); font-weight: 800;">
          MYCELIUM ONSLAUGHT
        </h1>
        <p style="color: #8b949e; font-size: 15px; margin-bottom: 26px; line-height: 1.6; max-width: 620px; margin-left: auto; margin-right: auto;">
          Subterranean containment has suffered a catastrophic breach. Deploy bioluminescent fungal turrets, form compounding 20-combo cluster networks, and defend the core against escalating bio-incursions.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px; width: 340px; margin: 0 auto;">
          <button id="btn-quick-play" class="hud-btn" style="background: linear-gradient(180deg, #238636 0%, #196c2e 100%); color: #fff; font-size: 17px; font-weight: 700; padding: 12px 20px; border: 1px solid #3fb950; box-shadow: 0 0 20px rgba(63, 185, 80, 0.45);">
            ▶ QUICK LAUNCH (BLOOM)
          </button>
          <button id="btn-open-map-select" class="hud-btn" style="font-size: 15px; padding: 10px 16px;">
            🗺 SECTOR MAPS & DIFFICULTY
          </button>
          <button id="btn-open-codex-title" class="hud-btn" style="border-color: #ffd166; color: #ffd166; font-size: 15px; padding: 10px 16px;">
            📖 CODEX & R&D SPECIMENS
          </button>
          <button id="btn-toggle-sound-title" class="hud-btn" style="font-size: 12px; color: #8b949e; padding: 8px;">
            🔊 AUDIO: ${this.isMuted ? 'MUTED' : 'ENABLED'}
          </button>
        </div>

        <div style="margin-top: 24px; font-size: 12px; color: #6e7681; font-family: 'Share Tech Mono', monospace;">
          HOTKEYS: [1-9] Build Turrets · [Space] Deploy Wave · [C] Subterranean Overlay · [Wheel] Zoom
        </div>
      </div>
    `;

    this.overlayEl.querySelector('#btn-quick-play')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      soundEngine.startAmbient();
      this.callbacks.onStartGame(this.selectedMapName, this.selectedDifficulty);
    });

    this.overlayEl.querySelector('#btn-open-map-select')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.showScreen('map_select');
    });

    this.overlayEl.querySelector('#btn-open-codex-title')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.callbacks.onOpenCodex();
    });

    this.overlayEl.querySelector('#btn-toggle-sound-title')?.addEventListener('click', (e) => {
      this.isMuted = this.callbacks.onToggleSound();
      (e.currentTarget as HTMLElement).innerText = `🔊 AUDIO: ${this.isMuted ? 'MUTED' : 'ENABLED'}`;
    });
  }

  private renderMapSelectScreen(): void {
    const mapNames = Object.keys(this.allMaps);
    const activeMap = this.allMaps[this.selectedMapName] || this.allMaps[mapNames[0]];

    this.overlayEl.innerHTML = `
      <div style="background: rgba(14, 18, 24, 0.97); border: 1px solid rgba(88, 166, 255, 0.3); border-radius: 12px; padding: 22px 26px; max-width: 1060px; width: 96%; color: #c9d1d9; box-shadow: 0 24px 60px rgba(0,0,0,0.85); backdrop-filter: blur(14px); display: flex; flex-direction: column; gap: 14px; max-height: 94vh;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #00f5d4; font-size: 22px; font-weight: 700; letter-spacing: 1px;">🗺 SECTOR SELECTION (13 EXPEDITIONS)</span>
            <span style="font-size: 12px; color: #8b949e; font-family: 'Share Tech Mono', monospace;">Click a sector thumbnail to inspect layout</span>
          </div>
          <button id="btn-back-to-title" class="hud-btn" style="padding: 6px 14px; font-size: 13px;">Back</button>
        </div>

        <!-- Visual Map Cards Carousel / Grid (Expanded 50%) -->
        <div id="map-carousel-grid" style="display: flex; gap: 12px; overflow-x: auto; padding: 8px 4px; scrollbar-width: thin;">
          ${mapNames
            .map((name) => {
              const m = this.allMaps[name];
              const isSelected = name === this.selectedMapName;
              return `
                <div class="map-card" data-map="${name}" style="flex: 0 0 160px; background: ${isSelected ? 'rgba(0, 245, 212, 0.12)' : 'rgba(22, 27, 34, 0.85)'}; border: 2px solid ${isSelected ? '#00f5d4' : '#30363d'}; border-radius: 8px; padding: 8px; cursor: pointer; text-align: center; transition: all 0.15s ease; box-shadow: ${isSelected ? '0 0 14px rgba(0, 245, 212, 0.4)' : 'none'};">
                  <canvas class="map-thumb-canvas" data-map="${name}" width="144" height="96" style="display: block; border-radius: 6px; background: #0a0e14; border: 1px solid #21262d; margin: 0 auto 6px auto;"></canvas>
                  <div style="font-size: 14px; font-weight: 700; color: ${isSelected ? '#00f5d4' : '#f0f6fc'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                  <div style="font-size: 11px; color: #8b949e; font-family: 'Share Tech Mono', monospace;">${m.totalLength.toFixed(0)}px · ${m.waypoints.length} pts</div>
                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Active Sector Inspection Panel (Expanded 50%) -->
        <div style="display: flex; gap: 20px; background: rgba(22, 27, 34, 0.75); border: 1px solid #30363d; border-radius: 10px; padding: 16px 20px; align-items: center;">
          <div style="position: relative;">
            <canvas id="active-map-preview" width="340" height="226" style="display: block; border-radius: 8px; background: #090d13; border: 1px solid rgba(88, 166, 255, 0.3);"></canvas>
            <div style="position: absolute; bottom: 6px; left: 10px; font-size: 11px; color: #8b949e; font-family: 'Share Tech Mono', monospace; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">🟢 Spawn &nbsp; 🔴 Core</div>
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 24px; font-weight: 700; color: #00f5d4;">${this.selectedMapName.toUpperCase()}</span>
              <span style="font-size: 13px; color: #58a6ff; font-family: 'Share Tech Mono', monospace;">
                Length: ${activeMap.totalLength.toFixed(0)}px · Waypoints: ${activeMap.waypoints.length}
              </span>
            </div>

            <!-- Difficulty Buttons -->
            <div>
              <div style="font-size: 12px; font-weight: bold; color: #8b949e; margin-bottom: 6px;">SELECT THREAT LEVEL:</div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                ${(['sprout', 'bloom', 'spread', 'dominion'] as DifficultyKey[])
                  .map(
                    (diff) => `
                  <button class="hud-btn diff-btn" data-diff="${diff}" style="padding: 10px 4px; text-align: center; border-color: ${
                      diff === this.selectedDifficulty ? '#00f5d4' : '#30363d'
                    }; background: ${
                      diff === this.selectedDifficulty
                        ? 'linear-gradient(180deg, #1b3a38 0%, #0d2222 100%)'
                        : 'linear-gradient(180deg, #21262d 0%, #161b22 100%)'
                    };">
                    <div style="font-weight: bold; font-size: 14px; color: ${
                      diff === 'sprout' ? '#3fb950' : diff === 'bloom' ? '#58a6ff' : diff === 'spread' ? '#d29922' : '#f85149'
                    };">${diff.toUpperCase()}</div>
                    <div style="font-size: 10px; color: #8b949e; margin-top: 2px;">
                      ${
                        diff === 'sprout'
                          ? '$50 · 1.08x'
                          : diff === 'bloom'
                          ? '$44 · 1.10x'
                          : diff === 'spread'
                          ? '$38 · 1.12x'
                          : '$30 · 1.15x'
                      }
                    </div>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Launch Button -->
            <button id="btn-start-selected-map" class="hud-btn" style="background: linear-gradient(180deg, #238636 0%, #196c2e 100%); color: #fff; font-size: 16px; font-weight: 700; padding: 12px; border-color: #3fb950; margin-top: 4px; box-shadow: 0 0 16px rgba(46,160,67,0.4);">
              ▶ ENGAGE CONTAINMENT PROTOCOL (${this.selectedMapName.toUpperCase()})
            </button>
          </div>
        </div>
      </div>
    `;

    // Render all thumbnail canvases and the detailed active preview
    this.renderMapCanvases();

    // Hook card click events
    this.overlayEl.querySelectorAll('.map-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        soundEngine.playUIClick();
        const mapName = (e.currentTarget as HTMLElement).dataset.map;
        if (mapName) {
          this.selectedMapName = mapName;
          this.renderMapSelectScreen();
        }
      });
    });

    // Hook difficulty buttons
    this.overlayEl.querySelectorAll('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        soundEngine.playUIClick();
        const diff = (e.currentTarget as HTMLElement).dataset.diff as DifficultyKey;
        this.selectedDifficulty = diff;
        this.renderMapSelectScreen();
      });
    });

    this.overlayEl.querySelector('#btn-back-to-title')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.showScreen('title');
    });

    this.overlayEl.querySelector('#btn-start-selected-map')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      soundEngine.startAmbient();
      this.callbacks.onStartGame(this.selectedMapName, this.selectedDifficulty);
    });
  }

  /**
   * Helper to draw organic smooth path with rounded fillet corners on radar preview canvases.
   */
  private drawSmoothOrganicPath(ctx: CanvasRenderingContext2D, waypoints: Point[]): void {
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

      const t1x = p1.x - ((p1.x - p0.x) / d1) * r;
      const t1y = p1.y - ((p1.y - p0.y) / d1) * r;
      const t2x = p1.x + ((p2.x - p1.x) / d2) * r;
      const t2y = p1.y + ((p2.y - p1.y) / d2) * r;

      ctx.lineTo(t1x, t1y);
      ctx.quadraticCurveTo(p1.x, p1.y, t2x, t2y);
    }

    const last = waypoints[waypoints.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  private renderMapCanvases(): void {
    // 1. Render all mini thumbnail canvases
    this.overlayEl.querySelectorAll<HTMLCanvasElement>('.map-thumb-canvas').forEach((canvas) => {
      const mapName = canvas.dataset.map;
      if (!mapName || !this.allMaps[mapName]) return;
      const map = this.allMaps[mapName];
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Logical map space is 720 x 480
      const scale = canvas.width / 720;

      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (map.waypoints.length > 1) {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer curb
        this.drawSmoothOrganicPath(ctx, map.waypoints);
        // non-balance: thumbnail road outer curb width 30
        ctx.lineWidth = 30;
        ctx.strokeStyle = '#18212c';
        ctx.stroke();

        // Road bed
        this.drawSmoothOrganicPath(ctx, map.waypoints);
        // non-balance: thumbnail road bed width 20
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#222b37';
        ctx.stroke();

        // Neon runnel
        this.drawSmoothOrganicPath(ctx, map.waypoints);
        // non-balance: thumbnail runnel width 4.5
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#00f5d4';
        ctx.stroke();

        // Spawn point
        ctx.beginPath();
        // non-balance: thumbnail spawn radius 14
        ctx.arc(map.waypoints[0].x, map.waypoints[0].y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#3fb950';
        ctx.fill();

        // Base core
        ctx.beginPath();
        // non-balance: thumbnail base radius 16
        ctx.arc(map.base.x, map.base.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#f85149';
        ctx.fill();

        ctx.restore();
      }
    });

    // 2. Render active map detailed preview
    const activeCanvas = this.overlayEl.querySelector<HTMLCanvasElement>('#active-map-preview');
    if (activeCanvas && this.allMaps[this.selectedMapName]) {
      const map = this.allMaps[this.selectedMapName];
      const ctx = activeCanvas.getContext('2d');
      if (ctx) {
        const scale = activeCanvas.width / 720;

        ctx.fillStyle = '#090d13';
        ctx.fillRect(0, 0, activeCanvas.width, activeCanvas.height);

        // Subtle coordinate grid
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
        ctx.lineWidth = 1;
        // non-balance: grid step 24
        const gridStep = 24;
        for (let x = 0; x <= activeCanvas.width; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, activeCanvas.height);
          ctx.stroke();
        }
        for (let y = 0; y <= activeCanvas.height; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(activeCanvas.width, y);
          ctx.stroke();
        }

        if (map.waypoints.length > 1) {
          ctx.save();
          ctx.scale(scale, scale);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Outer curb
          this.drawSmoothOrganicPath(ctx, map.waypoints);
          // non-balance: preview outer curb width 34
          ctx.lineWidth = 34;
          ctx.strokeStyle = '#18212c';
          ctx.stroke();

          // Roadbed
          this.drawSmoothOrganicPath(ctx, map.waypoints);
          // non-balance: preview roadbed width 24
          ctx.lineWidth = 24;
          ctx.strokeStyle = '#222b37';
          ctx.stroke();

          // Coolant line
          this.drawSmoothOrganicPath(ctx, map.waypoints);
          // non-balance: preview runnel width 6
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#00f5d4';
          ctx.shadowColor = '#00f5d4';
          // non-balance: preview glow blur 8
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Spawn point
          ctx.beginPath();
          // non-balance: preview spawn radius 16
          ctx.arc(map.waypoints[0].x, map.waypoints[0].y, 16, 0, Math.PI * 2);
          ctx.fillStyle = '#3fb950';
          ctx.shadowColor = '#3fb950';
          // non-balance: spawn glow blur 6
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Base core
          ctx.beginPath();
          // non-balance: preview base radius 18
          ctx.arc(map.base.x, map.base.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = '#f85149';
          ctx.shadowColor = '#f85149';
          // non-balance: base glow blur 8
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        }
      }
    }
  }

  private renderGameOverScreen(): void {
    this.overlayEl.innerHTML = `
      <div style="background: rgba(14, 18, 24, 0.96); border: 2px solid #f85149; border-radius: 12px; padding: 28px; max-width: 520px; width: 90%; text-align: center; color: #fff; box-shadow: 0 0 40px rgba(248, 81, 73, 0.3); backdrop-filter: blur(12px);">
        <div style="color: #f85149; font-size: 32px; font-weight: 800; letter-spacing: 2px; margin-bottom: 8px;">
          CRITICAL BREACH
        </div>
        <div style="color: #8b949e; font-size: 14px; margin-bottom: 20px;">
          The fungal infection overwhelmed core defenses. Subterranean Sector Compromised.
        </div>
        <div style="display: flex; justify-content: center; gap: 12px;">
          <button id="btn-retry-game" class="hud-btn" style="background: #238636; color: #fff; padding: 10px 20px; font-size: 14px;">
            🔄 RETRY SECTOR
          </button>
          <button id="btn-return-menu" class="hud-btn" style="padding: 10px 20px; font-size: 14px;">
            🗺 RETURN TO MENU
          </button>
        </div>
      </div>
    `;

    this.overlayEl.querySelector('#btn-retry-game')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.callbacks.onRestart();
    });

    this.overlayEl.querySelector('#btn-return-menu')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.showScreen('map_select');
    });
  }
}
