/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const CANONICAL_OTEL_RESOURCE_IDENTITY_KEYS: string[] = [
  'service.name',
  'service.namespace',
  'service.version',
  'service.instance.id',
  'deployment.environment.name',
  'host.name',
  'host.id',
  'k8s.namespace.name',
  'k8s.deployment.name',
  'k8s.pod.name',
  'container.name',
  'cloud.provider',
  'cloud.region',
  'cloud.resource_id'
];

export const ENTITY_IDENTITY_PRESET_KEYS: string[] = [
  ...CANONICAL_OTEL_RESOURCE_IDENTITY_KEYS,
  'messaging.destination.name',
  'k8s.workload.name',
  'endpoint.url'
];

export const DEFINITION_DISCOVERY_QUERY_IDENTITY_KEYS: string[] = [
  'endpoint.url',
  'service.name',
  'service.instance.id',
  'host.name',
  'host.id',
  'k8s.deployment.name',
  'k8s.pod.name',
  'container.name',
  'database.name',
  'database.instance'
];

export const ALERT_SEARCH_IDENTITY_KEYS: string[] = [
  'service.name',
  'service.instance.id',
  'messaging.destination.name',
  'endpoint.url',
  'host.name',
  'host.id',
  'k8s.workload.name',
  'k8s.deployment.name',
  'container.name',
  'cloud.resource_id'
];

export const ALERT_SEARCH_LABEL_KEYS: string[] = [
  'service.name',
  'service.instance.id',
  'messaging.destination.name',
  'endpoint.url',
  'host.name',
  'host.id',
  'k8s.workload.name',
  'k8s.deployment.name',
  'container.name',
  'cloud.resource_id'
];

export const LOG_SEARCH_IDENTITY_KEYS: string[] = [
  'service.name',
  'service.instance.id',
  'messaging.destination.name',
  'endpoint.url',
  'host.name',
  'host.id',
  'k8s.deployment.name',
  'container.name',
  'cloud.resource_id'
];

export const TRACE_SEARCH_IDENTITY_KEYS: string[] = [
  'service.name',
  'service.instance.id',
  'service.namespace',
  'deployment.environment.name',
  'host.name',
  'k8s.deployment.name',
  'container.name',
  'cloud.resource_id'
];

export function isEntityIdentityPresetKey(identityKey?: string): boolean {
  return identityKey != null && ENTITY_IDENTITY_PRESET_KEYS.includes(identityKey);
}

export function getEntityIdentityPriority(identityKey?: string): number {
  switch (identityKey) {
    case 'service.instance.id':
    case 'host.id':
      return 140;
    case 'cloud.resource_id':
      return 130;
    case 'endpoint.url':
    case 'messaging.destination.name':
      return 120;
    case 'service.name':
    case 'host.name':
    case 'k8s.deployment.name':
    case 'k8s.workload.name':
      return 90;
    case 'k8s.pod.name':
    case 'monitor.instance':
      return 80;
    case 'container.name':
      return 70;
    case 'monitor.name':
      return 50;
    case 'service.namespace':
    case 'k8s.namespace.name':
      return 30;
    case 'deployment.environment.name':
    case 'monitor.app':
      return 20;
    case 'service.version':
      return 15;
    case 'cloud.provider':
    case 'cloud.region':
      return 10;
    default:
      return 40;
  }
}

export function getPrimaryIdentityKeyForEntityType(entityType?: string): string {
  switch (entityType) {
    case 'host':
    case 'device':
      return 'host.name';
    case 'queue':
      return 'messaging.destination.name';
    case 'endpoint':
      return 'endpoint.url';
    case 'k8s_workload':
      return 'k8s.workload.name';
    default:
      return 'service.name';
  }
}

