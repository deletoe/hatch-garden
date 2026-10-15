import type { Adult, Chick, Egg, MudPuddle, Pig, RenderAdult, RenderChick, RenderEgg, RenderState } from './types';

type Writable<T> = { -readonly [Key in keyof T]: T[Key] };

/** Separate from the simulation's objects, with no new records for surviving buffer slots. */
export class RenderStateBuffer {
  private readonly adults: Writable<RenderAdult>[] = [];
  private readonly chicks: Writable<RenderChick>[] = [];
  private readonly eggs: Writable<RenderEgg>[] = [];
  private readonly pigs: Pig[] = [];
  private readonly puddle: MudPuddle = { id: 0, x: 0, y: 0, radiusX: 0, radiusY: 0, activatedAt: null };
  private readonly state = {
    revision: -1, time: 0, adults: this.adults, chicks: this.chicks, eggs: this.eggs, pigs: this.pigs,
    puddle: null as MudPuddle | null,
  };

  get view(): RenderState { return this.state; }

  update(revision: number, time: number, adults: readonly Adult[], eggs: readonly Egg[], chicks: readonly Chick[]): void {
    for (let index = 0; index < adults.length; index++) {
      const source = adults[index];
      const target = this.adults[index] ??= { id: 0, x: 0, y: 0, direction: 1, pose: 'idle', jumping: false };
      target.id = source.id; target.x = source.x; target.y = source.y;
      target.direction = source.direction; target.pose = source.pose; target.jumping = source.jumping;
    }
    this.adults.length = adults.length;
    for (let index = 0; index < chicks.length; index++) {
      const source = chicks[index];
      const target = this.chicks[index] ??= { id: 0, x: 0, y: 0, direction: 1, pose: 'idle', jumping: false };
      target.id = source.id; target.x = source.x; target.y = source.y;
      target.direction = source.direction; target.pose = source.pose; target.jumping = source.jumping;
    }
    this.chicks.length = chicks.length;
    for (let index = 0; index < eggs.length; index++) {
      const source = eggs[index];
      const target = this.eggs[index] ??= { id: 0, x: 0, y: 0, state: 'whole' };
      target.id = source.id; target.x = source.x; target.y = source.y; target.state = source.state;
    }
    this.eggs.length = eggs.length;
    this.state.revision = revision;
    this.state.time = time;
  }

  writePigs(pigs: readonly Pig[], puddle: MudPuddle | null): void {
    for (let index = 0; index < pigs.length; index++) {
      const source = pigs[index];
      const target = this.pigs[index] ??= { name: source.name, x: 0, y: 0, direction: 1, pose: 'idle', state: 'roaming' };
      target.name = source.name; target.x = source.x; target.y = source.y;
      target.direction = source.direction; target.pose = source.pose; target.state = source.state;
    }
    this.pigs.length = pigs.length;
    this.state.puddle = puddle ? Object.assign(this.puddle, puddle) : null;
  }
}
