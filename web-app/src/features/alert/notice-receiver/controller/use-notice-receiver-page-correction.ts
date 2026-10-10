/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
