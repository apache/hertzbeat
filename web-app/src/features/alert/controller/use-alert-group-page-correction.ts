/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { authoritativePageIndexCorrection } from '@/shared/pagination';

import type { AlertGroupQuery } from '../model/alert-group-model';
import type { AlertGroupListState } from '../model/alert-group-state';

export function useAlertGroupPageCorrection(
  query: AlertGroupQuery,
  list: AlertGroupListState,
  replacePageIndex: (pageIndex: number) => void
) {
  let totalPages: number | undefined;
  if (list.kind === 'ready') totalPages = Math.ceil(list.total / query.pageSize);
  if (list.kind === 'empty') totalPages = 0;
  const correction =
    totalPages === undefined ? undefined : authoritativePageIndexCorrection(query.pageIndex, totalPages);

  useEffect(() => {
    // Only authoritative list evidence may move an out-of-range route.
    if (correction !== undefined) replacePageIndex(correction);
  }, [correction, replacePageIndex]);
}
