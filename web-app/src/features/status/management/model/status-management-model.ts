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

import type { RemoteCollectionState, RemotePageState, RemoteRecordState } from '@/shared/remote-state';

import { StatusManagementContractError, type StatusComponent, type StatusIncident } from './status-management-contract';

export const statusComponentMethod = {
  automatic: 0,
  manual: 1
} as const;

export const statusComponentState = {
  normal: 0,
  abnormal: 1,
  unknown: 2
} as const;

export const statusIncidentState = {
  investigating: 0,
  identified: 1,
  monitoring: 2,
  resolved: 3
} as const;

const incidentStateKeys: Record<number, string> = {
  [statusIncidentState.investigating]: 'statusManagement.investigating',
  [statusIncidentState.identified]: 'statusManagement.identified',
  [statusIncidentState.monitoring]: 'statusManagement.monitoring',
  [statusIncidentState.resolved]: 'statusManagement.resolved'
};

export type StatusRecordState<T> = RemoteRecordState<T, 'missing' | 'permission' | 'unavailable' | 'error'>;
export type StatusCollectionState<T> = RemoteCollectionState<T, 'permission' | 'unavailable' | 'error'>;
export type StatusIncidentCollectionState<T> = RemotePageState<T, 'permission' | 'unavailable' | 'error'>;

export { isStatusOrgNotFound } from '@/features/status/shared/status-error-model';

/** Creation defaults preserve the established Status Page workflow; they are never missing-data fallbacks. */
export function createStatusComponentDraft(orgId: number): StatusComponent | undefined {
  if (!isPositiveId(orgId)) return undefined;
  return {
    orgId,
    name: '',
    method: statusComponentMethod.automatic,
    configState: statusComponentState.normal,
    state: statusComponentState.normal
  };
}

/** A new incident starts in the established investigating state only after its organization is known. */
export function createStatusIncidentDraft(orgId: number): StatusIncident | undefined {
  if (!isPositiveId(orgId)) return undefined;
  return {
    orgId,
    name: '',
    state: statusIncidentState.investigating,
    components: [],
    contents: []
  };
}

function parseLabels(value: string) {
  return Object.fromEntries(
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const separator = item.indexOf('=');
        return separator < 0 ? [item, ''] : [item.slice(0, separator).trim(), item.slice(separator + 1).trim()];
      })
  );
}

export function formatLabels(labels?: Record<string, string> | null) {
  return Object.entries(labels ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

type ComponentPayloadInput = {
  component: StatusComponent;
  name: string;
  description?: string | null;
  method: number;
  configState?: number;
  labelText?: string;
};

/** Rebuilds the writable component without trusting unregistered Ant Form fields. */
export function buildStatusComponentPayload(input: ComponentPayloadInput): StatusComponent {
  const { component } = input;
  const configState = input.method === statusComponentMethod.manual ? input.configState : component.configState;
  if (!isValidComponentIdentity(component) || !isValidComponentInput(input) || !isComponentState(configState)) {
    throw new StatusManagementContractError();
  }
  return {
    ...(component.id == null ? {} : { id: component.id }),
    orgId: component.orgId,
    name: input.name.trim(),
    ...(input.description == null ? {} : { description: input.description.trim() }),
    labels: input.method === statusComponentMethod.automatic ? parseLabels(input.labelText ?? '') : {},
    method: input.method,
    configState,
    state: component.state
  };
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
  if (state === statusComponentState.normal) return 'status.normal';
  if (state === statusComponentState.abnormal) return 'status.abnormal';
  return 'statusManagement.unknown';
}

export function incidentStateKey(state: number) {
  return incidentStateKeys[state] ?? 'statusManagement.unknown';
}

export function latestIncidentMessage(incident: StatusIncident) {
  return [...(incident.contents ?? [])].sort((left, right) => right.timestamp - left.timestamp)[0]?.message ?? '—';
}

function isIncidentState(state: number) {
  return Object.values(statusIncidentState).some(value => value === state);
}

function isPositiveId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function isComponentMethod(value: number) {
  return Object.values(statusComponentMethod).some(method => method === value);
}

function isComponentState(value: number | undefined): value is number {
  return value !== undefined && Object.values(statusComponentState).some(state => state === value);
}

function isValidComponentIdentity(component: StatusComponent) {
  const validOptionalId = component.id === undefined || isPositiveId(component.id);
  return validOptionalId && isPositiveId(component.orgId) && isComponentState(component.state);
}

function isValidComponentInput(input: ComponentPayloadInput) {
  return Boolean(input.name.trim()) && isComponentMethod(input.method);
}
