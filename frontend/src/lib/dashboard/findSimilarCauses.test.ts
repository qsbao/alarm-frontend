import { describe, it, expect } from 'vitest';
import { findSimilarCauses } from './findSimilarCauses';
import type { Alarm, Issue } from '../../types';

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alm-new',
    type: 'spc_ooc',
    severity: 'P1',
    message: 'test',
    alarmTime: '2026-04-17T10:00:00Z',
    alarmDate: '2026-04-17',
    eqpId: 'LITHO-07',
    productId: 'A7-Litho',
    module: 'LITHO',
    owner: 'user-tanaka',
    department: 'Litho',
    status: 'Open',
    labels: [],
    activity: [],
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-x',
    title: 'Cause',
    date: '2026-04-17T09:00:00Z',
    riskLevel: 'HIGH_RISK',
    status: 'Investigating',
    issueTime: '2026-04-17T09:00:00Z',
    labels: [],
    product: 'A7-Litho',
    module: 'LITHO',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'desc',
    activity: [],
    ...overrides,
  };
}

describe('findSimilarCauses', () => {
  describe('filtering', () => {
    it('returns empty for empty candidate pool', () => {
      const newAlarm = makeAlarm();
      expect(findSimilarCauses(newAlarm, [])).toEqual([]);
    });

    it('drops candidates from a different alarmDate', () => {
      const newAlarm = makeAlarm();
      const sameDay = makeIssue({ id: 'iss-A' });
      const otherDay = makeIssue({ id: 'iss-B', date: '2026-04-16T09:00:00Z' });
      const result = findSimilarCauses(newAlarm, [sameDay, otherDay]);
      expect(result.map((i) => i.id)).toEqual(['iss-A']);
    });

    it('drops candidates from a different department', () => {
      const newAlarm = makeAlarm();
      const sameDept = makeIssue({ id: 'iss-A' });
      const otherDept = makeIssue({ id: 'iss-B', department: 'Etch' });
      const result = findSimilarCauses(newAlarm, [sameDept, otherDept]);
      expect(result.map((i) => i.id)).toEqual(['iss-A']);
    });

    it('drops candidates whose module and product both differ', () => {
      const newAlarm = makeAlarm();
      const toolMatch = makeIssue({ id: 'iss-A' }); // module LITHO, product A7-Litho
      const unrelated = makeIssue({ id: 'iss-B', module: 'ETCH', product: 'B-Etch' });
      const result = findSimilarCauses(newAlarm, [toolMatch, unrelated]);
      expect(result.map((i) => i.id)).toEqual(['iss-A']);
    });

    it('keeps product-only matches (module differs but product is same)', () => {
      const newAlarm = makeAlarm();
      const productOnly = makeIssue({ id: 'iss-P', module: 'ETCH' });
      const result = findSimilarCauses(newAlarm, [productOnly]);
      expect(result.map((i) => i.id)).toEqual(['iss-P']);
    });

    it('narrows progressively: date-only vs date+dept vs date+dept+tool/product', () => {
      const newAlarm = makeAlarm();
      const full = makeIssue({ id: 'full' }); // same date, dept, module, product
      const dateOnly = makeIssue({ id: 'date-only', department: 'Etch', module: 'ETCH', product: 'B-Etch' });
      const dateAndDept = makeIssue({ id: 'date-dept', module: 'ETCH', product: 'B-Etch' });
      const offDate = makeIssue({ id: 'off-date', date: '2026-04-15T09:00:00Z' });

      const result = findSimilarCauses(newAlarm, [full, dateOnly, dateAndDept, offDate]);
      // only 'full' satisfies date+dept+(tool or product)
      expect(result.map((i) => i.id)).toEqual(['full']);
    });
  });

  describe('ranking', () => {
    it('ranks exact-tool match above product-only match', () => {
      const newAlarm = makeAlarm();
      const productOnly = makeIssue({ id: 'iss-product', module: 'ETCH', date: '2026-04-17T11:00:00Z' });
      const toolMatch = makeIssue({ id: 'iss-tool', module: 'LITHO', product: 'B-other', date: '2026-04-17T09:00:00Z' });
      const result = findSimilarCauses(newAlarm, [productOnly, toolMatch]);
      expect(result.map((i) => i.id)).toEqual(['iss-tool', 'iss-product']);
    });

    it('breaks ties by recency (most recent first) within the same tier', () => {
      const newAlarm = makeAlarm();
      const older = makeIssue({ id: 'iss-old', date: '2026-04-17T08:00:00Z' });
      const newer = makeIssue({ id: 'iss-new', date: '2026-04-17T11:30:00Z' });
      const result = findSimilarCauses(newAlarm, [older, newer]);
      expect(result.map((i) => i.id)).toEqual(['iss-new', 'iss-old']);
    });

    it('recency tiebreak applies within tool tier and within product-only tier separately', () => {
      const newAlarm = makeAlarm();
      const toolNew = makeIssue({ id: 'tool-new', module: 'LITHO', product: 'X', date: '2026-04-17T11:00:00Z' });
      const toolOld = makeIssue({ id: 'tool-old', module: 'LITHO', product: 'Y', date: '2026-04-17T08:00:00Z' });
      const prodNew = makeIssue({ id: 'prod-new', module: 'ETCH', product: 'A7-Litho', date: '2026-04-17T11:30:00Z' });
      const prodOld = makeIssue({ id: 'prod-old', module: 'ETCH', product: 'A7-Litho', date: '2026-04-17T07:00:00Z' });

      const result = findSimilarCauses(newAlarm, [prodOld, toolOld, prodNew, toolNew]);
      expect(result.map((i) => i.id)).toEqual(['tool-new', 'tool-old', 'prod-new', 'prod-old']);
    });
  });
});
