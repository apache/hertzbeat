/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useQueryDraft } from '@/shared/query-context';
import { entityRoutePaths } from '@/shared/navigation/app-paths';
import { classifyEntityDiscoveryError, loadEntityDiscovery } from '../api/entity-discovery-api';
import {
  buildEntityDiscoveryCreatePath,
  buildEntityDiscoveryDetailPath,
  readEntityDiscoveryQuery,
  writeEntityDiscoveryQuery,
  type EntityDiscoveryPage,
  type EntityDiscoveryViewModel
} from '../model/entity-discovery-model';
import { safeEntityReturnTo } from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';
import { useEntityCapabilities } from './use-entity-capabilities';

export function useEntityDiscoveryController(): EntityDiscoveryViewModel {
  const { canWrite } = useEntityCapabilities();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = readEntityDiscoveryQuery(params);
  const source = writeEntityDiscoveryQuery(query).toString();
  const rawReturnTo = params.get('returnTo');
  const catalogReturnTo = safeEntityReturnTo(rawReturnTo);
  const canonicalParams = writeEntityDiscoveryQuery(query);
  if (rawReturnTo !== null) canonicalParams.set('returnTo', catalogReturnTo);
  const canonicalSource = canonicalParams.toString();
  const draft = useQueryDraft(
    source,
    useMemo(() => query.search, [query.search])
  );
  const client = useQueryClient();
  const result = useQuery({
    queryKey: entityQueryKeys.discovery(source),
    queryFn: ({ signal }) => loadEntityDiscovery(query, signal),
    retry: false
  });
  useEffect(() => {
    if (location.pathname === entityRoutePaths.discovery && params.toString() !== canonicalSource) {
      setParams(canonicalSource, { replace: true });
    }
  }, [canonicalSource, location.pathname, params, setParams]);
  const setQuery = (patch: Partial<typeof query>) => {
    const next = writeEntityDiscoveryQuery({ ...query, ...patch });
    if (rawReturnTo !== null) next.set('returnTo', catalogReturnTo);
    setParams(next);
  };
  return {
    state: {
      query,
      draft: draft.value,
      evidence: resolveDiscoveryEvidence(result.isPending, result.error, result.data),
      refreshing: result.isFetching,
      canWrite
    },
    actions: {
      updateDraft: draft.setValue,
      submit: () => setQuery({ search: draft.value, pageIndex: 0 }),
      changePage: (page, pageSize) => setQuery({ pageIndex: page - 1, pageSize }),
      refresh: () => void client.invalidateQueries({ queryKey: entityQueryKeys.discovery(source) }),
      back: () => void navigate(catalogReturnTo),
      create: () => {
        if (canWrite) void navigate(buildEntityDiscoveryCreatePath(query, catalogReturnTo));
      },
      openCandidate: resourceId => {
        if (location.pathname === entityRoutePaths.discovery)
          void navigate(buildEntityDiscoveryDetailPath(resourceId, query, catalogReturnTo));
      }
    }
  };
}

function resolveDiscoveryEvidence(
  pending: boolean,
  error: Error | null,
  page: EntityDiscoveryPage | undefined
): EntityDiscoveryViewModel['state']['evidence'] {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityDiscoveryError(error) };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
