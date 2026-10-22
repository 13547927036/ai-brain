export interface Rng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (lo: number, hi: number): number => lo + next() * (hi - lo);

  const int = (lo: number, hi: number): number => Math.floor(range(lo, hi + 1 - Number.EPSILON));

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick 收到空数组');
    const idx = Math.floor(next() * items.length);
    return items[Math.min(idx, items.length - 1)] as T;
  };

  return { next, range, int, pick };
}
