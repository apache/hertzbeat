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

import { apiFetch } from '@/core/http/http-client';

import {
  INSTRUMENTATION_REQUEST_ERROR_CODES,
  type DetectionRequest,
  type DetectionResponse,
  type GuideRenderRequest,
  type GuideRenderResponse,
  type InstrumentationRequestErrorCode
} from '../model/instrumentation-contract';
import {
  buildDetectionPayload,
  buildGuideRenderPayload,
  parseCatalogResponse,
  parseDetectionResponse,
  parseGuideRenderResponse
} from './instrumentation-wire';
import {
  InstrumentationContractError,
  instrumentationMessageEnvelopeSchema,
  type InstrumentationMessageEnvelope
} from './instrumentation-schema';

export { InstrumentationContractError } from './instrumentation-schema';

const INSTRUMENTATION_API_PATH = '/api/instrumentation/v1';

export class InstrumentationRequestError extends Error {
  constructor(readonly machineCode: InstrumentationRequestErrorCode) {
    super(machineCode);
    this.name = 'InstrumentationRequestError';
  }
}

export class InstrumentationApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number
  ) {
    super(message);
    this.name = 'InstrumentationApiError';
  }
}

export function loadInstrumentationCatalog(signal?: AbortSignal) {
  return requestInstrumentation(
    `${INSTRUMENTATION_API_PATH}/catalog`,
    { method: 'GET', ...(signal ? { signal } : {}) },
    parseCatalogResponse
  );
}

export function renderInstrumentationGuide(request: GuideRenderRequest, signal?: AbortSignal) {
  return requestInstrumentation(
    `${INSTRUMENTATION_API_PATH}/render`,
    jsonRequest(buildGuideRenderPayload(request), signal),
    value => validateGuideResponse(request, parseGuideRenderResponse(value))
  );
}

export function detectInstrumentationSignals(request: DetectionRequest, signal?: AbortSignal) {
  return requestInstrumentation(
    `${INSTRUMENTATION_API_PATH}/detect`,
    jsonRequest(buildDetectionPayload(request), signal),
    value => validateDetectionResponse(request, parseDetectionResponse(value))
  );
}

function jsonRequest(body: GuideRenderRequest | DetectionRequest, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {})
  };
}

async function requestInstrumentation<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch {
    // Transport implementations may include request bodies or credentials in
    // their error text. Nothing below this boundary exposes that cause.
    throw new InstrumentationApiError('Instrumentation request failed');
  }
  if (!response.ok) {
    throw new InstrumentationApiError(`Instrumentation request failed with HTTP ${response.status}`, response.status);
  }

  let rawEnvelope: unknown;
  try {
    rawEnvelope = await response.json();
  } catch {
    throw new InstrumentationApiError('Instrumentation response was not valid JSON');
  }

  const envelope = parseMessageEnvelope(rawEnvelope);
  if (envelope.code !== 0) throwMessageError(envelope);
  return parse(envelope.data);
}

function parseMessageEnvelope(value: unknown): InstrumentationMessageEnvelope {
  const result = instrumentationMessageEnvelopeSchema.safeParse(value);
  if (result.success) return result.data;
  throw new InstrumentationApiError('Instrumentation response envelope was invalid');
}

function throwMessageError(envelope: InstrumentationMessageEnvelope): never {
  if (envelope.code === 1 && isRequestErrorCode(envelope.msg)) {
    throw new InstrumentationRequestError(envelope.msg);
  }
  throw new InstrumentationApiError('Instrumentation request failed');
}

function isRequestErrorCode(value: string | null | undefined): value is InstrumentationRequestErrorCode {
  return value !== undefined && INSTRUMENTATION_REQUEST_ERROR_CODES.some(code => code === value);
}

function validateGuideResponse(request: GuideRenderRequest, response: GuideRenderResponse) {
  if (!sameSelection(request, response.selection)) {
    throw new InstrumentationContractError('Guide response selection did not match the request');
  }
  return response;
}

function validateDetectionResponse(request: DetectionRequest, response: DetectionResponse) {
  const context = response.context;
  if (
    !sameSelection(request, context) ||
    context.service.name !== request.service.name ||
    context.service.namespace !== request.service.namespace ||
    context.service.environment !== request.service.environment ||
    context.collectorId !== request.collectorId ||
    context.startedAt !== request.startedAt
  ) {
    throw new InstrumentationContractError('Detection response context did not match the request');
  }
  return response;
}

function sameSelection(left: GuideRenderRequest | DetectionRequest, right: GuideRenderResponse['selection']) {
  return (
    left.language === right.language &&
    left.framework === right.framework &&
    left.method === right.method &&
    left.environment === right.environment &&
    left.platform === right.platform
  );
}
