type Point = { x: number; y: number };

const distanceSquared = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** One batch shares occupancy and reserves positions before any eggs are created. */
export class EggPlacement {
  private readonly cells = new Map<string, Point[]>();
  private readonly distanceSquared: number;
  private available: Point[];

  constructor(slots: readonly Point[], private readonly spacing: number, occupied: readonly Point[]) {
    this.distanceSquared = spacing * spacing;
    for (const point of occupied) this.occupy(point);
    this.available = slots.filter((point) => this.isFree(point));
  }

  reserve(preferred: Point): Point | undefined {
    let target: Point | undefined;
    if (this.isFree(preferred)) {
      target = preferred;
    } else {
      let nearest = Infinity;
      for (const point of this.available) {
        const distance = distanceSquared(point, preferred);
        if (distance < nearest) {
          nearest = distance;
          target = point;
        }
      }
    }
    if (target) {
      this.occupy(target);
      // A reservation can also block neighboring grid locations.
      this.available = this.available.filter((point) => distanceSquared(point, target!) >= this.distanceSquared);
    }
    return target;
  }

  hasSpace(center: Point): boolean {
    return this.available.length > 0 || this.isFree(center);
  }

  private occupy(point: Point): void {
    const key = this.key(Math.floor(point.x / this.spacing), Math.floor(point.y / this.spacing));
    const cell = this.cells.get(key);
    if (cell) cell.push(point);
    else this.cells.set(key, [point]);
  }

  private isFree(point: Point): boolean {
    const x = Math.floor(point.x / this.spacing);
    const y = Math.floor(point.y / this.spacing);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const occupied of this.cells.get(this.key(x + dx, y + dy)) ?? []) {
          if (distanceSquared(point, occupied) < this.distanceSquared) return false;
        }
      }
    }
    return true;
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }
}
