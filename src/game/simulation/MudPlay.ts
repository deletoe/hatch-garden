import type { MudPuddle, Pig, PigName } from './types';

export type PlayBounds = { width: number; height: number; left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };
type InternalPig = Pig & { targetX: number; targetY: number; runSpeed: number };

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const PLAY_SECONDS = 20;
const RESPAWN_SECONDS = 5;
const PUDDLE_WANDER_CHANCE_MIN = 0.15;
const PUDDLE_WANDER_CHANCE_MAX = 0.5;
const PUDDLE_WANDER_RAMP_SECONDS = 60;

/** A single, persistent pair of pigs and a single puddle share the simulation clock. */
export class MudPlay {
  private readonly pigs: InternalPig[] = [];
  private puddle: MudPuddle | null = null;
  private nextPuddleAt = 0;
  private wanderingStartedAt = 0;
  private nextId = 1;
  private randomState: number;

  constructor(private bounds: PlayBounds, seed: number) {
    // Keep pig wandering independent of chicken random decisions.
    this.randomState = (seed ^ 0x70696773) >>> 0;
    this.restart(0);
  }

  restart(now: number): void {
    this.puddle = null;
    this.wanderingStartedAt = now;
    this.nextPuddleAt = now + this.between(3, 7);
    this.pigs.length = 0;
    for (const [index, name] of (['peppa', 'george'] as const).entries()) {
      const point = { x: this.bounds.width * (index === 0 ? 0.3 : 0.7), y: this.bounds.top + (this.bounds.bottom - this.bounds.top) * 0.6 };
      const target = this.wanderTarget(point, now);
      this.pigs.push({ name, ...point, direction: index === 0 ? 1 : -1, pose: 'idle', state: 'roaming', targetX: target.x, targetY: target.y, runSpeed: 225 * this.scale });
    }
  }

  update(dt: number, now: number): void {
    if (this.puddle && this.puddle.activatedAt !== null && now - this.puddle.activatedAt >= PLAY_SECONDS) {
      this.puddle = null;
      this.wanderingStartedAt = now;
      this.nextPuddleAt = now + RESPAWN_SECONDS;
      for (const pig of this.pigs) {
        pig.state = 'roaming';
        pig.pose = 'idle';
        const target = this.wanderTarget(pig, now);
        pig.targetX = target.x;
        pig.targetY = target.y;
      }
    }
    if (!this.puddle && now >= this.nextPuddleAt) this.spawnPuddle();

    // Test entry before moving too, so a newly spawned puddle under a pig activates immediately.
    const visitor = this.pigs.find((pig) => this.contains(pig));
    if (visitor && this.puddle?.activatedAt === null) this.activate(visitor, now);
    for (const pig of this.pigs) {
      if (pig.state === 'jumping') continue;
      if (pig.state === 'roaming' && Math.hypot(pig.targetX - pig.x, pig.targetY - pig.y) < 8 * this.scale) {
        const target = this.wanderTarget(pig, now);
        pig.targetX = target.x;
        pig.targetY = target.y;
      }
      this.move(pig, pig.state === 'running' ? pig.runSpeed : 62 * this.scale, dt);
      pig.pose = Math.floor(now * (pig.state === 'running' ? 9 : 5)) % 2 === 0 ? 'walk-a' : 'walk-b';
      if (this.contains(pig)) {
        if (this.puddle?.activatedAt === null) this.activate(pig, now);
        else if (this.puddle) { pig.state = 'jumping'; pig.pose = 'jump'; }
      }
    }
  }

  isPlayingAt(point: Point): boolean {
    return this.puddle !== null && this.puddle.activatedAt !== null && this.contains(point);
  }

  snapshot(): { pigs: Pig[]; puddle: MudPuddle | null } {
    return {
      pigs: this.pigs.map(({ name, x, y, direction, pose, state }) => ({ name, x, y, direction, pose, state })),
      puddle: this.puddle ? { ...this.puddle } : null,
    };
  }

  setViewport(bounds: PlayBounds): void {
    const old = this.bounds;
    const remap = (point: Point): Point => ({
      x: bounds.left + (point.x - old.left) / (old.right - old.left) * (bounds.right - bounds.left),
      y: bounds.top + (point.y - old.top) / (old.bottom - old.top) * (bounds.bottom - bounds.top),
    });
    const oldPuddle = this.puddle ? { ...this.puddle } : null;
    if (this.puddle) {
      const point = remap(this.puddle);
      const radii = this.puddleRadii(bounds);
      Object.assign(this.puddle, radii, {
        x: clamp(point.x, bounds.left + radii.radiusX, bounds.right - radii.radiusX),
        y: clamp(point.y, bounds.top + radii.radiusY, bounds.bottom - radii.radiusY),
      });
    }
    for (const pig of this.pigs) {
      const point = remap(pig), target = remap({ x: pig.targetX, y: pig.targetY });
      if (pig.state === 'jumping' && oldPuddle && this.puddle) {
        pig.x = this.puddle.x + (pig.x - oldPuddle.x) / oldPuddle.radiusX * this.puddle.radiusX;
        pig.y = this.puddle.y + (pig.y - oldPuddle.y) / oldPuddle.radiusY * this.puddle.radiusY;
      } else { pig.x = point.x; pig.y = point.y; }
      const destination = pig.state === 'running' && this.puddle ? this.puddleTarget(pig.name) : target;
      pig.targetX = destination.x; pig.targetY = destination.y;
      if (pig.state === 'running') this.setRunSpeed(pig);
    }
    this.bounds = bounds;
  }

