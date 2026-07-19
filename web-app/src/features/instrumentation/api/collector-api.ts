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

import {
  availableCollectorIntakeSchema,
  collectorPageSchema,
  unavailableCollectorIntakeSchema
} from './collector-schema';
import type { CollectorInstrumentationIntake, InstrumentationCollector } from '../model/instrumentation-collector';

export async function loadInstrumentationCollectors(signal?: AbortSignal) {
  const page = await apiMessageGet('/api/collector?pageIndex=0&pageSize=200', signal ? { signal } : undefined);
  return parseCollectors(page);
}

function parseCollectors(value: unknown): InstrumentationCollector[] {
  const parsed = collectorPageSchema.safeParse(value);
  if (!parsed.success) throw new Error('Collector response was invalid');
  return parsed.data.content.map(summary => {
    const { name, ip, online, status } = summary.collector;
    return {
      collectorId: name,
      name,
      address: ip,
      online: online === true || status === 0,
      intake: Object.hasOwn(summary, 'instrumentationIntake')
        ? parseInstrumentationIntake(summary.instrumentationIntake, name)
        : { status: 'unavailable', errorCode: 'old_server' }
    };
  });
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
