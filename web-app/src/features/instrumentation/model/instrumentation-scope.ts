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

import type { CatalogResponse, MethodOption } from './instrumentation-contract';
import type { FlowStage, InstrumentationFlowDraft } from './instrumentation-flow';

export type InstrumentationScopeField =
  | 'deploymentEnvironment'
  | 'platform'
  | 'language'
  | 'framework'
  | 'method'
  | 'collector'
  | 'serviceName'
  | 'serviceNamespace'
  | 'serviceEnvironment'
  | 'token';

export type InstrumentationScopeValue = { kind: 'translation'; key: string } | { kind: 'text'; value: string };

export type InstrumentationScopeRow = {
  field: InstrumentationScopeField;
  value: InstrumentationScopeValue;
};

export type InstrumentationScopeSummary = {
  rows: InstrumentationScopeRow[];
  signals?: MethodOption['signals'] | undefined;
};

const SELECTION_STAGE = 2;
const CONTEXT_STAGE = 3;

export function buildInstrumentationScopeSummary(
  stage: FlowStage,
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse | undefined,
  hasToken: boolean
): InstrumentationScopeSummary {
  const rows: InstrumentationScopeRow[] = [
    translated('deploymentEnvironment', `instrumentation.environment.${draft.environment}`),
    translated('platform', `instrumentation.platform.${draft.platform}`)
  ];
  const method = stage >= SELECTION_STAGE ? appendSelectionRows(rows, draft, catalog) : undefined;
  if (stage >= CONTEXT_STAGE) appendContextRows(rows, draft, hasToken);
  return { rows, ...(method ? { signals: method.signals } : {}) };
}

function appendSelectionRows(
  rows: InstrumentationScopeRow[],
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse | undefined
) {
  const selection = draft.selection;
  if (!selection) return undefined;
  const language = catalog?.languages.find(item => item.language === selection.language);
  const framework = language?.frameworks.find(item => item.framework === selection.framework);
  const method = framework?.methods.find(item => item.method === selection.method);
  rows.push(
    translated('language', language?.labelKey ?? `instrumentation.language.${selection.language}`),
    translated('framework', framework?.labelKey ?? `instrumentation.framework.${selection.framework}`),
    translated('method', method?.labelKey ?? `instrumentation.method.${selection.method}`)
  );
  return method;
}

function appendContextRows(rows: InstrumentationScopeRow[], draft: InstrumentationFlowDraft, hasToken: boolean) {
  appendText(rows, 'collector', draft.collectorId);
  appendText(rows, 'serviceName', draft.serviceName);
  appendText(rows, 'serviceNamespace', draft.serviceNamespace);
  appendText(rows, 'serviceEnvironment', draft.serviceEnvironment);
  rows.push(translated('token', hasToken ? 'instrumentation.tokenInMemory' : 'instrumentation.tokenMissing'));
}

function appendText(rows: InstrumentationScopeRow[], field: InstrumentationScopeField, value: string) {
  const normalized = value.trim();
  if (normalized) rows.push({ field, value: { kind: 'text', value: normalized } });
}

function translated(field: InstrumentationScopeField, key: string): InstrumentationScopeRow {
  return { field, value: { kind: 'translation', key } };
}
