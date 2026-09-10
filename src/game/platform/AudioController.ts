import { audioAssets } from '../assets/manifest';

type SoundName = 'chicken' | 'lay' | 'hatch' | 'ui' | 'reward';

const soundVolume: Record<SoundName, number> = {
  chicken: 0.27,
  lay: 0.42,
  hatch: 0.46,
  ui: 0.32,
  reward: 0.7,
};

export class AudioController {
  private music: HTMLAudioElement | undefined;
  private enabled: boolean;
  private volume: number;
  private unlocked = false;
  private resumeMusic = false;
  private readonly activeClips = new Set<HTMLAudioElement>();

  constructor(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
  }

  unlock(): void {
    this.unlocked = true;
    this.startMusic();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    if (this.enabled) {
      this.play('ui');
    }
    this.enabled = enabled;
    if (!enabled) {
      this.pause();
      return;
    }
    this.resume();
  }

  play(name: SoundName): void {
    if (!this.enabled || !this.unlocked || this.activeClips.size >= 6) {
      return;
    }
    const clip = new Audio(audioAssets[name]);
    clip.preload = 'auto';
    clip.volume = soundVolume[name] * this.volume;
    const release = (): void => {
      this.activeClips.delete(clip);
    };
    clip.addEventListener('ended', release, { once: true });
    clip.addEventListener('error', release, { once: true });
    this.activeClips.add(clip);
    void clip.play().catch(() => release());
  }

  playReward(): void {
    this.play('reward');
  }

  pause(): void {
    for (const clip of this.activeClips) {
      clip.pause();
    }
    this.activeClips.clear();
    if (this.music && !this.music.paused) {
      this.resumeMusic = true;
      this.music.pause();
    }
  }

  resume(): void {
    if (!this.enabled || !this.unlocked || !this.resumeMusic) {
      return;
    }
    this.startMusic();
  }

  private startMusic(): void {
    if (!this.enabled || !this.unlocked) {
      return;
    }
    if (!this.music) {
      this.music = new Audio(audioAssets.background);
      this.music.loop = true;
      this.music.preload = 'none';
    }
    this.music.volume = 0.13 * this.volume;
    this.resumeMusic = false;
    void this.music.play().catch(() => undefined);
  }
}
