export type EggState = 'whole' | 'crack-1' | 'crack-2';
export type HenPose = 'idle' | 'blink' | 'walk-a' | 'walk-b' | 'lay' | 'happy';
export type ChickPose = 'idle' | 'walk-a' | 'walk-b' | 'hatch';

export type AdultState = 'roaming' | 'exiting';
export type PigName = 'peppa' | 'george';
export type Pig = {
  name: PigName;
  x: number;
  y: number;
  direction: -1 | 1;
  pose: 'idle' | 'walk-a' | 'walk-b' | 'jump';
  state: 'roaming' | 'running' | 'jumping';
};

export type MudPuddle = {
  id: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  activatedAt: number | null;
};

export type Adult = {
  id: number;
  x: number;
  y: number;
  direction: -1 | 1;
  pose: HenPose;
  age: number;
  state: AdultState;
  jumping: boolean;
};

export type Egg = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: EggState;
  age: number;
  sourceAdultId: number | null;
};

export type Chick = {
  id: number;
  x: number;
  y: number;
  direction: -1 | 1;
  pose: ChickPose;
  age: number;
  jumping: boolean;
};

export type WorldSize = { width: number; height: number };

export type GameSnapshot = {
  time: number;
  score: number;
  world: WorldSize;
  adults: readonly Adult[];
  eggs: readonly Egg[];
  chicks: readonly Chick[];
  pigs: readonly Pig[];
  puddle: MudPuddle | null;
};

export type RenderAdult = Readonly<Pick<Adult, 'id' | 'x' | 'y' | 'direction' | 'pose' | 'jumping'>>;
export type RenderChick = Readonly<Pick<Chick, 'id' | 'x' | 'y' | 'direction' | 'pose' | 'jumping'>>;
export type RenderEgg = Readonly<Pick<Egg, 'id' | 'x' | 'y' | 'state'>>;

/** Reused, read-only render data. Valid until the next renderState() refresh; do not retain as history. */
export type RenderState = {
  readonly revision: number;
  readonly time: number;
  readonly adults: readonly RenderAdult[];
  readonly eggs: readonly RenderEgg[];
  readonly chicks: readonly RenderChick[];
  readonly pigs: readonly Readonly<Pig>[];
  readonly puddle: Readonly<MudPuddle> | null;
};

export type GameAction = { type: 'LAY_EGG' } | { type: 'RESTART_SESSION' };

export type DispatchResult =
  | { accepted: true }
  | { accepted: false; reason: 'cooldown' | 'no-space' };

export type GameEvent =
  | { type: 'egg-laid'; eggId: number; adultId: number | null; x: number; y: number; score: number }
  | { type: 'egg-field-filled'; eggCount: number }
  | { type: 'egg-hatched'; eggId: number; chickId: number; x: number; y: number }
  | { type: 'chick-matured'; chickId: number; adultId: number; x: number; y: number }
  | { type: 'adult-exiting'; adultId: number; targetX: number; targetY: number; reason: 'idle' | 'overcrowded' }
  | { type: 'adult-left'; adultId: number }
  | { type: 'session-restarted' };
