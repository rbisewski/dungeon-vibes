/** Experience and levelling (D1, Jarulf's Guide §2.6). SPEC.md §1.2, §3.2. */

export const MAX_LEVEL = 50;
export const POINTS_PER_LEVEL = 5;

/** XP needed to *be* level n is `XP_TABLE[n - 1]`; the last entry is the XP cap ("MAX"). */
export const XP_TABLE: readonly number[] = [
  0, 2000, 4620, 8040, 12489, 18258, 25712, 35309, 47622, 63364,
  83419, 108879, 141086, 181683, 231075, 313656, 424067, 571190, 766569, 1025154,
  1366227, 1814568, 2401895, 3168651, 4166200, 5459523, 7130496, 9281874, 12042092, 15571031,
  20066900, 25774405, 32994399, 42095202, 53525811, 67831218, 85670061, 107834823, 135274799, 169122009,
  210720231, 261657253, 323800420, 399335440, 490808349, 601170414, 733825617, 892680222, 1082908612, 1310707109,
  1583495809,
];
export const XP_CAP = XP_TABLE[MAX_LEVEL];

export const xpForLevel = (level: number): number => XP_TABLE[Math.min(level, MAX_LEVEL) - 1];

export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= XP_TABLE[lvl]) lvl++;
  return lvl;
}

/** XP for one kill: `base · (1 + 0.1·(mlvl − clvl))`, rounded down; none once clvl ≥ mlvl + 10. */
export function killXp(baseXp: number, mlvl: number, clvl: number): number {
  // Integer form avoids float drift (e.g. 1 − 0.9 ≠ 0.1).
  return Math.max(0, Math.floor((baseXp * (10 + mlvl - clvl)) / 10));
}

export interface Progress { clvl: number; xp: number; unspent: number }

/** Adds XP (capped at MAX) and returns how many levels were gained; each level grants 5 attribute points. */
export function gainXp(p: Progress, amount: number): number {
  p.xp = Math.min(XP_CAP, p.xp + amount);
  const next = levelForXp(p.xp);
  const gained = Math.max(0, next - p.clvl);
  p.clvl += gained;
  p.unspent += gained * POINTS_PER_LEVEL;
  return gained;
}
