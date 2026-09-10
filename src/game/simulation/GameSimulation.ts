import type {
  Adult,
  Chick,
  ChickPose,
  DispatchResult,
  Egg,
  EggState,
  GameAction,
  GameEvent,
  GameSnapshot,
  WorldSize,
} from './types';

const INITIAL_WORLD: WorldSize = { width: 1280, height: 720 };
const LAY_COOLDOWN = 0.2;
// Three times the original timings: the player has room to cover the field before hatching starts.
const EGG_CRACK_ONE_AT = 2.7;
const EGG_CRACK_TWO_AT = 4.02;
const EGG_HATCH_AT = 5.46;
const CHICK_GROW_AT = 8;
const IDLE_EXIT_FIRST_AFTER = 8;
const IDLE_EXIT_INTERVAL = 16;
const OVERCROWDED_EXIT_COOLDOWN = 10;

type WorldBounds = WorldSize & {
  left: number;
  right: number;
  top: number;
  bottom: number;
  entityLeft: number;
  entityRight: number;
  entityTop: number;
  entityBottom: number;
};
type Point = { x: number; y: number };

type InternalAdult = Adult & {
  bornAt: number;
  speed: number;
  targetX: number;
  targetY: number;
  escapeTarget: boolean;
  blinkClock: number;
  layClock: number;
};

type InternalEgg = Egg;

type InternalChick = Chick & {
  speed: number;
  targetX: number;
  targetY: number;
  hatchClock: number;
  escapeTarget: boolean;
};

type WanderTarget = Point & { escapeTarget: boolean };

class SeededRandom {
  constructor(private value: number) {}

  next(): number {
    this.value = (this.value * 1664525 + 1013904223) >>> 0;
    return this.value / 0x100000000;
  }

  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const distanceSquared = (first: Point, second: Point): number => {
  const x = first.x - second.x;
  const y = first.y - second.y;
  return x * x + y * y;
};

export class GameSimulation {
  private readonly random: SeededRandom;
  private readonly eggs: InternalEgg[] = [];
  private readonly chicks: InternalChick[] = [];
  private readonly adults: InternalAdult[] = [];
  private readonly events: GameEvent[] = [];
  private world: WorldBounds = this.createBounds(INITIAL_WORLD.width, INITIAL_WORLD.height);
  private elapsed = 0;
  private score = 0;
  private nextId = 1;
  private layCooldown = 0;
  private lastLayOperationAt = 0;
  private completedIdleExitWaves = 0;
  private overcrowdedExitCooldown = 0;

  constructor(seed = 0x51c3d) {
    this.random = new SeededRandom(seed);
    this.adults.push(this.createAdult(this.world.width / 2, this.world.top + (this.world.bottom - this.world.top) * 0.48));
  }

  dispatch(action: GameAction): DispatchResult {
    if (action.type === 'RESTART_SESSION') {
      this.restart();
      return { accepted: true };
    }
    // An attempted lay is still player activity: it postpones the idle departure
    // wave even when the field is full or the input is inside the short cooldown.
    this.lastLayOperationAt = this.elapsed;
    this.completedIdleExitWaves = 0;
    if (this.layCooldown > 0) {
      return { accepted: false, reason: 'cooldown' };
    }

    const adults = this.layingAdults();
    if (adults.length === 0 && this.adults.length > 0) {
      return { accepted: false, reason: 'no-space' };
    }
    const plans = adults.length > 0
      ? this.planAdultEggs(adults)
      : this.planCentreEgg();
    if (plans.length === 0) {
      return { accepted: false, reason: 'no-space' };
    }

    this.layCooldown = LAY_COOLDOWN;
    for (const { adult, target } of plans) {
      if (adult) {
        adult.layClock = 0.33;
        adult.pose = 'lay';
      }
      const egg = this.createEgg(adult, target);
      this.eggs.push(egg);
      this.score += 1;
      this.events.push({ type: 'egg-laid', eggId: egg.id, adultId: adult?.id ?? null, x: egg.x, y: egg.y, score: this.score });
    }
    if (!this.hasFieldSpace()) {
      this.events.push({ type: 'egg-field-filled', eggCount: this.eggs.length });
    }
    return { accepted: true };
  }