export interface TelemetryIdentityMonitorLike {
  app?: string;
  name?: string;
  instance?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface TelemetryIdentityHeuristics {
  hostLikeApps: ReadonlySet<string>;
  deviceLikeApps: ReadonlySet<string>;
  queueLikeApps: ReadonlySet<string>;
  apiLikeApps: ReadonlySet<string>;
  endpointLikeApps: ReadonlySet<string>;
  databaseLikeApps: ReadonlySet<string>;
  middlewareLikeApps: ReadonlySet<string>;
  serviceLikeApps: ReadonlySet<string>;
}

function trimIdentityText(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function putTelemetryIdentityCandidate(target: Map<string, string>, key: string, value?: string): void {
  const normalized = trimIdentityText(value);
  if (!key || normalized == null || target.has(key)) {
    return;
  }
  target.set(key, normalized);
}

export function resolveTelemetryEndpointIdentity(instance?: string, name?: string): string | undefined {
  const normalizedInstance = trimIdentityText(instance);
  if (normalizedInstance != null && !normalizedInstance.toLowerCase().startsWith('null:')) {
    return normalizedInstance;
  }
  return trimIdentityText(name) || normalizedInstance;
}

export function extractTelemetryIdentityMatchesForMonitor(
  monitor: TelemetryIdentityMonitorLike,
  heuristics: TelemetryIdentityHeuristics
): Array<{ key: string; value: string }> {
  const identities = new Map<string, string>();
  Object.entries(monitor.labels || {}).forEach(([key, value]) => {
    if (isEntityIdentityPresetKey(key)) {
      putTelemetryIdentityCandidate(identities, key, value);
    }
  });
  Object.entries(monitor.annotations || {}).forEach(([key, value]) => {
    if (isEntityIdentityPresetKey(key)) {
      putTelemetryIdentityCandidate(identities, key, value);
    }
  });
  const app = (trimIdentityText(monitor.app) || '').toLowerCase();
  if (heuristics.hostLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'host.name', monitor.name);
    putTelemetryIdentityCandidate(identities, 'host.id', monitor.instance);
  }
  if (heuristics.queueLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'messaging.destination.name', monitor.name || monitor.instance);
  }
  if (
    heuristics.serviceLikeApps.has(app) ||
    heuristics.databaseLikeApps.has(app) ||
    (heuristics.middlewareLikeApps.has(app) && !heuristics.queueLikeApps.has(app))
  ) {
    putTelemetryIdentityCandidate(identities, 'service.name', monitor.name);
  }
  if (heuristics.endpointLikeApps.has(app)) {
    putTelemetryIdentityCandidate(identities, 'endpoint.url', resolveTelemetryEndpointIdentity(monitor.instance, monitor.name));
  }
  if (identities.has('k8s.namespace.name')) {
    putTelemetryIdentityCandidate(identities, 'k8s.workload.name', monitor.name);
  }
  return Array.from(identities.entries()).map(([key, value]) => ({ key, value }));
}

export function inferTelemetryEntityTypeForMonitor(
  monitor: TelemetryIdentityMonitorLike,
  identities: Array<{ key: string; value: string }>,
  heuristics: TelemetryIdentityHeuristics
): string {
  const app = (trimIdentityText(monitor.app) || '').toLowerCase();
  if (identities.some(identity => identity.key === 'k8s.workload.name')) {
    return 'k8s_workload';
  }
  if (heuristics.hostLikeApps.has(app)) {
    return 'host';
  }
  if (heuristics.deviceLikeApps.has(app)) {
    return 'device';
  }
  if (heuristics.queueLikeApps.has(app) || identities.some(identity => identity.key === 'messaging.destination.name')) {
    return 'queue';
  }
  if (heuristics.apiLikeApps.has(app)) {
    return 'api';
  }
  if (heuristics.endpointLikeApps.has(app) || identities.some(identity => identity.key === 'endpoint.url')) {
    return 'endpoint';
  }
  if (heuristics.databaseLikeApps.has(app)) {
    return 'database';
  }
  if (heuristics.middlewareLikeApps.has(app)) {
    return 'middleware';
  }
  return 'service';
}

export function inferTelemetryEntityNameForMonitor(
  monitor: TelemetryIdentityMonitorLike,
  entityType: string,
  identities: Array<{ key: string; value: string }>
): string {
  const primaryIdentityKey = getPrimaryIdentityKeyForEntityType(entityType);
  const primaryValue = identities.find(identity => identity.key === primaryIdentityKey)?.value;
  if (primaryValue != null) {
    return primaryValue;
  }
  return (
    identities.find(identity => identity.key === 'messaging.destination.name')?.value ||
    identities.find(identity => identity.key === 'service.name')?.value ||
    identities.find(identity => identity.key === 'host.name')?.value ||
    identities.find(identity => identity.key === 'endpoint.url')?.value ||
    trimIdentityText(monitor.name) ||
    trimIdentityText(monitor.instance) ||
    'monitor-unknown'
  );
}

export function findTelemetryIdentityValue(
  identities: Array<{ key: string; value: string }>,
  key: string
): string | undefined {
  return identities.find(identity => identity.key === key)?.value;
}
