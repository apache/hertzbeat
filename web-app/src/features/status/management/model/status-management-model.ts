/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { StatusComponent, StatusIncident } from '../api/status-management-api';

export { isStatusOrgNotFound } from '@/features/status/shared/status-error-model';

export function parseLabels(value: string) {
  return Object.fromEntries(value.split(',').map(item => item.trim()).filter(Boolean).map(item => {
    const separator = item.indexOf('=');
    return separator < 0 ? [item, ''] : [item.slice(0, separator).trim(), item.slice(separator + 1).trim()];
  }));
}

export function formatLabels(labels?: Record<string, string>) {
  return Object.entries(labels ?? {}).map(([key, value]) => `${key}=${value}`).join(', ');
}

type IncidentPayloadInput = {
  incident: StatusIncident;
  components: StatusComponent[];
  componentIds: number[];
  message: string;
  timestamp: number;
};

export function buildIncidentPayload(input: IncidentPayloadInput): StatusIncident {
  const { incident, components, componentIds, message, timestamp } = input;
  if (!isIncidentState(incident.state)) throw new Error('Unsupported incident state');
  if (!message.trim()) throw new Error('Incident update message is required');
  if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error('Incident update timestamp is invalid');
  const selected = new Set(componentIds);
  return {
    ...incident,
    name: incident.name.trim(),
    components: components.filter(component => component.id != null && selected.has(component.id)),
    contents: [
      ...(incident.contents ?? []),
      {
        ...(incident.id == null ? {} : { incidentId: incident.id }),
        message: message.trim(),
        state: incident.state,
        timestamp
      }
    ]
  };
}

export function statusStateKey(state: number) {
  return state === 0 ? 'status.normal' : state === 1 ? 'status.abnormal' : 'statusManagement.unknown';
}

export function incidentStateKey(state: number) {
  return ['statusManagement.investigating', 'statusManagement.identified',
    'statusManagement.monitoring', 'statusManagement.resolved'][state] ?? 'statusManagement.unknown';
}

export function latestIncidentMessage(incident: StatusIncident) {
  return [...(incident.contents ?? [])].sort((left, right) => right.timestamp - left.timestamp)[0]?.message ?? '—';
}

function isIncidentState(state: number) {
  return Number.isInteger(state) && state >= 0 && state <= 3;
}
