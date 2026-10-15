import { describe, expect, it } from 'vitest';
import { GameSimulation } from './GameSimulation';

describe('render state buffer', () => {
  it('reuses frame, arrays and records while preserving captured snapshots', () => {
    const simulation = new GameSimulation(123);
    simulation.dispatch({ type: 'LAY_EGG' });
    const frame = simulation.renderState(), revision = frame.revision;
    const adult = frame.adults[0], egg = frame.eggs[0], pigs = frame.pigs, pig = frame.pigs[0];
    const snapshot = simulation.snapshot(), captured = structuredClone(snapshot);
    expect(simulation.renderState()).toBe(frame);
    simulation.update(1 / 60);
    expect(simulation.renderState()).toBe(frame);
    expect(frame.revision).toBeGreaterThan(revision);
    expect(frame.adults[0]).toBe(adult);
    expect(frame.eggs[0]).toBe(egg);
    expect(frame.pigs).toBe(pigs);
    expect(frame.pigs[0]).toBe(pig);
    expect(snapshot).toEqual(captured);
    expect(frame.adults[0]).not.toHaveProperty('age');
    expect(frame.eggs[0]).not.toHaveProperty('targetX');
  });

  it('matches visible state through hatching, growth, departure, resizing and restart', () => {
    const simulation = new GameSimulation(123);
    const compare = (): void => {
      const frame = simulation.renderState(), snapshot = simulation.snapshot();
      expect(frame.time).toBe(snapshot.time);
      expect(frame.adults).toEqual(snapshot.adults.map(({ id, x, y, direction, pose, jumping }) => ({ id, x, y, direction, pose, jumping })));
      expect(frame.chicks).toEqual(snapshot.chicks.map(({ id, x, y, direction, pose, jumping }) => ({ id, x, y, direction, pose, jumping })));
      expect(frame.eggs).toEqual(snapshot.eggs.map(({ id, x, y, state }) => ({ id, x, y, state })));
      expect(frame.pigs).toEqual(snapshot.pigs);
      expect(frame.puddle).toEqual(snapshot.puddle);
    };
    for (let tick = 0; tick < 60 * 45; tick++) {
      if (tick % 13 === 0) simulation.dispatch({ type: 'LAY_EGG' });
      simulation.update(1 / 60);
      if (tick % 31 === 0) compare();
    }
    const frame = simulation.renderState();
    simulation.setViewport(3840, 2160);
    compare();
    const beforeRestart = frame.revision;
    simulation.dispatch({ type: 'RESTART_SESSION' });
    compare();
    expect(frame.revision).toBeGreaterThan(beforeRestart);
    expect(frame.adults).toHaveLength(1);
    expect(frame.chicks).toHaveLength(0);
    expect(frame.eggs).toHaveLength(0);
    expect(frame.pigs).toHaveLength(2);
    expect(frame.puddle).toBeNull();
  });

  it('does not expose mutable simulation objects through the render buffer', () => {
    const simulation = new GameSimulation(456);
    const frame = simulation.renderState();
    const originalX = simulation.snapshot().adults[0].x;
    (frame.adults[0] as { x: number }).x = -999;
    expect(simulation.snapshot().adults[0].x).toBe(originalX);
    simulation.update(1 / 60);
    expect(simulation.renderState().adults[0].x).not.toBe(-999);
    const control = new GameSimulation(456);
    control.update(1 / 60);
    expect(simulation.snapshot()).toEqual(control.snapshot());
  });
});
