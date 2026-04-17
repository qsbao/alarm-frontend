import { describe, it, expect } from 'vitest';
import type { AlarmStage } from '../../lib/dashboard/classifyAlarm';
import { getStageColorClass, formatStageStepLabel } from './stageStepChipPalette';

describe('stageStepChipPalette', () => {
  describe('getStageColorClass', () => {
    const cases: Array<[AlarmStage, string]> = [
      ['un-triaged', 'red'],
      ['pre-meeting', 'slate'],
      ['meeting', 'amber'],
      ['post-meeting', 'violet'],
      ['done', 'emerald'],
    ];

    it.each(cases)('returns a class containing the %s-appropriate color token for %s', (stage, color) => {
      expect(getStageColorClass(stage)).toContain(color);
    });

    it('returns distinct classes per stage', () => {
      const classes = new Set(cases.map(([s]) => getStageColorClass(s)));
      expect(classes.size).toBe(cases.length);
    });
  });

  describe('formatStageStepLabel', () => {
    it('formats stage + step when both are present', () => {
      expect(formatStageStepLabel('meeting', 'Meeting')).toBe('Meeting · Meeting');
    });

    it('shows stage alone when step is missing', () => {
      expect(formatStageStepLabel('pre-meeting', undefined)).toBe('Pre-meeting');
    });

    it('humanizes hyphenated stages', () => {
      expect(formatStageStepLabel('post-meeting', 'Lot Disposition')).toBe(
        'Post-meeting · Lot Disposition',
      );
    });

    it('renders un-triaged stage without a step as "Un-triaged"', () => {
      expect(formatStageStepLabel('un-triaged', undefined)).toBe('Un-triaged');
    });
  });
});
