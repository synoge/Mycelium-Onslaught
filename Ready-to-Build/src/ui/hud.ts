import { BalanceLoader } from '../balance/loader';
import { soundEngine } from '../audio/sound';
import { DifficultyKey, FamilyKey, StatTrack } from '../interfaces';
import { GameMap, isBuildLegal } from '../map/map';
import { GameInstance } from '../sim/game_instance';
import { ModifierStructure } from '../sim/modifier';
import { ConeMode, CONE_ANGLES, TargetingMode, Tower } from '../sim/tower';

// non-balance: enemy tier names metadata
export const ENEMY_TIER_NAMES: Record<number, { name: string; trait: string }> = {
  // non-balance: tier 0
  0: { name: 'Carpenter Ant', trait: 'Swarm Column' },
  // non-balance: tier 1
  1: { name: 'Ground Beetle', trait: 'Armored Chitin' },
  // non-balance: tier 2
  2: { name: 'Field Rat', trait: 'Fast Scurry' },
  // non-balance: tier 3
  3: { name: 'Crow', trait: 'Agile Corvid' },
  // non-balance: tier 4
  4: { name: 'Fox', trait: 'Brush-Tail Runner' },
  // non-balance: tier 5
  5: { name: 'Wild Boar', trait: 'Heavy Tusked Armor' },
  // non-balance: tier 6
  6: { name: 'K9 Handler', trait: 'Tactical Duo' },
  // non-balance: tier 7
  7: { name: 'Field Researcher', trait: 'Civilian Bio-Mask' },
  // non-balance: tier 8
  8: { name: 'Hazmat Trooper', trait: 'Apex Bio-Containment' },
};

export interface TowerSpecInfo {
  name: string;
  role: string;
  dmgType: string;
  strengths: string;
  signature: string;
  bloomPerk: string;
}

export const TOWER_SPECS: Record<FamilyKey, TowerSpecInfo> = {
  puffball: {
    name: 'Puffball Battery (Calvatia)',
    role: 'Rapid Anti-Swarm Gatling',
    dmgType: 'Direct Spore Kinetic',
    strengths: 'Fast swarms & light scouts',
    signature: 'Freakout Burst: 3x Damage & 4x Fire Rate at Dmg L4 + Rate L4',
    bloomPerk: 'Combo Cluster Node Lead',
  },
  foxfire: {
    name: 'Foxfire Lantern (Panellus)',
    role: 'Bioluminescent Laser Chain',
    dmgType: 'Continuous Energy Beam',
    strengths: 'Dense columns & clustered packs',
    signature: 'Recursive Compound Laser Chain (+25% power per adjacent Foxfire hop)',
    bloomPerk: 'Heavy Lumen Bloom Cannon',
  },
  artillery: {
    name: 'Artillery Cap (Amanita)',
    role: 'Heavy Siege Splash Mortar',
    dmgType: 'High-Explosive Shockwave',
    strengths: 'Armored juggernauts & tight crowds',
    signature: 'Holding Pattern: Pre-launches up to 4 orbiting spore shells',
    bloomPerk: 'Fruiting Detonation Mega-Blast',
  },
  cordyceps: {
    name: 'Cordyceps Spire (Ophiocordyceps)',
    role: 'Long-Range Toxic Neuro-Snare',
    dmgType: 'Poison / Speed Divisor',
    strengths: 'High-speed sprinters & bosses',
    signature: 'Compounding Slow Poison (up to 10x speed divisor)',
    bloomPerk: 'Spore Shockwave & Sinkhole Lead',
  },
  inky_cap: {
    name: 'Inky Cap Mortar (Coprinus)',
    role: 'Void Ground-Denial Zone',
    dmgType: 'Caustic Ink DoT & Armor Melt',
    strengths: 'Armor shredding & zone suppression',
    signature: 'Leaves 4s caustic ink puddles on road dealing DoT and +15% armor shred',
    bloomPerk: 'Void Puddle Spread Expansion',
  },
  polypore: {
    name: 'Polypore Shield (Trametes)',
    role: 'Tactical Bio-Dome & Ally Accelerator',
    dmgType: 'Forcefield Aura & Ally Haste',
    strengths: 'Chokepoint control & tower buffing',
    signature: 'Pulsing bio-dome slows enemies by 35% and boosts adjacent ally rate by +20%',
    bloomPerk: 'Concentric Bio-Forcefield Pulse',
  },
  stinkhorn: {
    name: 'Lattice Stinkhorn (Clathrus)',
    role: '360° Corrosive Miasma Siphon',
    dmgType: 'Aerosol Gas DoT & Chitin Acid',
    strengths: 'Heavy carapace & Wild Boar armor',
    signature: 'Continuous 360° miasma gas cloud dealing DoT and permanently melting armor',
    bloomPerk: 'Super-Corrosive Miasma Deluge',
  },
  ghost_pipe: {
    name: 'Ghost Pipe Leech (Monotropa)',
    role: 'Kinetic Siphon & Treasury Dividend',
    dmgType: 'Kinetic Drain & Bounty Multiplier',
    strengths: 'High velocity runners & economy',
    signature: 'Leeches 50% velocity from sprinters, converting momentum into bonus gold payouts',
    bloomPerk: 'Treasury Surge Multiplier',
  },
  lions_mane: {
    name: 'Lion\'s Mane Disruptor (Hericium)',
    role: 'Neural Synapse Cascade & Stagger',
    dmgType: 'Bio-Electric Lightning Stun',
    strengths: 'Crowd disruption & path reversal',
    signature: 'Discharges 3-target chain lightning with 800ms stun and 1.0s path reversal stagger',
    bloomPerk: 'Synapse Overload Cascade',
  },
};

