export class Synth {
  private context?: AudioContext;
  enabled = true;
  private lastHit = 0;
  constructor() { try { this.enabled = localStorage.getItem('alchemy-sound') !== 'off'; } catch { /* Storage can be unavailable. */ } }
  unlock() {
    if (!this.enabled) return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  toggle() { this.enabled = !this.enabled; try { localStorage.setItem('alchemy-sound', this.enabled ? 'on' : 'off'); } catch { /* Optional setting. */ } if (this.enabled) this.unlock(); return this.enabled; }
  tone(kind: 'hit' | 'launch' | 'win' | 'hurt' | 'upgrade', combo = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (kind === 'hit' && now - this.lastHit < 0.045) return;
    if (kind === 'hit') this.lastHit = now;
    const notes = kind === 'win' || kind === 'upgrade' ? [440, 554, 659, 880] : [kind === 'hurt' ? 110 : kind === 'launch' ? 320 : 580 + (combo % 12) * 45];
    notes.forEach((f, i) => {
      const oscillator = this.context!.createOscillator(); const gain = this.context!.createGain();
      const start = now + i * 0.08;
      oscillator.type = kind === 'hurt' ? 'triangle' : 'sine'; oscillator.frequency.setValueAtTime(f, start);
      oscillator.frequency.exponentialRampToValueAtTime(f * (kind === 'launch' ? 2 : 0.8), start + 0.15);
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.055, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      oscillator.connect(gain); gain.connect(this.context!.destination); oscillator.start(start); oscillator.stop(start + 0.24);
    });
  }
}
