import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-subtle text-theme-accent border border-theme-accent/20">
      <span className="text-theme-muted">{label}:</span>
      {value}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:bg-theme-accent/20 rounded-full p-0.5 transition-colors"
        title={`Remove ${label}: ${value}`}
      >
        <X size={10} />
      </button>
    </span>
  );
}
