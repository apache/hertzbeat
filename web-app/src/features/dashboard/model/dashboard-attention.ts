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

import type { AlertGroup } from '@/features/alert';
export function dashboardAlertSeverity(group: AlertGroup) {
  const shared = group.commonLabels?.severity ?? group.groupLabels?.severity;
  const labels = [...new Set(group.alerts.map(alert => alert.labels?.severity))];
  const severity = shared ?? (labels.length === 1 ? labels[0] : undefined);
  switch (severity) {
    case 'info':
    case 'warning':
    case 'critical':
    case 'emergency':
      return severity;
    default:
      return 'unknown';
  }
}

export function dashboardEventAge(value: string | number | null | undefined, now: number) {
  if (value === undefined || value === null || value === '') return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  const seconds = (timestamp - now) / 1000;
  if (Math.abs(seconds) < 60) return { timestamp, value: Math.trunc(seconds), unit: 'second' as const };
  if (Math.abs(seconds) < 3600) return { timestamp, value: Math.trunc(seconds / 60), unit: 'minute' as const };
  if (Math.abs(seconds) < 86400) return { timestamp, value: Math.trunc(seconds / 3600), unit: 'hour' as const };
  return { timestamp, value: Math.trunc(seconds / 86400), unit: 'day' as const };
}
