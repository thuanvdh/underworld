/**
 * xoshiro128** — deterministic 32-bit PRNG. Same seed gives the same sequence
 * on every JS engine, which is what lets the server replay a client battle.
 */
export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    // splitmix32 expands a single 32-bit seed into the 128-bit state.
    let x = seed >>> 0;
    const next = (): number => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.s0 = next();
    this.s1 = next();
    this.s2 = next();
    this.s3 = next();
  }

  /** Next unsigned 32-bit integer. */
  nextU32(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  /** Integer in [0, max). */
  int(max: number): number {
    return Math.floor((this.nextU32() / 0x100000000) * max);
  }

  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  /** True with probability bp / 10000. */
  chance(bp: number): boolean {
    return this.int(10000) < bp;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.int(items.length)];
    if (item === undefined) throw new Error("pick from empty list");
    return item;
  }

  /** Pick a key from a weight table. */
  weighted<K extends string>(table: Readonly<Record<K, number>>): K {
    const entries = Object.entries(table) as [K, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.int(total);
    for (const [key, weight] of entries) {
      if (roll < weight) return key;
      roll -= weight;
    }
    const last = entries[entries.length - 1];
    if (!last) throw new Error("weighted pick from empty table");
    return last[0];
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
