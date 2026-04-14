import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import {
  useCalibration,
  useCalibrationByEquipment,
  getCalibrationUrl,
  type CalibrationStatus,
} from '../externalSystems/calibration';
import type { StepStatus } from '../../../../frontend/src/lib/workflows/types';
import type { Issue } from '../../../../frontend/src/types';
import { backend } from '../../../../frontend/src/api/backendClient';

interface CalibrationReferenceFieldProps {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  stepStatus: StepStatus;
  issue: Issue;
}

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  Current: 'bg-green-500/10 text-green-600 dark:text-green-400',
  Due: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

interface LinkedAlarmInfo {
  machineId: string;
  chamberId?: string;
}

export function CalibrationReferenceField({ value, onChange, readOnly, stepStatus, issue }: CalibrationReferenceFieldProps) {
  const [linkedAlarm, setLinkedAlarm] = useState<LinkedAlarmInfo | null>(null);
  const [alarmsLoading, setAlarmsLoading] = useState(true);
  const [alarmsError, setAlarmsError] = useState<string | null>(null);

  // Fetch linked alarms to auto-resolve equipment info
  const fetchAlarms = useCallback(async () => {
    setAlarmsLoading(true);
    setAlarmsError(null);
    try {
      const alarmsRes = await backend.GET('/api/issues/{id}/alarms', {
        params: { path: { id: issue.id } },
      });
      const links = (alarmsRes.data ?? []) as unknown as Array<{ alarmId: string }>;
      if (links.length === 0) {
        setLinkedAlarm(null);
        setAlarmsLoading(false);
        return;
      }
      // Fetch first linked alarm to get machineId/chamberId
      const { data } = await backend.GET('/api/alarms/{id}', {
        params: { path: { id: links[0].alarmId } },
      });
      if (data) {
        const raw = data as unknown as { machineId: string; chamberId?: string };
        setLinkedAlarm({ machineId: raw.machineId, chamberId: raw.chamberId });
      } else {
        setLinkedAlarm(null);
      }
    } catch {
      setAlarmsError('Could not load linked alarms');
    } finally {
      setAlarmsLoading(false);
    }
  }, [issue.id]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Auto-resolve: look up calibration by equipment from linked alarm
  const {
    calibration: resolvedCalibration,
    loading: resolveLoading,
    error: resolveError,
    refetch: resolveRefetch,
  } = useCalibrationByEquipment(
    linkedAlarm?.machineId ?? null,
    linkedAlarm?.chamberId,
  );

  // When resolved calibration arrives and no value is set yet, auto-populate
  useEffect(() => {
    if (resolvedCalibration && !value) {
      onChange(resolvedCalibration.id);
    }
  }, [resolvedCalibration, value, onChange]);

  // For displaying: use value-based fetch if we have a value, otherwise resolved
  const {
    calibration: fetchedCalibration,
    loading: fetchLoading,
    error: fetchError,
    refetch: fetchRefetch,
  } = useCalibration(value || null);

  const calibration = fetchedCalibration ?? resolvedCalibration;
  const loading = alarmsLoading || resolveLoading || fetchLoading;
  const error = alarmsError || resolveError || fetchError;

  const handleRefresh = () => {
    fetchRefetch();
    resolveRefetch();
  };

  // Empty state: no alarms linked
  if (!alarmsLoading && !linkedAlarm && !value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          Equipment Calibration
        </span>
        <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
          <span className="text-[10px] text-theme-muted italic">
            No alarms linked to this issue — calibration cannot be auto-resolved
          </span>
        </div>
      </div>
    );
  }

  // Read-only card for completed/skipped steps
  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          Equipment Calibration
        </span>
        {value ? (
          <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
            {calibration && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-theme-primary">{calibration.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[calibration.status]}`}>
                    {calibration.status}
                  </span>
                </div>
                <span className="text-[10px] text-theme-secondary">
                  {calibration.machineId}{calibration.chamberId ? ` / ${calibration.chamberId}` : ''}
                </span>
                <a
                  href={getCalibrationUrl(calibration.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-1 w-fit"
                >
                  Open in Calibration System <ExternalLink size={10} />
                </a>
              </div>
            )}
            {loading && <span className="text-[10px] text-theme-muted italic">Loading...</span>}
            {error && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-500">
                <AlertCircle size={10} />
                {error}
                <button onClick={handleRefresh} className="underline ml-1">Retry</button>
              </div>
            )}
            {!calibration && !loading && !error && (
              <span className="text-[10px] text-theme-muted">{value}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-theme-muted italic">No calibration attached</span>
        )}
      </div>
    );
  }

  // Editable state
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
        Equipment Calibration
      </span>

      <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
        {loading && <span className="text-[10px] text-theme-muted italic">Resolving calibration...</span>}

        {error && !loading && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-500">
            <AlertCircle size={10} />
            {error}
            <button onClick={handleRefresh} className="underline ml-1">Retry</button>
          </div>
        )}

        {calibration && !loading && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-theme-primary">{calibration.id}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[calibration.status]}`}>
                {calibration.status}
              </span>
            </div>
            <span className="text-[10px] text-theme-secondary">
              {calibration.machineId}{calibration.chamberId ? ` / ${calibration.chamberId}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={getCalibrationUrl(calibration.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-theme-accent hover:underline flex items-center gap-1"
              >
                Open <ExternalLink size={10} />
              </a>
              <button
                onClick={handleRefresh}
                className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-0.5 ml-auto"
                title="Refresh calibration status"
              >
                <RefreshCw size={10} />
              </button>
            </div>
          </div>
        )}

        {!calibration && !loading && !error && (
          <span className="text-[10px] text-theme-muted italic">Calibration not found</span>
        )}
      </div>
    </div>
  );
}
