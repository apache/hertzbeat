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

import type { InstrumentationCollector } from '../api/collector-api';
import {
  INSTRUMENTATION_SCHEMA_VERSION,
  type CatalogResponse,
  type CollectorTarget,
  type DetectionRequest,
  type GuideRenderRequest,
  type GuideRenderResponse,
  type GuideSnippet,
  type InstrumentationEnvironment,
  type InstrumentationFramework,
  type InstrumentationLanguage,
  type InstrumentationMethod,
  type InstrumentationPlatform,
  type InstrumentationSignal,
  type InstrumentationSelection,
  type MethodOption,
  type QueryJumpContext,
  type ServiceIdentity
} from '../api/instrumentation-contract';
import { materializeSnippetForCopy } from '../api/instrumentation-wire';

export type FlowStage = 1 | 2 | 3 | 4 | 5;
export type FlowContextField = 'collectorId' | 'serviceName' | 'serviceNamespace' | 'serviceEnvironment';
export type InstrumentationFlowDraft = {
  environment: InstrumentationEnvironment;
  platform: InstrumentationPlatform;
  selection?: InstrumentationSelection;
  collectorId: string;
  serviceName: string;
  serviceNamespace: string;
  serviceEnvironment: string;
};

export function createFlowDraft(): InstrumentationFlowDraft {
  return {
    environment: 'docker', platform: 'linux_amd64', collectorId: '', serviceName: '',
    serviceNamespace: '', serviceEnvironment: ''
  };
}

export function availableEnvironments(catalog: CatalogResponse) {
  return unique(catalog.languages.flatMap(language => language.frameworks.flatMap(framework =>
    framework.methods.flatMap(method => method.environments))));
}

export function availablePlatforms(catalog: CatalogResponse, environment: InstrumentationEnvironment) {
  return unique(catalog.languages.flatMap(language => language.frameworks.flatMap(framework =>
    framework.methods.filter(method => method.environments.includes(environment)).flatMap(method => method.platforms))));
}

export function selectFlowEnvironment(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  environment: InstrumentationEnvironment,
  platform?: InstrumentationPlatform
) {
  const platforms = availablePlatforms(catalog, environment);
  const next = { ...draft, environment, platform: platform && platforms.includes(platform) ? platform : platforms[0] ?? 'any' };
  return next.selection ? reconcileOrClear(next, catalog, next.selection.language, next.selection.framework) : next;
}

export function selectFlowPlatform(draft: InstrumentationFlowDraft, catalog: CatalogResponse, platform: InstrumentationPlatform) {
  const next = { ...draft, platform };
  return next.selection ? reconcileOrClear(next, catalog, next.selection.language, next.selection.framework) : next;
}

export function selectCatalogLanguage(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  language: InstrumentationLanguage
) {
  return reconcileSelection(draft, catalog, language);
}

export function selectCatalogFramework(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  framework: InstrumentationFramework
) {
  if (!draft.selection) throw new Error('Select a language before a framework');
  return reconcileSelection(draft, catalog, draft.selection.language, framework);
}

export function selectCatalogMethod(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  method: InstrumentationMethod
) {
  if (!draft.selection) throw new Error('Select a language before a method');
  const options = compatibleMethods(catalog, draft, draft.selection.language, draft.selection.framework);
  if (!options.some(option => option.method === method)) throw new Error(`Unsupported method: ${method}`);
  return { ...draft, selection: { ...draft.selection, method } };
}

export function updateFlowContext(draft: InstrumentationFlowDraft, field: FlowContextField, value: string) {
  return { ...draft, [field]: value };
}

export function reconcileFlowCatalog(draft: InstrumentationFlowDraft, catalog: CatalogResponse) {
  if (!draft.selection) return draft;
  const methods = compatibleMethods(catalog, draft, draft.selection.language, draft.selection.framework);
  if (methods.some(option => option.method === draft.selection?.method)) return draft;
  try {
    return reconcileSelection(draft, catalog, draft.selection.language, draft.selection.framework);
  } catch {
    return clearFlowSelection(draft);
  }
}

export function clearFlowSelection(draft: InstrumentationFlowDraft): InstrumentationFlowDraft {
  if (!draft.selection) return draft;
  const next = { ...draft };
  delete next.selection;
  return next;
}

export function validateFlowContext(draft: InstrumentationFlowDraft) {
  const fields: FlowContextField[] = ['collectorId', 'serviceName', 'serviceNamespace', 'serviceEnvironment'];
  return fields.filter(field => !draft[field].trim());
}

