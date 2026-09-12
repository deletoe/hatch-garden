import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController } from './GameController';
import { GameSimulation } from './simulation/GameSimulation';

vi.mock('./platform/AudioController', () => ({
  AudioController: class {
    unlock() {} play() {} playReward() {} pause() {} resume() {} setEnabled() {}
  },
}));

beforeEach(() => vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: vi.fn() } }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('GameController performance and pause lifecycle', () => {
  it('does not copy entities or publish unchanged HUD state during idle frames', () => {
    const snapshots = vi.spyOn(GameSimulation.prototype, 'snapshot');
    const controller = new GameController();
    const listener = vi.fn();
    controller.subscribe(listener);
    for (let index = 0; index < 120; index++) controller.advance(1 / 60);
    expect(snapshots).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    controller.layEgg();
    controller.advance(1 / 60);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.lastCall?.[0].score).toBe(1);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('freezes entities while paused and requires explicit resume after returning from a hidden tab', () => {
    const controller = new GameController();
    controller.layEgg();
    controller.advance(1 / 60);
    const before = controller.state().snapshot;
    controller.setManualPause(true);
    controller.setDocumentHidden(true);
    controller.advance(900);
    controller.setDocumentHidden(false);
    expect(controller.state().pauseReason).toBe('manual');
    expect(controller.layEgg()).toEqual({ accepted: false, reason: 'paused' });
    expect(controller.state().snapshot).toBe(before);
    controller.setManualPause(false);
    controller.advance(1 / 60);
    expect(controller.state().snapshot.time - before.time).toBeCloseTo(1 / 60);
    controller.setDocumentHidden(true);
    controller.setDocumentHidden(false);
    expect(controller.state().pauseReason).toBe('returning');
    expect(controller.isPaused()).toBe(true);
  });
});
