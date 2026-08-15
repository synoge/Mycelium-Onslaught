import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BalanceLoader } from '../src/balance/loader';
import { loadAllMaps, MapDataRaw } from '../src/map/map';
import { GameShell } from '../src/ui/shell';
import { CodexUI } from '../src/ui/codex';
import { RawBalanceJSON } from '../src/interfaces';

describe('Shell & Codex (M5)', () => {
  const balancePath = path.resolve(process.cwd(), 'data/balance.json');
  const rawBalance: RawBalanceJSON = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));
  const loader = new BalanceLoader(rawBalance);

  const mapsPath = path.resolve(process.cwd(), 'data/maps.json');
  const rawMaps: Record<string, MapDataRaw> = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const allMaps = loadAllMaps(rawMaps);

  it('manages screens and difficulty selections', () => {
    // Mock container
    const mockEl = {
      style: {} as any,
      innerHTML: '',
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    let startedMap = '';
    let startedDiff = '';

    const shell = new GameShell(mockEl, allMaps, {
      onStartGame: (m, d) => { startedMap = m; startedDiff = d; },
      onOpenCodex: () => {},
      onToggleSound: () => false,
      onSetSpeed: () => {},
      onRestart: () => {},
    });

    expect(shell.currentScreen).toBe('title');
    shell.showScreen('map_select');
    expect(shell.currentScreen).toBe('map_select');
    shell.showScreen('game_over');
    expect(shell.currentScreen).toBe('game_over');
  });

  it('renders codex tabs without error', () => {
    const mockEl = {
      innerHTML: '',
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const codex = new CodexUI(mockEl, loader);
    codex.render();
    expect(mockEl.innerHTML).toContain('MYCELIAL CODEX');
  });
});
