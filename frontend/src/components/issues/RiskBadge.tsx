import type { RiskLevel } from '../../types';

const RISK_CLASSES: Record<RiskLevel, string> = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`badge border ${RISK_CLASSES[level]}`}>
      {level}
    </span>
  );
}
