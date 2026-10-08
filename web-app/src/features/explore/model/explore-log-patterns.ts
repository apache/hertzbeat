/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogRow } from './explore-signal-contract';
import { logSeverityLabel } from '@/shared/log-severity';

export type LogPattern = {
  key: string;
  template: string;
  service: string;
  severity: string;
  rows: LogRow[];
};

export function groupLogPatterns(rows: LogRow[], total: number) {
  const byKey = new Map<string, LogPattern>();
  let excluded = 0;
  for (const row of rows) {
    if (typeof row.body !== 'string' || !row.body.trim()) {
      excluded++;
      continue;
    }
    const serviceName = row.resource?.['service.name'] ?? row.resource?.service_name;
    const service = typeof serviceName === 'string' ? serviceName : '';
    const severity = logSeverityLabel(row) ?? '';
    const template = row.body.trim().replace(/\b\d+(?:\.\d+)?\b/gu, '?');
    const key = JSON.stringify([service, severity, template]);
    let group = byKey.get(key);
    if (!group) {
      group = { key, service, severity, template, rows: [] };
      byKey.set(key, group);
    }
    group.rows.push(row);
  }
  return {
    total,
    sampled: rows.length,
    excluded,
    groups: [...byKey.values()].sort(
      (left, right) => right.rows.length - left.rows.length || left.key.localeCompare(right.key)
    )
  };
}
