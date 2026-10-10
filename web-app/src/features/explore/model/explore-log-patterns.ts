/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
