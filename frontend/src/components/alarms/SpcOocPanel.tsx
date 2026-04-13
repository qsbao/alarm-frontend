import { Activity, BarChart3, Calendar, Gauge, Package } from 'lucide-react';
import type { SpcOocDetails } from '../../types';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function SpcOocPanel({ details }: { details: SpcOocDetails }) {
  return (
    <div className="card p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-3 flex items-center gap-1">
        <BarChart3 size={12} />
        SPC OOC Details
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Chart:</span>
            <span className="font-medium text-theme-primary">{details.chartName}</span>
            <span className="text-theme-muted">#{details.chartNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Level:</span>
            <span className="font-medium text-theme-primary">{details.chartLevel}</span>
          </div>
          {details.holdCode && (
            <div className="flex items-center gap-2">
              <Package size={12} className="text-theme-muted" />
              <span className="text-theme-muted">Hold Code:</span>
              <span className="font-medium text-theme-primary">{details.holdCode}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-theme-muted" />
            <span className="text-theme-muted">Tx Datetime:</span>
            <span className="font-medium text-theme-primary">{formatDateTime(details.txDatetime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">Wafers:</span>
            <span className="font-medium text-theme-primary">{details.waferCount}</span>
            <span className="text-theme-muted">OOC:</span>
            <span className="font-medium text-theme-primary">{details.oocCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-theme-muted">OOC Ratio:</span>
            <span className="font-medium text-theme-primary">
              {details.waferCount > 0
                ? `${((details.oocCount / details.waferCount) * 100).toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