  private get scale(): number { return clamp(Math.min(this.bounds.width, this.bounds.height) / 720, 0.42, 1); }

  private spawnPuddle(): void {
    const { radiusX, radiusY } = this.puddleRadii(this.bounds);
    this.puddle = {
      id: this.nextId++, radiusX, radiusY, activatedAt: null,
      x: this.between(this.bounds.left + radiusX, this.bounds.right - radiusX),
      y: this.between(this.bounds.top + radiusY, this.bounds.bottom - radiusY),
    };
  }

  private puddleRadii(bounds: PlayBounds): { radiusX: number; radiusY: number } {
    const scale = clamp(Math.min(bounds.width, bounds.height) / 720, 0.42, 1);
    return {
      radiusX: Math.min(145 * scale, (bounds.right - bounds.left) * 0.38),
      radiusY: Math.min(64 * scale, (bounds.bottom - bounds.top) * 0.24),
    };
  }

  private contains(point: Point): boolean {
    const puddle = this.puddle;
    return puddle !== null && ((point.x - puddle.x) / puddle.radiusX) ** 2 + ((point.y - puddle.y) / puddle.radiusY) ** 2 <= 1;
  }

  private activate(visitor: InternalPig, now: number): void {
    if (!this.puddle) return;
    this.puddle.activatedAt = now;
    visitor.state = 'jumping'; visitor.pose = 'jump';
    const other = this.pigs.find((pig) => pig !== visitor)!;
    other.state = 'running';
    const target = this.puddleTarget(other.name);
    other.targetX = target.x; other.targetY = target.y;
    this.setRunSpeed(other);
  }

  private setRunSpeed(pig: InternalPig): void {
    // Long and tall windows still allow the invited pig to arrive promptly.
    pig.runSpeed = Math.max(225 * this.scale, Math.hypot(pig.targetX - pig.x, pig.targetY - pig.y) / 3);
  }

  private puddleTarget(name: PigName): Point {
    const puddle = this.puddle!;
    return { x: puddle.x + (name === 'peppa' ? -1 : 1) * puddle.radiusX * 0.32, y: puddle.y };
  }

  private wanderTarget(origin: Point, now: number): Point {
    const puddle = this.puddle;
    const progress = clamp((now - this.wanderingStartedAt) / PUDDLE_WANDER_RAMP_SECONDS, 0, 1);
    const chance = PUDDLE_WANDER_CHANCE_MIN + (PUDDLE_WANDER_CHANCE_MAX - PUDDLE_WANDER_CHANCE_MIN) * progress;
    const towardPuddle = puddle !== null && this.between(0, 1) < chance;
    const angle = towardPuddle
      ? Math.atan2(puddle.y - origin.y, puddle.x - origin.x)
      : this.between(0, Math.PI * 2);
    const distance = this.between(60, Math.max(90, Math.min(this.bounds.width, this.bounds.height) * 0.55));
    if (towardPuddle) {
      const step = Math.min(distance, Math.hypot(puddle.x - origin.x, puddle.y - origin.y));
      return { x: origin.x + Math.cos(angle) * step, y: origin.y + Math.sin(angle) * step };
    }
    const marginX = Math.min(70 * this.scale, (this.bounds.right - this.bounds.left) * 0.12);
    const marginY = Math.min(80 * this.scale, (this.bounds.bottom - this.bounds.top) * 0.15);
    return {
      x: clamp(origin.x + Math.cos(angle) * distance, this.bounds.left + marginX, this.bounds.right - marginX),
      y: clamp(origin.y + Math.sin(angle) * distance, this.bounds.top + marginY, this.bounds.bottom - marginY),
    };
  }

  private move(pig: InternalPig, speed: number, dt: number): void {
    const dx = pig.targetX - pig.x, dy = pig.targetY - pig.y;
    const distance = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.001) pig.direction = dx < 0 ? -1 : 1;
    const step = Math.min(1, speed * dt / Math.max(0.001, distance));
    pig.x += dx * step; pig.y += dy * step;
  }

  private between(min: number, max: number): number {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return min + (max - min) * (this.randomState / 0x100000000);
  }
}
