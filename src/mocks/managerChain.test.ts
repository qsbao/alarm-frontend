import { describe, expect, it } from 'vitest';
import { MANAGER_CHAIN } from './managerChain';
import { MOCK_USERS, getUserById } from './users';

describe('MANAGER_CHAIN', () => {
  it('is keyed by UserId', () => {
    for (const userId of Object.keys(MANAGER_CHAIN)) {
      expect(getUserById(userId)).toBeDefined();
    }
  });

  it('l5 and l4 values are valid UserIds', () => {
    for (const [, chain] of Object.entries(MANAGER_CHAIN)) {
      expect(getUserById(chain.l5)).toBeDefined();
      expect(getUserById(chain.l4)).toBeDefined();
    }
  });

  it('covers all users who can be issue owners (original 8 engineers)', () => {
    const original8Ids = MOCK_USERS.slice(0, 8).map((u) => u.id);
    for (const id of original8Ids) {
      expect(MANAGER_CHAIN[id]).toBeDefined();
    }
  });

  it('l5 and l4 are different people', () => {
    for (const [, chain] of Object.entries(MANAGER_CHAIN)) {
      expect(chain.l5).not.toBe(chain.l4);
    }
  });
});
