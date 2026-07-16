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

import { apiMessageGet } from '@/core/http/api-message';

export const COLLECTOR_INTAKE_CAPABILITIES = ['otlp_http_protobuf', 'otlp_grpc'] as const;
export const COLLECTOR_INTAKE_ERROR_CODES = [
  'intake_not_advertised',
  'intake_advertisement_invalid',
  'intake_advertisement_unavailable'
] as const;

export type CollectorIntakeCapability = (typeof COLLECTOR_INTAKE_CAPABILITIES)[number];
export type CollectorIntakeErrorCode = (typeof COLLECTOR_INTAKE_ERROR_CODES)[number] | 'old_server';
export type CollectorInstrumentationIntake =
  | {
      status: 'available';
      schemaVersion: 1;
      collectorId: string;
      gateway: 'collector' | 'server';
      capabilities: readonly CollectorIntakeCapability[];
      otlpHttpEndpoint: string;
      otlpGrpcEndpoint: string;
      authorizationHeader: 'Authorization';
    }
  | { status: 'unavailable'; errorCode: CollectorIntakeErrorCode };

export type InstrumentationCollector = {
  name: string;
  collectorId: string;
  address: string;
  online: boolean;
  intake: CollectorInstrumentationIntake;
};

export async function loadInstrumentationCollectors(signal?: AbortSignal) {
  const page = await apiMessageGet<unknown>('/api/collector?pageIndex=0&pageSize=200', signal ? { signal } : undefined);
  return parseCollectors(page);
}

function parseCollectors(value: unknown): InstrumentationCollector[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { content?: unknown }).content)) {
    throw new Error('Collector response was invalid');
  }
  return (value as { content: unknown[] }).content.map((item, index) => parseCollector(item, index));
}

function parseCollector(value: unknown, index: number): InstrumentationCollector {
  const summary = value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
  const collector = summary?.collector;
  if (!collector || typeof collector !== 'object') throw new Error(`Collector ${index} was invalid`);
  const record = collector as Record<string, unknown>;
  const name = requiredString(record.name, `Collector ${index} name`);
  const address = requiredString(record.ip, `Collector ${index} address`);
  return {
    collectorId: name,
    name,
    address,
    online: record.online === true || record.status === 0,
    intake: summary && Object.hasOwn(summary, 'instrumentationIntake')
      ? parseInstrumentationIntake(summary.instrumentationIntake, name)
      : { status: 'unavailable', errorCode: 'old_server' }
  };
}

function parseInstrumentationIntake(value: unknown, registeredCollectorId: string): CollectorInstrumentationIntake {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidIntake();
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1 || record.collectorId !== registeredCollectorId) return invalidIntake();
  if (record.state === 'unavailable') return parseUnavailableIntake(record);
  return record.state === 'available' ? parseAvailableIntake(record, registeredCollectorId) : invalidIntake();
}

function parseAvailableIntake(
  record: Record<string, unknown>,
  registeredCollectorId: string
): CollectorInstrumentationIntake {
  const gateway = record.gateway;
  const capabilities = parseAvailableCapabilities(record.capabilities);
  const otlpHttpEndpoint = parsePublicHttpsEndpoint(record.otlpHttpEndpoint);
  const otlpGrpcEndpoint = parsePublicHttpsEndpoint(record.otlpGrpcEndpoint);
  if ((gateway !== 'collector' && gateway !== 'server')
    || !capabilities
    || !otlpHttpEndpoint
    || !otlpGrpcEndpoint
    || record.authorizationHeader !== 'Authorization'
    || record.errorCode !== null) {
    return invalidIntake();
  }
  return {
    status: 'available',
    schemaVersion: 1,
    collectorId: registeredCollectorId,
    gateway,
    capabilities,
    otlpHttpEndpoint,
    otlpGrpcEndpoint,
    authorizationHeader: 'Authorization'
  };
}

function parseUnavailableIntake(record: Record<string, unknown>): CollectorInstrumentationIntake {
  const errorCode = record.errorCode;
  if (record.gateway !== null
    || !Array.isArray(record.capabilities)
    || record.capabilities.length !== 0
    || record.otlpHttpEndpoint !== null
    || record.otlpGrpcEndpoint !== null
    || record.authorizationHeader !== null
    || !COLLECTOR_INTAKE_ERROR_CODES.includes(errorCode as (typeof COLLECTOR_INTAKE_ERROR_CODES)[number])) {
    return invalidIntake();
  }
  return { status: 'unavailable', errorCode: errorCode as (typeof COLLECTOR_INTAKE_ERROR_CODES)[number] };
}

function parseAvailableCapabilities(value: unknown): CollectorIntakeCapability[] | undefined {
  if (!Array.isArray(value)
    || value.length !== COLLECTOR_INTAKE_CAPABILITIES.length
    || new Set(value).size !== value.length
    || !COLLECTOR_INTAKE_CAPABILITIES.every(capability => value.includes(capability))) {
    return undefined;
  }
  return value as CollectorIntakeCapability[];
}

function parsePublicHttpsEndpoint(value: unknown) {
  if (typeof value !== 'string' || !value || value !== value.trim()) return undefined;
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return undefined;
  }
  return endpoint.protocol === 'https:'
    && endpoint.hostname
    && !endpoint.username
    && !endpoint.password
    && !endpoint.search
    && !endpoint.hash
    ? value
    : undefined;
}

function invalidIntake(): CollectorInstrumentationIntake {
  return { status: 'unavailable', errorCode: 'intake_advertisement_invalid' };
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} was invalid`);
  return value.trim();
}
