import { describe, it, expect } from 'vitest';
import { PRNG } from '../src/core/prng';
describe('PRNG determinism', () => {
    it('produces identical sequences for identical seeds', () => {
        const prng1 = new PRNG(12345);
        const prng2 = new PRNG(12345);
        for (let i = 0; i < 100; i++) {
            expect(prng1.next()).toBe(prng2.next());
            expect(prng1.nextInt(0, 100)).toBe(prng2.nextInt(0, 100));
            expect(prng1.nextFloat(-50, 50)).toBe(prng2.nextFloat(-50, 50));
        }
    });
    it('forks with deterministic independent sequences', () => {
        const root1 = new PRNG(42);
        const root2 = new PRNG(42);
        const child1 = root1.fork();
        const child2 = root2.fork();
        for (let i = 0; i < 50; i++) {
            expect(child1.next()).toBe(child2.next());
        }
    });
});
