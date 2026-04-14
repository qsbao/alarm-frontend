import { useState, useEffect, useCallback } from 'react';

export type CalibrationStatus = 'Current' | 'Due' | 'Overdue';

export interface Calibration {
  id: string;
  machineId: string;
  chamberId: string;
  status: CalibrationStatus;
  lastCalibrated: string; // ISO 8601
  nextDue: string; // ISO 8601
}

// Mock data — timestamps relative to now so they always appear recent
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const MOCK_CALIBRATIONS: Calibration[] = [
  { id: 'CAL-001', machineId: 'LITHO-07', chamberId: 'A', status: 'Current', lastCalibrated: new Date(now - 3 * day).toISOString(), nextDue: new Date(now + 27 * day).toISOString() },
  { id: 'CAL-002', machineId: 'ETCH-03', chamberId: 'B', status: 'Due', lastCalibrated: new Date(now - 28 * day).toISOString(), nextDue: new Date(now + 2 * day).toISOString() },
  { id: 'CAL-003', machineId: 'LITHO-02', chamberId: 'A', status: 'Overdue', lastCalibrated: new Date(now - 25 * day).toISOString(), nextDue: new Date(now - 5 * day).toISOString() },
  { id: 'CAL-004', machineId: 'FAC-01', chamberId: 'C', status: 'Current', lastCalibrated: new Date(now - 7 * day).toISOString(), nextDue: new Date(now + 23 * day).toISOString() },
  { id: 'CAL-005', machineId: 'FAC-12', chamberId: 'A', status: 'Due', lastCalibrated: new Date(now - 20 * day).toISOString(), nextDue: new Date(now + 1 * day).toISOString() },
];

const SIMULATED_LATENCY_MS = 80;

export async function fetchCalibration(id: string): Promise<Calibration | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!id) return null;
  return MOCK_CALIBRATIONS.find((c) => c.id === id) ?? null;
}

export async function lookupCalibrationByEquipment(machineId: string, chamberId?: string): Promise<Calibration | null> {
  await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));
  if (!machineId) return null;
  return MOCK_CALIBRATIONS.find((c) =>
    c.machineId === machineId && (!chamberId || c.chamberId === chamberId)
  ) ?? null;
}

export function getCalibrationUrl(calibrationId: string): string {
  return `https://calibration.fab.internal/records/${calibrationId}`;
}

export function useCalibration(calibrationId: string | null) {
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!calibrationId) {
      setCalibration(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCalibration(calibrationId);
      setCalibration(result);
    } catch {
      setError('Could not load calibration');
    } finally {
      setLoading(false);
    }
  }, [calibrationId]);

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

  return { calibration, loading, error, refetch: fetch };
}

export function useCalibrationByEquipment(machineId: string | null, chamberId: string | undefined) {
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!machineId) {
      setCalibration(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await lookupCalibrationByEquipment(machineId, chamberId);
      setCalibration(result);
    } catch {
      setError('Could not load calibration');
    } finally {
      setLoading(false);
    }
  }, [machineId, chamberId]);

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

  return { calibration, loading, error, refetch: fetch };
}