  update(dt: number): void {
    if (dt <= 0) {
      return;
    }
    this.elapsed += dt;
    this.layCooldown = Math.max(0, this.layCooldown - dt);
    this.overcrowdedExitCooldown = Math.max(0, this.overcrowdedExitCooldown - dt);
    this.updateEggs(dt);
    this.updateChicks(dt);
    this.updateAdults(dt);
  }

  setViewport(width: number, height: number): void {
    const next = this.createBounds(width, height);
    const previous = this.world;
    if (previous.width === next.width && previous.height === next.height) {
      return;
    }
    const remapInside = (point: Point): Point => ({
      x: this.remap(point.x, previous.left, previous.right, next.left, next.right),
      y: this.remap(point.y, previous.top, previous.bottom, next.top, next.bottom),
    });
    const remapEntity = (point: Point): Point => ({
      x: this.remapUnclamped(point.x, previous.entityLeft, previous.entityRight, next.entityLeft, next.entityRight),
      y: this.remapUnclamped(point.y, previous.entityTop, previous.entityBottom, next.entityTop, next.entityBottom),
    });

    for (const adult of this.adults) {
      const useEntityBounds = adult.state === 'exiting' || adult.escapeTarget;
      const position = useEntityBounds ? remapEntity(adult) : remapInside(adult);
      const target = useEntityBounds
        ? remapEntity({ x: adult.targetX, y: adult.targetY })
        : remapInside({ x: adult.targetX, y: adult.targetY });
      adult.x = position.x;
      adult.y = position.y;
      adult.targetX = target.x;
      adult.targetY = target.y;
    }
    for (const egg of this.eggs) {
      const position = remapInside(egg);
      const target = remapInside({ x: egg.targetX, y: egg.targetY });
      egg.x = position.x;
      egg.y = position.y;
      egg.targetX = target.x;
      egg.targetY = target.y;
    }
    for (const chick of this.chicks) {
      const position = chick.escapeTarget ? remapEntity(chick) : remapInside(chick);
      const target = chick.escapeTarget
        ? remapEntity({ x: chick.targetX, y: chick.targetY })
        : remapInside({ x: chick.targetX, y: chick.targetY });
      chick.x = position.x;
      chick.y = position.y;
      chick.targetX = target.x;
      chick.targetY = target.y;
    }
    this.world = next;
  }

  snapshot(): GameSnapshot {
    return {
      time: this.elapsed,
      score: this.score,
      world: { width: this.world.width, height: this.world.height },
      adults: this.adults.map(({ id, x, y, direction, pose, age, state }) => ({ id, x, y, direction, pose, age, state })),
      eggs: this.eggs.map(({ id, x, y, targetX, targetY, state, age, sourceAdultId }) => ({ id, x, y, targetX, targetY, state, age, sourceAdultId })),
      chicks: this.chicks.map(({ id, x, y, direction, pose, age }) => ({ id, x, y, direction, pose, age })),
    };
  }

  drainEvents(): GameEvent[] {
    return this.events.splice(0, this.events.length);
  }

  private createBounds(width: number, height: number): WorldBounds {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const visualScale = this.visualScaleFor(safeWidth, safeHeight);
    // These are coordinates for feet/egg bases. They scale with the current
    // canvas and reserve only the small HUD area rather than a fixed-height band.
    const side = Math.min(Math.max(16, 28 * visualScale), safeWidth * 0.16);
    const top = Math.min(Math.max(46, 70 * visualScale), safeHeight * 0.35);
    const bottom = safeHeight - Math.min(Math.max(10, 16 * visualScale), safeHeight * 0.12);
    const entityMargin = 256 * 0.63 * visualScale;
    return {
      width: safeWidth, height: safeHeight, left: side, right: safeWidth - side, top, bottom,
      entityLeft: -entityMargin, entityRight: safeWidth + entityMargin,
      entityTop: -entityMargin, entityBottom: safeHeight + entityMargin,
    };
  }

  private createAdult(x: number, y: number): InternalAdult {
    const target = this.randomWanderTarget({ x, y });
    return {
      id: this.nextId++, x, y,
      direction: this.random.next() > 0.5 ? 1 : -1,
      pose: 'idle', age: 0, state: 'roaming', bornAt: this.elapsed,
      speed: this.random.between(46, 64), targetX: target.x, targetY: target.y,
      escapeTarget: target.escapeTarget, blinkClock: this.random.between(1.8, 4.4), layClock: 0,
    };
  }

