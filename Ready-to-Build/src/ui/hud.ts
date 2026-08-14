import { BalanceLoader } from '../balance/loader';
import { DifficultyKey, FamilyKey, StatTrack } from '../interfaces';
import { GameMap, isBuildLegal } from '../map/map';
import { GameInstance } from '../sim/game_instance';
import { ModifierStructure } from '../sim/modifier';
import { ConeMode, CONE_ANGLES, TargetingMode, Tower } from '../sim/tower';

export class HUD {
  private game: GameInstance;
  private topBarEl: HTMLElement;
  private bottomBarEl: HTMLElement;

  public placingFamily: FamilyKey | null = null;
  public placingModifier: string | null = null;
  public isRelocating: boolean = false;

  public mousePos: { x: number; y: number } = { x: 0, y: 0 };
  public isHoveringCanvas: boolean = false;

  constructor(game: GameInstance, topBarEl: HTMLElement, bottomBarEl: HTMLElement) {
    this.game = game;
    this.topBarEl = topBarEl;
    this.bottomBarEl = bottomBarEl;

    this.renderInitialDom();
  }

  public setGameInstance(game: GameInstance): void {
    this.game = game;
    this.placingFamily = null;
    this.placingModifier = null;
    this.isRelocating = false;
    this.renderInitialDom();
  }

