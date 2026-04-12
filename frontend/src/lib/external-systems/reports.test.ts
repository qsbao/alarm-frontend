import { describe, expect, it } from 'vitest';
import { fetchReport, getReportUrl, type Report } from './reports';

describe('reports mock module', () => {
  it('returns report data for a valid ID', async () => {
    const report = await fetchReport('RPT-1001');
    expect(report).not.toBeNull();
    expect(report!.id).toBe('RPT-1001');
    expect(report!.version).toBeGreaterThanOrEqual(1);
    expect(report!.status).toBeDefined();
  });

  it('returns null for an invalid ID', async () => {
    const report = await fetchReport('RPT-9999');
    expect(report).toBeNull();
  });

  it('returns null for empty string', async () => {
    const report = await fetchReport('');
    expect(report).toBeNull();
  });

  it('report has expected fields', async () => {
    const report = await fetchReport('RPT-1001');
    expect(report).toMatchObject({
      id: 'RPT-1001',
      title: expect.any(String),
      version: expect.any(Number),
      status: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('report timestamps are within the last 30 days', async () => {
    const report = await fetchReport('RPT-1001');
    const updatedAt = new Date(report!.updatedAt).getTime();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(now - updatedAt).toBeLessThanOrEqual(thirtyDaysMs);
  });

  it('getReportUrl builds correct URL', () => {
    expect(getReportUrl('RPT-1001')).toContain('RPT-1001');
  });

  it('multiple valid IDs return distinct reports', async () => {
    const r1 = await fetchReport('RPT-1001');
    const r2 = await fetchReport('RPT-1002');
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1!.id).not.toBe(r2!.id);
  });
});
