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

import {
  MonitorContractError,
  type Monitor,
  type MonitorPage,
  type MonitorQuery
} from './monitor-contract';
import {
  monitorStatusSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  nullableStringMapSchema,
  positiveIntegerSchema,
  timestampSchema
} from './monitor-read-schema-primitives';

const monitorListItemSchema = z.object({
  id: positiveIntegerSchema,
  name: nonEmptyStringSchema,
  app: nonEmptyStringSchema,
  instance: nonEmptyStringSchema,
  status: monitorStatusSchema,
  labels: nullableStringMapSchema.optional(),
  gmtCreate: timestampSchema.nullish(),
  gmtUpdate: timestampSchema.nullish()
});

const monitorPageSchema = z.object({
  content: z.array(monitorListItemSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

type MonitorListItemWire = z.output<typeof monitorListItemSchema>;

export function parseMonitorPage(value: unknown, query: MonitorQuery): MonitorPage {
  const result = monitorPageSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();

  const page = result.data;
  if (page.number !== query.pageIndex
    || page.size !== query.pageSize
    || page.content.length > page.size
    || page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new MonitorContractError('Monitor page identity is inconsistent with the request');
  }
  return {
    content: page.content.map(mapMonitorListItem),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    number: page.number,
    size: page.size
  };
}

function mapMonitorListItem(wire: MonitorListItemWire): Monitor {
  return {
    id: wire.id,
    name: wire.name,
    app: wire.app,
    instance: wire.instance,
    status: wire.status,
    ...(wire.labels === undefined ? {} : { labels: wire.labels }),
    ...(wire.gmtCreate == null ? {} : { gmtCreate: wire.gmtCreate }),
    ...(wire.gmtUpdate == null ? {} : { gmtUpdate: wire.gmtUpdate })
  };
}
