/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { authoritativePageIndexCorrection } from '@/shared/pagination';

import type { NoticeReceiverListState } from '../model/notice-receiver-list-state';
import type { NoticeReceiverQuery } from '../model/notice-receiver-model';

export function useNoticeReceiverPageCorrection(
  query: NoticeReceiverQuery,
  list: NoticeReceiverListState,
  replacePageIndex: (pageIndex: number) => void
) {
  const totalPages = list.kind === 'ready' ? Math.ceil(list.total / query.pageSize) : undefined;
  const correction =
    totalPages === undefined ? undefined : authoritativePageIndexCorrection(query.pageIndex, totalPages);

  useEffect(() => {
    if (correction !== undefined) replacePageIndex(correction);
  }, [correction, replacePageIndex]);
}
