/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useQueryDraft } from '@/shared/query-context';
import { entityRoutePaths } from '@/shared/navigation/app-paths';
import { classifyEntityReadError, loadEntities } from '../api/entity-api';
import { readEntityQuery, writeEntityQuery } from '../model/entity-query';
import {
  buildEntityCreatePath,
  buildEntityDetailPath,
  type EntityFilterKey,
  type EntityListEvidence
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityListController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = readEntityQuery(params);
  const source = writeEntityQuery(query).toString();
  const draft = useQueryDraft(
    source,
    useMemo(() => query.search, [query.search])
  );
  const client = useQueryClient();
  const result = useQuery({
    queryKey: entityQueryKeys.list(source),
    queryFn: ({ signal }) => loadEntities(query, signal),
    retry: false
  });
  const setQuery = (patch: Parameters<typeof writeEntityQuery>[1]) => setParams(writeEntityQuery(query, patch));
  return {
    state: {
      query,
      draft: draft.value,
      evidence: resolveEvidence(result.isPending, result.error, result.data),
      refreshing: result.isFetching
    },
    actions: {
      updateDraft: draft.setValue,
      submit: () => setQuery({ search: draft.value.trim() }),
      changeFilter: (key: EntityFilterKey, value: string) => setQuery({ [key]: value }),
      changeSort: (sort: typeof query.sort, order: typeof query.order) => setQuery({ sort, order, pageIndex: 0 }),
      changePage: (page: number, pageSize: number) =>
        setQuery({ pageIndex: page - 1, pageSize: pageSize as typeof query.pageSize }),
      refresh: () => {
        void client.invalidateQueries({ queryKey: entityQueryKeys.list(source) });
      },
      create: () => void navigate(buildEntityCreatePath(query)),
      open: (id: number) => {
        if (location.pathname === entityRoutePaths.list) void navigate(buildEntityDetailPath(id, query));
      }
    }
  };
}

function resolveEvidence(
  pending: boolean,
  error: Error | null,
  page: Awaited<ReturnType<typeof loadEntities>> | undefined
): EntityListEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityReadError(error) };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
