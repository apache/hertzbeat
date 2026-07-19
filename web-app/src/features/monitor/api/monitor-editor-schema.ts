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

import { z } from 'zod';

import { MonitorContractError, type MonitorCollector, type MonitorParamDefine } from '../model/monitor-contract';
import {
  javaByteSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  nullableNonNegativeIntegerSchema,
  nullablePositiveIntegerSchema,
  nullableStringSchema,
  positiveIntegerSchema
} from './monitor-read-schema-primitives';

// Wire schemas enumerate accepted backend fields; Zod strips unrelated payload data.
const dependScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const paramOptionSchema = z.object({
  label: nonEmptyStringSchema,
  value: nonEmptyStringSchema
});

const paramDefineSchema = z.object({
  id: nullablePositiveIntegerSchema,
  app: nonEmptyStringSchema.nullish(),
  name: z.record(z.string(), z.string()),
  field: nonEmptyStringSchema,
  type: nonEmptyStringSchema,
  required: z.boolean(),
  defaultValue: nullableStringSchema,
  placeholder: nullableStringSchema,
  range: nullableStringSchema,
  limit: nullableNonNegativeIntegerSchema,
  options: z.array(paramOptionSchema).nullable(),
  keyAlias: nullableStringSchema,
  valueAlias: nullableStringSchema,
  depend: z.record(z.string(), z.array(dependScalarSchema)).nullable(),
  hide: z.boolean()
});

const paramDefinesSchema = z.array(paramDefineSchema);

const collectorStatusSchema = javaByteSchema.refine(value => value <= 1);
const collectorSummarySchema = z.object({
  collector: z.object({
    name: nonEmptyStringSchema,
    status: collectorStatusSchema
  })
});
const collectorPageSchema = z.object({
  content: z.array(collectorSummarySchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema.refine(value => value <= 20),
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

type ParamDefineWire = z.output<typeof paramDefineSchema>;

export function parseMonitorParamDefines(value: unknown, requestedApp: string): MonitorParamDefine[] {
  const requestResult = nonEmptyStringSchema.safeParse(requestedApp);
  const result = paramDefinesSchema.safeParse(value);
  if (!requestResult.success || !result.success) throw new MonitorContractError();
  return result.data.map(wire => mapParamDefine(wire, requestResult.data));
}

export function parseMonitorCollectorPage(value: unknown, requestedPage: number) {
  const result = collectorPageSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const page = result.data;
  // Pagination consistency depends on request context and therefore follows wire validation.
  if (
    page.number !== requestedPage ||
    page.size !== 200 ||
    page.totalPages !== Math.ceil(page.totalElements / page.size) ||
    page.content.length > page.size ||
    (requestedPage + 1 < page.totalPages && page.content.length !== page.size)
  ) {
    throw new MonitorContractError('Collector page identity is inconsistent with the request');
  }
  return {
    collectors: page.content.map(summary => ({
      name: summary.collector.name,
      online: summary.collector.status === 0
    })),
    totalPages: page.totalPages
  };
}

export function requireUniqueMonitorCollectors(collectors: MonitorCollector[]) {
  const names = new Set(collectors.map(collector => collector.name));
  if (names.size !== collectors.length) throw new MonitorContractError('Collector identity must be unique');
}

function mapParamDefine(wire: ParamDefineWire, requestedApp: string): MonitorParamDefine {
  const app = wire.app ?? requestedApp;
  if (app.toLowerCase() !== requestedApp.toLowerCase()) {
    throw new MonitorContractError('Monitor param define app does not match request');
  }
  return {
    id: wire.id,
    app,
    name: wire.name,
    field: wire.field,
    type: wire.type,
    required: wire.required,
    defaultValue: wire.defaultValue,
    placeholder: wire.placeholder,
    range: wire.range,
    limit: wire.limit,
    options: wire.options,
    keyAlias: wire.keyAlias,
    valueAlias: wire.valueAlias,
    depend: wire.depend,
    hide: wire.hide
  };
}
