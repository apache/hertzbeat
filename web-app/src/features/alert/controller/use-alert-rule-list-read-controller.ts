/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';

import { loadAlertRules } from '../api/alert-rule-api';
import type { AlertRuleQuery } from '../model/alert-rule-model';
import { alertRuleQueryKeys } from './alert-rule-query-keys';

/** Keeps command projections bound to the latest route query. */
export function useAlertRuleListReadController(query: AlertRuleQuery) {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: alertRuleQueryKeys.list(query),
    queryFn: ({ signal }) => loadAlertRules(query, signal),
    retry: false
  });
  const latestRef = useRef({ query, queryClient });
  useLayoutEffect(() => {
    latestRef.current = { query, queryClient };
  }, [query, queryClient]);
  const rereadLatest = () => {
    const latest = latestRef.current;
    return latest.queryClient.fetchQuery({
      queryKey: alertRuleQueryKeys.list(latest.query),
      queryFn: ({ signal }) => loadAlertRules(latest.query, signal),
      staleTime: 0
    });
  };
  return { listQuery, rereadLatest };
}
