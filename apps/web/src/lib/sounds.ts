type SfxName = 'dig' | 'convert' | 'upgrade' | 'hit' | 'claim' | 'ui' | 'error' | 'prestige'

const MUTE_KEY = 'pb_muted'

class SoundBus {
  private ctx: AudioContext | null = null
  muted = localStorage.getItem(MUTE_KEY) === '1'

  private ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setMuted(next: boolean) {
    this.muted = next
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  }

  toggle() {
    this.setMuted(!this.muted)
    return this.muted
  }

  play(name: SfxName) {
    if (this.muted) return
    try {
      const ctx = this.ensure()
      const now = ctx.currentTime
      switch (name) {
        case 'dig':
          this.noiseBurst(ctx, now, 0.04, 0.12, 800, 120)
          this.tone(ctx, now, 180, 0.06, 'triangle', 0.08)
          break
        case 'hit':
          this.tone(ctx, now, 140, 0.08, 'sawtooth', 0.1)
          this.tone(ctx, now + 0.04, 90, 0.12, 'square', 0.06)
          this.noiseBurst(ctx, now, 0.05, 0.15, 400, 80)
          break
        case 'convert':
          this.tone(ctx, now, 520, 0.08, 'sine', 0.07)
          this.tone(ctx, now + 0.07, 780, 0.1, 'sine', 0.06)
          break
        case 'upgrade':
          this.tone(ctx, now, 330, 0.06, 'triangle', 0.06)
          this.tone(ctx, now + 0.06, 440, 0.06, 'triangle', 0.06)
          this.tone(ctx, now + 0.12, 660, 0.1, 'triangle', 0.05)
          break
        case 'claim':
          this.tone(ctx, now, 600, 0.08, 'sine', 0.06)
          this.tone(ctx, now + 0.08, 900, 0.12, 'sine', 0.05)
          break
        case 'prestige':
          this.tone(ctx, now, 220, 0.15, 'sine', 0.08)
          this.tone(ctx, now + 0.12, 330, 0.15, 'sine', 0.07)
          this.tone(ctx, now + 0.24, 440, 0.2, 'sine', 0.06)
          break
        case 'ui':
          this.tone(ctx, now, 480, 0.04, 'sine', 0.04)
          break
        case 'error':
          this.tone(ctx, now, 160, 0.12, 'square', 0.05)
          break
      }
    } catch {
      /* autoplay / unsupported */
    }
  }

  private tone(
    ctx: AudioContext,
    when: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  private noiseBurst(
    ctx: AudioContext,
    when: number,
    dur: number,
    gain: number,
    hp: number,
    lp: number,
  ) {
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = (hp + lp) / 2
    filter.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, when)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(ctx.destination)
    src.start(when)
    src.stop(when + dur + 0.02)
  }
}

export const sfx = new SoundBus()
