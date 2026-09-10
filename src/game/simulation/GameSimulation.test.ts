import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';

const advance = (simulation: GameSimulation, seconds: number): void => {
  const step = 1 / 60;
  let remaining = seconds;
  while (remaining > 0) {
    const delta = Math.min(step, remaining);
    simulation.update(delta);
    remaining -= delta;
  }
};

const lay = (simulation: GameSimulation): void => {
  expect(simulation.dispatch({ type: 'LAY_EGG' })).toEqual({ accepted: true });
};

const growFlock = (simulation: GameSimulation, eggCount = 25): void => {
  for (let index = 0; index < eggCount; index += 1) {
    lay(simulation);
    advance(simulation, 0.21);
  }
  // The final egg is laid at 5.04 s. At 18.85 s every chick has grown.
  advance(simulation, 13.6);
};

describe('GameSimulation', () => {
  it('places a new egg at the selected mother hen before looking for another free slot', () => {
    const simulation = new GameSimulation(11);
    const mother = simulation.snapshot().adults[0];

    lay(simulation);
    const egg = simulation.snapshot().eggs[0];
    expect(egg.sourceAdultId).toBe(mother.id);
    expect(egg.targetX).toBe(mother.x + mother.direction * 24);
    expect(egg.targetY).toBe(mother.y + 18);
  });

  it('keeps an egg for the slower incubation period, then grows its chick into an adult', () => {
    const simulation = new GameSimulation(1);
    lay(simulation);
    simulation.drainEvents();

    advance(simulation, 5.4);
    expect(simulation.snapshot().eggs).toHaveLength(1);
    expect(simulation.snapshot().chicks).toHaveLength(0);

    advance(simulation, 0.1);
    expect(simulation.snapshot().eggs).toHaveLength(0);
    expect(simulation.snapshot().chicks).toHaveLength(1);
    expect(simulation.drainEvents().filter((event) => event.type === 'egg-hatched')).toHaveLength(1);

    advance(simulation, 7.8);
    expect(simulation.snapshot().chicks).toHaveLength(1);
    advance(simulation, 0.3);
    expect(simulation.snapshot().chicks).toHaveLength(0);
    expect(simulation.snapshot().adults).toHaveLength(2);
    expect(simulation.drainEvents().filter((event) => event.type === 'chick-matured')).toHaveLength(1);
  });

  it('spreads eggs across distinct slots before any of them hatch', () => {
    const simulation = new GameSimulation(2);
    simulation.setViewport(1280, 720);

    for (let index = 0; index < 24; index += 1) {
      lay(simulation);
      advance(simulation, 0.21);
    }

    const eggs = simulation.snapshot().eggs;
    expect(eggs).toHaveLength(24);
    for (let first = 0; first < eggs.length; first += 1) {
      for (let second = first + 1; second < eggs.length; second += 1) {
        const distance = Math.hypot(eggs[first].targetX - eggs[second].targetX, eggs[first].targetY - eggs[second].targetY);
        expect(distance).toBeGreaterThanOrEqual(52);
      }
    }
  });

  it('reserves non-overlapping positions for every grown hen and lays them together', () => {
    const simulation = new GameSimulation(3);
    lay(simulation);
    advance(simulation, 13.7);
    expect(simulation.snapshot().adults).toHaveLength(2);
    simulation.drainEvents();

    lay(simulation);
    const eggs = simulation.snapshot().eggs;
    const layingEvents = simulation.drainEvents()
      .filter((event): event is Extract<typeof event, { type: 'egg-laid' }> => event.type === 'egg-laid')
      .sort((first, second) => first.adultId! - second.adultId!);

    expect(eggs).toHaveLength(2);
    expect(layingEvents).toHaveLength(2);
    expect(layingEvents.map((event) => event.adultId)).toEqual(simulation.snapshot().adults.map((adult) => adult.id).sort((a, b) => a - b));
    expect(Math.hypot(eggs[0].x - eggs[1].x, eggs[0].y - eggs[1].y)).toBeGreaterThan(52);
    expect(simulation.snapshot().adults.every((adult) => adult.pose === 'lay')).toBe(true);
  });

  it('fills only the remaining dynamic egg positions when more hens ask to lay at once', () => {
    const simulation = new GameSimulation(7);
    simulation.setViewport(2000, 2000);
    growFlock(simulation);
    expect(simulation.snapshot().adults.filter((adult) => adult.state === 'roaming')).toHaveLength(26);

    // This compact viewport has fewer valid egg positions than the flock has hens.
    simulation.setViewport(160, 100);
    const roamingAdults = simulation.snapshot().adults.filter((adult) => adult.state === 'roaming');
    simulation.drainEvents();

    lay(simulation);
    const events = simulation.drainEvents();
    const batch = events.filter((event): event is Extract<typeof event, { type: 'egg-laid' }> => event.type === 'egg-laid');
    const layingIds = new Set(batch.flatMap((event) => event.adultId === null ? [] : [event.adultId]));

    // Equivalent to 98 occupied spaces and two free spaces: some hens lay and
    // every remaining location is filled in this one input, rather than rejecting
    // the entire flock batch.
    expect(batch.length).toBeGreaterThan(0);
    expect(batch.length).toBeLessThan(roamingAdults.length);
    expect(events.filter((event) => event.type === 'egg-field-filled')).toHaveLength(1);
    expect(simulation.snapshot().adults.filter((adult) => adult.pose === 'lay').map((adult) => adult.id).sort((a, b) => a - b))
      .toEqual([...layingIds].sort((a, b) => a - b));

    advance(simulation, 0.21);
    expect(simulation.dispatch({ type: 'LAY_EGG' })).toEqual({ accepted: false, reason: 'no-space' });
  });

  it('does not impose a fixed 96-egg cap on a larger responsive field', () => {
    const simulation = new GameSimulation(4);
    simulation.setViewport(2000, 2000);
    growFlock(simulation);
    simulation.drainEvents();

    for (let index = 0; index < 4; index += 1) {
      lay(simulation);
      advance(simulation, 0.21);
    }

    expect(simulation.snapshot().eggs.length).toBeGreaterThan(96);
  });

  it('sends half the roaming hens away after 8 seconds of idle time and halves again 16 seconds later', () => {
    const simulation = new GameSimulation(4);
    lay(simulation);
    advance(simulation, 13.7);
    lay(simulation);
    advance(simulation, 13.7);
    expect(simulation.snapshot().adults.filter((adult) => adult.state === 'roaming')).toHaveLength(3);

    simulation.drainEvents();
    lay(simulation); // This operation resets the inactivity clock.
    simulation.drainEvents();
    advance(simulation, 7.9);
    expect(simulation.drainEvents().filter((event) => event.type === 'adult-exiting')).toHaveLength(0);

    advance(simulation, 0.2);
    expect(simulation.drainEvents().filter((event) => event.type === 'adult-exiting')).toHaveLength(1);

    advance(simulation, 15.8);
    expect(simulation.drainEvents().filter((event) => event.type === 'adult-exiting')).toHaveLength(0);

    const roamingBeforeSecondWave = simulation.snapshot().adults.filter((adult) => adult.state === 'roaming').length;
    advance(simulation, 0.3);
    expect(simulation.drainEvents().filter((event) => event.type === 'adult-exiting')).toHaveLength(Math.floor(roamingBeforeSecondWave / 2));
  });

  it('keeps an idle departure walking until it crosses the outer game boundary', () => {
    const simulation = new GameSimulation(10);
    lay(simulation);
    advance(simulation, 13.7);
    expect(simulation.snapshot().adults.filter((adult) => adult.state === 'roaming')).toHaveLength(2);

    simulation.drainEvents();
    lay(simulation);
    simulation.drainEvents();
    advance(simulation, 8.1);
    const departing = simulation.drainEvents().find((event) => event.type === 'adult-exiting');
    expect(departing).toBeDefined();

    let leftField = false;
    for (let index = 0; index < 120; index += 1) {
      advance(simulation, 0.25);
      leftField ||= simulation.drainEvents().some((event) => event.type === 'adult-left' && event.adultId === departing?.adultId);
    }
    expect(leftField).toBe(true);
  });

  it('halves an overcrowded flock immediately, then waits 10 seconds before another overcrowding wave', () => {
    const simulation = new GameSimulation(12);
    simulation.setViewport(2000, 2000);
    growFlock(simulation);
    expect(simulation.snapshot().adults.filter((adult) => adult.state === 'roaming')).toHaveLength(26);

    // Reset the inactivity timer, then shrink to a field that one flock press
    // can roughly cover. Existing eggs are irrelevant to this adult-count rule.
    lay(simulation);
    simulation.setViewport(80, 80);
    simulation.drainEvents();
    advance(simulation, 1 / 60);
    const firstWave = simulation.drainEvents().filter((event) => event.type === 'adult-exiting' && event.reason === 'overcrowded');
    expect(firstWave).toHaveLength(13);

    advance(simulation, 7.5);
    lay(simulation); // Full-field input still resets the separate idle timer.
    simulation.drainEvents();
    advance(simulation, 2.3);
    expect(simulation.drainEvents().filter((event) => event.type === 'adult-exiting' && event.reason === 'overcrowded')).toHaveLength(0);
    expect((simulation as unknown as { overcrowdedExitCooldown: number }).overcrowdedExitCooldown).toBeGreaterThan(0);

    advance(simulation, 0.3);
    expect((simulation as unknown as { overcrowdedExitCooldown: number }).overcrowdedExitCooldown).toBe(0);
  });

  it('lets both adult hens and chicks eventually wander beyond the outer boundary', () => {
    const adultCanLeave = Array.from({ length: 20 }, (_, index) => {
      const simulation = new GameSimulation(100 + index);
      simulation.setViewport(320, 240);
      advance(simulation, 30);
      return simulation.snapshot().adults.length === 0;
    }).some(Boolean);
    expect(adultCanLeave).toBe(true);

    const chickCanLeave = Array.from({ length: 40 }, (_, index) => {
      const simulation = new GameSimulation(200 + index);
      simulation.setViewport(320, 240);
      lay(simulation);
      advance(simulation, 13.25);
      return simulation.snapshot().chicks.length === 0;
    }).some(Boolean);
    expect(chickCanLeave).toBe(true);
  });

  it('remaps entities into new canvas sizes without resetting their session', () => {
    const simulation = new GameSimulation(5);
    lay(simulation);
    advance(simulation, 0.25);
    simulation.setViewport(390, 844);
    simulation.setViewport(844, 390);
    const snapshot = simulation.snapshot();

    expect(snapshot.score).toBe(1);
    expect(snapshot.world).toEqual({ width: 844, height: 390 });
    for (const entity of [...snapshot.adults, ...snapshot.eggs, ...snapshot.chicks]) {
      expect(entity.x).toBeGreaterThanOrEqual(0);
      expect(entity.x).toBeLessThanOrEqual(snapshot.world.width);
      expect(entity.y).toBeGreaterThanOrEqual(0);
      expect(entity.y).toBeLessThanOrEqual(snapshot.world.height);
    }
  });
});
