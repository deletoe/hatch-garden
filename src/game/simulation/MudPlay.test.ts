import { describe, expect, it, vi } from 'vitest';
import { MudPlay } from './MudPlay';
import type { MudPuddle, Pig } from './types';

const bounds = { width: 1280, height: 720, left: 28, right: 1252, top: 70, bottom: 704 };
type Fixture = { puddle: MudPuddle | null; pigs: Array<Pig & { targetX: number; targetY: number }> };
const prepare = (): { play: MudPlay; fixture: Fixture } => {
  const play = new MudPlay(bounds, 123);
  const fixture = play as unknown as Fixture;
  fixture.puddle = { id: 99, x: 640, y: 360, radiusX: 145, radiusY: 64, activatedAt: null };
  Object.assign(fixture.pigs[0], { x: 640, y: 360, targetX: 640, targetY: 360 });
  Object.assign(fixture.pigs[1], { x: 1150, y: 500, targetX: 1150, targetY: 500 });
  return { play, fixture };
};

describe('MudPlay', () => {
  it.each([0, 1])('gives pig %i a 15 percent mud direction while keeping random distance and walking speed', (index) => {
    const { play, fixture } = prepare();
    Object.assign(fixture.pigs[index], { x: 200, y: 360, targetX: 200, targetY: 360 });
    Object.assign(fixture.pigs[1 - index], { x: 1150, y: 600, targetX: 1100, targetY: 650 });
    const random = vi.spyOn(play as unknown as { between(min: number, max: number): number }, 'between');
    random.mockReturnValueOnce(0.149).mockReturnValueOnce(200);
    play.update(0.1, 1);
    const pig = fixture.pigs[index];
    expect(pig.targetX).toBe(400); // The random 200 px segment points toward the 640 px puddle center.
    expect(pig.targetY).toBe(360);
    expect(pig.x).toBeCloseTo(206.2);
    expect(pig.state).toBe('roaming');
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('keeps the original random route in the 85 percent branch, including the 0.15 boundary', () => {
    const { play, fixture } = prepare();
    Object.assign(fixture.pigs[0], { x: 200, y: 360, targetX: 200, targetY: 360 });
    Object.assign(fixture.pigs[1], { targetX: 1100, targetY: 650 });
    const random = vi.spyOn(play as unknown as { between(min: number, max: number): number }, 'between');
    random.mockReturnValueOnce(0.15).mockReturnValueOnce(Math.PI / 2).mockReturnValueOnce(200);
    play.update(0.1, 1);
    expect(fixture.pigs[0].targetX).toBeCloseTo(200);
    expect(fixture.pigs[0].targetY).toBe(560);
    expect(random).toHaveBeenCalledTimes(3);
  });

  it('does not draw a mud chance without a puddle or redirect the current segment', () => {
    const { play, fixture } = prepare();
    Object.assign(fixture.pigs[0], { x: 200, y: 360, targetX: 200, targetY: 360 });
    Object.assign(fixture.pigs[1], { targetX: 1100, targetY: 650 });
    fixture.puddle = null;
    const random = vi.spyOn(play as unknown as { between(min: number, max: number): number }, 'between');
    random.mockReturnValueOnce(Math.PI / 2).mockReturnValueOnce(200);
    play.update(0.1, 1);
    expect(random).toHaveBeenCalledTimes(2);
    random.mockClear();
    fixture.puddle = { id: 99, x: 640, y: 360, radiusX: 145, radiusY: 64, activatedAt: null };
    play.update(0.1, 1.1);
    expect(random).not.toHaveBeenCalled();
    expect(fixture.pigs[0].targetY).toBe(560);
  });

  it('stops a mud-directed segment at the center instead of overshooting, then starts normal mud play on entry', () => {
    const { play, fixture } = prepare();
    Object.assign(fixture.pigs[0], { x: 400, y: 360, targetX: 400, targetY: 360 });
    Object.assign(fixture.pigs[1], { targetX: 1100, targetY: 650 });
    const random = vi.spyOn(play as unknown as { between(min: number, max: number): number }, 'between');
    random.mockReturnValueOnce(0.1).mockReturnValueOnce(300);
    play.update(0.1, 1);
    expect(fixture.pigs[0].targetX).toBe(640);
    for (let tick = 1; tick <= 120; tick++) play.update(1 / 60, 1 + tick / 60);
    expect(play.snapshot().pigs[0].state).toBe('jumping');
    expect(play.snapshot().pigs[1].state).toBe('running');
    expect(play.snapshot().puddle?.activatedAt).not.toBeNull();
  });

  it('keeps an unused puddle inert, then one visitor calls its companion to run over and jump', () => {
    const { play, fixture } = prepare();
    expect(play.isPlayingAt({ x: 640, y: 360 })).toBe(false);
    play.update(1 / 60, 10);
    expect(play.snapshot().puddle?.activatedAt).toBe(10);
    expect(play.snapshot().pigs.map((pig) => pig.state)).toEqual(['jumping', 'running']);
    expect(play.isPlayingAt({ x: 640, y: 360 })).toBe(true);
    const start = play.snapshot().pigs[1].x;
    play.update(0.2, 10.2);
    expect(play.snapshot().pigs[1].x).toBeLessThan(start - 25);
    for (let index = 1; index <= 240; index++) play.update(1 / 60, 10.2 + index / 60);
    expect(play.snapshot().pigs.every((pig) => pig.state === 'jumping')).toBe(true);
    const positions = fixture.pigs.map(({ x, y }) => ({ x, y }));
    play.update(5, 19.2);
    expect(fixture.pigs.map(({ x, y }) => ({ x, y }))).toEqual(positions);
  });

  it('counts 20 seconds from first entry, waits exactly 5 seconds, and replaces only one puddle', () => {
    const { play } = prepare();
    play.update(0, 10);
    play.update(0, 29.99);
    expect(play.snapshot().puddle?.id).toBe(99);
    play.update(0, 30);
    expect(play.snapshot().puddle).toBeNull();
    expect(play.snapshot().pigs.every((pig) => pig.state === 'roaming')).toBe(true);
    play.update(0, 34.99);
    expect(play.snapshot().puddle).toBeNull();
    play.update(0, 35);
    expect(play.snapshot().puddle).not.toBeNull();
    expect(play.snapshot().puddle?.id).not.toBe(99);
    expect(play.snapshot().pigs).toHaveLength(2);
  });

  it('brings a far-away companion into the puddle promptly even in a very wide viewport', () => {
    const { play, fixture } = prepare();
    play.setViewport({ ...bounds, width: 10000, right: 9972 });
    const puddle = play.snapshot().puddle!;
    Object.assign(fixture.pigs[0], { x: puddle.x, y: puddle.y });
    Object.assign(fixture.pigs[1], { x: 9900, y: puddle.y });
    play.update(1 / 60, 10);
    expect(play.snapshot().pigs[1].state).toBe('running');
    for (let index = 1; index <= 180; index++) play.update(1 / 60, 10 + index / 60);
    expect(play.snapshot().pigs[1].state).toBe('jumping');
    expect(play.snapshot().puddle?.activatedAt).toBe(10);
  });

  it('preserves active timer and membership while adapting the puddle shape to portrait and landscape', () => {
    const { play } = prepare();
    play.update(1, 10);
    for (let index = 1; index < 4; index++) play.update(1, 10 + index);
    for (const [width, height] of [[390, 844], [844, 390], [160, 100], [1920, 1080]]) {
      const next = { width, height, left: 10, right: width - 10, top: 30, bottom: height - 10 };
      play.setViewport(next);
      const snapshot = play.snapshot(), puddle = snapshot.puddle!;
      expect(puddle.activatedAt).toBe(10);
      expect(puddle.x - puddle.radiusX).toBeGreaterThanOrEqual(next.left - 1e-8);
      expect(puddle.x + puddle.radiusX).toBeLessThanOrEqual(next.right + 1e-8);
      for (const pig of snapshot.pigs) {
        expect(pig.state).toBe('jumping');
        expect(((pig.x - puddle.x) / puddle.radiusX) ** 2 + ((pig.y - puddle.y) / puddle.radiusY) ** 2).toBeLessThanOrEqual(1 + 1e-8);
      }
    }
  });

  it('keeps exactly two pigs in the viewport through repeated natural play cycles', () => {
    const play = new MudPlay(bounds, 123);
    let activePuddles = 0, lastActive = 0;
    for (let tick = 0; tick < 60 * 600; tick++) {
      play.update(1 / 60, tick / 60);
      if (tick % 60 !== 0) continue;
      const { pigs, puddle } = play.snapshot();
      if (puddle?.activatedAt !== null && puddle && puddle.id !== lastActive) { activePuddles++; lastActive = puddle.id; }
      expect(pigs).toHaveLength(2);
      for (const pig of pigs) {
        expect(pig.x).toBeGreaterThanOrEqual(bounds.left);
        expect(pig.x).toBeLessThanOrEqual(bounds.right);
        expect(pig.y).toBeGreaterThanOrEqual(bounds.top);
        expect(pig.y).toBeLessThanOrEqual(bounds.bottom);
      }
    }
    expect(activePuddles).toBeGreaterThan(1);
    play.restart(0);
    expect(play.snapshot().puddle).toBeNull();
    expect(play.snapshot().pigs.every((pig) => pig.state === 'roaming')).toBe(true);
  });
});
