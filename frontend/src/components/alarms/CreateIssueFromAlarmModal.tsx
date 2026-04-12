import { X } from 'lucide-react';
import { useState } from 'react';
import type { Alarm, AlarmType, HumanRisk, IssueDraft, RiskLevel, User } from '../../types';
import { ALL_ALARM_TYPES, ALL_RISK_LEVELS } from '../../types';
import { getDefaultWorkflowId } from '../../lib/workflows/workflowDefaults';
import { getAllDefinitions } from '../../lib/workflows/definitions';

const HUMAN_RISK_TO_RISK_LEVEL: Record<HumanRisk, RiskLevel> = {
  high: 'High',
  middle: 'Medium',
  low: 'Low',
};

function buildIssueFromAlarm(alarm: Alarm, now: string): IssueDraft {
  const riskLevel: RiskLevel = alarm.humanRisk
    ? HUMAN_RISK_TO_RISK_LEVEL[alarm.humanRisk]
    : alarm.severity;

  return {
    title: alarm.message,
    description:
      `Escalated from alarm ${alarm.id}: ${alarm.message}. ` +
      `Machine: ${alarm.machineId}. Product: ${alarm.product}. Operation: ${alarm.operation}. ` +
      `Department: ${alarm.department}. Owner: ${alarm.owner}.`,
    date: now,
    alarmType: alarm.type,
    riskLevel,
    status: 'Triage',
    issueTime: alarm.time,
    operation: alarm.operation,
    product: alarm.product,
    ownerId: alarm.owner,
    department: alarm.department,
  };
}

interface CreateIssueFromAlarmModalProps {
  alarm: Alarm;
  currentUser: User;
  onSubmit: (draft: IssueDraft, workflowDefinitionId: string | undefined) => void;
  onClose: () => void;
}

export function CreateIssueFromAlarmModal({
  alarm,
  currentUser,
  onSubmit,
  onClose,
}: CreateIssueFromAlarmModalProps) {
  const initial = buildIssueFromAlarm(alarm, new Date().toISOString());
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [alarmType, setAlarmType] = useState<AlarmType>(initial.alarmType);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initial.riskLevel);
  const [product, setProduct] = useState(initial.product);
  const [operation, setOperation] = useState(initial.operation);
  const [ownerId, setOwnerId] = useState(initial.ownerId);
  const [department, setDepartment] = useState(initial.department);
  const [workflowId, setWorkflowId] = useState<string>(
    getDefaultWorkflowId(alarm.type) ?? '',
  );

  const allDefinitions = getAllDefinitions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        title,
        description,
        date: initial.date,
        alarmType,
        riskLevel,
        status: 'Triage',
        issueTime: initial.issueTime,
        operation,
        product,
        ownerId,
        department,
      },
      workflowId || undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-raised border border-border-default rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-theme-primary">Create Issue from Alarm</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-primary">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base text-xs"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-base text-xs resize-none"
              rows={3}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Alarm Type</span>
              <select
                value={alarmType}
                onChange={(e) => setAlarmType(e.target.value as AlarmType)}
                className="input-base text-xs"
              >
                {ALL_ALARM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Risk Level</span>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="input-base text-xs"
              >
                {ALL_RISK_LEVELS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Product</span>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="input-base text-xs"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Operation</span>
              <input
                type="text"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                className="input-base text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Owner</span>
              <input
                type="text"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="input-base text-xs"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Department</span>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-base text-xs"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">Workflow</span>
            <select
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              className="input-base text-xs"
            >
              <option value="">None</option>
              {allDefinitions.map((d) => (
                <option key={d.id} value={d.id}>{d.name} (v{d.version})</option>
              ))}
            </select>
          </label>

          <div className="text-[10px] text-theme-muted">
            Linked alarm: <span className="font-mono">{alarm.id}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm">
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
