import { describe, it, expect } from 'vitest';
import { SpriteRenderer, FAMILY_COLORS } from '../src/render/sprites';

describe('SpriteRenderer & Placeholder Silhouettes (D-01)', () => {
  it('defines distinct family colors and valid color codes', () => {
    expect(FAMILY_COLORS.cyan).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(FAMILY_COLORS.green).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(FAMILY_COLORS.crimson).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(FAMILY_COLORS.amber).toMatch(/^#[0-9a-fA-F]{6}$/);

    // All four family colors must be unique
    const unique = new Set(Object.values(FAMILY_COLORS));
    expect(unique.size).toBe(4);
  });

  it('instantiates renderer successfully without runtime errors', () => {
    const renderer = new SpriteRenderer();
    expect(renderer).toBeDefined();
  });
});
