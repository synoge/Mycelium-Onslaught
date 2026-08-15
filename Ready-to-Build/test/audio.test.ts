import { describe, it, expect } from 'vitest';
import { AudioEngine } from '../src/audio/sound';

describe('Web Audio Engine (M6)', () => {
  it('manages mute states and volume toggles', () => {
    const audio = new AudioEngine();
    expect(audio.toggleMute()).toBe(true);
    expect(audio.toggleMute()).toBe(false);

    audio.setMuted(true);
    // Should not throw or crash when muted
    audio.playLaser();
    audio.playExplosion();
    audio.playComboFlourish();
    audio.playUpgrade();
    audio.playUIClick();
    audio.playCoreBreach();
  });
});
