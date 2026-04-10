import { FilterBar } from '../components/issues/FilterBar';
import { IssueTable } from '../components/issues/IssueTable';
import { useIssues } from '../hooks/useIssues';

export function IssueListPage() {
  const { loading } = useIssues();

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <div className="header-bar px-6 py-4">
        <h1 className="text-lg font-semibold text-theme-primary mb-3">Issues</h1>
        <FilterBar />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-sm text-theme-muted">Loading issues...</div>
        ) : (
          <IssueTable />
        )}
      </div>
    </div>
  );
}
