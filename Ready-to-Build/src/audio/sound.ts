// Procedural Web Audio Engine for Mycelium Onslaught (M6 + Option C Tension Escalation)

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  // non-balance: default audio volumes
  private sfxVolume: number = 0.5;
  // non-balance: default audio volumes
  private musicVolume: number = 0.3;
  private ambientOsc: OscillatorNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;
  private isAmbientPlaying: boolean = false;
  private isHighTension: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ambientGain) {
      this.ambientGain.gain.value = muted ? 0 : this.musicVolume;
    }
    if (this.tensionGain) {
      this.tensionGain.gain.value = muted ? 0 : (this.isHighTension ? this.musicVolume * 0.3 : 0);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public startAmbient(): void {
    if (this.isAmbientPlaying || typeof window === 'undefined') return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();

      // Deep hypnotic 55Hz (A1) mycelial drone with subtle LFO
      this.ambientOsc.type = 'sine';
      // non-balance: drone frequency 55Hz
      this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      // non-balance: ambient volume factor
      const ambVol = this.isMuted ? 0 : this.musicVolume * 0.4;
      this.ambientGain.gain.setValueAtTime(ambVol, this.ctx.currentTime);

      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);
      this.ambientOsc.start();

      // Tension sub-oscillator (A2/Eb minor tritone tension)
      this.tensionOsc = this.ctx.createOscillator();
      this.tensionGain = this.ctx.createGain();
      this.tensionOsc.type = 'sawtooth';
      // non-balance: tritone tension frequency 116.54 Hz (Bb2)
      this.tensionOsc.frequency.setValueAtTime(116.54, this.ctx.currentTime);
      this.tensionGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.tensionOsc.connect(this.tensionGain);
      this.tensionGain.connect(this.ctx.destination);
      this.tensionOsc.start();

      this.isAmbientPlaying = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Dynamically modulates ambient audio tension when core is damaged or apex waves arrive (Option C).
   */
  public updateTension(lives: number, tier: number): void {
    // non-balance: low health threshold
    const isCritical = lives <= 3;
    // non-balance: apex tier 8
    const isApex = tier === 8;
    const shouldBeTense = isCritical || isApex;

    if (shouldBeTense !== this.isHighTension) {
      this.isHighTension = shouldBeTense;
      if (this.tensionGain && this.ctx) {
        const targetVol = this.isMuted ? 0 : (shouldBeTense ? this.musicVolume * 0.25 : 0);
        // non-balance: volume ramp time
        this.tensionGain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 1.0);
      }
    }
  }

  public playLaser(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // non-balance: laser frequency sweep start
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    // non-balance: laser frequency sweep end
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.12);

    // non-balance: laser gain envelope
    gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.ctx.currentTime);
    // non-balance: laser decay time
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: laser duration
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public playMortarLaunch(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // non-balance: mortar start frequency
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    // non-balance: mortar end frequency
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);

    // non-balance: mortar gain
    gain.gain.setValueAtTime(this.sfxVolume * 0.4, this.ctx.currentTime);
    // non-balance: mortar decay
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: mortar duration
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playExplosion(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    // non-balance: explosion start frequency
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    // non-balance: explosion end frequency
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.35);

    // non-balance: explosion gain
    gain.gain.setValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime);
    // non-balance: explosion decay
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: explosion duration
    osc.stop(this.ctx.currentTime + 0.35);
  }

  public playComboFlourish(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Harmonic arpeggio chord (C-E-G-C)
    // non-balance: chord frequencies
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      // non-balance: note schedule time
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + index * 0.06);

      // non-balance: note volume
      gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.ctx!.currentTime + index * 0.06);
      // non-balance: note duration
      gain.gain.linearRampToValueAtTime(0.01, this.ctx!.currentTime + index * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      // non-balance: start time
      osc.start(this.ctx!.currentTime + index * 0.06);
      // non-balance: stop time
      osc.stop(this.ctx!.currentTime + index * 0.06 + 0.3);
    });
  }

  public playUpgrade(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // non-balance: upgrade jingle start freq
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    // non-balance: upgrade jingle end freq
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);

    // non-balance: upgrade volume
    gain.gain.setValueAtTime(this.sfxVolume * 0.25, this.ctx.currentTime);
    // non-balance: upgrade decay
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: duration
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playUIClick(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // non-balance: click start freq
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    // non-balance: click end freq
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

    // non-balance: click gain
    gain.gain.setValueAtTime(this.sfxVolume * 0.2, this.ctx.currentTime);
    // non-balance: click decay
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: click duration
    osc.stop(this.ctx.currentTime + 0.04);
  }

  public playCoreBreach(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // non-balance: alarm high tone
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    // non-balance: alarm low tone
    osc.frequency.setValueAtTime(110, this.ctx.currentTime + 0.15);

    // non-balance: alarm volume
    gain.gain.setValueAtTime(this.sfxVolume * 0.5, this.ctx.currentTime);
    // non-balance: alarm decay
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    // non-balance: alarm duration
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const soundEngine = new AudioEngine();
