/**
 * 文件模块：程序合成音效（WebAudio），不依赖任何音频文件。
 * 约束：AudioContext 必须在用户手势里创建/恢复（浏览器自动播放策略），所以 unlock() 由 pointerdown 触发。
 *       静音状态持久化到 localStorage，重开游戏保持。
 */
export type SfxName =
  | 'click'
  | 'launch'
  | 'hit'
  | 'crit'
  | 'fire'
  | 'zap'
  | 'split'
  | 'refresh'
  | 'wall'
  | 'drop'
  | 'settle'
  | 'enemyHurt'
  | 'enemyDie'
  | 'playerHurt'
  | 'upgrade'
  | 'heal'
  | 'win'
  | 'lose'
  | 'pause';

const STORAGE_KEY = 'marble-alchemy:muted';

interface ToneOpts {
  freq: number;
  endFreq?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  delay?: number;
}

interface NoiseOpts {
  dur: number;
  gain?: number;
  filter?: BiquadFilterType;
  freq?: number;
  endFreq?: number;
  delay?: number;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted: boolean;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    this.muted = stored === '1';
  }

  /** 在用户手势内调用：创建并恢复 AudioContext。 */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem(STORAGE_KEY, m ? '1' : '0');
    } catch {
      /* 无 localStorage 时忽略 */
    }
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.02);
    }
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name: SfxName, arg = 0): void {
    if (this.muted || !this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    switch (name) {
      case 'click':
        this.tone({ freq: 900, endFreq: 640, dur: 0.06, type: 'triangle', gain: 0.12 });
        break;
      case 'launch':
        this.noise({ dur: 0.18, gain: 0.12, filter: 'bandpass', freq: 900, endFreq: 2400 });
        this.tone({ freq: 320, endFreq: 980, dur: 0.14, type: 'sine', gain: 0.1 });
        break;
      case 'hit': {
        const step = Math.min(14, Math.max(0, arg));
        const f = 523 * Math.pow(2, step / 12);
        this.tone({ freq: f, endFreq: f * 0.97, dur: 0.09, type: 'triangle', gain: 0.16 });
        this.noise({ dur: 0.03, gain: 0.05, filter: 'highpass', freq: 3000 });
        break;
      }
      case 'crit':
        this.tone({ freq: 880, endFreq: 1760, dur: 0.12, type: 'square', gain: 0.08 });
        this.tone({ freq: 1320, dur: 0.16, type: 'triangle', gain: 0.12, delay: 0.03 });
        this.noise({ dur: 0.08, gain: 0.08, filter: 'highpass', freq: 2500 });
        break;
      case 'fire':
        this.noise({ dur: 0.14, gain: 0.1, filter: 'lowpass', freq: 900, endFreq: 300 });
        this.tone({ freq: 220, endFreq: 120, dur: 0.12, type: 'sawtooth', gain: 0.05 });
        break;
      case 'zap':
        this.noise({ dur: 0.07, gain: 0.1, filter: 'highpass', freq: 1800 });
        this.tone({ freq: 1900, endFreq: 380, dur: 0.09, type: 'square', gain: 0.07 });
        break;
      case 'split':
        this.tone({ freq: 620, dur: 0.05, type: 'triangle', gain: 0.12 });
        this.tone({ freq: 830, dur: 0.05, type: 'triangle', gain: 0.12, delay: 0.05 });
        this.tone({ freq: 1040, dur: 0.07, type: 'triangle', gain: 0.12, delay: 0.1 });
        break;
      case 'refresh':
        this.tone({ freq: 523, dur: 0.1, type: 'sine', gain: 0.14 });
        this.tone({ freq: 659, dur: 0.1, type: 'sine', gain: 0.14, delay: 0.08 });
        this.tone({ freq: 784, dur: 0.16, type: 'sine', gain: 0.14, delay: 0.16 });
        break;
      case 'wall':
        this.tone({ freq: 190, endFreq: 150, dur: 0.05, type: 'sine', gain: 0.07 });
        break;
      case 'drop':
        this.tone({ freq: 420, endFreq: 140, dur: 0.16, type: 'sine', gain: 0.1 });
        break;
      case 'settle':
        this.noise({ dur: 0.28, gain: 0.25, filter: 'lowpass', freq: 500, endFreq: 120 });
        this.tone({ freq: 120, endFreq: 55, dur: 0.32, type: 'sine', gain: 0.3 });
        break;
      case 'enemyHurt':
        this.tone({ freq: 210, endFreq: 90, dur: 0.22, type: 'sawtooth', gain: 0.12 });
        this.noise({ dur: 0.12, gain: 0.1, filter: 'lowpass', freq: 1200 });
        break;
      case 'enemyDie':
        this.tone({ freq: 640, endFreq: 50, dur: 0.7, type: 'sawtooth', gain: 0.12 });
        this.noise({ dur: 0.55, gain: 0.18, filter: 'lowpass', freq: 1600, endFreq: 100 });
        break;
      case 'playerHurt':
        this.tone({ freq: 160, endFreq: 65, dur: 0.32, type: 'square', gain: 0.12 });
        this.noise({ dur: 0.22, gain: 0.15, filter: 'lowpass', freq: 700 });
        break;
      case 'upgrade':
        [660, 880, 1100, 1320].forEach((f, i) => this.tone({ freq: f, dur: 0.1, type: 'triangle', gain: 0.12, delay: i * 0.07 }));
        break;
      case 'heal':
        this.tone({ freq: 523, endFreq: 660, dur: 0.18, type: 'sine', gain: 0.12 });
        this.tone({ freq: 784, endFreq: 1046, dur: 0.24, type: 'sine', gain: 0.12, delay: 0.12 });
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) =>
          this.tone({ freq: f, dur: i === 6 ? 0.5 : 0.16, type: 'triangle', gain: 0.14, delay: i * 0.14 }),
        );
        break;
      case 'lose':
        [440, 370, 311, 220].forEach((f, i) => this.tone({ freq: f, endFreq: f * 0.94, dur: 0.3, type: 'sawtooth', gain: 0.07, delay: i * 0.24 }));
        break;
      case 'pause':
        this.tone({ freq: 520, dur: 0.07, type: 'triangle', gain: 0.1 });
        this.tone({ freq: 400, dur: 0.09, type: 'triangle', gain: 0.1, delay: 0.08 });
        break;
    }
  }

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.endFreq), t0 + o.dur);
    const gain = o.gain ?? 0.15;
    const attack = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  private noise(o: NoiseOpts): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? 'lowpass';
    filter.frequency.setValueAtTime(o.freq ?? 1000, t0);
    if (o.endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.endFreq), t0 + o.dur);
    const g = ctx.createGain();
    const gain = o.gain ?? 0.1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }
}
