import { BalanceLoader } from '../balance/loader';

export class CodexUI {
  private containerEl: HTMLElement;
  private loader: BalanceLoader;
  private currentTab: 'families' | 'modifiers' | 'enemies' | 'combos' | 'specimens' = 'families';

  constructor(containerEl: HTMLElement, loader: BalanceLoader) {
    this.containerEl = containerEl;
    this.loader = loader;
  }

  public render(): void {
    this.containerEl.innerHTML = `
      <div style="background: rgba(14, 18, 24, 0.97); border: 1px solid rgba(88, 166, 255, 0.3); border-radius: 12px; padding: 26px 30px; max-width: 1100px; width: 95%; max-height: 88vh; overflow-y: auto; color: #c9d1d9; font-family: 'Rajdhani', -apple-system, sans-serif; box-shadow: 0 24px 60px rgba(0,0,0,0.85); backdrop-filter: blur(14px);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 14px; margin-bottom: 18px;">
          <h2 style="margin: 0; color: #00f5d4; font-size: 24px; letter-spacing: 1px;">📖 BIO-HAZARD MYCELIAL CODEX & R&D LAB</h2>
          <button id="btn-close-codex" class="hud-btn" style="padding: 6px 16px; font-size: 13px;">Close (Esc)</button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <button class="codex-tab-btn hud-btn" data-tab="families" style="${this.getTabStyle('families')}">Core Turrets (4)</button>
          <button class="codex-tab-btn hud-btn" data-tab="specimens" style="${this.getTabStyle('specimens')}">✨ Specimen R&D Lab (5)</button>
          <button class="codex-tab-btn hud-btn" data-tab="modifiers" style="${this.getTabStyle('modifiers')}">Support & Apex (10)</button>
          <button class="codex-tab-btn hud-btn" data-tab="enemies" style="${this.getTabStyle('enemies')}">Enemy Dossiers (9)</button>
          <button class="codex-tab-btn hud-btn" data-tab="combos" style="${this.getTabStyle('combos')}">20 Combo Recipes</button>
        </div>

        <div id="codex-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    // Hook tab switches
    this.containerEl.querySelectorAll('.codex-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as any;
        this.currentTab = tab;
        this.render();
      });
    });

    this.containerEl.querySelector('#btn-close-codex')?.addEventListener('click', () => {
      this.containerEl.style.display = 'none';
    });
  }

  private getTabStyle(tab: string): string {
    return this.currentTab === tab
      ? 'background: linear-gradient(180deg, #238636 0%, #196c2e 100%); color: #fff; border-color: #3fb950; font-weight: 700;'
      : 'background: linear-gradient(180deg, #21262d 0%, #161b22 100%); color: #8b949e;';
  }

  private renderTabContent(): string {
    // non-balance: percentage scale factor 100
    const pctScale = 100;

    switch (this.currentTab) {
      case 'families':
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #2de2e6; display: flex; gap: 12px; align-items: center;">
              <img src="/assets/tower_puffball.jpg" style="width: 72px; height: 72px; border-radius: 6px; border: 1px solid #2de2e6; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #2de2e6; font-size: 16px;">Puffball (Cyan) — <i>Calvatia</i></h3>
                <p style="margin: 0; font-size: 12px; color: #8b949e;">Base: $12 · Short range, high rate. High-frequency localized spore bursts and freakout acceleration at Dmg L4 + Rate L4.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #00ff66; display: flex; gap: 12px; align-items: center;">
              <img src="/assets/tower_foxfire.jpg" style="width: 72px; height: 72px; border-radius: 6px; border: 1px solid #00ff66; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #00ff66; font-size: 16px;">Foxfire (Green) — <i>Panellus</i></h3>
                <p style="margin: 0; font-size: 12px; color: #8b949e;">Base: $17 · Medium range, laser beam. Links to adjacent Foxfires for recursive compounding laser chain strikes (+25% power per hop).</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #ff0055; display: flex; gap: 12px; align-items: center;">
              <img src="/assets/tower_artillery.jpg" style="width: 72px; height: 72px; border-radius: 6px; border: 1px solid #ff0055; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #ff0055; font-size: 16px;">Artillery (Red) — <i>Amanita</i></h3>
                <p style="margin: 0; font-size: 12px; color: #8b949e;">Base: $26 · High damage, splash impact. Unlocks Holding Pattern (up to 4 pre-launched orbiting spore mortars) at Range L3 + Rate L3.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #ffaa00; display: flex; gap: 12px; align-items: center;">
              <img src="/assets/tower_cordyceps.jpg" style="width: 72px; height: 72px; border-radius: 6px; border: 1px solid #ffaa00; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #ffaa00; font-size: 16px;">Cordyceps (Yellow) — <i>Ophiocordyceps</i></h3>
                <p style="margin: 0; font-size: 12px; color: #8b949e;">Base: $40 · Long range slow toxin. Inflicts compounding speed reduction divisor (up to 10x slow) and freakout acceleration.</p>
              </div>
            </div>
          </div>
        `;

      case 'specimens':
        return `
          <div style="margin-bottom: 12px; font-size: 13px; color: #ffd166; background: rgba(255, 209, 102, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255, 209, 102, 0.25);">
            🔬 <b>BIO-RESEARCH LAB ARCHIVE:</b> 5 Prospective Fungal Specimen Concepts undergoing containment cultivation.
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #c77dff; display: flex; gap: 14px; align-items: center;">
              <img src="/assets/tower_inky_cap.jpg" style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #c77dff; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #c77dff; font-size: 17px;">1. Inky Cap (Coprinus Void-Mortar)</h3>
                <div style="font-size: 11px; color: #58a6ff; margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;">ROLE: Ground-Denial Void Puddle Generator · ESTIMATED COST: $32</div>
                <p style="margin: 0; font-size: 12px; color: #8b949e; line-height: 1.4;">Auto-digests its cap into pooling dark ink upon impact. Leaves persistent 4-second caustic puddles on the road that dissolve armor and damage passing columns.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #00f5d4; display: flex; gap: 14px; align-items: center;">
              <img src="/assets/tower_polypore.jpg" style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #00f5d4; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #00f5d4; font-size: 17px;">2. Bioluminescent Polypore (Shelf Shield)</h3>
                <div style="font-size: 11px; color: #58a6ff; margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;">ROLE: Tactical Bio-Forcefield & Attack Speed Amplifier · ESTIMATED COST: $45</div>
                <p style="margin: 0; font-size: 12px; color: #8b949e; line-height: 1.4;">Erects a shimmering spherical bio-forcefield that slows fast-moving runners and boosts the firing rate of all adjacent friendly towers by +20%.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #ff5964; display: flex; gap: 14px; align-items: center;">
              <img src="/assets/tower_stinkhorn.jpg" style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #ff5964; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #ff5964; font-size: 17px;">3. Lattice Stinkhorn (Miasma Siphon)</h3>
                <div style="font-size: 11px; color: #58a6ff; margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;">ROLE: Armor-Shredding Aerosol Gas Emitter · ESTIMATED COST: $28</div>
                <p style="margin: 0; font-size: 12px; color: #8b949e; line-height: 1.4;">Hollow crimson lattice sphere venting corrosive green miasma gas. Completely strips natural armor defenses from Wild Boars and Hazmat units.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #e0e1dd; display: flex; gap: 14px; align-items: center;">
              <img src="/assets/tower_ghost_pipe.jpg" style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #e0e1dd; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #e0e1dd; font-size: 17px;">4. Ghost Pipe (Subterranean Energy Leech)</h3>
                <div style="font-size: 11px; color: #58a6ff; margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;">ROLE: Kinetic Siphon & Treasury Booster · ESTIMATED COST: $36</div>
                <p style="margin: 0; font-size: 12px; color: #8b949e; line-height: 1.4;">Translucent subterranean stalk that leeches kinetic velocity from passing runners, converting their speed into raw currency bonus payouts.</p>
              </div>
            </div>

            <div style="background: rgba(22, 27, 34, 0.8); padding: 12px; border-radius: 8px; border-left: 4px solid #38b000; display: flex; gap: 14px; align-items: center;">
              <img src="/assets/tower_lions_mane.jpg" style="width: 80px; height: 80px; border-radius: 6px; border: 1px solid #38b000; object-fit: cover;" />
              <div>
                <h3 style="margin: 0 0 4px 0; color: #38b000; font-size: 17px;">5. Lion's Mane (Neural Cascade Disruptor)</h3>
                <div style="font-size: 11px; color: #58a6ff; margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;">ROLE: Neural Synapse Cascade & Path Reversal · ESTIMATED COST: $52</div>
                <p style="margin: 0; font-size: 12px; color: #8b949e; line-height: 1.4;">Cascading crystalline spines emitting bio-electric lightning arcs that overload biological nervous systems, triggering brief 1-second path reversal staggers.</p>
              </div>
            </div>
          </div>
        `;

      case 'modifiers':
        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${this.loader.modifiers
              .map(
                (m) => `
              <div style="background: rgba(22, 27, 34, 0.8); padding: 10px; border-radius: 6px; border: 1px solid #30363d;">
                <div style="display: flex; justify-content: space-between;">
                  <b style="color: #ffd166;">${m.name}</b>
                  <span style="color: #58a6ff; font-family: 'Share Tech Mono', monospace;">Cost: $${m.cost}</span>
                </div>
                <div style="font-size: 12px; color: #8b949e; margin-top: 4px;">
                  Damage: ${m.damage_mult >= 0 ? '+' : ''}${Math.round(m.damage_mult * pctScale)}% · 
                  Range: ${m.range_added > 0 ? `+${m.range_added}px ` : ''}${m.range_mult >= 0 ? '+' : ''}${Math.round(m.range_mult * pctScale)}% · 
                  Rate: ${m.rate_mult >= 0 ? '+' : ''}${Math.round(m.rate_mult * pctScale)}%
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `;

      case 'enemies':
        return `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${[
              // non-balance: tier 0
              { tier: 0, name: 'Carpenter Ant', desc: 'Fast swarm column unit with baseline HP. Easy prey for Puffball and Foxfire.' },
              // non-balance: tier 1
              { tier: 1, name: 'Ground Beetle', desc: 'Armored carapace, heavy resistance against light single-target attacks.' },
              // non-balance: tier 2
              { tier: 2, name: 'Field Rat', desc: 'Agile scurry, moderate health, tests initial switchback coverage.' },
              // non-balance: tier 3
              { tier: 3, name: 'Crow', desc: 'Swift aerial pathing, bypasses sluggish slow single-target turrets.' },
              // non-balance: tier 4
              { tier: 4, name: 'Fox', desc: 'High velocity runner with bushy tail evasion traits.' },
              // non-balance: tier 5
              { tier: 5, name: 'Wild Boar', desc: 'Massive tusked juggernaut with heavy armor. Requires Cordyceps slow and Artillery mortars.' },
              // non-balance: tier 6
              { tier: 6, name: 'K9 Handler Unit', desc: 'Tactical pair with high endurance and coordinated sprint bursts.' },
              // non-balance: tier 7
              { tier: 7, name: 'Field Researcher', desc: 'Equipped with hazard bio-masks and experimental chemical shielding.' },
              // non-balance: tier 8
              { tier: 8, name: 'Hazmat Containment Trooper', desc: 'Apex biological containment unit with pressurized bio-hazard filters and massive health pool.' },
            ]
              .map(
                (e) => `
              <div style="background: rgba(22, 27, 34, 0.8); padding: 8px 12px; border-radius: 6px; border: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <b style="color: #f0f6fc;">Tier ${e.tier}: ${e.name}</b>
                  <div style="font-size: 12px; color: #8b949e;">${e.desc}</div>
                </div>
                <span style="font-size: 11px; color: #58a6ff; font-family: 'Share Tech Mono', monospace;">Cycle 1–3+ Escalation</span>
              </div>
            `
              )
              .join('')}
          </div>
        `;

      case 'combos':
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${this.loader.combos
              .map(
                (c) => `
              <div style="background: rgba(22, 27, 34, 0.8); padding: 10px; border-radius: 6px; border: 1px solid #30363d;">
                <b style="color: #00f5d4; font-size: 14px;">${c.key.replace(/_/g, ' ').toUpperCase()}</b>
                <div style="font-size: 11px; color: #ffd166; margin-top: 2px;">
                  Lead: <b>${c.lead.toUpperCase()}</b> · Requires: ${Object.entries(c.requires)
                  .map(([col, count]) => `${count}x ${col.toUpperCase()}`)
                  .join(', ')}
                </div>
                <div style="font-size: 11px; color: #8b949e; margin-top: 4px;">
                  Radius: 70px · Bloom Gate: Dmg L8+ · Yield: ${c.yield}x · Cooldown: ${(c.recharge_ms / 1000).toFixed(1)}s
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
    }
  }
}
