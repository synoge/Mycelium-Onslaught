import { describe, it, expect } from 'vitest';
import { MultiSystemAccumulator } from '../src/core/ticker';
describe('MultiSystemAccumulator', () => {
    it('produces identical tick counts across 30fps, 60fps, and 144fps over the same duration', () => {
        const durationMs = 10000; // 10 seconds
        // 30 fps (~33.333ms per frame)
        const acc30 = new MultiSystemAccumulator();
        const frameTime30 = 1000 / 30;
        let elapsed30 = 0;
        while (elapsed30 < durationMs) {
            const dt = Math.min(frameTime30, durationMs - elapsed30);
            acc30.advance(dt, {});
            elapsed30 += dt;
        }
        // 60 fps (~16.666ms per frame)
        const acc60 = new MultiSystemAccumulator();
        const frameTime60 = 1000 / 60;
        let elapsed60 = 0;
        while (elapsed60 < durationMs) {
            const dt = Math.min(frameTime60, durationMs - elapsed60);
            acc60.advance(dt, {});
            elapsed60 += dt;
        }
        // 144 fps (~6.944ms per frame)
        const acc144 = new MultiSystemAccumulator();
        const frameTime144 = 1000 / 144;
        let elapsed144 = 0;
        while (elapsed144 < durationMs) {
            const dt = Math.min(frameTime144, durationMs - elapsed144);
            acc144.advance(dt, {});
            elapsed144 += dt;
        }
        const stats30 = acc30.getStats();
        const stats60 = acc60.getStats();
        const stats144 = acc144.getStats();
        expect(stats30.movementTicks).toBe(stats60.movementTicks);
        expect(stats60.movementTicks).toBe(stats144.movementTicks);
        expect(stats30.towerTicks).toBe(stats60.towerTicks);
        expect(stats60.towerTicks).toBe(stats144.towerTicks);
        expect(stats30.spawnTicks).toBe(stats60.spawnTicks);
        expect(stats60.spawnTicks).toBe(stats144.spawnTicks);
    });
    it('caps ticks per frame during a 3-second background pause to avoid spiral of death', () => {
        const acc = new MultiSystemAccumulator();
        let moveTicksCount = 0;
        let towerTicksCount = 0;
        let spawnTicksCount = 0;
        // Simulate single frame after 3000ms freeze
        acc.advance(3000, {
            onMovementTick: () => moveTicksCount++,
            onTowerTick: () => towerTicksCount++,
            onSpawningTick: () => spawnTicksCount++,
        });
        expect(moveTicksCount).toBeLessThanOrEqual(12);
        expect(towerTicksCount).toBeLessThanOrEqual(12);
        expect(spawnTicksCount).toBeLessThanOrEqual(12);
    });
});
