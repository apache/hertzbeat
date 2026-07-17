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

import type {
  CatalogResponse,
  DetectionRequest,
  GuideRenderRequest,
  GuideRenderResponse,
  GuideSnippet,
  InstrumentationSelection,
  SecretPlaceholder,
  ServiceIdentity
} from './instrumentation-contract';
import {
  catalogResponseSchema,
  contractViolation,
  guideRenderResponseSchema,
  InstrumentationContractError,
  parseInstrumentationSchema
} from './instrumentation-schema';

export { parseDetectionResponse } from './instrumentation-detection-wire';
export { InstrumentationContractError } from './instrumentation-schema';

export function parseCatalogResponse(value: unknown): CatalogResponse {
  return parseInstrumentationSchema(catalogResponseSchema, value, 'catalog');
}

export function parseGuideRenderResponse(value: unknown): GuideRenderResponse {
  const response = parseInstrumentationSchema(guideRenderResponseSchema, value, 'guide');
  validateSecretPlaceholders(response);
  return response;
}

export function buildGuideRenderPayload(request: GuideRenderRequest): GuideRenderRequest {
  return {
    schemaVersion: 1,
    ...copySelection(request),
    collector: {
      collectorId: request.collector.collectorId,
      otlpHttpEndpoint: request.collector.otlpHttpEndpoint,
      otlpGrpcEndpoint: request.collector.otlpGrpcEndpoint,
      authorizationHeader: request.collector.authorizationHeader
    },
    service: copyService(request.service)
  };
}

export function buildDetectionPayload(request: DetectionRequest): DetectionRequest {
  return {
    schemaVersion: 1,
    ...copySelection(request),
    service: copyService(request.service),
    collectorId: request.collectorId,
    startedAt: request.startedAt
  };
}

export function materializeSnippetForCopy(
  snippet: GuideSnippet,
  placeholders: Record<string, SecretPlaceholder>,
  transientSecrets: Record<string, string | undefined>
) {
  let content = snippet.content;
  for (const placeholderId of snippet.secretPlaceholders) {
    const placeholder = placeholders[placeholderId];
    const secret = transientSecrets[placeholderId];
    if (!placeholder || placeholder.valueFormat !== 'url_unreserved' || placeholder.replacement !== 'raw') {
      throw new InstrumentationContractError(`Unsupported secret placeholder: ${placeholderId}`);
    }
    if (!secret || !/^[A-Za-z0-9._~-]+$/.test(secret)) {
      throw new InstrumentationContractError(`Invalid transient secret: ${placeholderId}`);
    }
    if (!content.includes(placeholder.marker)) {
      throw new InstrumentationContractError(`Secret marker is missing: ${placeholderId}`);
    }
    content = content.replaceAll(placeholder.marker, secret);
  }
  return content;
}

function validateSecretPlaceholders(response: GuideRenderResponse) {
  const placeholders = Object.entries(response.secretPlaceholders);
  const markerOwners = new Set<string>();
  for (const [name, placeholder] of placeholders) {
    if (!name || markerOwners.has(placeholder.marker)) {
      contractViolation('Guide secret placeholder names and markers must be unique');
    }
    markerOwners.add(placeholder.marker);
  }
  const referenced = new Set<string>();
  for (const step of response.steps) {
    for (const snippet of step.snippets) validateSnippetSecretReferences(snippet, placeholders, referenced);
  }
  if (placeholders.some(([name]) => !referenced.has(name))) {
    contractViolation('Guide secret placeholder was unused');
  }
}

function validateSnippetSecretReferences(
  snippet: GuideSnippet,
  placeholders: Array<[string, SecretPlaceholder]>,
  referenced: Set<string>
) {
  for (const name of snippet.secretPlaceholders) {
    const placeholder = placeholders.find(([candidate]) => candidate === name)?.[1];
    if (!placeholder || !snippet.content.includes(placeholder.marker)) {
      contractViolation('Guide snippet secret reference was invalid');
    }
    referenced.add(name);
  }
  for (const [name, placeholder] of placeholders) {
    if (snippet.content.includes(placeholder.marker) && !snippet.secretPlaceholders.includes(name)) {
      contractViolation('Guide snippet secret marker was undeclared');
    }
  }
}

function copySelection(selection: InstrumentationSelection): InstrumentationSelection {
  return {
    language: selection.language,
    framework: selection.framework,
    method: selection.method,
    environment: selection.environment,
    platform: selection.platform
  };
}

function copyService(service: ServiceIdentity): ServiceIdentity {
  return { name: service.name, namespace: service.namespace, environment: service.environment };
}