export function buildGuideRequest(
  draft: InstrumentationFlowDraft,
  collector: InstrumentationCollector,
  transientTarget?: CollectorTarget
): GuideRenderRequest {
  const selection = requireSelection(draft);
  requireContext(draft);
  if (collector.collectorId !== draft.collectorId || !collector.online) throw new Error('Selected Collector is unavailable');
  if (!transientTarget) throw new Error('Collector intake endpoint is unavailable');
  const target = createTransientCollectorTarget(transientTarget);
  if (target.collectorId !== collector.collectorId) throw new Error('Collector intake endpoint does not match');
  return {
    schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
    ...selection,
    collector: target,
    service: serviceIdentity(draft)
  };
}

export function createTransientCollectorTarget(target: CollectorTarget): CollectorTarget {
  if (!target.collectorId.trim() || target.authorizationHeader !== 'Authorization') {
    throw new Error('Collector intake endpoint context is invalid');
  }
  requireSafeEndpoint(target.otlpHttpEndpoint);
  requireSafeEndpoint(target.otlpGrpcEndpoint);
  return {
    collectorId: target.collectorId.trim(),
    otlpHttpEndpoint: target.otlpHttpEndpoint,
    otlpGrpcEndpoint: target.otlpGrpcEndpoint,
    authorizationHeader: target.authorizationHeader
  };
}

export function buildDetectionRequest(draft: InstrumentationFlowDraft, startedAt: number): DetectionRequest {
  const selection = requireSelection(draft);
  requireContext(draft);
  return {
    schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
    ...selection,
    service: serviceIdentity(draft),
    collectorId: draft.collectorId,
    startedAt
  };
}

export function materializeGuideSnippet(snippet: GuideSnippet, guide: GuideRenderResponse, token: string) {
  return materializeSnippetForCopy(snippet, guide.secretPlaceholders, { authorizationToken: token });
}

export function buildExploreHandoff(signal: InstrumentationSignal, context: QueryJumpContext) {
  const params = new URLSearchParams({
    signal,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment,
    collectorId: context.collectorId,
    start: String(context.startedAt),
    end: String(context.detectedAt)
  });
  return `/explore?${params.toString()}`;
}

export function compatibleMethods(
  catalog: CatalogResponse,
  draft: Pick<InstrumentationFlowDraft, 'environment' | 'platform'>,
  language: InstrumentationLanguage,
  framework: InstrumentationFramework
): MethodOption[] {
  return catalog.languages.find(item => item.language === language)?.frameworks
    .find(item => item.framework === framework)?.methods
    .filter(method => method.environments.includes(draft.environment)
      && (method.platforms.includes(draft.platform) || method.platforms.includes('any'))) ?? [];
}

function reconcileSelection(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  language: InstrumentationLanguage,
  requestedFramework?: InstrumentationFramework
) {
  const languageOption = catalog.languages.find(item => item.language === language);
  if (!languageOption) throw new Error(`Unsupported language: ${language}`);
  const frameworkOptions = requestedFramework
    ? languageOption.frameworks.filter(item => item.framework === requestedFramework)
    : languageOption.frameworks;
  for (const framework of frameworkOptions) {
    const methods = compatibleMethods(catalog, draft, language, framework.framework);
    const method = methods.find(option => !option.preview) ?? methods[0];
    if (method) {
      return {
        ...draft,
        selection: {
          language,
          framework: framework.framework,
          method: method.method,
          environment: draft.environment,
          platform: draft.platform
        }
      };
    }
  }
  throw new Error(`No compatible ${language} instrumentation method`);
}

function reconcileOrClear(
  draft: InstrumentationFlowDraft,
  catalog: CatalogResponse,
  language: InstrumentationLanguage,
  framework: InstrumentationFramework
) {
  try {
    return reconcileSelection(draft, catalog, language, framework);
  } catch {
    return clearFlowSelection(draft);
  }
}

function requireSelection(draft: InstrumentationFlowDraft) {
  if (!draft.selection) throw new Error('Instrumentation selection is incomplete');
  return { ...draft.selection, environment: draft.environment, platform: draft.platform };
}

function requireContext(draft: InstrumentationFlowDraft) {
  if (validateFlowContext(draft).length > 0) throw new Error('Instrumentation context is incomplete');
}

function serviceIdentity(draft: InstrumentationFlowDraft): ServiceIdentity {
  return {
    name: draft.serviceName.trim(),
    namespace: draft.serviceNamespace.trim(),
    environment: draft.serviceEnvironment.trim()
  };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function requireSafeEndpoint(value: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error('Collector intake endpoint is invalid');
  }
  if (!['http:', 'https:'].includes(endpoint.protocol)
    || !endpoint.hostname
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash) {
    throw new Error('Collector intake endpoint is invalid');
  }
}
