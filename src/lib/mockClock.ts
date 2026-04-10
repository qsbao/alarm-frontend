let frozenTime: number | null = null;

export const mockClock = {
  now(): number {
    return frozenTime ?? Date.now();
  },

  freeze(time: number): void {
    frozenTime = time;
  },

  unfreeze(): void {
    frozenTime = null;
  },

  advance(ms: number): void {
    if (frozenTime === null) {
      throw new Error('Cannot advance: clock is not frozen');
    }
    frozenTime += ms;
  },
};
