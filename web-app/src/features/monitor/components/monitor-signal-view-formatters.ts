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

import type {
  MonitorInvestigationSnapshot,
  MonitorInvestigationViewState,
  MonitorSignalState
} from '../model/monitor-investigation-model';
import type { MonitorSignalCapabilityState } from '../model/monitor-signal-view-model';

export function monitorInvestigationSnapshot(
  state: MonitorInvestigationViewState
): MonitorInvestigationSnapshot | undefined {
  return state.kind === 'ready' ? state.snapshot : undefined;
}

export function monitorInvestigationSectionState(
  investigation: MonitorInvestigationViewState,
  state: MonitorSignalState | undefined
): MonitorSignalCapabilityState {
  if (state) return state;
  return investigation.kind === 'unavailable' ? 'unavailable' : 'unknown';
}

export function formatMonitorTimestamp(value: number, timeZone?: string) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 8_640_000_000_000_000) return undefined;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      ...(timeZone ? { timeZone } : {})
    }).format(value);
  } catch {
    return undefined;
  }
}

export function formatMonitorDuration(value: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)} ms`;
}
