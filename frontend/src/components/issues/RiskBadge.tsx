import type { HumanRiskLevel } from '../../types';

const RISK_CLASSES: Record<HumanRiskLevel, string> = {
  HIGH_RISK: 'text-red-400 bg-red-500/10 border-red-500/20',
  MIDDLE_RISK: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  LOW_RISK: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const RISK_DISPLAY: Record<HumanRiskLevel, string> = {
  HIGH_RISK: 'High',
  MIDDLE_RISK: 'Middle',
  LOW_RISK: 'Low',
};

export function RiskBadge({ level }: { level: HumanRiskLevel }) {
  return (
    <span className={`badge border ${RISK_CLASSES[level]}`}>
      {RISK_DISPLAY[level]}
    </span>
  );
}
