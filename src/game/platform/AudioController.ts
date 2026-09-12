import { audioAssets } from '../assets/manifest';

type SoundName = 'chicken' | 'lay' | 'hatch' | 'ui' | 'reward';

const soundVolume: Record<SoundName, number> = {
  chicken: 0.27,
  lay: 0.42,
  hatch: 0.46,
  ui: 0.32,
  reward: 0.7,
};

const voiceLimit: Record<SoundName, number> = { chicken: 1, lay: 2, hatch: 3, ui: 1, reward: 1 };
type Voice = { clip: HTMLAudioElement; busy: boolean; generation: number };

export class AudioController {
  private music: HTMLAudioElement | undefined;
  private enabled: boolean;
  private volume: number;
  private unlocked = false;
  private suspended = false;
  private readonly voices = new Map<SoundName, Voice[]>();

  constructor(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
  }

  unlock(): void {
    this.unlocked = true;
    // Retry a rejected autoplay on the next gesture; an already playing track is reused.
    this.startMusic();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (!enabled) {
      this.stopClips();
      this.music?.pause();
      return;
    }
    this.startMusic();
  }

  play(name: SoundName): void {
    if (!this.enabled || !this.unlocked || this.suspended) {
      return;
    }
    let pool = this.voices.get(name);
    if (!pool) {
      pool = [];
      this.voices.set(name, pool);
    }
    let voice = pool.find((candidate) => !candidate.busy);
    if (!voice && pool.length < voiceLimit[name]) {
      const clip = new Audio(audioAssets[name]);
      clip.preload = 'auto';
      voice = { clip, busy: false, generation: 0 };
      const ownedVoice = voice;
      const release = (): void => { ownedVoice.busy = false; };
      clip.addEventListener('ended', release);
      clip.addEventListener('error', release);
      pool.push(voice);
    }
    if (!voice) return;
    const currentVoice = voice;
    const generation = ++voice.generation;
    voice.busy = true;
    voice.clip.currentTime = 0;
    voice.clip.volume = soundVolume[name] * this.volume;
    void voice.clip.play().catch(() => {
      if (currentVoice.generation === generation) currentVoice.busy = false;
    });
  }

  playReward(): void {
    this.play('reward');
  }

  pause(): void {
    this.suspended = true;
    this.stopClips();
    this.music?.pause();
  }

  resume(): void {
    this.suspended = false;
    this.startMusic();
  }

  private stopClips(): void {
    for (const pool of this.voices.values()) {
      for (const voice of pool) {
        voice.generation++;
        voice.clip.pause();
        voice.clip.currentTime = 0;
        voice.busy = false;
      }
    }
  }

  private startMusic(): void {
    if (!this.enabled || !this.unlocked || this.suspended) {
      return;
    }
    if (!this.music) {
      this.music = new Audio(audioAssets.background);
      this.music.loop = true;
      this.music.preload = 'none';
    }
    this.music.volume = 0.13 * this.volume;
    if (!this.music.paused) return;
    void this.music.play().catch(() => undefined);
  }
}
