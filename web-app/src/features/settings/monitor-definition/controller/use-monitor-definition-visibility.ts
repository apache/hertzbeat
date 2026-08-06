/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { monitorNavigationQueryKeys } from '@/features/monitor';

import { MonitorDefinitionRequestError, updateMonitorDefinitionVisibility } from '../api/monitor-definition-api';
import type { MonitorDefinitionCatalogItem, MonitorDefinitionFailureKind } from '../model/monitor-definition-model';
import type { MonitorDefinitionCatalogProof } from './monitor-definition-catalog-proof';

export function useMonitorDefinitionVisibility(options: {
  canWrite: boolean;
  catalogProof: MonitorDefinitionCatalogProof;
  queryClient: QueryClient;
}) {
  const active = useRef<AbortController | null>(null);
  const [pendingApp, setPendingApp] = useState<string | null>(null);
  const [failure, setFailure] = useState<MonitorDefinitionFailureKind | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (options.canWrite) return;
    active.current?.abort();
  }, [options.canWrite]);

  const updateVisibility = async (item: MonitorDefinitionCatalogItem) => {
    if (!options.canWrite || active.current) return;
    const abort = new AbortController();
    active.current = abort;
    setPendingApp(item.app);
    setFailure(null);
    try {
      await updateMonitorDefinitionVisibility(item.app, !item.hidden, abort.signal);
      const catalog = await options.catalogProof.load(abort.signal);
      abort.signal.throwIfAborted();
      options.catalogProof.publish(catalog);
      // The shell owns dynamic monitor navigation. Refetching its shared query
      // lets the established runtime loader converge without route-local parsing.
      await options.queryClient.refetchQueries({ queryKey: monitorNavigationQueryKeys.all, type: 'active' });
    } catch (error) {
      if (!abort.signal.aborted) {
        setFailure(error instanceof MonitorDefinitionRequestError ? error.kind : 'visibility-update-failed');
      }
    } finally {
      if (active.current === abort) {
        active.current = null;
        setPendingApp(null);
      }
    }
  };

  return {
    failure: options.canWrite ? failure : null,
    pendingApp: options.canWrite ? pendingApp : null,
    updateVisibility
  };
}