export class HUD {
  private game: GameInstance;
  private topBarEl: HTMLElement;
  private bottomBarEl: HTMLElement;

  public placingFamily: FamilyKey | null = null;
  public placingModifier: string | null = null;
  public isRelocating: boolean = false;
  public showGhostMycelium: boolean = false;
  public autoSendNextWave: boolean = false;

  public mousePos: { x: number; y: number } = { x: 0, y: 0 };
  public isHoveringCanvas: boolean = false;

  public onOpenCodex?: () => void;
  public onOpenMenu?: () => void;
  public onSpeedChange?: (multiplier: number) => void;
  public onZoomIn?: () => void;
  public onZoomOut?: () => void;
  public onZoomReset?: () => void;
  public currentSpeed: number = 1;

  public currentBuildRackTab: 'core' | 'advanced' = 'core';
  private currentSelectionKey: string | null = null;

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
    this.currentSelectionKey = null;
    this.renderInitialDom();
  }

  private renderInitialDom(): void {
    // 1. Top Bar with Wave Intel, Auto-Send, and Zoom Controls
    this.topBarEl.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: nowrap;">
        <div class="hud-card" id="hud-stat-cash">Cash: $0</div>
        <div class="hud-card" id="hud-stat-lives">Core: 10 Nodes</div>
        <div class="hud-card" id="hud-stat-wave" style="cursor:help;position:relative;" title="Hover for Wave Intel">Wave: 0 ℹ</div>
        <div class="hud-card" id="hud-stat-cycle">Cycle 1 · Tier 0</div>
        <div class="hud-card" id="hud-stat-timer">Next: 18.0s</div>
      </div>
      
      <!-- Center: Zoom Controls -->
      <div style="display: flex; gap: 4px; align-items: center; background: rgba(22, 27, 34, 0.85); border: 1px solid #30363d; border-radius: 6px; padding: 3px 6px;">
        <button class="hud-btn" id="btn-zoom-out" style="padding: 4px 8px; font-size: 11px;" title="Zoom Out (-)">🔍 -</button>
        <button class="hud-btn" id="btn-zoom-reset" style="padding: 4px 8px; font-size: 11px;" title="Reset Zoom (1.0x)">1.0x</button>
        <button class="hud-btn" id="btn-zoom-in" style="padding: 4px 8px; font-size: 11px;" title="Zoom In (+)">🔍 +</button>
      </div>

      <!-- Right: Game Controls -->
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: nowrap;">
        <button class="hud-btn" id="btn-auto-send" style="background:#21262d;color:#8b949e;">Auto-Send: OFF</button>
        <button class="hud-btn" id="btn-send-now" style="background:linear-gradient(180deg, #2ea043 0%, #238636 100%);color:#fff;font-weight:bold;padding:6px 14px;box-shadow:0 0 10px rgba(46,160,67,0.4);">Send Wave (Space)</button>
        <button class="hud-btn" id="btn-speed-toggle">1x Speed</button>
        <button class="hud-btn" id="btn-codex-open">Codex</button>
        <button class="hud-btn" id="btn-menu-open">Menu</button>
      </div>

      <!-- Wave Intel Popover -->
      <div id="wave-intel-popover" style="display:none;position:absolute;top:48px;left:240px;background:#161b22;border:1px solid #58a6ff;border-radius:8px;padding:12px 16px;z-index:200;color:#c9d1d9;font-size:12px;box-shadow:0 12px 32px rgba(0,0,0,0.8);backdrop-filter:blur(10px);pointer-events:none;">
      </div>
    `;

    // Zoom Buttons
    this.topBarEl.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      if (this.onZoomIn) this.onZoomIn();
    });
    this.topBarEl.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      if (this.onZoomOut) this.onZoomOut();
    });
    this.topBarEl.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      if (this.onZoomReset) this.onZoomReset();
    });

    const autoSendBtn = this.topBarEl.querySelector('#btn-auto-send') as HTMLButtonElement;
    autoSendBtn?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.autoSendNextWave = !this.autoSendNextWave;
      autoSendBtn.innerText = `Auto-Send: ${this.autoSendNextWave ? 'ON' : 'OFF'}`;
      autoSendBtn.style.background = this.autoSendNextWave ? '#238636' : '#21262d';
      autoSendBtn.style.color = this.autoSendNextWave ? '#fff' : '#8b949e';
    });

    const sendBtn = this.topBarEl.querySelector('#btn-send-now') as HTMLButtonElement;
    sendBtn?.addEventListener('click', () => {
      soundEngine.playUIClick();
      this.game.sendWaveNow();
    });

    const speedBtn = this.topBarEl.querySelector('#btn-speed-toggle') as HTMLButtonElement;
    speedBtn?.addEventListener('click', () => {
      soundEngine.playUIClick();
      // non-balance: speed multiplier levels
      const speeds = [1, 2, 5];
      const nextIdx = (speeds.indexOf(this.currentSpeed) + 1) % speeds.length;
      this.currentSpeed = speeds[nextIdx];
      speedBtn.innerText = `${this.currentSpeed}x Speed`;
      if (this.onSpeedChange) this.onSpeedChange(this.currentSpeed);
    });

    this.topBarEl.querySelector('#btn-codex-open')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      if (this.onOpenCodex) this.onOpenCodex();
    });

    this.topBarEl.querySelector('#btn-menu-open')?.addEventListener('click', () => {
      soundEngine.playUIClick();
      if (this.onOpenMenu) this.onOpenMenu();
    });

    // Wave Intel Tooltip hover
    const waveStatEl = this.topBarEl.querySelector('#hud-stat-wave');
    const intelPopover = this.topBarEl.querySelector('#wave-intel-popover') as HTMLElement;

    waveStatEl?.addEventListener('mouseenter', () => {
      if (!intelPopover) return;
      const nextW = this.game.waveManager.currentWaveNum + 1;
      // non-balance: 9 tiers per cycle
      const tierCount = 9;
      const tier = (nextW - 1) % tierCount;
      const cycle = Math.floor((nextW - 1) / tierCount) + 1;
      const tierInfo = ENEMY_TIER_NAMES[tier] || { name: 'Unknown', trait: 'Standard' };
      // non-balance: 10 squad size constant
      const count = 10;
      const speed = this.game.loader.getDifficulty(this.game['difficulty']).params.speed;

      intelPopover.innerHTML = `
        <div style="font-weight:bold;color:#58a6ff;margin-bottom:4px;font-size:13px;">🔍 INCOMING WAVE ${nextW} INTEL</div>
        <div><b>Enemy:</b> ${tierInfo.name} (Tier ${tier} · Cycle ${cycle})</div>
        <div><b>Squad Size:</b> ${count} units</div>
        <div><b>Special Trait:</b> <span style="color:#ffd166;">${tierInfo.trait}</span></div>
        <div><b>March Velocity:</b> ${speed} px/s</div>
      `;
      intelPopover.style.display = 'block';
    });

    waveStatEl?.addEventListener('mouseleave', () => {
      if (intelPopover) intelPopover.style.display = 'none';
    });

    // 2. Bottom / Build Rack Panel with Two-Tier Selector
    this.renderBuildRack();

    // Global keyboard shortcuts [1-9]
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') { soundEngine.playUIClick(); this.placingFamily = 'puffball'; }
      if (e.key === '2') { soundEngine.playUIClick(); this.placingFamily = 'foxfire'; }
      if (e.key === '3') { soundEngine.playUIClick(); this.placingFamily = 'artillery'; }
      if (e.key === '4') { soundEngine.playUIClick(); this.placingFamily = 'cordyceps'; }
      if (e.key === '5') { soundEngine.playUIClick(); this.placingFamily = 'inky_cap'; }
      if (e.key === '6') { soundEngine.playUIClick(); this.placingFamily = 'polypore'; }
      if (e.key === '7') { soundEngine.playUIClick(); this.placingFamily = 'stinkhorn'; }
      if (e.key === '8') { soundEngine.playUIClick(); this.placingFamily = 'ghost_pipe'; }
      if (e.key === '9') { soundEngine.playUIClick(); this.placingFamily = 'lions_mane'; }
      if (e.key.toLowerCase() === 'c') { this.showGhostMycelium = true; }
      if (e.key === ' ') {
        e.preventDefault();
        soundEngine.playUIClick();
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

    window.addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 'c') {
        this.showGhostMycelium = false;
      }
    });
  }

  private renderBuildRack(): void {
    const isCore = this.currentBuildRackTab === 'core';

    this.bottomBarEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;width:100%;">
        <div style="display:flex;gap:10px;align-items:center;background:rgba(22,27,34,0.95);padding:6px 12px;border-radius:8px;border:1px solid rgba(88,166,255,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.5);">
          
          <!-- Rack Tab Toggle -->
          <div style="display:flex;gap:3px;background:#0d1117;border-radius:6px;padding:3px;border:1px solid #30363d;flex-shrink:0;">
            <button class="hud-btn rack-tab-btn" data-tab="core" style="padding:5px 12px;font-size:12px;${isCore ? 'background:linear-gradient(180deg,#2ea043 0%,#238636 100%);color:#fff;font-weight:bold;' : 'color:#8b949e;'}">
              Core (1-4)
            </button>
            <button class="hud-btn rack-tab-btn" data-tab="advanced" style="padding:5px 12px;font-size:12px;${!isCore ? 'background:linear-gradient(180deg,#2ea043 0%,#238636 100%);color:#fff;font-weight:bold;' : 'color:#8b949e;'}">
              Specimens (5-9)
            </button>
          </div>

          <!-- Active Tower Buttons -->
          <div style="display:flex;gap:6px;align-items:center;flex:1;">
            ${
              isCore
                ? `
              <button class="hud-btn build-btn" data-family="puffball" style="flex:1;border-left:3px solid #2de2e6;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;">
                <img src="/assets/tower_puffball.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>1. Puffball (<b style="color:#ffd166;">$${this.game.loader.getFamily('puffball').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="foxfire" style="flex:1;border-left:3px solid #00ff66;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;">
                <img src="/assets/tower_foxfire.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>2. Foxfire (<b style="color:#ffd166;">$${this.game.loader.getFamily('foxfire').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="artillery" style="flex:1;border-left:3px solid #ff0055;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;">
                <img src="/assets/tower_artillery.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>3. Artillery (<b style="color:#ffd166;">$${this.game.loader.getFamily('artillery').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="cordyceps" style="flex:1;border-left:3px solid #ffaa00;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;">
                <img src="/assets/tower_cordyceps.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>4. Cordyceps (<b style="color:#ffd166;">$${this.game.loader.getFamily('cordyceps').build_cost}</b>)</span>
              </button>
            `
                : `
              <button class="hud-btn build-btn" data-family="inky_cap" style="flex:1;border-left:3px solid #c77dff;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;">
                <img src="/assets/tower_inky_cap.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>5. Inky Cap (<b style="color:#ffd166;">$${this.game.loader.getFamily('inky_cap').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="polypore" style="flex:1;border-left:3px solid #00f5d4;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;">
                <img src="/assets/tower_polypore.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>6. Polypore (<b style="color:#ffd166;">$${this.game.loader.getFamily('polypore').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="stinkhorn" style="flex:1;border-left:3px solid #ff5964;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;">
                <img src="/assets/tower_stinkhorn.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>7. Stinkhorn (<b style="color:#ffd166;">$${this.game.loader.getFamily('stinkhorn').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="ghost_pipe" style="flex:1;border-left:3px solid #e0e1dd;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;">
                <img src="/assets/tower_ghost_pipe.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>8. Ghost Pipe (<b style="color:#ffd166;">$${this.game.loader.getFamily('ghost_pipe').build_cost}</b>)</span>
              </button>
              <button class="hud-btn build-btn" data-family="lions_mane" style="flex:1;border-left:3px solid #00b4d8;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 8px;">
                <img src="/assets/tower_lions_mane.jpg" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
                <span>9. Lion's Mane (<b style="color:#ffd166;">$${this.game.loader.getFamily('lions_mane').build_cost}</b>)</span>
              </button>
            `
            }
          </div>

          <!-- Support Auras Dropdown Module -->
          <div style="display:flex;align-items:center;gap:6px;background:rgba(13,17,23,0.9);padding:4px 8px;border-radius:6px;border:1px solid #30363d;flex-shrink:0;">
            <span style="font-weight:700;color:#ffd166;font-size:11px;">AURA:</span>
            <select id="select-modifier" style="background:#161b22;color:#fff;border:1px solid #30363d;padding:4px 8px;border-radius:4px;font-size:11px;font-family:'Rajdhani',sans-serif;font-weight:600;">
              <option value="">-- Support Mod --</option>
              ${this.game.loader.modifiers
                .map((m) => `<option value="${m.name}">${m.name} ($${m.cost})</option>`)
                .join('')}
            </select>
            <button class="hud-btn" id="btn-build-mod" style="padding:4px 8px;font-size:11px;background:#238636;color:#fff;">Build</button>
          </div>
        </div>

        <!-- Dynamic Selection Panel -->
        <div id="selection-panel" style="display:none;background:rgba(22,27,34,0.95);padding:8px 14px;border-radius:8px;border:1px solid rgba(88,166,255,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.6);">
        </div>
      </div>
    `;

    // Hook tab switches
    this.bottomBarEl.querySelectorAll('.rack-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        soundEngine.playUIClick();
        const tab = (e.currentTarget as HTMLElement).dataset.tab as 'core' | 'advanced';
        this.currentBuildRackTab = tab;
        this.renderBuildRack();
      });
    });

    // Hook build buttons & hover inspection flyouts
    const flyout = document.getElementById('tower-spec-flyout');
    const buildButtons = this.bottomBarEl.querySelectorAll('.build-btn');

    buildButtons.forEach((btn) => {
      const fam = (btn as HTMLElement).dataset.family as FamilyKey;
      const famData = this.game.loader.getFamily(fam);
      const spec = TOWER_SPECS[fam];

      btn.addEventListener('click', () => {
        soundEngine.playUIClick();
        this.placingFamily = fam;
        this.placingModifier = null;
        this.isRelocating = false;
      });

      btn.addEventListener('mouseenter', () => {
        if (!flyout) return;
        const basePower = famData.base_power;
        const d0 = famData.base.damage;
        const r0 = famData.base.range;
        const f0 = famData.base.rate;

        flyout.innerHTML = `
          <div style="display: flex; gap: 10px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 8px; margin-bottom: 8px;">
            <img src="/assets/tower_${fam}.jpg" style="width: 44px; height: 44px; border-radius: 6px; border: 1px solid #00f5d4; object-fit: cover;" />
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #00f5d4;">${spec.name}</div>
              <div style="font-size: 11px; color: #58a6ff; font-family: 'Share Tech Mono', monospace;">
                ROLE: ${spec.role.toUpperCase()} · POWER: <b style="color:#ffd166;">${basePower.toFixed(1)}</b>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; margin-bottom: 8px; text-align: center; font-size: 11px;">
            <div>Damage: <b style="color:#ff5964;">${d0}</b></div>
            <div>Range: <b style="color:#58a6ff;">${r0}px</b></div>
            <div>Rate: <b style="color:#00ff66;">${f0} RPM</b></div>
          </div>

          <div style="font-size: 11px; line-height: 1.4; margin-bottom: 4px;">
            <div><b>Damage Type:</b> <span style="color:#ffd166;">${spec.dmgType}</span></div>
            <div><b>Strengths:</b> ${spec.strengths}</div>
            <div><b>Signature:</b> <span style="color:#e0e1dd;">${spec.signature}</span></div>
            <div><b>Bloom Milestone:</b> <span style="color:#00f5d4;">${spec.bloomPerk}</span></div>
          </div>
        `;
        const idleCard = document.getElementById('dock-tactical-idle');
        if (idleCard) idleCard.style.display = 'none';
        flyout.style.display = 'block';
      });

      btn.addEventListener('mouseleave', () => {
        if (flyout) flyout.style.display = 'none';
        const idleCard = document.getElementById('dock-tactical-idle');
        if (idleCard) idleCard.style.display = 'block';
      });
    });

    const buildModBtn = this.bottomBarEl.querySelector('#btn-build-mod') as HTMLButtonElement;
    const modSelect = this.bottomBarEl.querySelector('#select-modifier') as HTMLSelectElement;
    buildModBtn?.addEventListener('click', () => {
      const selected = modSelect.value;
      if (selected) {
        soundEngine.playUIClick();
        this.placingModifier = selected;
        this.placingFamily = null;
        this.isRelocating = false;
      }
    });
  }

  public update(): void {
    if (this.autoSendNextWave) {
      const isWaveActive = this.game.waveManager.pendingWaves.length > 0 || this.game.waveManager.attackers.length > 0;
      if (!isWaveActive && !this.game.economyManager.isGameOver) {
        this.game.sendWaveNow();
      }
    }

    const cashEl = document.getElementById('hud-stat-cash');
    if (cashEl) cashEl.innerText = `Cash: $${Math.floor(this.game.economyManager.cash)}`;

    const livesEl = document.getElementById('hud-stat-lives');
    if (livesEl) livesEl.innerText = `Core: ${this.game.economyManager.lives} Nodes`;

    const waveEl = document.getElementById('hud-stat-wave');
    if (waveEl) waveEl.innerText = `Wave: ${this.game.waveManager.currentWaveNum} ℹ`;

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
      // non-balance: 1000 ms per second
      const sec = Math.max(0, this.game.waveManager.autoTimerMs / 1000).toFixed(1);
      timerEl.innerText = `Next: ${sec}s`;
    }

    this.updateSelectionPanel();
  }

  public updateSelectionPanel(forceRebuild: boolean = false): void {
    const selPanel = document.getElementById('selection-panel');
    if (!selPanel) return;

    const newKey = this.game.selectedTower
      ? `tower_${this.game.selectedTower.id}`
      : this.game.selectedModifier
      ? `mod_${this.game.selectedModifier.id}`
      : 'none';

    if (newKey !== this.currentSelectionKey || forceRebuild) {
      this.currentSelectionKey = newKey;
      this.rebuildSelectionPanelDom(selPanel);
    } else {
      this.syncSelectionPanelValues();
    }
  }

  private rebuildSelectionPanelDom(selPanel: HTMLElement): void {
    if (this.game.selectedTower) {
      const t = this.game.selectedTower;
      selPanel.style.display = 'flex';
      selPanel.style.gap = '10px';
      selPanel.style.alignItems = 'center';

      const dmgCost = this.game.loader.getUpgradeCost(t.familyKey, 'damage', t.levels.damage);
      const rngCost = this.game.loader.getUpgradeCost(t.familyKey, 'range', t.levels.range);
      const rateCost = this.game.loader.getUpgradeCost(t.familyKey, 'rate', t.levels.rate);
      const resale = Math.floor(t.totalSpent * this.game.loader.constants.resale);
      const relocCost = this.game.economyManager.getRelocateCost(this.game.loader.getFamily(t.familyKey).build_cost);

      // non-balance: 3000ms undo window
      const isUndoEligible = (this.game.simTimeMs - t.placedTimeMs) <= 3000 && !t.hasFired;

      selPanel.innerHTML = `
        <img src="/assets/tower_${t.familyKey}.jpg" style="width: 38px; height: 38px; border-radius: 6px; border: 1px solid #58a6ff; object-fit: cover;" />
        <div style="font-size:11px;">
          <b style="color:#00f5d4;">${this.game.loader.getFamily(t.familyKey).label}</b>
          ($<span id="sel-total-spent">${t.totalSpent}</span>) | 
          Dmg: <b id="sel-stat-dmg" style="color:#ff5964;">${t.getEffectiveDamage().toFixed(1)}</b> · 
          Rng: <b id="sel-stat-rng" style="color:#58a6ff;">${t.getEffectiveRange().toFixed(0)}</b> · 
          Rate: <b id="sel-stat-rate" style="color:#00ff66;">${t.getEffectiveRate().toFixed(0)}</b>
          <div style="color:#8b949e;font-size:10px;margin-top:2px;">
            📊 Total Dmg: <b style="color:#58a6ff;" id="sel-total-dmg">${Math.floor(t.totalDamageDealt).toLocaleString()}</b> | 
            Kills: <b style="color:#3fb950;" id="sel-total-kills">${t.totalKills}</b>
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="hud-btn" id="btn-up-dmg">Dmg L${t.levels.damage} ($${dmgCost})</button>
          <button class="hud-btn" id="btn-up-rng">Rng L${t.levels.range} ($${rngCost})</button>
          <button class="hud-btn" id="btn-up-rate">Rate L${t.levels.rate} ($${rateCost})</button>
        </div>
        <div style="display:flex;gap:4px;margin-left:auto;">
          <button class="hud-btn" id="btn-cycle-target">Target: ${t.targetingMode}</button>
          <button class="hud-btn" id="btn-cycle-cone">Cone: ${t.coneMode}</button>
          <button class="hud-btn" id="btn-relocate" style="background:#d29922;color:#fff;">Relocate ($${relocCost})</button>
          <button class="hud-btn" id="btn-sell" style="${isUndoEligible ? 'background:#238636;color:#fff;font-weight:bold;' : 'background:#da3633;color:#fff;'}">
            ${isUndoEligible ? `Undo (100% Refund: +$${t.totalSpent})` : `Sell (+$${resale})`}
          </button>
        </div>
      `;

      selPanel.querySelector('#btn-up-dmg')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentDmgCost = this.game.loader.getUpgradeCost(t.familyKey, 'damage', t.levels.damage);
        if (this.game.economyManager.canAfford(currentDmgCost)) {
          soundEngine.playUpgrade();
          this.game.upgradeTower(t, 'damage');
          this.updateSelectionPanel(true);
        }
      });
      selPanel.querySelector('#btn-up-rng')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentRngCost = this.game.loader.getUpgradeCost(t.familyKey, 'range', t.levels.range);
        if (this.game.economyManager.canAfford(currentRngCost)) {
          soundEngine.playUpgrade();
          this.game.upgradeTower(t, 'range');
          this.updateSelectionPanel(true);
        }
      });
      selPanel.querySelector('#btn-up-rate')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentRateCost = this.game.loader.getUpgradeCost(t.familyKey, 'rate', t.levels.rate);
        if (this.game.economyManager.canAfford(currentRateCost)) {
          soundEngine.playUpgrade();
          this.game.upgradeTower(t, 'rate');
          this.updateSelectionPanel(true);
        }
      });
      selPanel.querySelector('#btn-cycle-target')?.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playUIClick();
        const modes: TargetingMode[] = ['near', 'far', 'weak', 'strong', 'slow', 'fast', 'old', 'young'];
        const nextIdx = (modes.indexOf(t.targetingMode) + 1) % modes.length;
        t.targetingMode = modes[nextIdx];
        this.updateSelectionPanel(true);
      });
      selPanel.querySelector('#btn-cycle-cone')?.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playUIClick();
        const cones: ConeMode[] = ['full', 'wide', 'medium', 'narrow'];
        const nextIdx = (cones.indexOf(t.coneMode) + 1) % cones.length;
        t.coneMode = cones[nextIdx];
        this.updateSelectionPanel(true);
      });
      selPanel.querySelector('#btn-relocate')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.game.economyManager.canAfford(relocCost)) {
          soundEngine.playUIClick();
          this.isRelocating = true;
          this.placingFamily = null;
          this.placingModifier = null;
        }
      });
      selPanel.querySelector('#btn-sell')?.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playUIClick();
        this.game.sellTower(t);
        this.updateSelectionPanel(true);
      });
    } else if (this.game.selectedModifier) {
      const m = this.game.selectedModifier;
      selPanel.style.display = 'flex';
      selPanel.style.gap = '12px';
      selPanel.style.alignItems = 'center';

      const resale = Math.floor(m.totalSpent * this.game.loader.constants.resale);
      const relocCost = this.game.economyManager.getRelocateCost(m.data.cost);

      selPanel.innerHTML = `
        <div style="font-size:12px;">
          <b style="color:#ffd166;">${m.name}</b> (Aura: ${m.range}px) | Level ${m.level}
        </div>
        ${
          m.level === 1
            ? `<button class="hud-btn" id="btn-up-mod">Upgrade Aura to 130px ($${m.data.cost})</button>`
            : `<span style="color:#3fb950;font-size:12px;font-weight:bold;">Max Level</span>`
        }
        <div style="display:flex;gap:6px;margin-left:auto;">
          <button class="hud-btn" id="btn-relocate" style="background:#d29922;color:#fff;">Relocate ($${relocCost})</button>
          <button class="hud-btn" id="btn-sell" style="background:#da3633;color:#fff;">Sell (+$${resale})</button>
        </div>
      `;

      selPanel.querySelector('#btn-up-mod')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.game.economyManager.canAfford(m.data.cost)) {
          soundEngine.playUpgrade();
          this.game.economyManager.deduct(m.data.cost);
          m.upgrade();
          this.game.modifierManager.onStructureChanged();
          this.updateSelectionPanel(true);
        }
      });
      selPanel.querySelector('#btn-relocate')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.game.economyManager.canAfford(relocCost)) {
          soundEngine.playUIClick();
          this.isRelocating = true;
          this.placingFamily = null;
          this.placingModifier = null;
        }
      });
      selPanel.querySelector('#btn-sell')?.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEngine.playUIClick();
        this.game.sellModifier(m);
        this.updateSelectionPanel(true);
      });
    } else {
      selPanel.style.display = 'none';
    }
  }

  private syncSelectionPanelValues(): void {
    if (!this.game.selectedTower) return;
    const t = this.game.selectedTower;

    const dmgEl = document.getElementById('sel-stat-dmg');
    if (dmgEl) dmgEl.innerText = t.getEffectiveDamage().toFixed(1);

    const rngEl = document.getElementById('sel-stat-rng');
    if (rngEl) rngEl.innerText = t.getEffectiveRange().toFixed(0);

    const rateEl = document.getElementById('sel-stat-rate');
    if (rateEl) rateEl.innerText = t.getEffectiveRate().toFixed(0);

    const totalDmgEl = document.getElementById('sel-total-dmg');
    if (totalDmgEl) totalDmgEl.innerText = Math.floor(t.totalDamageDealt).toLocaleString();

    const killsEl = document.getElementById('sel-total-kills');
    if (killsEl) killsEl.innerText = t.totalKills.toString();
  }
}
