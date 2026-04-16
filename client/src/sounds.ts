type OscType = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscType = 'sine',
    vol = 0.25,
    delay = 0,
  ) {
    if (this.muted) return;
    const ctx = this.getCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  /** Short ding when a word is revealed in the article */
  playRevealed() {
    this.tone(880, 0.12, 'sine', 0.2);
    this.tone(1100, 0.18, 'sine', 0.15, 0.08);
  }

  /** Low thud when a guess is not found */
  playNotFound() {
    this.tone(160, 0.25, 'triangle', 0.2);
    this.tone(140, 0.18, 'sawtooth', 0.08, 0.06);
  }

  /** Victory fanfare when YOU find the target word */
  playWin() {
    const chord = [440, 554, 659, 880];
    chord.forEach((f, i) => this.tone(f, 0.35, 'sine', 0.22, i * 0.1));
  }

  /** Subtle chime when another player reveals a word */
  playOtherRevealed() {
    this.tone(660, 0.1, 'sine', 0.12);
  }

  /** "Too common" soft buzz */
  playTooCommon() {
    this.tone(300, 0.15, 'square', 0.1);
  }

  /** Warm ascending hint when a guess is close to an article word */
  playClose() {
    this.tone(440, 0.1, 'sine', 0.16);
    this.tone(554, 0.14, 'sine', 0.13, 0.09);
  }

  toggle(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sounds = new SoundEngine();

/** Derive a proximity-based color (blue = cold → red = hot) */
export function proximityColor(score: number): string {
  // Hue goes from 240 (blue/cold) → 0 (red/hot)
  const hue = Math.round(240 - score * 240);
  const sat = Math.round(65 + score * 25);       // 65–90 %
  const lit = Math.round(55 - score * 10);        // 45–55 %
  const alpha = 0.45 + score * 0.45;              // 0.45–0.9
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
}

/** Color for proximity placeholder text: vivid warm when close, grey when far */
export function proximityTextColor(score: number): string {
  // High score → bright amber/orange, low score → muted grey
  const hue = 35; // warm amber
  const sat = Math.round(score * 90);        // 0–90 %
  const lit = Math.round(45 + score * 25);   // 45–70 %
  const alpha = 0.3 + score * 0.55;          // 0.3–0.85
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
}
