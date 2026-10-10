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

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft, zeroBasedPageChange } from '@/shared/query-context';

import { readNoticeReceiverQuery, writeNoticeReceiverQuery } from '../model/notice-receiver-model';

export function useNoticeReceiverQueryController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const query = useMemo(() => readNoticeReceiverQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonicalSearch = useMemo(() => writeNoticeReceiverQuery(query).toString(), [query]);
  const { value: name, setValue: setName } = useStringQueryDraft(query.name, query.name);

  useCanonicalQuerySearch(locationSearch, canonicalSearch, setSearchParams);

  const search = useCallback(() => {
    const submittedName = name.trim();
    setName(submittedName);
    setSearchParams(writeNoticeReceiverQuery({ ...query, name: submittedName, pageIndex: 0 }));
  }, [name, query, setName, setSearchParams]);

  const changePage = useCallback(
    (page: number, pageSize: number) => {
      setSearchParams(writeNoticeReceiverQuery({ ...query, ...zeroBasedPageChange(page, pageSize, query.pageSize) }));
    },
    [query, setSearchParams]
  );

  const replacePageIndex = useCallback(
    (pageIndex: number) => {
      setSearchParams(writeNoticeReceiverQuery({ ...query, pageIndex }), { replace: true });
    },
    [query, setSearchParams]
  );

  return { query, name, setName, search, changePage, replacePageIndex };
}
