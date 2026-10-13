import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';
import type { Adult, Chick, MudPuddle, Pig } from './types';

type Fixture = {
  adults: Array<Adult & { targetX: number; targetY: number }>;
  chicks: Array<Chick & { targetX: number; targetY: number; hatchClock: number }>;
  mudPlay: { puddle: MudPuddle | null; pigs: Array<Pig & { targetX: number; targetY: number }> };
};
const advance = (simulation: GameSimulation, seconds: number): void => {
  for (let remaining = seconds; remaining > 1e-8; remaining -= 1 / 60) simulation.update(Math.min(remaining, 1 / 60));
};
const prepare = (): { simulation: GameSimulation; fixture: Fixture } => {
  const simulation = new GameSimulation(1);
  simulation.dispatch({ type: 'LAY_EGG' });
  advance(simulation, 5.5);
  const fixture = simulation as unknown as Fixture;
  fixture.mudPlay.puddle = { id: 99, x: 640, y: 360, radiusX: 145, radiusY: 64, activatedAt: null };
  for (const [index, pig] of fixture.mudPlay.pigs.entries()) Object.assign(pig, { state: 'roaming', x: index ? 1150 : 100, y: 600, targetX: index ? 1150 : 100, targetY: 600 });
  for (const entity of [...fixture.adults, ...fixture.chicks]) Object.assign(entity, { x: 640, y: 360, targetX: 800, targetY: 360 });
  fixture.chicks[0].hatchClock = 0;
  return { simulation, fixture };
};
const activate = (simulation: GameSimulation, fixture: Fixture): void => {
  Object.assign(fixture.mudPlay.pigs[0], { x: 640, y: 360, targetX: 640, targetY: 360 });
  simulation.update(1 / 60);
};

describe('Chicken and mud interaction', () => {
  it('lets chickens cross inactive mud but freezes only chickens inside playing mud', () => {
    const { simulation, fixture } = prepare();
    simulation.update(0.5);
    expect(simulation.snapshot().adults[0].x).toBeGreaterThan(640);
    expect(simulation.snapshot().chicks[0].x).toBeGreaterThan(640);
    expect(simulation.snapshot().adults[0].jumping).toBe(false);
    expect(simulation.snapshot().chicks[0].jumping).toBe(false);
    activate(simulation, fixture);
    const before = simulation.snapshot();
    expect(before.adults[0].jumping).toBe(true);
    expect(before.chicks[0].jumping).toBe(true);
    advance(simulation, 1);
    expect(simulation.snapshot().adults[0].x).toBe(before.adults[0].x);
    expect(simulation.snapshot().chicks[0].x).toBe(before.chicks[0].x);
    expect(simulation.snapshot().chicks[0].age).toBeCloseTo(before.chicks[0].age + 1);
  });

  it('grows a jumping chick into a jumping mother, keeps egg placement, and defers departures', () => {
    const { simulation, fixture } = prepare();
    fixture.chicks[0].age = 7.95;
    activate(simulation, fixture);
    simulation.update(0.1);
    expect(simulation.snapshot().chicks).toHaveLength(0);
    expect(simulation.snapshot().adults).toHaveLength(2);
    expect(simulation.snapshot().adults.every((adult) => adult.jumping)).toBe(true);
    const mothers = simulation.snapshot().adults;
    const result = simulation.dispatch({ type: 'LAY_EGG' });
    expect(result.accepted).toBe(true);
    expect(simulation.snapshot().eggs).toHaveLength(2);
    for (const egg of simulation.snapshot().eggs) expect(mothers.some((mother) => mother.id === egg.sourceAdultId)).toBe(true);
    simulation.drainEvents();
    advance(simulation, 10);
    expect(simulation.snapshot().adults.every((adult) => adult.state === 'roaming' && adult.jumping)).toBe(true);
    expect(simulation.drainEvents().some((event) => event.type === 'adult-exiting')).toBe(false);
    const before = simulation.snapshot();
    const first = before.adults[0];
    advance(simulation, 10);
    expect(simulation.snapshot().puddle).toBeNull();
    expect(simulation.snapshot().adults.every((adult) => !adult.jumping)).toBe(true);
    expect(simulation.snapshot().adults.find((adult) => adult.id === first.id)?.x).not.toBe(first.x);
  });

  it('holds an already departing hen in active mud and lets it lay before resuming its exit', () => {
    const { simulation, fixture } = prepare();
    Object.assign(fixture.adults[0], { state: 'exiting', targetX: 1600, targetY: 360 });
    activate(simulation, fixture);
    const mother = simulation.snapshot().adults[0];
    expect(mother.jumping).toBe(true);
    expect(simulation.dispatch({ type: 'LAY_EGG' }).accepted).toBe(true);
    advance(simulation, 19.9);
    expect(simulation.snapshot().adults.find((adult) => adult.id === mother.id)?.x).toBe(mother.x);
    advance(simulation, 0.2);
    const resumed = simulation.snapshot().adults.find((adult) => adult.id === mother.id)!;
    expect(resumed.jumping).toBe(false);
    expect(resumed.state).toBe('exiting');
    expect(resumed.x).toBeGreaterThan(mother.x);
  });

  it('keeps jumping membership through resizing, and clears all play state on restart', () => {
    const { simulation, fixture } = prepare();
    activate(simulation, fixture);
    const activatedAt = simulation.snapshot().puddle!.activatedAt;
    for (const [width, height] of [[390, 844], [844, 390], [160, 100], [1280, 720]]) {
      simulation.setViewport(width, height);
      simulation.update(1 / 60);
      const snapshot = simulation.snapshot(), puddle = snapshot.puddle!;
      expect(puddle.activatedAt).toBe(activatedAt);
      for (const entity of [...snapshot.adults, ...snapshot.chicks]) {
        expect(entity.jumping).toBe(true);
        expect(((entity.x - puddle.x) / puddle.radiusX) ** 2 + ((entity.y - puddle.y) / puddle.radiusY) ** 2).toBeLessThanOrEqual(1 + 1e-8);
      }
    }
    simulation.dispatch({ type: 'RESTART_SESSION' });
    expect(simulation.snapshot().puddle).toBeNull();
    expect(simulation.snapshot().pigs).toHaveLength(2);
    expect(simulation.snapshot().adults.every((adult) => !adult.jumping)).toBe(true);
  });
});
