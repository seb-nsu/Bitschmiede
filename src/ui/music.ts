// 4b.5 Platzhalter-Musik je Epoche (S11 Ton und Musik, UI-R80/R81): ein kleiner WebAudio-Sequenzer spielt Melodie und
// Bass aus data/audio/music.json. Stimmungen ruhig, angespannt, festlich wechseln mit Überblendung (fadeMs).
// UI-R82: Die Musik folgt dem Anzeigemodell; die Simulation kennt keine Klänge.
import music from "../../data/audio/music.json";
import { audioContext } from "./audio";
import { sample } from "./samples";

export type Mood = keyof typeof music.moods;
type EpochId = keyof typeof music.epochs;

const LOOKAHEAD_S = 0.25;
const TICK_MS = 100;

function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

interface Layer { gain: GainNode; epoch: EpochId; mood: Mood; step: number; next: number; track: AudioBufferSourceNode | null }

/** CC0-Musikstück je Epoche und Stimmung (data/audio/music.json „tracks“), sonst null (Sequenzer spielt). */
function trackPath(epoch: EpochId, mood: Mood): string | undefined {
  const t = (music as { tracks?: Record<string, Record<string, string>> }).tracks;
  return t?.[epoch]?.[mood] ?? t?.[epoch]?.ruhig;
}

/** Sequenzer mit einer aktiven Schicht; beim Wechsel blendet die alte aus und die neue ein. */
class MusicPlayer {
  private atmo: { gain: GainNode; src: AudioBufferSourceNode } | null = null;
  private layer: Layer | null = null;
  private timer: number | null = null;
  private volume = 0;
  private atmoVolume = 0;

  update(epoch: string, mood: Mood, volume: number, atmoVolume: number): void {
    const c = audioContext();
    if (!c) return;
    if (c.state === "suspended") void c.resume().catch(() => {});
    const e = (epoch in music.epochs ? epoch : "80") as EpochId;
    this.volume = volume;
    this.setAtmo(c, atmoVolume);
    const fade = music.fadeMs / 1000;
    if (!this.layer || this.layer.epoch !== e || this.layer.mood !== mood) {
      const old = this.layer;
      if (old) {
        old.gain.gain.cancelScheduledValues(c.currentTime);
        old.gain.gain.setValueAtTime(old.gain.gain.value, c.currentTime);
        old.gain.gain.linearRampToValueAtTime(0, c.currentTime + fade);
        window.setTimeout(() => old.gain.disconnect(), music.fadeMs + 500);
      }
      const gain = c.createGain();
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(volume, c.currentTime + (old ? fade : 0.5));
      gain.connect(c.destination);
      this.layer = { gain, epoch: e, mood, step: old?.step ?? 0, next: c.currentTime + 0.05, track: null };
      if (old?.track) {
        const t = old.track;
        window.setTimeout(() => t.stop(), music.fadeMs + 500);
      }
    } else {
      this.layer.gain.gain.setTargetAtTime(volume, c.currentTime, 0.3);
    }
    this.startTrack(c);
    this.timer ??= window.setInterval(() => this.schedule(), TICK_MS);
  }

  /** Startet das Musikstück der Schicht, sobald es geladen ist; bis dahin spielt der Sequenzer. */
  private startTrack(c: AudioContext): void {
    const l = this.layer;
    if (!l || l.track) return;
    const buf = sample(c, trackPath(l.epoch, l.mood));
    if (!buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // Stücke sind auf etwa -18 LUFS normiert; trackGain gleicht sie an den leisen Sequenzer an.
    const g = c.createGain();
    g.gain.value = (music as { trackGain?: number }).trackGain ?? 1;
    src.connect(g).connect(l.gain);
    src.start();
    l.track = src;
  }

  stop(): void {
    const c = audioContext();
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (c && this.layer) {
      const g = this.layer.gain;
      g.gain.setTargetAtTime(0, c.currentTime, 0.2);
      window.setTimeout(() => g.disconnect(), 1500);
    }
    if (this.layer?.track) {
      const t = this.layer.track;
      window.setTimeout(() => t.stop(), 1500);
    }
    this.layer = null;
    if (this.atmo) {
      this.atmo.src.stop();
      this.atmo.gain.disconnect();
      this.atmo = null;
    }
  }

  private setAtmo(c: AudioContext, v: number): void {
    this.atmoVolume = v;
    if (v <= 0) {
      if (this.atmo) this.atmo.gain.gain.setTargetAtTime(0, c.currentTime, 0.3);
      return;
    }
    if (!this.atmo) {
      // Atmosphäre: leises Bürorauschen (gefiltertes Rauschen) als Grundton der Bühne.
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = music.atmo.filterHz;
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      this.atmo = { gain, src };
    }
    this.atmo.gain.gain.setTargetAtTime(this.atmoVolume * music.atmo.gain, c.currentTime, 0.5);
  }

  private schedule(): void {
    const c = audioContext();
    const l = this.layer;
    if (!c || !l || this.volume <= 0) return;
    this.startTrack(c);
    if (l.track) return;
    const ep = music.epochs[l.epoch];
    const mood = music.moods[l.mood];
    const stepS = 60 / ((ep.bpm * mood.tempoPct) / 100) / 2;
    while (l.next < c.currentTime + LOOKAHEAD_S) {
      const m = ep.melody[l.step % ep.melody.length]!;
      const b = l.step % 2 === 0 ? ep.bassline[(l.step >> 1) % ep.bassline.length]! : 0;
      if (m > 0) this.note(c, l.gain, ep.lead as OscillatorType, hz(m + mood.transpose), l.next, stepS * 0.9, (music.gain * mood.leadGain) / 100);
      if (b > 0) this.note(c, l.gain, ep.bass as OscillatorType, hz(b + mood.transpose), l.next, stepS * 1.8, music.gain * 0.9);
      l.step++;
      l.next += stepS;
    }
  }

  private note(c: AudioContext, dest: GainNode, type: OscillatorType, freq: number, t0: number, dur: number, peak: number): void {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

export const player = new MusicPlayer();
