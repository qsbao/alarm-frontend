import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerFieldKind,
  getFieldKind,
  getAllFieldKindIds,
  resetFieldKindRegistry,
  type FieldKindSpec,
} from './fieldKindRegistry';

describe('fieldKindRegistry', () => {
  beforeEach(() => {
    resetFieldKindRegistry();
  });

  it('registers and retrieves a field kind by id', () => {
    const spec: FieldKindSpec = { component: () => null };
    registerFieldKind('example-plugin:lot-disposition', spec);
    expect(getFieldKind('example-plugin:lot-disposition')).toBe(spec);
  });

  it('returns undefined for an unknown kind', () => {
    expect(getFieldKind('nonexistent:kind')).toBeUndefined();
  });

  it('throws on duplicate id registration', () => {
    const spec: FieldKindSpec = { component: () => null };
    registerFieldKind('example-plugin:lot-disposition', spec);
    expect(() => registerFieldKind('example-plugin:lot-disposition', spec))
      .toThrowError('Duplicate field kind id: example-plugin:lot-disposition');
  });

  it('getAllFieldKindIds returns all registered ids', () => {
    registerFieldKind('a:one', { component: () => null });
    registerFieldKind('b:two', { component: () => null });
    expect(getAllFieldKindIds()).toEqual(['a:one', 'b:two']);
  });
});