  private renderInitialDom(): void {
    // 1. Top Bar
    this.topBarEl.innerHTML = `
      <div class="hud-card" id="hud-stat-cash">Cash: $0</div>
      <div class="hud-card" id="hud-stat-lives">Lives: 10</div>
      <div class="hud-card" id="hud-stat-wave">Wave: 0</div>
      <div class="hud-card" id="hud-stat-cycle">Cycle 1 · Tier 0</div>
      <div class="hud-card" id="hud-stat-timer">Next: 18.0s</div>
      <button class="hud-btn" id="btn-send-now" style="background:#238636;color:#fff;font-weight:bold;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">Send Wave Now (Space)</button>
    `;

    const sendBtn = this.topBarEl.querySelector('#btn-send-now') as HTMLButtonElement;
    sendBtn?.addEventListener('click', () => {
      this.game.sendWaveNow();
    });

    // 2. Bottom / Controls Panel
    this.bottomBarEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;width:100%;">
        <div style="display:flex;gap:8px;align-items:center;background:#161b22;padding:8px;border-radius:4px;border:1px solid #30363d;">
          <span style="font-weight:bold;color:#8b949e;font-size:12px;">BUILD TOWERS:</span>
          <button class="hud-btn build-btn" data-family="puffball">1. Puffball ($${this.game.loader.getFamily('puffball').build_cost})</button>
          <button class="hud-btn build-btn" data-family="foxfire">2. Foxfire ($${this.game.loader.getFamily('foxfire').build_cost})</button>
          <button class="hud-btn build-btn" data-family="artillery">3. Artillery ($${this.game.loader.getFamily('artillery').build_cost})</button>
          <button class="hud-btn build-btn" data-family="cordyceps">4. Cordyceps ($${this.game.loader.getFamily('cordyceps').build_cost})</button>
          <span style="font-weight:bold;color:#8b949e;font-size:12px;margin-left:12px;">MODIFIERS:</span>
          <select id="select-modifier" style="background:#21262d;color:#fff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;">
            <option value="">-- Choose Support --</option>
            ${this.game.loader.modifiers
              .map((m) => `<option value="${m.name}">${m.name} ($${m.cost})</option>`)
              .join('')}
          </select>
          <button class="hud-btn" id="btn-build-mod">Build Mod</button>
        </div>

        <div id="selection-panel" style="display:none;background:#161b22;padding:8px;border-radius:4px;border:1px solid #30363d;">
          <!-- Dynamically populated on tower selection -->
        </div>
      </div>
    `;

    // Hook build buttons
    const buildButtons = this.bottomBarEl.querySelectorAll('.build-btn');
    buildButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const fam = (e.currentTarget as HTMLElement).dataset.family as FamilyKey;
        this.placingFamily = fam;
        this.placingModifier = null;
        this.isRelocating = false;
      });
    });

    const buildModBtn = this.bottomBarEl.querySelector('#btn-build-mod') as HTMLButtonElement;
    const modSelect = this.bottomBarEl.querySelector('#select-modifier') as HTMLSelectElement;
    buildModBtn?.addEventListener('click', () => {
      const selected = modSelect.value;
      if (selected) {
        this.placingModifier = selected;
        this.placingFamily = null;
        this.isRelocating = false;
      }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') this.placingFamily = 'puffball';
      if (e.key === '2') this.placingFamily = 'foxfire';
      if (e.key === '3') this.placingFamily = 'artillery';
      if (e.key === '4') this.placingFamily = 'cordyceps';
      if (e.key === ' ') {
        e.preventDefault();
        this.game.sendWaveNow();
      }
      if (e.key === 'Escape') {
        this.placingFamily = null;
        this.placingModifier = null;
        this.isRelocating = false;
        this.game.selectedTower = null;
        this.game.selectedModifier = null;
        this.updateSelectionPanel();
      }
    });
  }

  public update(): void {
    // 1. Top stats update
    const cashEl = document.getElementById('hud-stat-cash');
    if (cashEl) cashEl.innerText = `Cash: $${Math.floor(this.game.economyManager.cash)}`;

    const livesEl = document.getElementById('hud-stat-lives');
    if (livesEl) livesEl.innerText = `Lives: ${this.game.economyManager.lives}`;

    const waveEl = document.getElementById('hud-stat-wave');
    if (waveEl) waveEl.innerText = `Wave: ${this.game.waveManager.currentWaveNum}`;

    const cycleEl = document.getElementById('hud-stat-cycle');
    if (cycleEl) {
      const w = Math.max(1, this.game.waveManager.currentWaveNum);
      // non-balance: 9 tiers per cycle
      const tierCount = 9;
      const tier = (w - 1) % tierCount;
      const cycle = Math.floor((w - 1) / tierCount) + 1;
      cycleEl.innerText = `Cycle ${cycle} · Tier ${tier}`;
    }

    const timerEl = document.getElementById('hud-stat-timer');
    if (timerEl) {
      // non-balance: 1000 ms per second time conversion
      const sec = Math.max(0, this.game.waveManager.autoTimerMs / 1000).toFixed(1);
      timerEl.innerText = `Next: ${sec}s`;
    }

    this.updateSelectionPanel();
  }

  public updateSelectionPanel(): void {
    const selPanel = document.getElementById('selection-panel');
    if (!selPanel) return;

    if (this.game.selectedTower) {
      const t = this.game.selectedTower;
      selPanel.style.display = 'flex';
      selPanel.style.gap = '16px';
      selPanel.style.alignItems = 'center';

      const dmgCost = this.game.loader.getUpgradeCost(t.familyKey, 'damage', t.levels.damage);
      const rngCost = this.game.loader.getUpgradeCost(t.familyKey, 'range', t.levels.range);
      const rateCost = this.game.loader.getUpgradeCost(t.familyKey, 'rate', t.levels.rate);
      const resale = Math.floor(t.totalSpent * this.game.loader.constants.resale);
      const relocCost = this.game.economyManager.getRelocateCost(this.game.loader.getFamily(t.familyKey).build_cost);

      selPanel.innerHTML = `
        <div style="font-size:12px;">
          <b style="color:#58a6ff;">${this.game.loader.getFamily(t.familyKey).label}</b>
          (Pos: ${t.x.toFixed(0)}, ${t.y.toFixed(0)}) | Total: $${t.totalSpent}
          <div style="color:#8b949e;margin-top:2px;">
            Dmg: <b>${t.getEffectiveDamage().toFixed(1)}</b> | Rng: <b>${t.getEffectiveRange().toFixed(1)}</b> | Rate: <b>${t.getEffectiveRate().toFixed(1)} RPM</b>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="hud-btn" id="btn-up-dmg">Dmg L${t.levels.damage} ($${dmgCost})</button>
          <button class="hud-btn" id="btn-up-rng">Rng L${t.levels.range} ($${rngCost})</button>
          <button class="hud-btn" id="btn-up-rate">Rate L${t.levels.rate} ($${rateCost})</button>
        </div>
        <div style="display:flex;gap:6px;margin-left:auto;">
          <button class="hud-btn" id="btn-cycle-target">Target: ${t.targetingMode}</button>
          <button class="hud-btn" id="btn-cycle-cone">Cone: ${t.coneMode}</button>
          <button class="hud-btn" id="btn-relocate" style="background:#d29922;color:#fff;">Relocate ($${relocCost})</button>
          <button class="hud-btn" id="btn-sell" style="background:#da3633;color:#fff;">Sell (+$${resale})</button>
        </div>
      `;

      selPanel.querySelector('#btn-up-dmg')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(dmgCost)) {
          this.game.upgradeTower(t, 'damage');
          this.updateSelectionPanel();
        }
      });
      selPanel.querySelector('#btn-up-rng')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(rngCost)) {
          this.game.upgradeTower(t, 'range');
          this.updateSelectionPanel();
        }
      });
      selPanel.querySelector('#btn-up-rate')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(rateCost)) {
          this.game.upgradeTower(t, 'rate');
          this.updateSelectionPanel();
        }
      });
      selPanel.querySelector('#btn-cycle-target')?.addEventListener('click', () => {
        const modes: TargetingMode[] = ['near', 'far', 'weak', 'strong', 'slow', 'fast', 'old', 'young'];
        const nextIdx = (modes.indexOf(t.targetingMode) + 1) % modes.length;
        t.targetingMode = modes[nextIdx];
        this.updateSelectionPanel();
      });
      selPanel.querySelector('#btn-cycle-cone')?.addEventListener('click', () => {
        const cones: ConeMode[] = ['full', 'wide', 'medium', 'narrow'];
        const nextIdx = (cones.indexOf(t.coneMode) + 1) % cones.length;
        t.coneMode = cones[nextIdx];
        this.updateSelectionPanel();
      });
      selPanel.querySelector('#btn-relocate')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(relocCost)) {
          this.isRelocating = true;
          this.placingFamily = null;
          this.placingModifier = null;
        }
      });
      selPanel.querySelector('#btn-sell')?.addEventListener('click', () => {
        this.game.sellTower(t);
        this.updateSelectionPanel();
      });
    } else if (this.game.selectedModifier) {
      const m = this.game.selectedModifier;
      selPanel.style.display = 'flex';
      selPanel.style.gap = '16px';
      selPanel.style.alignItems = 'center';

      const resale = Math.floor(m.totalSpent * this.game.loader.constants.resale);
      const relocCost = this.game.economyManager.getRelocateCost(m.data.cost);

      selPanel.innerHTML = `
        <div style="font-size:12px;">
          <b style="color:#e3b341;">${m.name}</b> (Pos: ${m.x.toFixed(0)}, ${m.y.toFixed(0)}) | Level ${m.level}
        </div>
        ${
          m.level === 1
            ? `<button class="hud-btn" id="btn-up-mod">Upgrade Reach to 130px ($${m.data.cost})</button>`
            : `<span style="color:#3fb950;font-size:12px;">Max Level</span>`
        }
        <div style="display:flex;gap:6px;margin-left:auto;">
          <button class="hud-btn" id="btn-relocate" style="background:#d29922;color:#fff;">Relocate ($${relocCost})</button>
          <button class="hud-btn" id="btn-sell" style="background:#da3633;color:#fff;">Sell (+$${resale})</button>
        </div>
      `;

      selPanel.querySelector('#btn-up-mod')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(m.data.cost)) {
          this.game.economyManager.deduct(m.data.cost);
          m.upgrade();
          this.game.modifierManager.onStructureChanged();
          this.updateSelectionPanel();
        }
      });
      selPanel.querySelector('#btn-relocate')?.addEventListener('click', () => {
        if (this.game.economyManager.canAfford(relocCost)) {
          this.isRelocating = true;
          this.placingFamily = null;
          this.placingModifier = null;
        }
      });
      selPanel.querySelector('#btn-sell')?.addEventListener('click', () => {
        this.game.sellModifier(m);
        this.updateSelectionPanel();
      });
    } else {
      selPanel.style.display = 'none';
    }
  }
}