  private layingAdults(): InternalAdult[] {
    return this.adults
      .filter((adult) => adult.state === 'roaming')
      .sort((first, second) => first.bornAt - second.bornAt || first.id - second.id);
  }

  private planAdultEggs(adults: readonly InternalAdult[]): Array<{ adult: InternalAdult; target: Point }> {
    const plans: Array<{ adult: InternalAdult; target: Point }> = [];
    const reserved: Point[] = [];
    for (const adult of adults) {
      const target = this.findEggSlot(this.layingPoint(adult), reserved);
      if (!target) {
        continue;
      }
      plans.push({ adult, target });
      reserved.push(target);
    }
    return plans;
  }

  private planCentreEgg(): Array<{ adult: undefined; target: Point }> {
    const target = this.findEggSlot(this.screenCenterPoint());
    return target ? [{ adult: undefined, target }] : [];
  }

  private createEgg(adult: InternalAdult | undefined, target: Point): InternalEgg {
    return {
      id: this.nextId++, x: target.x, y: target.y, targetX: target.x, targetY: target.y,
      state: 'whole', age: 0, sourceAdultId: adult?.id ?? null,
    };
  }

  private eggSlots(): Point[] {
    const spacing = this.eggSpacing();
    const rowSpacing = spacing * 0.86;
    const slots: Point[] = [];
    let row = 0;
    for (let y = this.world.top; y <= this.world.bottom; y += rowSpacing) {
      const offset = row % 2 === 0 ? 0 : spacing * 0.5;
      for (let x = this.world.left + offset; x <= this.world.right; x += spacing) {
        slots.push({ x, y });
      }
      row += 1;
    }
    return slots;
  }

  private findEggSlot(preferred: Point, reserved: readonly Point[] = []): Point | undefined {
    const slots = this.eggSlots();
    const spacing = this.eggSpacing();
    const minimumDistanceSquared = spacing * spacing;
    const candidates = [preferred, ...slots]
      .filter((candidate) => candidate.x >= this.world.left && candidate.x <= this.world.right && candidate.y >= this.world.top && candidate.y <= this.world.bottom)
      .sort((first, second) => distanceSquared(first, preferred) - distanceSquared(second, preferred));
    return candidates.find((candidate) => this.canPlaceEgg(candidate, minimumDistanceSquared, reserved));
  }

  private hasFieldSpace(): boolean {
    return this.findEggSlot(this.screenCenterPoint()) !== undefined;
  }

  private eggSpacing(): number {
    // The egg texture is rendered at 0.55 of its 96 px source width. Use the
    // live visual scale so a narrow phone and a wide desktop pack proportionally.
    return 52 * this.visualScaleFor(this.world.width, this.world.height);
  }

  private visualScaleFor(width: number, height: number): number {
    return clamp(Math.min(width, height) / 720, 0.42, 1);
  }

  private canPlaceEgg(candidate: Point, minimumDistanceSquared: number, reserved: readonly Point[]): boolean {
    const occupied = this.eggs.some((egg) => distanceSquared(candidate, { x: egg.targetX, y: egg.targetY }) < minimumDistanceSquared);
    return !occupied && !reserved.some((point) => distanceSquared(candidate, point) < minimumDistanceSquared);
  }

  private updateEggs(dt: number): void {
    for (let index = this.eggs.length - 1; index >= 0; index -= 1) {
      const egg = this.eggs[index];
      egg.age += dt;
      egg.state = this.eggStateForAge(egg.age);
      if (egg.age < EGG_HATCH_AT) {
        continue;
      }
      this.eggs.splice(index, 1);
      const chick = this.createChick(egg);
      this.chicks.push(chick);
      this.events.push({ type: 'egg-hatched', eggId: egg.id, chickId: chick.id, x: egg.x, y: egg.y });
    }
  }

