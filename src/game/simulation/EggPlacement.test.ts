import { describe, expect, it } from 'vitest';
import { EggPlacement } from './EggPlacement';

type Point = { x: number; y: number };
const distance = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

describe('EggPlacement', () => {
  it('reserves the last two of 100 spaces and rejects only subsequent hens', () => {
    const slots = Array.from({ length: 100 }, (_, index) => ({ x: (index % 10) * 52, y: Math.floor(index / 10) * 52 }));
    const placement = new EggPlacement(slots, 52, slots.slice(0, 98));
    expect(placement.reserve(slots[0])).toEqual(slots[98]);
    expect(placement.reserve(slots[0])).toEqual(slots[99]);
    expect(placement.reserve(slots[0])).toBeUndefined();
    expect(placement.hasSpace(slots[0])).toBe(false);
  });

  it('matches a full distance search across dense batches and different viewport scales', () => {
    let seed = 123;
    const random = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
    for (const [width, height, spacing] of [[160, 100, 21.84], [390, 844, 28.16], [1280, 720, 52], [1920, 1080, 52]]) {
      const slots: Point[] = [];
      for (let row = 0, y = 0; y <= height; row++, y += spacing * 0.86) {
        for (let x = row % 2 * spacing / 2; x <= width; x += spacing) slots.push({ x, y });
      }
      const occupied: Point[] = [{ x: -spacing / 3, y: -spacing / 3 }];
      const placement = new EggPlacement(slots, spacing, occupied);
      for (let index = 0; index < slots.length + 20; index++) {
        const preferred = { x: random() * width, y: random() * height };
        const isFree = (point: Point): boolean => occupied.every((egg) => distance(egg, point) >= spacing * spacing);
        const expected = isFree(preferred) ? preferred : [...slots].sort((a, b) => distance(a, preferred) - distance(b, preferred)).find(isFree);
        expect(placement.reserve(preferred)).toEqual(expected);
        if (expected) occupied.push(expected);
      }
    }
  });
});
