export const wrap = (value: number, length: number): number => ((value % length) + length) % length;
