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

import type { MonitorMetricCatalogEvidence } from './monitor-detail-model';
import type { MonitorInvestigationViewState, MonitorSignalState } from './monitor-investigation-model';

export type MonitorSignalCapabilityState = MonitorSignalState | 'unknown';

export type MonitorSignalCapabilities = {
  nativeMetrics: MonitorSignalCapabilityState;
  currentAlerts: MonitorSignalCapabilityState;
  collection: MonitorSignalCapabilityState;
  boundEntity: MonitorSignalCapabilityState;
  otlpEvidence: MonitorSignalCapabilityState;
};

export function resolveMonitorSignalCapabilities(
  nativeMetrics: MonitorMetricCatalogEvidence,
  investigation: MonitorInvestigationViewState
): MonitorSignalCapabilities {
  const fallback = unresolvedInvestigationState(investigation);
  if (investigation.kind !== 'ready') {
    return {
      nativeMetrics: nativeMetricCapability(nativeMetrics),
      currentAlerts: fallback,
      collection: fallback,
      boundEntity: fallback,
      otlpEvidence: fallback
    };
  }
  const { snapshot } = investigation;
  return {
    nativeMetrics: nativeMetricCapability(nativeMetrics),
    currentAlerts: snapshot.alerts.state,
    collection: snapshot.collection.state,
    boundEntity: snapshot.binding.state,
    otlpEvidence: otlpCapability(snapshot.binding)
  };
}

function nativeMetricCapability(catalog: MonitorMetricCatalogEvidence): MonitorSignalCapabilityState {
  if (catalog.kind === 'ready') return 'ready';
  if (catalog.kind === 'empty' || catalog.kind === 'unavailable') return catalog.kind;
  return 'unknown';
}

function unresolvedInvestigationState(state: MonitorInvestigationViewState): MonitorSignalCapabilityState {
  return state.kind === 'unavailable' ? 'unavailable' : 'unknown';
}

function otlpCapability(
  binding: Extract<MonitorInvestigationViewState, { kind: 'ready' }>['snapshot']['binding']
): MonitorSignalCapabilityState {
  if (binding.identity === null) return 'unavailable';
  return binding.identity.signals.length > 0 ? 'ready' : 'empty';
}
