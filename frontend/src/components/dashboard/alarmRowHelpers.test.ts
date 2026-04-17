import { describe, it, expect } from 'vitest';
import type { ActivityEntry } from '../../types';
import {
  latestCommentText,
  sameCauseBandClass,
  formatEventTime,
} from './alarmRowHelpers';

describe('latestCommentText', () => {
  it('returns undefined when there are no comments', () => {
    const activity: ActivityEntry[] = [
      { id: '1', type: 'created', timestamp: '2026-04-17T09:00:00Z', author: 'system' },
    ];
    expect(latestCommentText(activity)).toBeUndefined();
  });

  it('returns the most recent comment text by timestamp', () => {
    const activity: ActivityEntry[] = [
      { id: '1', type: 'created', timestamp: '2026-04-17T09:00:00Z', author: 'system' },
      { id: '2', type: 'comment', timestamp: '2026-04-17T10:00:00Z', author: 'a', text: 'first' },
      { id: '3', type: 'comment', timestamp: '2026-04-17T11:00:00Z', author: 'b', text: 'latest' },
    ];
    expect(latestCommentText(activity)).toBe('latest');
  });

  it('ignores non-comment activity when picking the latest comment', () => {
    const activity: ActivityEntry[] = [
      { id: '1', type: 'comment', timestamp: '2026-04-17T10:00:00Z', author: 'a', text: 'only-comment' },
      { id: '2', type: 'workflow_transition', timestamp: '2026-04-17T12:00:00Z', author: 'b' },
    ];
    expect(latestCommentText(activity)).toBe('only-comment');
  });
});

describe('sameCauseBandClass', () => {
  it('returns transparent when there is no linked issue', () => {
    expect(sameCauseBandClass(undefined)).toBe('border-l-4 border-transparent');
  });

  it('returns a concrete color class when given an issueId', () => {
    expect(sameCauseBandClass('iss-1')).not.toBe('border-l-4 border-transparent');
    expect(sameCauseBandClass('iss-1')).toMatch(/border-l-4 border-/);
  });

  it('is deterministic — same issueId maps to the same class', () => {
    expect(sameCauseBandClass('iss-x')).toBe(sameCauseBandClass('iss-x'));
  });

  it('distinct issue IDs can map to distinct classes (palette has >1 entry)', () => {
    const seen = new Set<string>();
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      seen.add(sameCauseBandClass(id));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('formatEventTime', () => {
  it('returns "—" when undefined', () => {
    expect(formatEventTime(undefined)).toBe('—');
  });

  it('renders yyyy-MM-dd HH:mm for ISO input', () => {
    expect(formatEventTime('2026-04-17T10:05:00Z')).toBe('2026-04-17 10:05');
  });
});
