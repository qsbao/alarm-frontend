import { useState, useEffect, useCallback } from 'react';

export type LotStatus = 'InProcess' | 'Hold' | 'Scrapped' | 'Released';

export interface Lot {
  id: string;
  product: string;
  quantity: number;
  status: LotStatus;
  updatedAt: string; // ISO 8601
}

// Mock data — timestamps relative to now so they always appear recent
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const MOCK_LOTS: Lot[] = [
  { id: 'LOT-2024-0001', product: 'A7-Litho', quantity: 25, status: 'InProcess', updatedAt: new Date(now - 1 * day).toISOString() },
  { id: 'LOT-2024-0002', product: 'A7-Litho', quantity: 50, status: 'Hold', updatedAt: new Date(now - 3 * day).toISOString() },
  { id: 'LOT-2024-0003', product: 'D1-PVD', quantity: 30, status: 'Released', updatedAt: new Date(now - 2 * day).toISOString() },
  { id: 'LOT-2024-0004', product: 'D1-PVD', quantity: 10, status: 'Scrapped', updatedAt: new Date(now - 7 * day).toISOString() },
  { id: 'LOT-2024-0005', product: 'F4-Metro', quantity: 40, status: 'InProcess', updatedAt: new Date(now - 4 * day).toISOString() },
  { id: 'LOT-2024-0006', product: 'F4-Metro', quantity: 20, status: 'Released', updatedAt: new Date(now - 5 * day).toISOString() },
  { id: 'LOT-2024-0007', product: 'A7-Litho', quantity: 15, status: 'InProcess', updatedAt: new Date(now - 6 * day).toISOString() },
  { id: 'LOT-2024-0008', product: 'D1-PVD', quantity: 35, status: 'Hold', updatedAt: new Date(now - 8 * day).toISOString() },
];

const SIMULATED_LATENCY_MS = 80;

export async function fetchLot(id: string): Promise<Lot | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!id) return null;
  return MOCK_LOTS.find((l) => l.id === id) ?? null;
}

export async function searchLots(params: { product?: string; query?: string }): Promise<Lot[]> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  return MOCK_LOTS.filter((lot) => {
    if (params.product && lot.product !== params.product) return false;
    if (params.query && !lot.id.toLowerCase().includes(params.query.toLowerCase())) return false;
    return true;
  });
}

export function getLotUrl(lotId: string): string {
  return `https://lots.fab.internal/lots/${lotId}`;
}

export function useLot(lotId: string) {
  const [lot, setLot] = useState<Lot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!lotId) {
      setLot(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLot(lotId);
      setLot(result);
    } catch {
      setError('Could not load lot');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

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

  return { lot, loading, error, refetch: fetch };
}
