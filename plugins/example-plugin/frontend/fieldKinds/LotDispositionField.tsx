import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, Search } from 'lucide-react';
import {
  useLot,
  searchLots,
  getLotUrl,
  type Lot,
  type LotStatus,
} from '../externalSystems/lotDisposition';
import type { FieldProps } from '../../../../frontend/src/lib/workflows/fieldKindRegistry';

const STATUS_COLORS: Record<LotStatus, string> = {
  InProcess: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Hold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Scrapped: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Released: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

export function LotDispositionField({ value, onChange, readOnly, stepStatus, issue }: FieldProps) {
  const { lot, loading, error, refetch } = useLot(value);
  const [showPicker, setShowPicker] = useState(!value);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Lot[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    if (!showPicker) return;
    let cancelled = false;
    setSearchLoading(true);
    searchLots({ product: issue.product, query: debouncedQuery || undefined }).then((lots) => {
      if (!cancelled) {
        setResults(lots);
        setSearchLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, showPicker, issue.product]);

  const handleSelect = useCallback((lotId: string) => {
    onChange(lotId);
    setShowPicker(false);
    setQuery('');
  }, [onChange]);

  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          Lot Disposition
        </span>
        {value ? (
          <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
            {lot && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-theme-primary">{lot.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[lot.status]}`}>
                    {lot.status}
                  </span>
                </div>
                <span className="text-[10px] text-theme-secondary">
                  {lot.product} — {lot.quantity} wafers
                </span>
                <a
                  href={getLotUrl(lot.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-1 w-fit"
                >
                  Open in Lot System <ExternalLink size={10} />
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
            {!lot && !loading && !error && (
              <span className="text-[10px] text-theme-muted">{value}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-theme-muted italic">No lot selected</span>
        )}
      </div>
    );
  }

  if (value && !showPicker) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          Lot Disposition
        </span>
        <div className="rounded bg-surface-overlay/40 border border-border-subtle/30 p-2">
          {loading && <span className="text-[10px] text-theme-muted italic">Loading lot...</span>}

          {error && !loading && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-500">
              <AlertCircle size={10} />
              {error}
              <button onClick={refetch} className="underline ml-1">Retry</button>
            </div>
          )}

          {lot && !loading && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-theme-primary">{lot.id}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[lot.status]}`}>
                  {lot.status}
                </span>
              </div>
              <span className="text-[10px] text-theme-secondary">
                {lot.product} — {lot.quantity} wafers
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={getLotUrl(lot.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-1"
                >
                  Open <ExternalLink size={10} />
                </a>
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-overlay/60 text-theme-muted hover:bg-surface-overlay transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={refetch}
                  className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-0.5 ml-auto"
                  title="Refresh lot status"
                >
                  <RefreshCw size={10} />
                </button>
              </div>
            </div>
          )}

          {!lot && !loading && !error && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-theme-muted italic">Lot not found</span>
              <button
                onClick={() => setShowPicker(true)}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-overlay/60 text-theme-muted hover:bg-surface-overlay transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
        Lot Disposition
      </span>
      <div className="relative">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-surface-overlay/40 border border-border-subtle/30">
          <Search size={12} className="text-theme-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search lots (${issue.product})...`}
            className="flex-1 bg-transparent text-xs text-theme-primary placeholder:text-theme-muted/60 outline-none"
            autoFocus
          />
          {value && (
            <button
              onClick={() => { setShowPicker(false); setQuery(''); }}
              className="text-[10px] text-theme-muted hover:text-theme-primary transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-1 rounded bg-surface-overlay/60 border border-border-subtle/30 max-h-40 overflow-y-auto">
          {searchLoading && (
            <div className="px-2 py-2 text-[10px] text-theme-muted italic">Searching...</div>
          )}
          {!searchLoading && results.length === 0 && (
            <div className="px-2 py-2 text-[10px] text-theme-muted italic">No lots found</div>
          )}
          {!searchLoading && results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-2 py-1.5 hover:bg-accent-subtle/30 transition-colors flex items-center gap-2 border-b border-border-subtle/20 last:border-b-0"
            >
              <span className="text-xs font-medium text-theme-primary">{r.id}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[r.status]}`}>
                {r.status}
              </span>
              <span className="text-[10px] text-theme-muted ml-auto">{r.quantity} wafers</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
