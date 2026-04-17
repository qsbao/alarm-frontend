import type { AlarmStage } from '../../lib/dashboard/classifyAlarm';
import { getStageColorClass, formatStageStepLabel } from './stageStepChipPalette';

export function StageStepChip({
  stage,
  stepLabel,
}: {
  stage: AlarmStage;
  stepLabel?: string;
}) {
  return (
    <span
      data-testid="stage-step-chip"
      data-stage={stage}
      className={`badge border ${getStageColorClass(stage)}`}
    >
      {formatStageStepLabel(stage, stepLabel)}
    </span>
  );
}
