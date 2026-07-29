/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { EntityMonitorQuery } from '../model/entity-contract';
import { normalizeEntityMonitorQuery } from '../model/entity-monitor-query';

export const entityQueryKeys = {
  all: ['entities'] as const,
  lists: () => [...entityQueryKeys.all, 'list'] as const,
  list: (scope: string) => [...entityQueryKeys.all, 'list', scope] as const,
  details: () => [...entityQueryKeys.all, 'detail'] as const,
  detail: (id: number | undefined) => [...entityQueryKeys.all, 'detail', id] as const,
  monitors: (id: number | undefined, query: EntityMonitorQuery) =>
    [...entityQueryKeys.detail(id), 'monitors', normalizeEntityMonitorQuery(query)] as const,
  editor: (id: number | undefined) => [...entityQueryKeys.all, 'editor', id] as const,
  definitions: () => [...entityQueryKeys.all, 'definition'] as const,
  definition: (id: number | undefined, format: string) => [...entityQueryKeys.definitions(), id, format] as const,
  discovery: (scope: string) => [...entityQueryKeys.all, 'discovery', scope] as const,
  suggestions: () => [...entityQueryKeys.all, 'suggestions'] as const
};
