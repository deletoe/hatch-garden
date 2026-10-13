import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameController } from './GameController';
import { GameSimulation } from './simulation/GameSimulation';
import { MudPlay } from './simulation/MudPlay';
import type { MudPuddle, Pig } from './simulation/types';

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

  it('freezes the mud direction probability during manual and hidden pauses', () => {
    const controller = new GameController();
    controller.advance(30);
    const simulation = (controller as unknown as { simulation: GameSimulation }).simulation;
    const mud = (simulation as unknown as { mudPlay: MudPlay }).mudPlay;
    const fixture = mud as unknown as { puddle: MudPuddle | null; pigs: Array<Pig & { targetX: number; targetY: number }> };
    fixture.puddle = { id: 99, x: 640, y: 360, radiusX: 145, radiusY: 64, activatedAt: null };
    Object.assign(fixture.pigs[0], { x: 200, y: 360, targetX: 200, targetY: 360, state: 'roaming' });
    Object.assign(fixture.pigs[1], { x: 1150, y: 600, targetX: 1100, targetY: 650, state: 'roaming' });
    const random = vi.spyOn(mud as unknown as { between(min: number, max: number): number }, 'between');
    random.mockReturnValueOnce(0.33).mockReturnValueOnce(Math.PI / 2).mockReturnValueOnce(200);
    controller.setManualPause(true);
    controller.advance(900);
    controller.setDocumentHidden(true);
    controller.setManualPause(false);
    controller.advance(900);
    controller.setDocumentHidden(false);
    controller.advance(900); // Returning from the tab still waits for explicit resume.
    expect(random).not.toHaveBeenCalled();
    expect(controller.state().snapshot.time).toBe(30);
    controller.setManualPause(false);
    controller.advance(1 / 60);
    expect(fixture.pigs[0].targetY).toBe(560); // Still about 32.5%, below the 33% roll.
    expect(random).toHaveBeenCalledTimes(3);
  });
});
