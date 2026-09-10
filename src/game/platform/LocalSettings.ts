export type GameSettings = {
  schemaVersion: 1;
  bestSessionEggs: number;
  soundEnabled: boolean;
  volume: number;
};

const STORAGE_KEY = 'hatch-garden.settings.v1';

const defaults = (): GameSettings => ({
  schemaVersion: 1,
  bestSessionEggs: 0,
  soundEnabled: true,
  volume: 0.7,
});

const finiteInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

const volume = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;

export class LocalSettings {
  private current: GameSettings;
  private storageAvailable = true;

  constructor() {
    this.current = this.read();
  }

  snapshot(): GameSettings {
    return { ...this.current };
  }

  get isPersistent(): boolean {
    return this.storageAvailable;
  }

  set(patch: Partial<Omit<GameSettings, 'schemaVersion'>>): GameSettings {
    const bestSessionEggs = finiteInteger(patch.bestSessionEggs) ?? this.current.bestSessionEggs;
    const soundEnabled = typeof patch.soundEnabled === 'boolean' ? patch.soundEnabled : this.current.soundEnabled;
    const nextVolume = volume(patch.volume) ?? this.current.volume;
    this.current = { schemaVersion: 1, bestSessionEggs, soundEnabled, volume: nextVolume };
    this.write();
    return this.snapshot();
  }

  private read(): GameSettings {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults();
      }
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return defaults();
      }
      const record = parsed as Record<string, unknown>;
      if (record.schemaVersion !== 1) {
        return defaults();
      }
      return {
        schemaVersion: 1,
        bestSessionEggs: finiteInteger(record.bestSessionEggs) ?? 0,
        soundEnabled: typeof record.soundEnabled === 'boolean' ? record.soundEnabled : true,
        volume: volume(record.volume) ?? 0.7,
      };
    } catch {
      this.storageAvailable = false;
      return defaults();
    }
  }

  private write(): void {
    if (!this.storageAvailable) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      this.storageAvailable = false;
    }
  }
}
