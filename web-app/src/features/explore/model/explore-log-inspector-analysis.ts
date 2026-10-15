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

import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis, type LogAnalysisState } from '@/platform/perses';
import { logFacetFieldSchema, type LogFacetField } from './explore-log-facets';
import type { LogInspectorFilterTarget } from './explore-log-inspector-filter';

export type LogInspectorAnalysisIntent = 'group' | 'measure' | 'graph';
export type LogInspectorAnalysisTarget = { field: LogFacetField; numeric: boolean };
export type LogInspectorAnalysisControls = {
  onAnalyzeLogField?: ((target: LogInspectorAnalysisTarget, intent: LogInspectorAnalysisIntent) => boolean) | undefined;
  logAnalysisDisabledReason?: 'existing-analysis' | 'unavailable' | undefined;
};

type Action =
  | { kind: 'ready'; analysis: LogAnalysisState }
  | {
      kind: 'disabled';
      reason: 'existing-analysis' | 'unavailable';
    };

export function logInspectorAnalysisTarget(
  scope: 'resource' | 'attribute' | undefined,
  key: string,
  value: unknown,
  contextField?: LogInspectorFilterTarget['contextField']
): LogInspectorAnalysisTarget | undefined {
  if (!scope || !['string', 'number', 'boolean'].includes(typeof value)) return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  if (['log.record.uid', 'hertzbeat.ingest_id', 'hertzbeat.event_id'].includes(key)) return undefined;
  const builtin = scope === 'resource' && (contextField === 'serviceName' || contextField === 'environment');
  const source = builtin ? 'builtin' : scope;
  const fieldKey = builtin ? contextField : key;
  const field = logFacetFieldSchema.safeParse({ source, key: fieldKey, id: `${source}:${fieldKey}` });
  return field.success ? { field: field.data, numeric: !builtin && typeof value === 'number' } : undefined;
}

export function logInspectorAnalysisDisabledReason(
  appliedRaw: string | undefined,
  draftRaw: string | undefined
): 'existing-analysis' | undefined {
  return isReplaceable(appliedRaw) && isReplaceable(draftRaw) ? undefined : 'existing-analysis';
}

export function logInspectorAnalysisAction(
  appliedRaw: string | undefined,
  draftRaw: string | undefined,
  target: LogInspectorAnalysisTarget,
  intent: LogInspectorAnalysisIntent
): Action {
  const reason = logInspectorAnalysisDisabledReason(appliedRaw, draftRaw);
  if (reason) return { kind: 'disabled', reason };
  const field = logFacetFieldSchema.safeParse(target.field);
  if (
    !field.success ||
    typeof target.numeric !== 'boolean' ||
    !validIntent(intent) ||
    (intent === 'measure' && (!target.numeric || field.data.source === 'builtin'))
  ) {
    return { kind: 'disabled', reason: 'unavailable' };
  }
  return {
    kind: 'ready',
    analysis:
      intent === 'group'
        ? { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', field: field.data.id }
        : {
            ...DEFAULT_LOG_ANALYSIS,
            representation: 'timeseries',
            measure: { function: intent === 'graph' && !target.numeric ? 'unique' : 'avg', field: field.data.id },
            order: 'measure-desc'
          }
  };
}

function validIntent(intent: LogInspectorAnalysisIntent) {
  return intent === 'group' || intent === 'measure' || intent === 'graph';
}

function isReplaceable(raw: string | undefined) {
  if (raw === undefined) return true;
  try {
    const state = parseLogAnalysis(raw);
    return (
      ['logs', 'timeseries'].includes(state.representation) &&
      state.limit === DEFAULT_LOG_ANALYSIS.limit &&
      [DEFAULT_LOG_ANALYSIS.order, 'measure-desc'].includes(state.order) &&
      state.minCount === DEFAULT_LOG_ANALYSIS.minCount &&
      !(state.field && state.measure) &&
      [state.grouping, state.comparison, state.intervalMs, state.transform, state.additionalMeasures].every(
        value => value === undefined
      )
    );
  } catch {
    return false;
  }
}
