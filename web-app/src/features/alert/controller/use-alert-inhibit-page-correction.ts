/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { authoritativePageIndexCorrection } from '@/shared/pagination';

import type { AlertInhibitQuery } from '../model/alert-inhibit-model';
import type { AlertInhibitListState } from '../model/alert-inhibit-state';

export function useAlertInhibitPageCorrection(
  query: AlertInhibitQuery,
  list: AlertInhibitListState,
  replacePageIndex: (pageIndex: number) => void
) {
  let totalPages: number | undefined;
  if (list.kind === 'ready') totalPages = Math.ceil(list.total / query.pageSize);
  if (list.kind === 'empty') totalPages = 0;
  const correction =
    totalPages === undefined ? undefined : authoritativePageIndexCorrection(query.pageIndex, totalPages);

  useEffect(() => {
    // Only authoritative list evidence may replace an impossible route page.
    if (correction !== undefined) replacePageIndex(correction);
  }, [correction, replacePageIndex]);
}
