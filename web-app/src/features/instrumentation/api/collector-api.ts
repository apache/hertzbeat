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

export type InstrumentationCollector = {
  name: string;
  collectorId: string;
  address: string;
  online: boolean;
  intake: { status: 'unavailable' };
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
  const collector = value && typeof value === 'object' ? (value as { collector?: unknown }).collector : undefined;
  if (!collector || typeof collector !== 'object') throw new Error(`Collector ${index} was invalid`);
  const record = collector as Record<string, unknown>;
  const name = requiredString(record.name, `Collector ${index} name`);
  const address = requiredString(record.ip, `Collector ${index} address`);
  return {
    collectorId: name,
    name,
    address,
    online: record.online === true || record.status === 0,
    intake: { status: 'unavailable' }
  };
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} was invalid`);
  return value.trim();
}
