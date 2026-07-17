/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

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
} from '../api/instrumentation-contract';
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

export function parseInstrumentationProgress(
  params: URLSearchParams,
  context: QueryContext
): InstrumentationProgress {
  const persisted = progressKeys.some(key => params.has(key));
  const environmentValue = enumParam(params, keys.environment, INSTRUMENTATION_ENVIRONMENTS);
  const platformValue = enumParam(params, keys.platform, INSTRUMENTATION_PLATFORMS);
  const environment: InstrumentationEnvironment = environmentValue ?? 'docker';
  const platform: InstrumentationPlatform = platformValue ?? 'linux_amd64';
  const parsedSelection = parseSelection(params, environment, platform);
  const mismatch = hasProgressMismatch(
    params, persisted, environmentValue, platformValue, parsedSelection.mismatch
  );
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
  for (const key of progressKeys) params.delete(key);
  params.set(keys.schemaVersion, String(INSTRUMENTATION_SCHEMA_VERSION));
  params.set(keys.stage, String(Math.min(stage, 3)));
  params.set(keys.environment, draft.environment);
  params.set(keys.platform, draft.platform);
  if (draft.selection) {
    params.set(keys.language, draft.selection.language);
    params.set(keys.framework, draft.selection.framework);
    params.set(keys.method, draft.selection.method);
  }
  return params;
}

function readStage(value: string | null): Extract<FlowStage, 1 | 2 | 3> {
  return value === '2' ? 2 : value === '3' ? 3 : 1;
}

function enumParam<const T extends readonly string[]>(params: URLSearchParams, key: string, values: T) {
  const value = params.get(key);
  return values.includes(value as T[number]) ? value as T[number] : undefined;
}

function parseSelection(
  params: URLSearchParams,
  environment: InstrumentationEnvironment,
  platform: InstrumentationPlatform
): { selection?: InstrumentationSelection; mismatch: boolean } {
  const language = enumParam(params, keys.language, INSTRUMENTATION_LANGUAGES);
  const framework = enumParam(params, keys.framework, INSTRUMENTATION_FRAMEWORKS);
  const method = enumParam(params, keys.method, INSTRUMENTATION_METHODS);
  const presentCount = [keys.language, keys.framework, keys.method].filter(key => params.has(key)).length;
  if (presentCount === 0) return { mismatch: false };
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
  return persisted && params.get(keys.schemaVersion) !== String(INSTRUMENTATION_SCHEMA_VERSION)
    || invalidSpecifiedParam(params, keys.environment, environment)
    || invalidSpecifiedParam(params, keys.platform, platform)
    || selectionMismatch;
}
