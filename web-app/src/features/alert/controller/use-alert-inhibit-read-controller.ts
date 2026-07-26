/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';

import {
  AlertInhibitUnavailableError,
  type AlertInhibitManagementContext,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';
import {
  fetchAlertInhibitVisibleProjection,
  useAlertInhibitVisibleProjection
} from './alert-inhibit-visible-projection';
import { useAlertInhibitPageCorrection } from './use-alert-inhibit-page-correction';
import { useAlertInhibitQueryController } from './use-alert-inhibit-query-controller';

type VisibleQuery = {
  identity: string;
  query: AlertInhibitQuery;
  management: AlertInhibitManagementContext | null;
};

export function useAlertInhibitReadController() {
  const queryClient = useQueryClient();
  const queryController = useAlertInhibitQueryController();
  const { management, query, search, source } = queryController.state;
  const projection = useAlertInhibitVisibleProjection({ query, management });
  const currentQueryRef = useRef<VisibleQuery>({ identity: source, query, management });
  useLayoutEffect(() => {
    // A pending command rereads the query currently owned by the visible route.
    currentQueryRef.current = { identity: source, query, management };
  }, [management, query, source]);
  const rereadAuthoritatively = useCallback(async () => {
    const visible = currentQueryRef.current;
    const page = await fetchAlertInhibitVisibleProjection(queryClient, visible);
    if (currentQueryRef.current.identity !== visible.identity) {
      throw new AlertInhibitUnavailableError('visible alert inhibit query changed during projection');
    }
    return page;
  }, [queryClient]);
  const refresh = async () => {
    try {
      await rereadAuthoritatively();
    } catch {
      // React Query owns the visible list failure for a manual refresh.
    }
  };
  useAlertInhibitPageCorrection(query, projection.list, queryController.replacePageIndex);
  return {
    state: {
      list: projection.list,
      query,
      refreshing: projection.refreshing,
      search,
      management: {
        context: management,
        missingCount: projection.missingCount
      }
    },
    actions: {
      ...queryController.actions,
      refresh
    },
    rereadAuthoritatively
  };
}
