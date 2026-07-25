/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { loadAlertGroups, loadAlertSummary } from '../api/alert-api';
import type { AlertQuery } from '../model/alert-model';
import { alertCenterQueryKeys } from './alert-center-query-keys';
import { useAlertCenterRealtimeRefresh } from './use-alert-center-realtime-refresh';

export function useAlertCenterData(query: AlertQuery) {
  const summary = useQuery({
    queryKey: alertCenterQueryKeys.summary(),
    queryFn: ({ signal }) => loadAlertSummary(signal)
  });
  const list = useQuery({
    queryKey: alertCenterQueryKeys.groups(query),
    queryFn: ({ signal }) => loadAlertGroups(query, signal)
  });
  const { refetch: refetchList } = list;
  const { refetch: refetchSummary } = summary;
  const refresh = useCallback(() => Promise.all([refetchSummary(), refetchList()]), [refetchList, refetchSummary]);

  useAlertCenterRealtimeRefresh(refresh);
  return { list, summary, refetchList, refetchSummary, refresh };
}
