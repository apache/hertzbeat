/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { classifyEntityDetailError, loadEntityDetail } from '../api/entity-api';
import {
  buildEntityEditRoute,
  buildEntityExplorePath,
  safeEntityReturnTo,
  type EntityDetailEvidence,
  type EntityExploreSignal
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityDetailController() {
  const navigate = useNavigate();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const id = parseEntityId(entityId);
  const result = useQuery({
    queryKey: entityQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEntityDetail(id, signal),
    retry: false
  });
  const evidence = resolveDetail(id, result.isPending, result.error, result.data);
  return {
    state: { evidence },
    actions: {
      back: () => {
        void navigate(safeEntityReturnTo(params.get('returnTo')));
      },
      edit: () => {
        if (evidence.kind === 'ready')
          void navigate(buildEntityEditRoute(evidence.detail.entity.id, params.get('returnTo')));
      },
      explore: (signal: EntityExploreSignal) => {
        if (evidence.kind === 'ready') void navigate(buildEntityExplorePath(evidence.detail, signal));
      }
    }
  };
}

function resolveDetail(
  id: number | undefined,
  pending: boolean,
  error: Error | null,
  detail: Awaited<ReturnType<typeof loadEntityDetail>> | undefined
): EntityDetailEvidence {
  if (id === undefined) return { kind: 'missing' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityDetailError(error) };
  return detail ? { kind: 'ready', detail } : { kind: 'error' };
}

function parseEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
