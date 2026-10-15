import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';
import { worldScaleFor } from './viewport';

describe('responsive world density', () => {
  it.each([[390, 844, 390 / 720], [1280, 720, 1], [1920, 1080, 1], [2560, 1440, 4 / 3], [3840, 2160, 2]])('scales %i by %i without capping large scenes at one', (width, height, scale) => {
    expect(worldScaleFor(width, height)).toBeCloseTo(scale);
    expect(worldScaleFor(height, width)).toBeCloseTo(scale);
  });

  it.each([[1920, 1080], [2560, 1440], [3840, 2160], [2160, 3840], [3440, 1440]])('still fills the whole %i by %i field and accepts a partial final batch', (width, height) => {
    const simulation = new GameSimulation(4);
    simulation.setViewport(width, height);
    type AdultFixture = { id: number; pose: string };
    const fixture = simulation as unknown as {
      adults: AdultFixture[];
      createAdult(x: number, y: number): AdultFixture;
      world: { left: number; right: number; top: number; bottom: number };
    };
    for (let index = fixture.adults.length; index < 1200; index++) fixture.adults.push(fixture.createAdult(width / 2, height / 2));
    expect(simulation.dispatch({ type: 'LAY_EGG' }).accepted).toBe(true);
    const eggs = simulation.snapshot().eggs, events = simulation.drainEvents();
    expect(eggs.length).toBeGreaterThan(300);
    expect(eggs.length).toBeLessThan(600);
    expect(fixture.adults.filter((adult) => adult.pose === 'lay')).toHaveLength(eggs.length);
    expect(events.filter((event) => event.type === 'egg-field-filled')).toHaveLength(1);
    const spacing = 52 * worldScaleFor(width, height);
    expect(Math.min(...eggs.map((egg) => egg.x))).toBeLessThanOrEqual(fixture.world.left + spacing);
    expect(Math.max(...eggs.map((egg) => egg.x))).toBeGreaterThanOrEqual(fixture.world.right - spacing);
    expect(Math.min(...eggs.map((egg) => egg.y))).toBeLessThanOrEqual(fixture.world.top + spacing);
    expect(Math.max(...eggs.map((egg) => egg.y))).toBeGreaterThanOrEqual(fixture.world.bottom - spacing);
    for (let index = 0; index < eggs.length; index++) {
      for (let other = index + 1; other < eggs.length; other++) {
        expect(Math.hypot(eggs[index].x - eggs[other].x, eggs[index].y - eggs[other].y)).toBeGreaterThanOrEqual(spacing - 1e-8);
      }
    }
    simulation.update(0.21);
    expect(simulation.dispatch({ type: 'LAY_EGG' })).toEqual({ accepted: false, reason: 'no-space' });
    expect(simulation.snapshot().eggs).toHaveLength(eggs.length);
  });

  it('keeps walking and departure speed proportional when the whole world doubles', () => {
    const normal = new GameSimulation(123), large = new GameSimulation(123);
    normal.setViewport(1920, 1080); large.setViewport(3840, 2160);
    normal.dispatch({ type: 'RESTART_SESSION' }); large.dispatch({ type: 'RESTART_SESSION' });
    for (let index = 0; index < 120; index++) { normal.update(1 / 60); large.update(1 / 60); }
    const first = normal.snapshot().adults[0], second = large.snapshot().adults[0];
    expect(second.x).toBeCloseTo(first.x * 2);
    expect(second.y).toBeCloseTo(first.y * 2);
  });
});
