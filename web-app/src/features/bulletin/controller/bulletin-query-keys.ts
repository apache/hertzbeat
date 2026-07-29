/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
