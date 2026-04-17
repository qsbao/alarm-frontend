import type { AlarmStage } from '../../lib/dashboard/classifyAlarm';

const STAGE_CLASSES: Record<AlarmStage, string> = {
  'un-triaged': 'text-red-400 bg-red-500/15 border-red-500/30',
  'pre-meeting': 'text-slate-300 bg-slate-500/15 border-slate-500/30',
  meeting: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  'post-meeting': 'text-violet-400 bg-violet-500/15 border-violet-500/30',
  done: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
};

const STAGE_DISPLAY: Record<AlarmStage, string> = {
  'un-triaged': 'Un-triaged',
  'pre-meeting': 'Pre-meeting',
  meeting: 'Meeting',
  'post-meeting': 'Post-meeting',
  done: 'Done',
};

export function getStageColorClass(stage: AlarmStage): string {
  return STAGE_CLASSES[stage];
}

export function formatStageStepLabel(stage: AlarmStage, stepLabel: string | undefined): string {
  const stageText = STAGE_DISPLAY[stage];
  if (!stepLabel) return stageText;
  return `${stageText} · ${stepLabel}`;
}
