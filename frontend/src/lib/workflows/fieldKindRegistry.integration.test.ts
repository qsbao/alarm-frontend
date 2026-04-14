import { describe, expect, it } from 'vitest';
import { getFieldKind } from './fieldKindRegistry';

describe('fieldKindRegistry integration', () => {
  it('returns undefined for an unregistered plugin kind', () => {
    expect(getFieldKind('missing-plugin:some-field')).toBeUndefined();
  });

  it('core kinds text and enum are not in the registry (handled inline)', () => {
    expect(getFieldKind('text')).toBeUndefined();
    expect(getFieldKind('enum')).toBeUndefined();
  });
});
