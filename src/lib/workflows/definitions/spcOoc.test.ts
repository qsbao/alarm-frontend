import { describe, expect, it } from 'vitest';
import { spcOocDefinition } from './spcOoc';

describe('spcOoc definition smoke tests', () => {
  it('has 3 phases', () => {
    expect(spcOocDefinition.phases).toHaveLength(3);
  });

  it('has 4 required roles', () => {
    expect(spcOocDefinition.requiredRoles).toHaveLength(4);
    const roles = spcOocDefinition.requiredRoles.map((r) => r.role);
    expect(roles).toContain('chart_owner');
    expect(roles).toContain('pi_engineer');
    expect(roles).toContain('owner_l5_manager');
    expect(roles).toContain('owner_l4_manager');
  });

  it('has 6 total actions across all phases', () => {
    const allActions = spcOocDefinition.phases.flatMap((p) => p.actions);
    expect(allActions).toHaveLength(6);
  });

  it('initial phase has at least one required action', () => {
    const firstPhase = spcOocDefinition.phases[0];
    const requiredActions = firstPhase.actions.filter((a) => a.required);
    expect(requiredActions.length).toBeGreaterThanOrEqual(1);
  });

  it('every sendsBackTo references an existing phase id', () => {
    const phaseIds = new Set(spcOocDefinition.phases.map((p) => p.id));
    for (const phase of spcOocDefinition.phases) {
      for (const action of phase.actions) {
        if (action.sendsBackTo) {
          expect(phaseIds.has(action.sendsBackTo)).toBe(true);
        }
      }
    }
  });

  it('has exactly 2 send-back loops', () => {
    const sendBacks = spcOocDefinition.phases
      .flatMap((p) => p.actions)
      .filter((a) => a.sendsBackTo);
    expect(sendBacks).toHaveLength(2);
  });

  it('every action gate is callable', () => {
    const mockCtx = {
      user: { id: 'test-user' },
      instance: {
        definitionId: spcOocDefinition.id,
        currentPhaseId: spcOocDefinition.phases[0].id,
        actors: [],
        completedActions: {},
        actionHistory: [],
      },
      issue: {
        id: 'iss-001',
        title: 'Test',
        date: '2025-01-01T00:00:00Z',
        alarmType: 'TempSpike' as const,
        riskLevel: 'High' as const,
        status: 'New' as const,
        issueTime: '2025-01-01T00:00:00Z',
        operation: 'Test',
        product: 'Test',
        owner: 'Test',
        department: 'Test',
        description: 'Test',
        relatedAlarmIds: [],
        activity: [],
      },
    };

    for (const phase of spcOocDefinition.phases) {
      for (const action of phase.actions) {
        expect(typeof action.gate(mockCtx)).toBe('boolean');
      }
    }
  });

  it('every required role resolver is callable', () => {
    const mockIssue = {
      id: 'iss-001',
      title: 'Test',
      date: '2025-01-01T00:00:00Z',
      alarmType: 'TempSpike' as const,
      riskLevel: 'High' as const,
      status: 'New' as const,
      issueTime: '2025-01-01T00:00:00Z',
      operation: 'Test',
      product: 'Test',
      owner: 'Test',
      department: 'Test',
      description: 'Test',
      relatedAlarmIds: [],
      activity: [],
    };

    for (const role of spcOocDefinition.requiredRoles) {
      expect(typeof role.resolve(mockIssue, {})).not.toBe('function');
    }
  });
});
