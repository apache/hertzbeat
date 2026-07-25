/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect } from 'react';

import { authoritativePageIndexCorrection } from '@/shared/pagination';

import type { NoticeTemplateListState, NoticeTemplateQuery } from '../notice-template-model';

export function useNoticeTemplatePageCorrection(
  query: NoticeTemplateQuery,
  list: NoticeTemplateListState,
  replacePageIndex: (pageIndex: number) => void
) {
  let totalPages: number | undefined;
  if (list.kind === 'ready') totalPages = Math.ceil(list.total / query.pageSize);
  // Empty is authoritative; loading and failures cannot prove that a route page is stale.
  if (list.kind === 'empty') totalPages = 0;
  const correction =
    totalPages === undefined ? undefined : authoritativePageIndexCorrection(query.pageIndex, totalPages);

  useEffect(() => {
    if (correction !== undefined) replacePageIndex(correction);
  }, [correction, replacePageIndex]);
}
