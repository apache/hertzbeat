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
  monitorStatusFilters,
  type Monitor,
  type MonitorPage,
  type MonitorQuery
} from '../model/monitor-contract';
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

// MonitorsController returns PageResponse rather than Spring Data's Page shape;
// the parser maps these wire names into the shared frontend pagination model.
const monitorPageSchema = z.object({
  content: z.array(monitorListItemSchema),
  totalElements: nonNegativeIntegerSchema,
  pageIndex: nonNegativeIntegerSchema,
  pageSize: positiveIntegerSchema
});

type MonitorListItemWire = z.output<typeof monitorListItemSchema>;

export function parseMonitorAppList(value: unknown, requestedApp: string): Monitor[] {
  const app = requestedApp.trim();
  if (!app) throw new MonitorContractError('Monitor application is required');
  const result = z.array(monitorListItemSchema).safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const ids = new Set(result.data.map(item => item.id));
  if (ids.size !== result.data.length || result.data.some(item => item.app !== app)) {
    throw new MonitorContractError('Monitor application evidence is inconsistent with the request');
  }
  return result.data.map(mapMonitorListItem);
}

export function parseMonitorPage(value: unknown, query: MonitorQuery): MonitorPage {
  const result = monitorPageSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();

  const page = result.data;
  const totalPages = Math.ceil(page.totalElements / page.pageSize);
  const remainingRows = Math.max(0, page.totalElements - page.pageIndex * page.pageSize);
  const expectedContentSize = Math.min(page.pageSize, remainingRows);
  const monitorIds = new Set(page.content.map(item => item.id));
  // App and active status are backend equality predicates; search and label expressions intentionally are not.
  const crossesAppFilter = query.app.length > 0 && page.content.some(item => item.app !== query.app);
  const crossesStatusFilter =
    query.status !== monitorStatusFilters.all && page.content.some(item => String(item.status) !== query.status);
  if (
    page.pageIndex !== query.pageIndex ||
    page.pageSize !== query.pageSize ||
    page.content.length !== expectedContentSize ||
    monitorIds.size !== page.content.length ||
    crossesAppFilter ||
    crossesStatusFilter
  ) {
    throw new MonitorContractError('Monitor page evidence is inconsistent with the request');
  }
  return {
    content: page.content.map(mapMonitorListItem),
    totalElements: page.totalElements,
    totalPages,
    number: page.pageIndex,
    size: page.pageSize
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
