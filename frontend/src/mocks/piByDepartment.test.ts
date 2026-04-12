import { describe, expect, it } from 'vitest';
import { PI_BY_DEPARTMENT } from './piByDepartment';
import { getUserById } from './users';

describe('PI_BY_DEPARTMENT', () => {
  it('covers Litho, Etch, and Facilities departments', () => {
    expect(PI_BY_DEPARTMENT['Litho']).toBeDefined();
    expect(PI_BY_DEPARTMENT['Etch']).toBeDefined();
    expect(PI_BY_DEPARTMENT['Facilities']).toBeDefined();
  });

  it('values are valid UserIds', () => {
    for (const userId of Object.values(PI_BY_DEPARTMENT)) {
      expect(getUserById(userId)).toBeDefined();
    }
  });
});
