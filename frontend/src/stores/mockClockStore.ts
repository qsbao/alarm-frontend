import { create } from 'zustand';
import { mockClock } from '../lib/mockClock';

interface MockClockStore {
  now: number;
  advance(ms: number): void;
  refresh(): void;
}

export const useMockClockStore = create<MockClockStore>()((set) => ({
  now: mockClock.now(),

  advance(ms: number) {
    // If clock isn't frozen yet, freeze it at current time so advance works
    if (!isFrozen()) {
      mockClock.freeze(mockClock.now());
    }
    mockClock.advance(ms);
    set({ now: mockClock.now() });
  },

  refresh() {
    set({ now: mockClock.now() });
  },
}));

function isFrozen(): boolean {
  try {
    mockClock.advance(0);
    return true;
  } catch {
    return false;
  }
}
