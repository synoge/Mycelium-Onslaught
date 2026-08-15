import { describe, it, expect } from 'vitest';
import { VFXEngine } from '../src/render/vfx';

describe('VFX and Particle Engine (M4)', () => {
  it('spawns and decays particles over time', () => {
    const vfx = new VFXEngine();
    vfx.spawnParticleBurst(100, 100, 10, ['#ffffff', '#ff0000']);
    expect(vfx['particles'].length).toBe(10);

    // Step 500ms
    vfx.update(500);
    expect(vfx['particles'].every((p) => p.alpha <= 1.0)).toBe(true);

    // Step 1000ms more (total 1500ms > particle max life)
    vfx.update(1000);
    expect(vfx['particles'].length).toBe(0);
  });

  it('spawns shockwaves and lasers correctly', () => {
    const vfx = new VFXEngine();
    vfx.spawnShockwave(50, 50, 80, '#00ff66', 3, 300);
    expect(vfx['shockwaves'].length).toBe(1);

    vfx.spawnLaserBeam(10, 10, 100, 100, '#00ff66', 3, [{ x: 50, y: 50 }]);
    expect(vfx['lasers'].length).toBe(1);

    // Step 400ms -> shockwaves and lasers should fade
    vfx.update(400);
    expect(vfx['shockwaves'].length).toBe(0);
    expect(vfx['lasers'].length).toBe(0);
  });

  it('handles screen shake impulses and decay', () => {
    const vfx = new VFXEngine();
    vfx.addScreenShake(10);
    expect(vfx.screenShakeAmount).toBe(10);

    vfx.update(200);
    expect(vfx.screenShakeAmount).toBeLessThan(10);
  });

  it('triggers specialized combo VFX for all major combo types', () => {
    const vfx = new VFXEngine();
    vfx.triggerComboVFX('fruiting_detonation', 200, 200);
    expect(vfx['shockwaves'].length).toBeGreaterThan(0);
    expect(vfx['particles'].length).toBeGreaterThan(0);
    expect(vfx['floatingTexts'].length).toBeGreaterThan(0);

    vfx.triggerComboVFX('mycelial_sinkhole', 200, 200);
    vfx.triggerComboVFX('enzymatic_burn', 200, 200);
    vfx.triggerComboVFX('cordyceps_cloud', 200, 200);
    vfx.triggerComboVFX('spore_shockwave', 200, 200);
    vfx.triggerComboVFX('heavy_bloom_cannon', 200, 200);

    expect(vfx['floatingTexts'].length).toBe(6);
  });
});