  private updateChicks(dt: number): void {
    for (let index = this.chicks.length - 1; index >= 0; index -= 1) {
      const chick = this.chicks[index];
      chick.age += dt;
      chick.hatchClock = Math.max(0, chick.hatchClock - dt);
      if (chick.age >= CHICK_GROW_AT) {
        this.chicks.splice(index, 1);
        const adult = this.createAdult(chick.x, chick.y);
        this.adults.push(adult);
        this.events.push({ type: 'chick-matured', chickId: chick.id, adultId: adult.id, x: chick.x, y: chick.y });
        continue;
      }
      if (chick.hatchClock > 0) {
        chick.pose = 'hatch';
        continue;
      }
      if (distanceSquared(chick, { x: chick.targetX, y: chick.targetY }) < 14 * 14) {
        const target = this.randomWanderTarget(chick);
        chick.targetX = target.x;
        chick.targetY = target.y;
        chick.escapeTarget = target.escapeTarget;
      }
      this.moveToward(chick, chick.targetX, chick.targetY, chick.speed * (chick.escapeTarget ? 1.8 : 1), dt);
      if (this.isOutsideEntityBounds(chick)) {
        this.chicks.splice(index, 1);
        continue;
      }
      const step = Math.floor((this.elapsed + chick.id) * 4.2) % 3;
      chick.pose = (step === 0 ? 'idle' : step === 1 ? 'walk-a' : 'walk-b') satisfies ChickPose;
    }
  }

  private createChick(egg: InternalEgg): InternalChick {
    const x = egg.x;
    const y = egg.y + 7;
    const target = this.randomWanderTarget({ x, y });
    return {
      id: this.nextId++, x, y,
      direction: this.random.next() > 0.5 ? 1 : -1,
      pose: 'hatch', age: 0, speed: this.random.between(25, 43),
      targetX: target.x, targetY: target.y, hatchClock: 0.3, escapeTarget: target.escapeTarget,
    };
  }

  private updateAdults(dt: number): void {
    for (const adult of this.adults) {
      adult.age = this.elapsed - adult.bornAt;
    }
    if (!this.scheduleOvercrowdedAdultExit()) {
      this.scheduleIdleAdultExits();
    }

    for (let index = this.adults.length - 1; index >= 0; index -= 1) {
      const adult = this.adults[index];
      adult.layClock = Math.max(0, adult.layClock - dt);
      if (adult.state === 'exiting') {
        this.moveToward(adult, adult.targetX, adult.targetY, adult.speed * 1.55, dt);
        adult.pose = Math.floor(this.elapsed * 4.1) % 2 === 0 ? 'walk-a' : 'walk-b';
        if (this.isOutsideEntityBounds(adult)) {
          this.adults.splice(index, 1);
          this.events.push({ type: 'adult-left', adultId: adult.id });
        }
        continue;
      }
      if (adult.layClock > 0) {
        adult.pose = 'lay';
        continue;
      }
      if (distanceSquared(adult, { x: adult.targetX, y: adult.targetY }) < 16 * 16) {
        const target = this.randomWanderTarget(adult);
        adult.targetX = target.x;
        adult.targetY = target.y;
        adult.escapeTarget = target.escapeTarget;
      }
      this.moveToward(adult, adult.targetX, adult.targetY, adult.speed, dt);
      if (this.isOutsideEntityBounds(adult)) {
        this.adults.splice(index, 1);
        this.events.push({ type: 'adult-left', adultId: adult.id });
        continue;
      }
      adult.blinkClock -= dt;
      if (adult.blinkClock <= 0) {
        adult.pose = 'blink';
        adult.blinkClock = this.random.between(2.4, 5.2);
      } else {
        adult.pose = Math.floor((this.elapsed + adult.id) * 3.4) % 3 === 0 ? 'idle' : Math.floor(this.elapsed * 5.2) % 2 === 0 ? 'walk-a' : 'walk-b';
      }
    }
  }

  private scheduleIdleAdultExits(): void {
    const idleFor = this.elapsed - this.lastLayOperationAt;
    const dueWaves = idleFor < IDLE_EXIT_FIRST_AFTER
      ? 0
      : 1 + Math.floor((idleFor - IDLE_EXIT_FIRST_AFTER) / IDLE_EXIT_INTERVAL);
    while (this.completedIdleExitWaves < dueWaves) {
      const roaming = this.layingAdults();
      const leavingCount = Math.floor(roaming.length / 2);
      for (const adult of roaming.slice(0, leavingCount)) {
        this.startExit(adult, 'idle');
      }
      this.completedIdleExitWaves += 1;
    }
  }

  private scheduleOvercrowdedAdultExit(): boolean {
    if (this.overcrowdedExitCooldown > 0) {
      return false;
    }
    const roaming = this.layingAdults();
    // This is the current screen's approximate one-press fill count. It is
    // regenerated on every resize, so the pressure threshold follows the view.
    const fieldFillingFlockSize = this.eggSlots().length;
    if (roaming.length < fieldFillingFlockSize) {
      return false;
    }
    for (const adult of roaming.slice(0, Math.floor(roaming.length / 2))) {
      this.startExit(adult, 'overcrowded');
    }
    this.overcrowdedExitCooldown = OVERCROWDED_EXIT_COOLDOWN;
    return true;
  }

