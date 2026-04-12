import { useCallback, useEffect, useState } from 'react';
import { backend } from '../api/backendClient';
import type { Alarm, AlarmFilters } from '../types';

interface BackendAlarm {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  unit?: string;
  time: string;
  recoveryTime?: string;
  machineId: string;
  chamberId?: string;
  product: string;
  operation: string;
  owner: string;
  department: string;
  chartOwnerId?: string;
  status: string;
  humanRisk?: string;
  labels: string[];
}

function toAlarm(raw: BackendAlarm): Alarm {
  return {
    id: raw.id,
    type: raw.type as Alarm['type'],
    severity: raw.severity as Alarm['severity'],
    message: raw.message,
    value: raw.value,
    unit: raw.unit,
    time: raw.time,
    recoveryTime: raw.recoveryTime,
    machineId: raw.machineId,
    chamberId: raw.chamberId,
    product: raw.product,
    operation: raw.operation,
    owner: raw.owner,
    department: raw.department,
    chartOwnerId: raw.chartOwnerId,
    status: raw.status as Alarm['status'],
    humanRisk: raw.humanRisk as Alarm['humanRisk'],
    labels: (raw.labels ?? []) as Alarm['labels'],
    activity: [],
  };
}

export function useAlarms(filters: AlarmFilters, from: string, to: string) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | string[]> = { from, to };
      if (filters.search) params.search = filters.search;
      if (filters.status?.length) params.status = filters.status;
      if (filters.department?.length) params.department = filters.department;
      if (filters.severity?.length) params.severity = filters.severity;
      if (filters.humanRisk?.length) params.humanRisk = filters.humanRisk;
      if (filters.alarmType?.length) params.alarmType = filters.alarmType;
      if (filters.owner?.length) params.owner = filters.owner;
      if (filters.machineId?.length) params.machineId = filters.machineId;
      if (filters.chamberId?.length) params.chamberId = filters.chamberId;
      if (filters.product?.length) params.product = filters.product;
      if (filters.operation?.length) params.operation = filters.operation;
      if (filters.labels?.length) params.labels = filters.labels;
      if (filters.active) params.active = filters.active;

      const { data } = await backend.GET('/api/alarms', {
        params: { query: params as any },
      });
      const raw = (data ?? []) as unknown as BackendAlarm[];
      setAlarms(raw.map(toAlarm));
    } finally {
      setLoading(false);
    }
  }, [from, to, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { alarms, loading, refresh: fetch };
}

export function useAlarm(id: string | undefined) {
  const [alarm, setAlarm] = useState<Alarm | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!id) {
      setAlarm(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await backend.GET('/api/alarms/{id}', {
        params: { path: { id } },
      });
      if (data) {
        setAlarm(toAlarm(data as unknown as BackendAlarm));
      } else {
        setAlarm(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { alarm, loading, refresh: fetch };
}

export function useAlarmActions(alarmId: string, onSuccess: () => void) {
  const ack = async (note?: string) => {
    const body = note ? { note } : {};
    const { response } = await backend.POST('/api/alarms/{id}/ack', {
      params: { path: { id: alarmId } },
      body: body as any,
    });
    if (response.ok) onSuccess();
    return response;
  };

  const setLabel = async (action: 'add' | 'remove', label: string) => {
    const { response } = await backend.POST('/api/alarms/{id}/label', {
      params: { path: { id: alarmId } },
      body: { action, label } as any,
    });
    if (response.ok) onSuccess();
    return response;
  };

  const setRisk = async (risk: string) => {
    const { response } = await backend.POST('/api/alarms/{id}/risk', {
      params: { path: { id: alarmId } },
      body: { risk } as any,
    });
    if (response.ok) onSuccess();
    return response;
  };

  return { ack, setLabel, setRisk };
}
