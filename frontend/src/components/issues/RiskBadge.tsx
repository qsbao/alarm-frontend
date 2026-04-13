import type { RiskLevel } from '../../types';

const RISK_CLASSES: Record<RiskLevel, string> = {
  P0: 'text-red-400 bg-red-500/10 border-red-500/20',
  P1: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  P2: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  P3: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`badge border ${RISK_CLASSES[level]}`}>
      {level}
    </span>
  );
}
