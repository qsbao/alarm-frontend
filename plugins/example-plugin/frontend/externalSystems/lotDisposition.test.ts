import { describe, expect, it } from 'vitest';
import {
  fetchLot,
  searchLots,
  getLotUrl,
  type LotStatus,
} from './lotDisposition';

describe('lotDisposition mock module (plugin)', () => {
  it('returns lot data for a valid ID', async () => {
    const lot = await fetchLot('LOT-2024-0001');
    expect(lot).not.toBeNull();
    expect(lot!.id).toBe('LOT-2024-0001');
    expect(lot!.status).toBeDefined();
  });

  it('returns null for an invalid ID', async () => {
    const lot = await fetchLot('LOT-9999-9999');
    expect(lot).toBeNull();
  });

  it('returns null for empty string', async () => {
    const lot = await fetchLot('');
    expect(lot).toBeNull();
  });

  it('lot has expected fields', async () => {
    const lot = await fetchLot('LOT-2024-0001');
    expect(lot).toMatchObject({
      id: 'LOT-2024-0001',
      product: expect.any(String),
      quantity: expect.any(Number),
      status: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('lot timestamps are within the last 30 days', async () => {
    const lot = await fetchLot('LOT-2024-0001');
    const updatedAt = new Date(lot!.updatedAt).getTime();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(now - updatedAt).toBeLessThanOrEqual(thirtyDaysMs);
  });

  it('has all four status types represented', async () => {
    const statuses = new Set<LotStatus>();
    for (const id of [
      'LOT-2024-0001',
      'LOT-2024-0002',
      'LOT-2024-0003',
      'LOT-2024-0004',
      'LOT-2024-0005',
      'LOT-2024-0006',
    ]) {
      const lot = await fetchLot(id);
      if (lot) statuses.add(lot.status);
    }
    expect(statuses.has('InProcess')).toBe(true);
    expect(statuses.has('Hold')).toBe(true);
    expect(statuses.has('Scrapped')).toBe(true);
    expect(statuses.has('Released')).toBe(true);
  });

  it('searchLots returns results filtered by product', async () => {
    const results = await searchLots({ product: 'A7-Litho' });
    expect(results.length).toBeGreaterThan(0);
    for (const lot of results) {
      expect(lot.product).toBe('A7-Litho');
    }
  });

  it('searchLots returns results filtered by query string', async () => {
    const results = await searchLots({ query: 'LOT-2024-0001' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((l) => l.id === 'LOT-2024-0001')).toBe(true);
  });

  it('searchLots returns results filtered by both product and query', async () => {
    const results = await searchLots({ product: 'A7-Litho', query: 'LOT' });
    expect(results.length).toBeGreaterThan(0);
    for (const lot of results) {
      expect(lot.product).toBe('A7-Litho');
    }
  });

  it('searchLots returns empty array when no match', async () => {
    const results = await searchLots({ product: 'NONEXISTENT-PRODUCT' });
    expect(results).toEqual([]);
  });

  it('getLotUrl builds correct URL', () => {
    expect(getLotUrl('LOT-2024-0001')).toContain('LOT-2024-0001');
  });

  it('multiple valid IDs return distinct lots', async () => {
    const l1 = await fetchLot('LOT-2024-0001');
    const l2 = await fetchLot('LOT-2024-0002');
    expect(l1).not.toBeNull();
    expect(l2).not.toBeNull();
    expect(l1!.id).not.toBe(l2!.id);
  });
});
