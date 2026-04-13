import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Alarm, AlarmLabel, RiskLevel } from '../types';
import { ALL_ALARM_LABELS, ALL_RISK_LEVELS } from '../types';
import { useCurrentUserStore } from '../stores/currentUserStore';

import { useAlarm, useAlarmActions, useAlarmActivity } from '../hooks/useAlarms';

const SEVERITY_COLOR: Record<RiskLevel, string> = {
  P0: 'bg-red-500/15 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Acked: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

const RISK_COLOR: Record<RiskLevel, string> = {
  P0: 'bg-red-500/15 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

interface QuickAckDrawerProps {
  alarmId: string;
  onClose: () => void;
}

export function QuickAckDrawer({ alarmId, onClose }: QuickAckDrawerProps) {
  const { alarm, refresh } = useAlarm(alarmId);
  const { activity, refresh: refreshActivity } = useAlarmActivity(alarmId);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const actions = useAlarmActions(alarmId, () => { refresh(); refreshActivity(); });
  const [comment, setComment] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reset comment when alarm changes
  useEffect(() => {
    setComment('');
  }, [alarmId]);

  if (!alarm) return null;

  const canAck = currentUser.department !== '' && currentUser.department === alarm.department;

  const handleAck = async () => {
    await actions.ack(comment || undefined);
    setComment('');
    onClose();
  };

  const handleLabelToggle = async (label: AlarmLabel) => {
    const action = alarm.labels.includes(label) ? 'remove' : 'add';
    await actions.setLabel(action, label);
  };

  const handleRiskChange = async (risk: RiskLevel) => {
    await actions.setRisk(risk);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-surface-base border-l border-border-default z-50 flex flex-col shadow-2xl animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-primary">Quick Triage</span>
            <span className="badge font-mono text-[10px]">{alarm.id}</span>
          </div>
          <button onClick={onClose} className="btn-ghost btn-xs">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Alarm Summary */}
          <div>
            <div className="text-sm text-theme-primary font-medium mb-2">{alarm.message}</div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="badge text-[10px]">{alarm.type}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SEVERITY_COLOR[alarm.severity]}`}>
                {alarm.severity}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLOR[alarm.status]}`}>
                {alarm.status}
              </span>
            </div>
            <div className="text-xs text-theme-secondary space-y-0.5">
              <div><span className="text-theme-muted">Machine:</span> <span className="font-mono">{alarm.eqpId}</span>{alarm.chamberId && ` / ${alarm.chamberId}`}</div>
              <div><span className="text-theme-muted">Owner:</span> {alarm.owner} <span className="text-theme-muted">({alarm.department})</span></div>
            </div>
          </div>

          {/* Ack section */}
          {alarm.status === 'Open' && (
            <div className="flex flex-col gap-2 border-t border-border-subtle/40 pt-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Acknowledge</h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment (optional)..."
                className="input-base text-xs resize-none"
                rows={2}
              />
              <div className="relative group inline-block">
                <button
                  onClick={handleAck}
                  disabled={!canAck}
                  className="btn-primary btn-sm w-full"
                >
                  <Check size={13} />
                  Acknowledge
                </button>
                {!canAck && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-raised border border-border-default rounded text-[10px] text-theme-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    You must be in the {alarm.department} department to acknowledge this alarm
                  </div>
                )}
              </div>
            </div>
          )}

          {alarm.status === 'Acked' && (() => {
            const ackEntry = activity.find((e) => e.type === 'acked' || e.type === 'acked_via_issue');
            return (
              <div className="border-t border-border-subtle/40 pt-4">
                <div className="text-xs text-theme-muted italic">
                  Acknowledged{ackEntry?.author ? ` by ${ackEntry.author}` : ''}
                </div>
                {ackEntry?.note && (
                  <div className="mt-2 px-3 py-2 bg-surface-overlay/40 rounded border border-border-subtle/40 text-xs text-theme-secondary">
                    {ackEntry.note}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Labels */}
          <div className="border-t border-border-subtle/40 pt-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Labels</h3>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ALARM_LABELS.map((label) => {
                const active = alarm.labels.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => handleLabelToggle(label)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                      active
                        ? 'bg-accent-subtle text-theme-accent border-theme-accent/30'
                        : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk picker */}
          <div className="border-t border-border-subtle/40 pt-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-2">Risk Level</h3>
            <div className="flex gap-1.5">
              {ALL_RISK_LEVELS.map((risk) => {
                const isActive = alarm.riskLevel === risk;
                return (
                  <button
                    key={risk}
                    onClick={() => handleRiskChange(risk)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                      isActive
                        ? RISK_COLOR[risk]
                        : 'bg-surface-overlay/40 text-theme-muted border-border-subtle/40 hover:text-theme-secondary'
                    }`}
                  >
                    {RISK_LABELS[risk]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
