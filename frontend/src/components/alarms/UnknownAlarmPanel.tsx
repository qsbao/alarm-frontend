import { AlertTriangle } from 'lucide-react';

export function UnknownAlarmPanel({ kind }: { kind: string }) {
  return (
    <div className="card p-4 border-amber-500/30 bg-amber-500/5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1">
        <AlertTriangle size={12} />
        Unsupported alarm type
      </h3>
      <p className="text-xs text-theme-secondary">
        No panel is registered for alarm type <code className="font-mono text-theme-primary">{kind}</code>.
        The plugin that provides this type may not be loaded.
      </p>
    </div>
  );
}
