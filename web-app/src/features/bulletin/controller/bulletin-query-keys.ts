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

import type { BulletinQuery } from '../model/bulletin-model';

const bulletinRootKey = ['bulletin'] as const;

export const bulletinQueryKeys = {
  root: () => bulletinRootKey,
  lists: () => [...bulletinRootKey, 'lists'] as const,
  list: (query: BulletinQuery) => [...bulletinRootKey, 'lists', query.search, query.pageIndex, query.pageSize] as const,
  dependencies: () => [...bulletinRootKey, 'dependencies'] as const,
  apps: (locale: string) => [...bulletinRootKey, 'dependencies', 'apps', locale] as const,
  monitors: (app: string) => [...bulletinRootKey, 'dependencies', 'monitors', app] as const,
  hierarchy: (app: string, locale: string) => [...bulletinRootKey, 'dependencies', 'hierarchy', app, locale] as const,
  metrics: (bulletinId: number | null) => [...bulletinRootKey, 'metrics', bulletinId] as const
};
