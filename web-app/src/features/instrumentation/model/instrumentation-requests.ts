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

import { buildSignalHandoffPath } from '@/shared/query-context';

import type { InstrumentationCollector } from '../api/collector-api';
import {
  INSTRUMENTATION_SCHEMA_VERSION,
  type CollectorTarget,
  type DetectionRequest,
  type GuideRenderRequest,
  type GuideRenderResponse,
  type GuideSnippet,
  type InstrumentationSignal,
  type QueryJumpContext,
  type ServiceIdentity
} from '../api/instrumentation-contract';
import { materializeSnippetForCopy } from '../api/instrumentation-wire';
import { validateFlowContext, type InstrumentationFlowDraft } from './instrumentation-flow';

export function buildGuideRequest(
  draft: InstrumentationFlowDraft,
  collector: InstrumentationCollector,
  transientTarget?: CollectorTarget
): GuideRenderRequest {
  const selection = requireSelection(draft);
  requireContext(draft);
  if (collector.collectorId !== draft.collectorId || !collector.online) {
    throw new Error('Selected Collector is unavailable');
  }
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
  return buildSignalHandoffPath(signal, {
    collectorId: context.collectorId,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment
  }, { from: context.startedAt, to: context.detectedAt });
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
