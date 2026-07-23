/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { isSensitiveFieldName } from '@/core/security/sensitive-field';
import type { QueryContext } from '@/shared/query-context';

import {
  INSTRUMENTATION_ENVIRONMENTS,
  INSTRUMENTATION_FRAMEWORKS,
  INSTRUMENTATION_LANGUAGES,
  INSTRUMENTATION_METHODS,
  INSTRUMENTATION_PLATFORMS,
  INSTRUMENTATION_SCHEMA_VERSION,
  type InstrumentationEnvironment,
  type InstrumentationPlatform,
  type InstrumentationSelection
} from './instrumentation-contract';
import { createFlowDraft, type FlowStage, type InstrumentationFlowDraft } from './instrumentation-flow';

export type InstrumentationProgress = {
  stage: Extract<FlowStage, 1 | 2 | 3>;
  draft: InstrumentationFlowDraft;
  mismatch: boolean;
};

const keys = {
  schemaVersion: 'instrumentationSchemaVersion',
  stage: 'instrumentationStage',
  environment: 'instrumentationEnvironment',
  platform: 'instrumentationPlatform',
  language: 'instrumentationLanguage',
  framework: 'instrumentationFramework',
  method: 'instrumentationMethod'
} as const;
const progressKeys = Object.values(keys);
const SELECTION_KEYS = [keys.language, keys.framework, keys.method] as const;
const DEFAULT_ENVIRONMENT: InstrumentationEnvironment = 'docker';
const DEFAULT_PLATFORM: InstrumentationPlatform = 'linux_amd64';
const LAST_PERSISTED_SETUP_STAGE: Extract<FlowStage, 1 | 2 | 3> = 3;

export function parseInstrumentationProgress(params: URLSearchParams, context: QueryContext): InstrumentationProgress {
  const persisted = progressKeys.some(key => params.has(key));
  const environmentValue = enumParam(params, keys.environment, INSTRUMENTATION_ENVIRONMENTS);
  const platformValue = enumParam(params, keys.platform, INSTRUMENTATION_PLATFORMS);
  const environment = environmentValue ?? DEFAULT_ENVIRONMENT;
  const platform = platformValue ?? DEFAULT_PLATFORM;
  const parsedSelection = parseSelection(params, environment, platform);
  const mismatch = hasProgressMismatch(params, persisted, environmentValue, platformValue, parsedSelection.mismatch);
  const draft: InstrumentationFlowDraft = {
    ...createFlowDraft(),
    environment,
    platform,
    collectorId: context.collectorId ?? '',
    serviceName: context.serviceName ?? '',
    serviceNamespace: context.serviceNamespace ?? '',
    serviceEnvironment: context.environment ?? ''
  };
  if (!mismatch && parsedSelection.selection) draft.selection = parsedSelection.selection;
  return {
    stage: mismatch ? 1 : readStage(params.get(keys.stage)),
    draft,
    mismatch
  };
}

export function writeInstrumentationProgress(
  source: URLSearchParams,
  draft: InstrumentationFlowDraft,
  stage: FlowStage
) {
  const params = new URLSearchParams(source);
  // Progress updates may reuse a URL created by another flow. Strip the shared
  // sensitive vocabulary before preserving any non-instrumentation context.
  for (const key of [...params.keys()]) {
    if (isSensitiveFieldName(key)) params.delete(key);
  }
  for (const key of progressKeys) params.delete(key);
  params.set(keys.schemaVersion, String(INSTRUMENTATION_SCHEMA_VERSION));
  params.set(keys.stage, String(persistedSetupStage(stage)));
  params.set(keys.environment, draft.environment);
  params.set(keys.platform, draft.platform);
  if (draft.selection) {
    params.set(keys.language, draft.selection.language);
    params.set(keys.framework, draft.selection.framework);
    params.set(keys.method, draft.selection.method);
  }
  return params;
}

export function instrumentationProgressIdentity(draft: InstrumentationFlowDraft) {
  return JSON.stringify([
    draft.environment,
    draft.platform,
    draft.selection?.language,
    draft.selection?.framework,
    draft.selection?.method
  ]);
}

function readStage(value: string | null): Extract<FlowStage, 1 | 2 | 3> {
  if (value === '2') return 2;
  if (value === '3') return 3;
  return 1;
}

function persistedSetupStage(stage: FlowStage): Extract<FlowStage, 1 | 2 | 3> {
  if (stage === 1 || stage === 2) return stage;
  return LAST_PERSISTED_SETUP_STAGE;
}

function enumParam<const T extends readonly string[]>(params: URLSearchParams, key: string, values: T) {
  const value = params.get(key);
  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function parseSelection(
  params: URLSearchParams,
  environment: InstrumentationEnvironment,
  platform: InstrumentationPlatform
): { selection?: InstrumentationSelection; mismatch: boolean } {
  const language = enumParam(params, keys.language, INSTRUMENTATION_LANGUAGES);
  const framework = enumParam(params, keys.framework, INSTRUMENTATION_FRAMEWORKS);
  const method = enumParam(params, keys.method, INSTRUMENTATION_METHODS);
  const presentCount = SELECTION_KEYS.filter(key => params.has(key)).length;
  if (presentCount === 0) return { mismatch: false };
  // Language, framework, and method form one selection; a partial tuple must never be restored.
  if (presentCount !== SELECTION_KEYS.length) return { mismatch: true };
  if (!language || !framework || !method) return { mismatch: true };
  return { selection: { language, framework, method, environment, platform }, mismatch: false };
}

function invalidSpecifiedParam(params: URLSearchParams, key: string, parsed: string | undefined) {
  return params.has(key) && parsed == null;
}

function hasProgressMismatch(
  params: URLSearchParams,
  persisted: boolean,
  environment: string | undefined,
  platform: string | undefined,
  selectionMismatch: boolean
) {
  if (persisted && params.get(keys.schemaVersion) !== String(INSTRUMENTATION_SCHEMA_VERSION)) return true;
  if (invalidSpecifiedParam(params, keys.environment, environment)) return true;
  if (invalidSpecifiedParam(params, keys.platform, platform)) return true;
  return selectionMismatch;
}
