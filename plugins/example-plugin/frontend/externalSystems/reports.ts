import { useState, useEffect, useCallback } from 'react';

export type ReportStatus = 'Draft' | 'In Review' | 'Published';

export interface Report {
  id: string;
  title: string;
  version: number;
  status: ReportStatus;
  updatedAt: string; // ISO 8601
}

// Mock data — timestamps relative to now so they always appear recent
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const MOCK_REPORTS: Report[] = [
  { id: 'RPT-1001', title: 'SPC Investigation — LITHO-07 EndpointDrift', version: 3, status: 'Published', updatedAt: new Date(now - 2 * day).toISOString() },
  { id: 'RPT-1002', title: 'Particle Count Excursion — ETCH-03', version: 1, status: 'Draft', updatedAt: new Date(now - 5 * day).toISOString() },
  { id: 'RPT-1003', title: 'Gas Flow Deviation Root Cause', version: 2, status: 'In Review', updatedAt: new Date(now - 1 * day).toISOString() },
  { id: 'RPT-1004', title: 'Chamber Leak Investigation — FAC-12', version: 1, status: 'Draft', updatedAt: new Date(now - 10 * day).toISOString() },
  { id: 'RPT-1005', title: 'Voltage Sag Corrective Actions', version: 4, status: 'Published', updatedAt: new Date(now - 3 * day).toISOString() },
];

const SIMULATED_LATENCY_MS = 80;

export async function fetchReport(id: string): Promise<Report | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!id) return null;
  return MOCK_REPORTS.find((r) => r.id === id) ?? null;
}

export function getReportUrl(reportId: string): string {
  return `https://reports.fab.internal/reports/${reportId}`;
}

export function useReport(reportId: string) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!reportId) {
      setReport(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReport(reportId);
      setReport(result);
    } catch {
      setError('Could not load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // Initial fetch + refetch on reportId change
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Focus-refetch: refetch when tab becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        fetch();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fetch]);

  return { report, loading, error, refetch: fetch };
}
