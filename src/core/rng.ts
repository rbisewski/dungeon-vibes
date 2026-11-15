/** A random source returning floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast, seedable 32-bit PRNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A well-mixed 32-bit seed for item `n` of a family (e.g. one level of a run). */
export function deriveSeed(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Integer in [a, b] inclusive. */
export const rngInt = (rng: Rng, a: number, b: number): number => Math.floor(a + (b - a + 1) * rng());
