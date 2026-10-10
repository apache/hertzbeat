/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { EntityMonitorQuery } from '../model/entity-contract';
import { normalizeEntityMonitorQuery } from '../model/entity-monitor-query';

export const entityQueryKeys = {
  all: ['entities'] as const,
  lists: () => [...entityQueryKeys.all, 'list'] as const,
  list: (scope: string) => [...entityQueryKeys.all, 'list', scope] as const,
  details: () => [...entityQueryKeys.all, 'detail'] as const,
  detail: (id: number | undefined) => [...entityQueryKeys.all, 'detail', id] as const,
  signal: (id: number, signal: string, window: string, refreshRevision: number) =>
    [...entityQueryKeys.detail(id), 'signal', signal, window, refreshRevision] as const,
  monitors: (id: number | undefined, query: EntityMonitorQuery) =>
    [...entityQueryKeys.detail(id), 'monitors', normalizeEntityMonitorQuery(query)] as const,
  editor: (id: number | undefined) => [...entityQueryKeys.all, 'editor', id] as const,
  definitions: () => [...entityQueryKeys.all, 'definition'] as const,
  definition: (id: number | undefined, format: string) => [...entityQueryKeys.definitions(), id, format] as const,
  discovery: (scope: string) => [...entityQueryKeys.all, 'discovery', scope] as const,
  suggestions: () => [...entityQueryKeys.all, 'suggestions'] as const
};
