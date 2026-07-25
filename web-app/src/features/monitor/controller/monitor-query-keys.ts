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

import type { Monitor, MonitorQuery } from '../model/monitor-contract';

type MonitorHistorySource = Pick<Monitor, 'id' | 'instance' | 'name' | 'app' | 'scrape'> | undefined;

const rootKey = ['monitor'] as const;

// Every value that can change a backend result belongs in its resource key.
export const monitorQueryKeys = {
  lists: () => [...rootKey, 'list'] as const,
  list: (query: MonitorQuery) =>
    [
      ...rootKey,
      'list',
      query.search,
      query.app,
      query.status,
      query.labels,
      query.sort,
      query.order,
      query.pageIndex,
      query.pageSize
    ] as const,
  apps: () => [...rootKey, 'apps'] as const,
  detail: (id: number | undefined) => [...rootKey, 'detail', id] as const,
  collectors: () => [...rootKey, 'collectors'] as const,
  labelSuggestions: () => [...rootKey, 'editor', 'label-suggestions'] as const,
  appDefines: (app: string) => [...rootKey, 'defines', 'app', app] as const,
  sdDefines: (scrape: string) => [...rootKey, 'defines', 'sd', scrape] as const,
  metricCatalog: (id: number | undefined, app: string | undefined, scrape: string | null | undefined) =>
    [...rootKey, 'metrics', 'catalog', id, app, scrape] as const,
  favorites: (id: number | undefined) => [...rootKey, 'metrics', 'favorites', id] as const,
  realtime: (id: number | undefined, group: string | undefined, field: string | undefined) =>
    [...rootKey, 'metrics', 'realtime', id, group, field] as const,
  history: (source: MonitorHistorySource, metricKey: string, history: string) =>
    [
      ...rootKey,
      'metrics',
      'history',
      source?.id,
      source?.instance,
      source?.name,
      source?.app,
      source?.scrape,
      metricKey,
      history
    ] as const
};
