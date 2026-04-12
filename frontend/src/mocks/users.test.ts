import { describe, expect, it } from 'vitest';
import { MOCK_USERS, getUserById, getUserByName } from './users';

describe('MOCK_USERS', () => {
  it('every user has a non-empty id field', () => {
    for (const user of MOCK_USERS) {
      expect(user.id).toBeTruthy();
      expect(typeof user.id).toBe('string');
    }
  });

  it('all user ids are unique', () => {
    const ids = MOCK_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has 27 users matching backend seed data', () => {
    expect(MOCK_USERS.length).toBe(27);
  });

  it('preserves the original 8 users (by name)', () => {
    const original8 = [
      'H. Tanaka', 'L. Rossi', 'R. Garcia', 'M. Chen',
      'S. Patel', 'A. Kim', 'K. Müller', 'J. Smith',
    ];
    for (const name of original8) {
      expect(MOCK_USERS.find((u) => u.name === name)).toBeDefined();
    }
  });

  it('covers at least Litho, Etch, and Facilities departments', () => {
    const depts = new Set(MOCK_USERS.map((u) => u.department));
    expect(depts.has('Litho')).toBe(true);
    expect(depts.has('Etch')).toBe(true);
    expect(depts.has('Facilities')).toBe(true);
  });

  it('getUserById returns the correct user', () => {
    const first = MOCK_USERS[0];
    expect(getUserById(first.id)).toBe(first);
  });

  it('getUserById returns undefined for unknown id', () => {
    expect(getUserById('nonexistent')).toBeUndefined();
  });

  it('getUserByName returns the correct user', () => {
    const user = getUserByName('H. Tanaka');
    expect(user).toBeDefined();
    expect(user!.name).toBe('H. Tanaka');
  });
});
