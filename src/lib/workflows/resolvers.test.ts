import { describe, expect, it } from 'vitest';
import {
  resolveChartOwner,
  resolvePiEngineer,
  resolveOwnerL5Manager,
  resolveOwnerL4Manager,
} from './resolvers';
import type { Issue } from '../../types';

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'iss-001',
    title: 'Test Issue',
    date: '2025-01-15T10:00:00Z',
    alarmType: 'TempSpike',
    riskLevel: 'High',
    status: 'New',
    issueTime: '2025-01-15T09:55:00Z',
    operation: 'Lithography',
    product: 'A7-Litho',
    ownerId: 'user-tanaka',
    department: 'Litho',
    description: 'Test',
    relatedAlarmIds: ['alm-001'],
    activity: [],
    ...overrides,
  };
}

const mockAlarms = [
  { id: 'alm-001', chartOwnerId: 'user-tanaka' },
  { id: 'alm-002', chartOwnerId: 'user-chen' },
];

const mockPiByDepartment: Record<string, string> = {
  Litho: 'user-pi-litho',
  Etch: 'user-pi-etch',
};

const mockManagerChain: Record<string, { l5: string; l4: string }> = {
  'user-tanaka': { l5: 'user-mgr-l5', l4: 'user-mgr-l4' },
};

describe('resolveChartOwner', () => {
  it('resolves from first related alarm chartOwnerId', () => {
    const issue = makeIssue();
    const result = resolveChartOwner(issue, { alarms: mockAlarms });
    expect(result).toBe('user-tanaka');
  });

  it('returns undefined when issue has no related alarms', () => {
    const issue = makeIssue({ relatedAlarmIds: [] });
    const result = resolveChartOwner(issue, { alarms: mockAlarms });
    expect(result).toBeUndefined();
  });

  it('returns undefined when alarms mock is missing', () => {
    const issue = makeIssue();
    const result = resolveChartOwner(issue, {});
    expect(result).toBeUndefined();
  });

  it('returns undefined when alarm has no chartOwnerId', () => {
    const issue = makeIssue();
    const result = resolveChartOwner(issue, {
      alarms: [{ id: 'alm-001' }],
    });
    expect(result).toBeUndefined();
  });
});

describe('resolvePiEngineer', () => {
  it('resolves from department', () => {
    const issue = makeIssue();
    const result = resolvePiEngineer(issue, { piByDepartment: mockPiByDepartment });
    expect(result).toBe('user-pi-litho');
  });

  it('returns undefined for unknown department', () => {
    const issue = makeIssue({ department: 'Unknown' });
    const result = resolvePiEngineer(issue, { piByDepartment: mockPiByDepartment });
    expect(result).toBeUndefined();
  });

  it('returns undefined when piByDepartment mock is missing', () => {
    const issue = makeIssue();
    const result = resolvePiEngineer(issue, {});
    expect(result).toBeUndefined();
  });
});

describe('resolveOwnerL5Manager', () => {
  it('resolves from owner manager chain', () => {
    const issue = makeIssue();
    const result = resolveOwnerL5Manager(issue, { managerChain: mockManagerChain });
    expect(result).toBe('user-mgr-l5');
  });

  it('returns undefined when owner is missing from chain', () => {
    const issue = makeIssue({ ownerId: 'unknown-user' });
    const result = resolveOwnerL5Manager(issue, { managerChain: mockManagerChain });
    expect(result).toBeUndefined();
  });

  it('returns undefined when managerChain mock is missing', () => {
    const issue = makeIssue();
    const result = resolveOwnerL5Manager(issue, {});
    expect(result).toBeUndefined();
  });
});

describe('resolveOwnerL4Manager', () => {
  it('resolves from owner manager chain', () => {
    const issue = makeIssue();
    const result = resolveOwnerL4Manager(issue, { managerChain: mockManagerChain });
    expect(result).toBe('user-mgr-l4');
  });

  it('returns undefined when owner is missing from chain', () => {
    const issue = makeIssue({ ownerId: 'unknown-user' });
    const result = resolveOwnerL4Manager(issue, { managerChain: mockManagerChain });
    expect(result).toBeUndefined();
  });

  it('returns undefined when managerChain mock is missing', () => {
    const issue = makeIssue();
    const result = resolveOwnerL4Manager(issue, {});
    expect(result).toBeUndefined();
  });
});
