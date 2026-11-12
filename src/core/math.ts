/** Cosmetic and (for now) gameplay randomness. Level and roll streams move to seeded `Rng`s in later phases. */
export const R: () => number = Math.random;
export const PI = Math.PI, TAU = PI * 2;

export const rr = (a: number, b: number): number => a + (b - a) * R();
export const ri = (a: number, b: number): number => Math.floor(a + (b - a + 1) * R());
export const pick = <T>(a: readonly T[]): T => a[Math.floor(R() * a.length)];
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Frame-rate independent exponential approach of `a` toward `b` with rate `l`. */
export const damp = (a: number, b: number, l: number, dt: number): number => a + (b - a) * (1 - Math.exp(-l * dt));
/** Wraps an angle into [-PI, PI). */
export const wrapA = (a: number): number => {
  a = (a + PI) % TAU;
  if (a < 0) a += TAU;
  return a - PI;
};

const hs = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Smooth 2D value noise in [0, 1). */
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hs(xi, yi), hs(xi + 1, yi), fx), lerp(hs(xi, yi + 1), hs(xi + 1, yi + 1), fx), fy);
}
