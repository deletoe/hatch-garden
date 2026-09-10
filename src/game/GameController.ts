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

type StateListener = (state: ControllerState) => void;

export class GameController {
  private readonly simulation = new GameSimulation();
  private readonly settingsStore = new LocalSettings();
  private readonly audio: AudioController;
  private readonly listeners = new Set<StateListener>();
  private manualPause = false;
  private hidden = false;
  private waitingForResume = false;
  private bestWritten = 0;

  constructor() {
    const settings = this.settingsStore.snapshot();
    this.bestWritten = settings.bestSessionEggs;
    this.audio = new AudioController(settings.soundEnabled, settings.volume);
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state());
    return () => this.listeners.delete(listener);
  }

  layEgg(): DispatchResult | { accepted: false; reason: 'paused' } {
    if (this.isPaused()) {
      return { accepted: false, reason: 'paused' };
    }
    this.audio.unlock();
    const result = this.simulation.dispatch({ type: 'LAY_EGG' });
    this.publish();
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
    this.publish();
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

  private isPaused(): boolean {
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
    for (const event of events) {
      if (event.type === 'egg-field-filled') {
        this.audio.playReward();
      }
      if (event.type === 'egg-hatched') {
        this.audio.play('hatch');
      }
      if (event.type === 'session-restarted') {
        this.audio.play('ui');
      }
    }
  }

  private updateBest(): void {
    const score = this.simulation.snapshot().score;
    const settings = this.settingsStore.snapshot();
    if (score <= settings.bestSessionEggs || score === this.bestWritten) {
      return;
    }
    this.bestWritten = score;
    this.settingsStore.set({ bestSessionEggs: score });
  }

  private publish(): void {
    const state = this.state();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
