/** Save-file rules that need no game state (SPEC §12.2). */

/** Most items one level keeps on its floor in the save. */
export const GROUND_CAP = 200;

/**
 * Trims a level's saved floor items (oldest first in `list`) to `cap`: the oldest normal-quality items go first, then,
 * only if that is not enough, the oldest of the rest. Keeps the original order.
 */
export function capGround<T>(list: readonly T[], isNormal: (e: T) => boolean, cap = GROUND_CAP): T[] {
  let excess = list.length - cap;
  if (excess <= 0) return [...list];
  const drop = new Set<T>();
  for (const e of list) { if (excess <= 0) break; if (isNormal(e)) { drop.add(e); excess--; } }
  for (const e of list) { if (excess <= 0) break; if (!drop.has(e)) { drop.add(e); excess--; } }
  return list.filter(e => !drop.has(e));
}