  private startExit(adult: InternalAdult, reason: 'idle' | 'overcrowded'): void {
    adult.state = 'exiting';
    const target = this.randomExitPoint();
    adult.targetX = target.x;
    adult.targetY = target.y;
    this.events.push({ type: 'adult-exiting', adultId: adult.id, targetX: adult.targetX, targetY: adult.targetY, reason });
  }

  private randomExitPoint(): Point {
    const edge = Math.floor(this.random.next() * 4);
    if (edge === 0) {
      return { x: this.random.between(this.world.entityLeft, this.world.entityRight), y: this.world.entityTop - 1 };
    } else if (edge === 1) {
      return { x: this.world.entityRight + 1, y: this.random.between(this.world.entityTop, this.world.entityBottom) };
    } else if (edge === 2) {
      return { x: this.random.between(this.world.entityLeft, this.world.entityRight), y: this.world.entityBottom + 1 };
    }
    return { x: this.world.entityLeft - 1, y: this.random.between(this.world.entityTop, this.world.entityBottom) };
  }

  private moveToward(entity: { x: number; y: number; direction: -1 | 1 }, targetX: number, targetY: number, speed: number, dt: number): boolean {
    const dx = targetX - entity.x;
    const dy = targetY - entity.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.001 || distance <= speed * dt) {
      entity.x = targetX;
      entity.y = targetY;
      return true;
    }
    entity.direction = dx < 0 ? -1 : 1;
    entity.x += (dx / distance) * speed * dt;
    entity.y += (dy / distance) * speed * dt;
    return false;
  }

  private randomWanderTarget(origin: Point): WanderTarget {
    const shortSide = Math.min(this.world.width, this.world.height);
    const longSide = Math.max(this.world.width, this.world.height);
    const escapeTarget = this.random.next() < 0.18;
    const distance = escapeTarget
      ? this.random.between(longSide * 0.7, longSide * 1.45)
      : this.random.between(Math.max(36, shortSide * 0.09), Math.max(54, shortSide * 0.42));
    const angle = this.random.between(0, Math.PI * 2);
    return {
      x: origin.x + Math.cos(angle) * distance,
      y: origin.y + Math.sin(angle) * distance,
      escapeTarget,
    };
  }

  private screenCenterPoint(): Point {
    return {
      x: clamp(this.world.width / 2, this.world.left, this.world.right),
      y: clamp(this.world.height / 2, this.world.top, this.world.bottom),
    };
  }

  private layingPoint(adult: InternalAdult): Point {
    const scale = this.visualScaleFor(this.world.width, this.world.height);
    return {
      x: clamp(adult.x + adult.direction * 24 * scale, this.world.left, this.world.right),
      y: clamp(adult.y + 18 * scale, this.world.top, this.world.bottom),
    };
  }

  private isOutsideEntityBounds(entity: Point): boolean {
    return entity.x < this.world.entityLeft
      || entity.x > this.world.entityRight
      || entity.y < this.world.entityTop
      || entity.y > this.world.entityBottom;
  }

  private eggStateForAge(age: number): EggState {
    if (age >= EGG_CRACK_TWO_AT) {
      return 'crack-2';
    }
    if (age >= EGG_CRACK_ONE_AT) {
      return 'crack-1';
    }
    return 'whole';
  }

  private remap(value: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
    const progress = clamp((value - oldMin) / (oldMax - oldMin), 0, 1);
    return newMin + (newMax - newMin) * progress;
  }

  private remapUnclamped(value: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
    const progress = (value - oldMin) / (oldMax - oldMin);
    return newMin + (newMax - newMin) * progress;
  }

  private restart(): void {
    this.eggs.length = 0;
    this.chicks.length = 0;
    this.adults.length = 0;
    this.score = 0;
    this.elapsed = 0;
    this.layCooldown = 0;
    this.lastLayOperationAt = 0;
    this.completedIdleExitWaves = 0;
    this.overcrowdedExitCooldown = 0;
    this.adults.push(this.createAdult(this.world.width / 2, this.world.top + (this.world.bottom - this.world.top) * 0.48));
    this.events.push({ type: 'session-restarted' });
  }
}
