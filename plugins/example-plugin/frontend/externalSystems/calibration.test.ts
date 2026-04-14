import { describe, expect, it } from 'vitest';
import { fetchCalibration, lookupCalibrationByEquipment, getCalibrationUrl, type CalibrationStatus } from './calibration';

describe('calibration mock module', () => {
  it('returns calibration data for a valid ID', async () => {
    const cal = await fetchCalibration('CAL-001');
    expect(cal).not.toBeNull();
    expect(cal!.id).toBe('CAL-001');
    expect(cal!.status).toBeDefined();
  });

  it('returns null for an invalid ID', async () => {
    const cal = await fetchCalibration('CAL-9999');
    expect(cal).toBeNull();
  });

  it('returns null for empty string', async () => {
    const cal = await fetchCalibration('');
    expect(cal).toBeNull();
  });

  it('calibration has expected fields', async () => {
    const cal = await fetchCalibration('CAL-001');
    expect(cal).toMatchObject({
      id: 'CAL-001',
      machineId: expect.any(String),
      chamberId: expect.any(String),
      status: expect.any(String),
      lastCalibrated: expect.any(String),
      nextDue: expect.any(String),
    });
  });

  it('calibration timestamps are within the last 30 days', async () => {
    const cal = await fetchCalibration('CAL-001');
    const lastCalibrated = new Date(cal!.lastCalibrated).getTime();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(now - lastCalibrated).toBeLessThanOrEqual(thirtyDaysMs);
  });

  it('has all three status types represented', async () => {
    const statuses = new Set<CalibrationStatus>();
    for (const id of ['CAL-001', 'CAL-002', 'CAL-003', 'CAL-004', 'CAL-005']) {
      const cal = await fetchCalibration(id);
      if (cal) statuses.add(cal.status);
    }
    expect(statuses.has('Current')).toBe(true);
    expect(statuses.has('Due')).toBe(true);
    expect(statuses.has('Overdue')).toBe(true);
  });

  it('lookupCalibrationByEquipment returns calibration for valid machine+chamber', async () => {
    const cal = await lookupCalibrationByEquipment('LITHO-07', 'A');
    expect(cal).not.toBeNull();
    expect(cal!.machineId).toBe('LITHO-07');
    expect(cal!.chamberId).toBe('A');
  });

  it('lookupCalibrationByEquipment returns null for unknown equipment', async () => {
    const cal = await lookupCalibrationByEquipment('UNKNOWN-99', 'X');
    expect(cal).toBeNull();
  });

  it('getCalibrationUrl builds correct URL', () => {
    expect(getCalibrationUrl('CAL-001')).toContain('CAL-001');
  });

  it('multiple valid IDs return distinct calibrations', async () => {
    const c1 = await fetchCalibration('CAL-001');
    const c2 = await fetchCalibration('CAL-002');
    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(c1!.id).not.toBe(c2!.id);
  });
});
