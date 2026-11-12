/** World units per tile. */
export const T = 2;
export const WALL_H = 3;
/** 8-neighbourhood offsets; the first 4 entries are the orthogonal neighbours. */
export const DX8 = [1, -1, 0, 0, 1, 1, -1, -1] as const;
export const DZ8 = [0, 0, 1, -1, 1, -1, 1, -1] as const;
