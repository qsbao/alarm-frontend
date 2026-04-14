import { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useReport, getReportUrl } from '../externalSystems/reports';
import type { StepStatus } from '../../../../frontend/src/lib/workflows/types';

interface ReportReferenceFieldProps {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  stepStatus: StepStatus;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'In Review': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Published: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

export function ReportReferenceField({ value, onChange, readOnly, stepStatus }: ReportReferenceFieldProps) {
  const [inputValue, setInputValue] = useState(value);
  const { report, loading, error, refetch } = useReport(value);

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Read-only card for completed/skipped steps
  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          Report ID
        </span>
        {value ? (
          <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
            {report && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-theme-primary">{report.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[report.status] ?? ''}`}>
                    {report.status}
                  </span>
                  <span className="text-[10px] text-theme-muted">v{report.version}</span>
                </div>
                <span className="text-[10px] text-theme-secondary">{report.title}</span>
                <a
                  href={getReportUrl(report.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-1 w-fit"
                >
                  Open in Report System <ExternalLink size={10} />
                </a>
              </div>
            )}
            {loading && <span className="text-[10px] text-theme-muted italic">Loading...</span>}
            {error && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-500">
                <AlertCircle size={10} />
                {error}
                <button onClick={refetch} className="underline ml-1">Retry</button>
              </div>
            )}
            {!report && !loading && !error && (
              <span className="text-[10px] text-theme-muted">{value}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-theme-muted italic">No report attached</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
        Report ID
      </span>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="e.g. RPT-1001"
        className="input-base text-xs"
      />

      {/* Live status card */}
      {value && (
        <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
          {loading && <span className="text-[10px] text-theme-muted italic">Loading report...</span>}

          {error && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-500">
              <AlertCircle size={10} />
              {error}
              <button onClick={refetch} className="underline ml-1">Retry</button>
            </div>
          )}

          {report && !loading && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-theme-primary">{report.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[report.status] ?? ''}`}>
                  {report.status}
                </span>
                <span className="text-[10px] text-theme-muted">v{report.version}</span>
                <a
                  href={getReportUrl(report.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-1"
                >
                  Open <ExternalLink size={10} />
                </a>
                <button
                  onClick={refetch}
                  className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-0.5 ml-auto"
                  title="Refresh report status"
                >
                  <RefreshCw size={10} />
                </button>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <span className="text-[10px] text-theme-muted italic">Report not found</span>
          )}
        </div>
      )}
    </div>
  );
}
