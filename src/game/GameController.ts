import { GameSimulation } from './simulation/GameSimulation';
import type { DispatchResult, GameEvent, GameSnapshot } from './simulation/types';
import { AudioController } from './platform/AudioController';
import { LocalSettings, type GameSettings } from './platform/LocalSettings';

export type PauseReason = 'manual' | 'hidden' | 'returning';

export type ControllerState = {
  snapshot: GameSnapshot;
  settings: GameSettings;
  paused: boolean;
  pauseReason: PauseReason | null;
  storageAvailable: boolean;
};

export type UiState = Omit<ControllerState, 'snapshot'> & { score: number };
type StateListener = (state: UiState) => void;

export class GameController {
  private readonly simulation = new GameSimulation();
  private readonly settingsStore = new LocalSettings();
  private readonly audio: AudioController;
  private readonly listeners = new Set<StateListener>();
  private manualPause = false;
  private hidden = false;
  private waitingForResume = false;
  private lastScore = 0;

  constructor() {
    const settings = this.settingsStore.snapshot();
    this.audio = new AudioController(settings.soundEnabled, settings.volume);
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.uiState());
    return () => this.listeners.delete(listener);
  }

  layEgg(): DispatchResult | { accepted: false; reason: 'paused' } {
    if (this.isPaused()) {
      return { accepted: false, reason: 'paused' };
    }
    this.audio.unlock();
    const result = this.simulation.dispatch({ type: 'LAY_EGG' });
    return result;
  }

  restart(): void {
    this.simulation.dispatch({ type: 'RESTART_SESSION' });
    this.publish();
  }

  resizeWorld(width: number, height: number): void {
    this.simulation.setViewport(width, height);
    this.publish();
  }

  advance(dt: number): GameEvent[] {
    if (this.isPaused()) {
      return [];
    }
    this.simulation.update(dt);
    const events = this.simulation.drainEvents();
    this.playEvents(events);
    this.updateBest();
    return events;
  }

  setManualPause(paused: boolean): void {
    this.manualPause = paused;
    if (paused) {
      this.audio.pause();
    } else if (!this.hidden) {
      this.waitingForResume = false;
      this.audio.resume();
    }
    this.publish();
  }

  setDocumentHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) {
      this.audio.pause();
    } else if (!this.manualPause) {
      this.waitingForResume = true;
    }
    this.publish();
  }

  toggleSound(): void {
    const settings = this.settingsStore.snapshot();
    const next = !settings.soundEnabled;
    this.audio.setEnabled(next);
    this.settingsStore.set({ soundEnabled: next });
    this.publish();
  }

  state(): ControllerState {
    return {
      snapshot: this.simulation.snapshot(),
      settings: this.settingsStore.snapshot(),
      paused: this.isPaused(),
      pauseReason: this.pauseReason(),
      storageAvailable: this.settingsStore.isPersistent,
    };
  }

  private uiState(): UiState {
    return {
      score: this.simulation.getScore(),
      settings: this.settingsStore.snapshot(),
      paused: this.isPaused(),
      pauseReason: this.pauseReason(),
      storageAvailable: this.settingsStore.isPersistent,
    };
  }

  isPaused(): boolean {
    return this.manualPause || this.hidden || this.waitingForResume;
  }

  private pauseReason(): PauseReason | null {
    if (this.hidden) {
      return 'hidden';
    }
    if (this.manualPause) {
      return 'manual';
    }
    if (this.waitingForResume) {
      return 'returning';
    }
    return null;
  }

  private playEvents(events: readonly GameEvent[]): void {
    const laidEggs = events.filter((event) => event.type === 'egg-laid');
    if (laidEggs.length > 0) {
      this.audio.play('lay');
      const finalScore = laidEggs.at(-1)?.score;
      if (finalScore !== undefined && finalScore % 4 === 0) {
        this.audio.play('chicken');
      }
    }
    let hatched = false;
    for (const event of events) {
      if (event.type === 'egg-field-filled') {
        this.audio.playReward();
      }
      if (event.type === 'egg-hatched') {
        hatched = true;
      }
      if (event.type === 'session-restarted') {
        this.audio.play('ui');
      }
    }
    if (hatched) this.audio.play('hatch');
  }

  private updateBest(): void {
    const score = this.simulation.getScore();
    if (score === this.lastScore) return;
    this.lastScore = score;
    const settings = this.settingsStore.snapshot();
    if (score > settings.bestSessionEggs) this.settingsStore.set({ bestSessionEggs: score });
    this.publish();
  }

  private publish(): void {
    const state = this.uiState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
