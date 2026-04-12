import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIssues } from '../../hooks/useIssues';
import { useIssueStore, type SortKey } from '../../stores/issueStore';
import { IssueRow } from './IssueRow';
import { SelectionToolbar } from './SelectionToolbar';

interface SortableHeaderProps {
  label: string;
  columnKey: SortKey;
}

function SortableHeader({ label, columnKey }: SortableHeaderProps) {
  const sortKey = useIssueStore((s) => s.sortKey);
  const sortDir = useIssueStore((s) => s.sortDir);
  const setSort = useIssueStore((s) => s.setSort);
  const active = sortKey === columnKey;

  return (
    <th
      onClick={() => setSort(columnKey)}
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${
        active ? 'text-theme-accent' : 'text-theme-secondary hover:text-theme-primary'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </span>
    </th>
  );
}

function PlainHeader({ label }: { label: string }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-theme-secondary whitespace-nowrap">
      {label}
    </th>
  );
}

function SelectAllCheckbox({ pageItems }: { pageItems: { id: string; status: string }[] }) {
  const selectedIds = useIssueStore((s) => s.selectedIds);
  const toggleSelected = useIssueStore((s) => s.toggleSelected);

  const triageIds = pageItems.filter((i) => i.status === 'Triage').map((i) => i.id);
  const allTriageSelected = triageIds.length > 0 && triageIds.every((id) => selectedIds.has(id));
  const someSelected = triageIds.some((id) => selectedIds.has(id));

  const handleChange = () => {
    if (allTriageSelected) {
      // Deselect all triage on this page
      for (const id of triageIds) {
        if (selectedIds.has(id)) toggleSelected(id);
      }
    } else {
      // Select all triage on this page
      for (const id of triageIds) {
        if (!selectedIds.has(id)) toggleSelected(id);
      }
    }
  };

  return (
    <th className="px-3 py-2 w-8">
      <input
        type="checkbox"
        checked={allTriageSelected}
        ref={(el) => { if (el) el.indeterminate = someSelected && !allTriageSelected; }}
        onChange={handleChange}
        disabled={triageIds.length === 0}
        className="accent-theme-accent cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Select all Triage issues on this page"
      />
    </th>
  );
}

export function IssueTable() {
  const { pageItems, filtered, totalPages, page } = useIssues();
  const setPage = useIssueStore((s) => s.setPage);
  const selectedIds = useIssueStore((s) => s.selectedIds);

  return (
    <div className="card overflow-hidden">
      {selectedIds.size > 0 && <SelectionToolbar pageItems={pageItems} />}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border-default/40 bg-surface-overlay/30">
            <tr>
              <SelectAllCheckbox pageItems={pageItems} />
              <SortableHeader label="date" columnKey="date" />
              <PlainHeader label="alarm_type" />
              <SortableHeader label="risk_level" columnKey="risk_level" />
              <PlainHeader label="issue_status" />
              <PlainHeader label="ongoing_steps" />
              <PlainHeader label="" />
              <PlainHeader label="title" />
              <PlainHeader label="issue_time" />
              <PlainHeader label="operation" />
              <PlainHeader label="product" />
              <PlainHeader label="owner" />
              <PlainHeader label="department" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-sm text-theme-muted">
                  No issues match the current filters.
                </td>
              </tr>
            ) : (
              pageItems.map((issue) => <IssueRow key={issue.id} issue={issue} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border-default/40 bg-surface-overlay/20">
        <div className="text-xs text-theme-muted">
          {filtered.length} issue{filtered.length === 1 ? '' : 's'} · Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="btn-ghost btn-sm"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="btn-ghost btn-sm"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
