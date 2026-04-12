import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { USERS } from '../lib/users';

interface CurrentUserStore {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

export const useCurrentUserStore = create<CurrentUserStore>()(
  persist(
    (set) => ({
      currentUser: USERS[0],
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    { name: 'fab-alarm-current-user' },
  ),
);
