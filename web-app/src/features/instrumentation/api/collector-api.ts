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

import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';

import {
  availableCollectorIntakeSchema,
  collectorPageSchema,
  type CollectorSummaryWire,
  unavailableCollectorIntakeSchema
} from './collector-schema';
import type { CollectorInstrumentationIntake, InstrumentationCollector } from '../model/instrumentation-collector';

const collectorPageSize = 200;
// Defensive UI safety policy: beyond 20 requests / 4,000 Select rows, fail instead of claiming partial inventory.
const maximumCollectorPages = 20;

export type CollectorReadFailureKind = 'unavailable' | 'error';

export async function loadInstrumentationCollectors(signal?: AbortSignal) {
  const firstPage = await loadCollectorPage(0, signal);
  assertFirstPage(firstPage);
  const collectors = [...firstPage.collectors];

  // The first Spring Page snapshot fixes the request bound; later pages must keep the same scope evidence.
  for (let pageIndex = 1; pageIndex < firstPage.totalPages; pageIndex += 1) {
    const page = await loadCollectorPage(pageIndex, signal);
    assertContinuationPage(firstPage, page, pageIndex);
    collectors.push(...page.collectors);
  }

  signal?.throwIfAborted();
  if (collectors.length !== firstPage.totalElements) throw new CollectorContractError();
  requireUniqueCollectors(collectors);
  return collectors;
}

type CollectorPage = ReturnType<typeof parseCollectorPage>;

async function loadCollectorPage(pageIndex: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const path = `/api/collector?pageIndex=${pageIndex}&pageSize=${collectorPageSize}`;
  const value = await apiMessageGet(path, signal ? { signal } : undefined);
  // A transport that resolves after cancellation cannot publish retired inventory into the query cache.
  signal?.throwIfAborted();
  return parseCollectorPage(value);
}

function parseCollectorPage(value: unknown) {
  const parsed = collectorPageSchema.safeParse(value);
  if (!parsed.success) throw new CollectorContractError();
  return {
    collectors: parsed.data.content.map(mapCollector),
    totalElements: parsed.data.totalElements,
    totalPages: parsed.data.totalPages,
    number: parsed.data.number,
    size: parsed.data.size
  };
}

function mapCollector(summary: CollectorSummaryWire): InstrumentationCollector {
  const { name, ip } = summary.collector;
  return {
    collectorId: name,
    name,
    address: ip,
    online: resolveCollectorOnline(summary.collector),
    intake: Object.hasOwn(summary, 'instrumentationIntake')
      ? parseInstrumentationIntake(summary.instrumentationIntake, name)
      : { status: 'unavailable', errorCode: 'old_server' }
  };
}

function resolveCollectorOnline(collector: CollectorSummaryWire['collector']) {
  if (collector.online !== undefined) return collector.online;
  if (collector.status === 0) return true;
  if (collector.status === 1) return false;
  // The schema requires one authoritative signal; keep this exhaustive guard if its output contract changes.
  throw new CollectorContractError();
}

function assertFirstPage(page: CollectorPage) {
  const expectedPages = page.totalElements === 0 ? 0 : Math.ceil(page.totalElements / page.size);
  const expectedLength = Math.min(page.size, page.totalElements);
  if (
    page.number !== 0 ||
    page.size !== collectorPageSize ||
    page.totalPages !== expectedPages ||
    page.totalPages > maximumCollectorPages ||
    page.collectors.length !== expectedLength
  ) {
    throw new CollectorContractError();
  }
}

function assertContinuationPage(firstPage: CollectorPage, page: CollectorPage, pageIndex: number) {
  const expectedLength = Math.min(firstPage.size, firstPage.totalElements - pageIndex * firstPage.size);
  if (
    page.number !== pageIndex ||
    page.size !== firstPage.size ||
    page.totalPages !== firstPage.totalPages ||
    page.totalElements !== firstPage.totalElements ||
    page.collectors.length !== expectedLength
  ) {
    throw new CollectorContractError();
  }
}

function requireUniqueCollectors(collectors: InstrumentationCollector[]) {
  if (new Set(collectors.map(collector => collector.collectorId)).size !== collectors.length) {
    throw new CollectorContractError();
  }
}

export class CollectorContractError extends Error {
  constructor() {
    super('Collector response was invalid');
    this.name = 'CollectorContractError';
  }
}

export function collectorReadFailureKind(error: unknown): CollectorReadFailureKind {
  if (!(error instanceof ApiMessageError)) return 'error';
  return error.cause !== undefined || error.status === undefined || error.status === 0 || error.status >= 500
    ? 'unavailable'
    : 'error';
}

function parseInstrumentationIntake(value: unknown, registeredCollectorId: string): CollectorInstrumentationIntake {
  const available = availableCollectorIntakeSchema.safeParse(value);
  if (available.success && available.data.collectorId === registeredCollectorId) {
    return {
      status: 'available',
      schemaVersion: 1,
      collectorId: registeredCollectorId,
      gateway: available.data.gateway,
      capabilities: available.data.capabilities,
      otlpHttpEndpoint: available.data.otlpHttpEndpoint,
      otlpGrpcEndpoint: available.data.otlpGrpcEndpoint,
      authorizationHeader: 'Authorization'
    };
  }
  const unavailable = unavailableCollectorIntakeSchema.safeParse(value);
  if (unavailable.success && unavailable.data.collectorId === registeredCollectorId) {
    return { status: 'unavailable', errorCode: unavailable.data.errorCode };
  }
  return { status: 'unavailable', errorCode: 'intake_advertisement_invalid' };
}
