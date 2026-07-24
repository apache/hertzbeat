/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiFetch } from '@/core/http/http-client';

import type { DetectionRequest, RenderRequest } from '../model/instrumentation-v2-contract';
import { messageEnvelopeSchema } from './instrumentation-v2-schema';
import {
  InstrumentationContractError,
  parseCatalogResponse,
  parseDetectionResponse,
  parseIntakeProfilesResponse,
  parseRenderResponse
} from './instrumentation-v2-wire';

export { InstrumentationContractError } from './instrumentation-v2-wire';

const ROOT = '/api/instrumentation/v2';
const requestCodes = new Set([
  'instrumentation_v2_schema_unsupported',
  'instrumentation_v2_selection_invalid',
  'instrumentation_v2_context_invalid',
  'instrumentation_v2_intake_profile_not_found',
  'instrumentation_v2_intake_profile_unavailable'
]);

export class InstrumentationApiError extends Error {
  constructor(readonly httpStatus?: number) {
    super('Instrumentation request failed');
    this.name = 'InstrumentationApiError';
  }
}

export class InstrumentationRequestError extends Error {
  constructor(readonly machineCode: string) {
    super(machineCode);
    this.name = 'InstrumentationRequestError';
  }
}

export const loadInstrumentationCatalog = (signal?: AbortSignal) =>
  request(`${ROOT}/catalog`, get(signal), parseCatalogResponse);
export const loadIntakeProfiles = (signal?: AbortSignal) =>
  request(`${ROOT}/intake-profiles`, get(signal), parseIntakeProfilesResponse);
export const renderInstrumentationGuide = (value: RenderRequest, signal?: AbortSignal) =>
  request(`${ROOT}/render`, post(copyRequest(value), signal), response => {
    const parsed = parseRenderResponse(response);
    if (
      parsed.sourceKind !== value.sourceKind ||
      parsed.recipeId !== value.recipeId ||
      parsed.intakeProfile.id !== value.intakeProfileId ||
      !sameService(parsed.service, value.service)
    ) {
      throw new InstrumentationContractError('render response did not match request');
    }
    return parsed;
  });
export const detectInstrumentationSignals = (value: DetectionRequest, signal?: AbortSignal) =>
  request(`${ROOT}/detect`, post(copyRequest(value), signal), response => {
    const parsed = parseDetectionResponse(response);
    if (
      parsed.context.sourceKind !== value.sourceKind ||
      parsed.context.recipeId !== value.recipeId ||
      parsed.context.intakeProfileId !== value.intakeProfileId ||
      parsed.context.startedAt !== value.startedAt ||
      !sameService(parsed.context.service, value.service)
    ) {
      throw new InstrumentationContractError('detection response did not match request');
    }
    return parsed;
  });

async function request<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(path, init);
  } catch {
    throw new InstrumentationApiError();
  }
  if (!response.ok) throw new InstrumentationApiError(response.status);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new InstrumentationApiError(response.status);
  }
  const envelope = messageEnvelopeSchema.safeParse(json);
  if (!envelope.success) throw new InstrumentationApiError(response.status);
  if (envelope.data.code !== 0) {
    const code = envelope.data.msg;
    if (code && requestCodes.has(code)) throw new InstrumentationRequestError(code);
    throw new InstrumentationApiError(response.status);
  }
  return parse(envelope.data.data);
}

const get = (signal?: AbortSignal): RequestInit => ({ method: 'GET', ...(signal ? { signal } : {}) });
const post = (body: RenderRequest | DetectionRequest, signal?: AbortSignal): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  ...(signal ? { signal } : {})
});

function copyRequest<T extends RenderRequest | DetectionRequest>(value: T): T {
  // An explicit allowlist keeps browser-only token state out of transport and errors.
  return {
    schemaVersion: 2,
    sourceKind: value.sourceKind,
    ...(value.recipeId ? { recipeId: value.recipeId } : {}),
    ...(value.language ? { language: value.language } : {}),
    ...(value.framework ? { framework: value.framework } : {}),
    ...(value.method ? { method: value.method } : {}),
    ...(value.environment ? { environment: value.environment } : {}),
    ...(value.platform ? { platform: value.platform } : {}),
    intakeProfileId: value.intakeProfileId,
    service: {
      name: value.service.name,
      namespace: value.service.namespace,
      environment: value.service.environment,
      ...(value.service.serviceInstanceId ? { serviceInstanceId: value.service.serviceInstanceId } : {}),
      ...(value.service.endpoint ? { endpoint: value.service.endpoint } : {})
    },
    ...('startedAt' in value ? { startedAt: value.startedAt } : {})
  } as T;
}

function sameService(left: RenderRequest['service'], right: RenderRequest['service']) {
  return (
    left.name === right.name &&
    left.namespace === right.namespace &&
    left.environment === right.environment &&
    left.serviceInstanceId === right.serviceInstanceId &&
    left.endpoint === right.endpoint
  );
}
