import { useCallback, useEffect, useState } from 'react';
import { backend } from '../api/backendClient';
import type { Alarm, AlarmFilters, Module } from '../types';

interface BackendAlarm {
  id: string;
  type: string;
  severity: string;
  message: string;
  value?: number;
  unit?: string;
  alarmTime: string;
  eventTime?: string;
  alarmDate?: string;
  recoveryTime?: string;
  eqpId: string;
  chamberId?: string;
  productId: string;
  operName?: string;
  operNo?: string;
  technologyId?: string;
  productGroupId?: string;
  processOperName?: string;
  processOperNo?: string;
  lotId?: string;
  lotPriority?: number;
  waferId?: string;
  recipeId?: string;
  routeId?: string;
  module?: string;
  moduleOwner?: string;
  piOwner?: string;
  owner: string;
  department: string;
  chartOwnerId?: string;
  status: string;
  riskLevel?: string;
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
    alarmTime: raw.alarmTime,
    eventTime: raw.eventTime,
    alarmDate: raw.alarmDate,
    recoveryTime: raw.recoveryTime,
    eqpId: raw.eqpId,
    chamberId: raw.chamberId,
    productId: raw.productId,
    operName: raw.operName,
    operNo: raw.operNo,
    technologyId: raw.technologyId,
    productGroupId: raw.productGroupId,
    processOperName: raw.processOperName,
    processOperNo: raw.processOperNo,
    lotId: raw.lotId,
    lotPriority: raw.lotPriority,
    waferId: raw.waferId,
    recipeId: raw.recipeId,
    routeId: raw.routeId,
    module: raw.module as Module,
    moduleOwner: raw.moduleOwner,
    piOwner: raw.piOwner,
    owner: raw.owner,
    department: raw.department,
    chartOwnerId: raw.chartOwnerId,
    status: raw.status as Alarm['status'],
    riskLevel: raw.riskLevel as Alarm['riskLevel'],
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
      if (filters.riskLevel?.length) params.riskLevel = filters.riskLevel;
      if (filters.alarmType?.length) params.alarmType = filters.alarmType;
      if (filters.owner?.length) params.owner = filters.owner;
      if (filters.eqpId?.length) params.eqpId = filters.eqpId;
      if (filters.chamberId?.length) params.chamberId = filters.chamberId;
      if (filters.productId?.length) params.productId = filters.productId;
      if (filters.operName?.length) params.operName = filters.operName;
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
