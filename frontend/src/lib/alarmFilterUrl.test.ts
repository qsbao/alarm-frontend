import { describe, it, expect } from 'vitest';
import type { AlarmFilters, AlarmSortKey } from '../types';
import { filtersToParams, paramsToFilters } from './alarmFilterUrl';

describe('filtersToParams', () => {
  it('returns empty URLSearchParams for empty filters', () => {
    const params = filtersToParams({});
    expect(params.toString()).toBe('');
  });

  it('serializes search', () => {
    const params = filtersToParams({ search: 'temp' });
    expect(params.get('q')).toBe('temp');
  });

  it('serializes status array', () => {
    const params = filtersToParams({ status: ['Open', 'Acked'] });
    expect(params.get('status')).toBe('Open,Acked');
  });

  it('serializes department array', () => {
    const params = filtersToParams({ department: ['Litho'] });
    expect(params.get('department')).toBe('Litho');
  });

  it('serializes active filter', () => {
    const params = filtersToParams({ active: 'active' });
    expect(params.get('active')).toBe('active');
  });

  it('serializes sort key', () => {
    const params = filtersToParams({}, 'severity');
    expect(params.get('sort')).toBe('severity');
  });

  it('omits default sort key (alarmTime)', () => {
    const params = filtersToParams({}, 'alarmTime');
    expect(params.has('sort')).toBe(false);
  });

  it('omits empty arrays', () => {
    const params = filtersToParams({ status: [], labels: [] });
    expect(params.toString()).toBe('');
  });

  it('serializes labels', () => {
    const params = filtersToParams({ labels: ['Recurring', 'LotImpacting'] });
    expect(params.get('labels')).toBe('Recurring,LotImpacting');
  });

  it('serializes all filter dimensions', () => {
    const filters: AlarmFilters = {
      search: 'test',
      status: ['Open'],
      department: ['Etch'],
      severity: ['P1'],
      riskLevel: ['HIGH_RISK'],
      alarmType: ['TempSpike'],
      owner: ['M. Chen'],
      eqpId: ['ETCH-03'],
      productId: ['B2-Etch'],
      operName: ['Etching'],
      labels: ['Recurring'],
      active: 'recovered',
    };
    const params = filtersToParams(filters, 'severity');
    expect(params.get('q')).toBe('test');
    expect(params.get('status')).toBe('Open');
    expect(params.get('department')).toBe('Etch');
    expect(params.get('severity')).toBe('P1');
    expect(params.get('riskLevel')).toBe('HIGH_RISK');
    expect(params.get('alarmType')).toBe('TempSpike');
    expect(params.get('owner')).toBe('M. Chen');
    expect(params.get('eqpId')).toBe('ETCH-03');
    expect(params.get('productId')).toBe('B2-Etch');
    expect(params.get('operName')).toBe('Etching');
    expect(params.get('labels')).toBe('Recurring');
    expect(params.get('active')).toBe('recovered');
    expect(params.get('sort')).toBe('severity');
  });
});

describe('paramsToFilters', () => {
  it('returns empty filters for empty params', () => {
    const params = new URLSearchParams();
    const { filters, sortKey } = paramsToFilters(params);
    expect(filters).toEqual({});
    expect(sortKey).toBe('alarmTime');
  });

  it('parses search', () => {
    const params = new URLSearchParams('q=temp');
    const { filters } = paramsToFilters(params);
    expect(filters.search).toBe('temp');
  });

  it('parses status', () => {
    const params = new URLSearchParams('status=Open,Acked');
    const { filters } = paramsToFilters(params);
    expect(filters.status).toEqual(['Open', 'Acked']);
  });

  it('parses active filter', () => {
    const params = new URLSearchParams('active=recovered');
    const { filters } = paramsToFilters(params);
    expect(filters.active).toBe('recovered');
  });

  it('parses sort key', () => {
    const params = new URLSearchParams('sort=severity');
    const { sortKey } = paramsToFilters(params);
    expect(sortKey).toBe('severity');
  });

  it('defaults sort key to alarmTime', () => {
    const params = new URLSearchParams('status=Open');
    const { sortKey } = paramsToFilters(params);
    expect(sortKey).toBe('alarmTime');
  });

  it('ignores unknown params', () => {
    const params = new URLSearchParams('unknown=foo&status=Open');
    const { filters } = paramsToFilters(params);
    expect(filters.status).toEqual(['Open']);
    expect((filters as Record<string, unknown>)['unknown']).toBeUndefined();
  });

  it('ignores invalid active values', () => {
    const params = new URLSearchParams('active=invalid');
    const { filters } = paramsToFilters(params);
    expect(filters.active).toBeUndefined();
  });

  it('ignores invalid sort values', () => {
    const params = new URLSearchParams('sort=invalid');
    const { sortKey } = paramsToFilters(params);
    expect(sortKey).toBe('alarmTime');
  });
});

describe('round-trip serialization', () => {
  it('round-trips filters and sort', () => {
    const original: AlarmFilters = {
      search: 'leak',
      status: ['Open'],
      department: ['Litho', 'Etch'],
      severity: ['P1', 'P0'],
      alarmType: ['TempSpike'],
      labels: ['Recurring'],
      active: 'active',
    };
    const originalSort: AlarmSortKey = 'severity';

    const params = filtersToParams(original, originalSort);
    const { filters, sortKey } = paramsToFilters(params);

    expect(filters).toEqual(original);
    expect(sortKey).toBe(originalSort);
  });

  it('round-trips empty filters', () => {
    const params = filtersToParams({});
    const { filters, sortKey } = paramsToFilters(params);
    expect(filters).toEqual({});
    expect(sortKey).toBe('alarmTime');
  });
});
