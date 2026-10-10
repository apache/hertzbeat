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

import {
  normalizeInvestigationTimeZone,
  parseQueryContext,
  QUERY_CONTEXT_FIELDS,
  writeQueryContext,
  type InvestigationTimeWindow,
  type QueryContext
} from '@/shared/query-context';

import {
  isPositiveJavaLong,
  normalizeOpaqueId,
  normalizePositiveId,
  requireRecord
} from './investigation-model-validation';

export type InvestigationSource = 'entity' | 'monitor' | 'alert' | 'metric' | 'log' | 'trace' | 'topology' | 'ai';

export type InvestigationAnchor = {
  source: InvestigationSource;
  context: QueryContext;
  window: InvestigationTimeWindow;
  traceId?: string | undefined;
  spanId?: string | undefined;
  alertId?: string | undefined;
};

export type InvestigationCapabilityState = 'available' | 'empty' | 'unavailable' | 'unknown';
type CapabilityKey =
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'topology'
  | 'collection'
  | 'alerts'
  | 'nativeMetrics'
  | 'otelMetrics'
  | 'redMetrics'
  | 'traceCorrelation'
  | 'logTraceCorrelation'
  | 'semanticGraph';

export type SignalCapabilities = Readonly<Record<CapabilityKey, InvestigationCapabilityState>>;

const sources: readonly InvestigationSource[] = [
  'entity',
  'monitor',
  'alert',
  'metric',
  'log',
  'trace',
  'topology',
  'ai'
];
const capabilityKeys: readonly CapabilityKey[] = [
  'metrics',
  'logs',
  'traces',
  'topology',
  'collection',
  'alerts',
  'nativeMetrics',
  'otelMetrics',
  'redMetrics',
  'traceCorrelation',
  'logTraceCorrelation',
  'semanticGraph'
];
const capabilityStates: readonly InvestigationCapabilityState[] = ['available', 'empty', 'unavailable', 'unknown'];
const contextKeys = Object.values(QUERY_CONTEXT_FIELDS);

export function createInvestigationAnchor(input: InvestigationAnchor): InvestigationAnchor {
  requireRecord(input, ['source', 'context', 'window', 'traceId', 'spanId', 'alertId']);
  if (!sources.includes(input.source)) throw new Error('Investigation anchor source is invalid');
  requireRecord(input.context, contextKeys);
  requireRecord(input.window, ['from', 'to', 'timeZone']);

  const context = parseQueryContext(writeQueryContext(new URLSearchParams(), input.context));
  for (const key of ['entityId', 'monitorId', 'intakeProfileId'] as const) {
    if (context[key] != null && !isPositiveJavaLong(context[key])) {
      throw new Error('Investigation anchor identity is invalid');
    }
  }
  if (!validWindow(input.window)) throw new Error('Investigation anchor window is invalid');
  const timeZone = normalizeInvestigationTimeZone(input.window.timeZone);
  if (!timeZone) throw new Error('Investigation anchor time zone is invalid');

  const traceId = normalizeOpaqueId(input.traceId);
  const spanId = normalizeOpaqueId(input.spanId);
  const alertId = normalizePositiveId(input.alertId);
  if (spanId && !traceId) throw new Error('Investigation span identity requires a trace identity');

  return {
    source: input.source,
    context,
    window: { from: input.window.from, to: input.window.to, timeZone },
    ...(traceId ? { traceId } : {}),
    ...(spanId ? { spanId } : {}),
    ...(alertId ? { alertId } : {})
  };
}

export function createSignalCapabilities(input: Partial<SignalCapabilities>): SignalCapabilities {
  requireRecord(input, capabilityKeys);
  return Object.fromEntries(
    capabilityKeys.map(key => {
      const state = input[key] ?? 'unknown';
      if (!capabilityStates.includes(state)) throw new Error('Investigation capability state is invalid');
      return [key, state];
    })
  ) as SignalCapabilities;
}

function validWindow(window: InvestigationTimeWindow) {
  return (
    Number.isSafeInteger(window.from) && Number.isSafeInteger(window.to) && window.from > 0 && window.from < window.to
  );
}
