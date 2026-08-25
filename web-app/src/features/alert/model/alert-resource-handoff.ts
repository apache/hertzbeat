/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  alertRoutePaths,
  buildEntityDetailPath,
  buildMonitorDetailPath,
  normalizeAlertCenterReturnTo
} from '@/shared/navigation/app-paths';

import type { AlertRecord } from './alert-model';

const resourceAuthorityLabels = {
  monitor: 'hertzbeat.monitor.id',
  entity: 'hertzbeat.entity.id'
} as const;

export type AlertResourceHandoff = {
  resource: keyof typeof resourceAuthorityLabels;
  path: string;
};

export function alertResourceHandoffs(alert: AlertRecord, returnTo: string): AlertResourceHandoff[] {
  if (!alert.labels) return [];
  const safeReturnTo = normalizeAlertCenterReturnTo(returnTo) ?? alertRoutePaths.center;
  const monitorId = exactAuthorityId(alert.labels[resourceAuthorityLabels.monitor]);
  const entityId = exactAuthorityId(alert.labels[resourceAuthorityLabels.entity]);
  return [
    ...(monitorId === undefined
      ? []
      : [{ resource: 'monitor' as const, path: withReturnTo(buildMonitorDetailPath(monitorId), safeReturnTo) }]),
    ...(entityId === undefined
      ? []
      : [{ resource: 'entity' as const, path: buildEntityDetailPath(entityId, safeReturnTo) }])
  ];
}

function exactAuthorityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && String(id) === value ? id : undefined;
}

function withReturnTo(path: string, returnTo: string) {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
