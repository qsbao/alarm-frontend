const MAX_VISIBLE = 2;

export function OngoingStepsBadge({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  const visible = labels.slice(0, MAX_VISIBLE);
  const overflow = labels.length - MAX_VISIBLE;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-violet-500/15 text-violet-400 border-violet-500/30 max-w-[200px] truncate">
      {visible.join(', ')}
      {overflow > 0 && (
        <span className="text-violet-400/70" title={labels.join(', ')}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
