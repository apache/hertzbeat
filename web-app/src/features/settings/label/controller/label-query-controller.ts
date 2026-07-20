/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { settingsPaths } from '@/shared/settings/settings-routes';

import {
  labelQueryAfterConfirmedDelete,
  readLabelQuery,
  writeLabelQuery,
  type LabelDeletePageReceipt,
  type LabelPageSize,
  type LabelQuery
} from '../model/label-query-model';

export function useLabelQueryController() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const query = useMemo(() => readLabelQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const queryRef = useRef(query);
  const canonicalSearch = useMemo(() => writeLabelQuery(query).toString(), [query]);

  // Publish only committed external navigation before later layout effects can settle an old delete.
  useLayoutEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (pathname === settingsPaths.labels && locationSearch !== canonicalSearch) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [canonicalSearch, locationSearch, pathname, setSearchParams]);

  const navigateQuery = useCallback(
    (next: LabelQuery, replace = false) => {
      queryRef.current = next;
      setSearchParams(writeLabelQuery(next), { replace });
    },
    [setSearchParams]
  );

  const setSearch = useCallback(
    (value: string) => {
      const search = value.trim();
      const current = queryRef.current;
      navigateQuery({
        ...current,
        search,
        pageIndex: search === current.search ? current.pageIndex : 0
      });
    },
    [navigateQuery]
  );

  const setPage = useCallback(
    (pageIndex: number, pageSize: LabelPageSize) => {
      navigateQuery({ ...queryRef.current, pageIndex, pageSize });
    },
    [navigateQuery]
  );

  const reconcileConfirmedDelete = useCallback(
    (receipt: LabelDeletePageReceipt) => {
      const next = labelQueryAfterConfirmedDelete(queryRef.current, receipt);
      if (!next) return false;
      navigateQuery(next, true);
      return true;
    },
    [navigateQuery]
  );

  return { query, reconcileConfirmedDelete, setPage, setSearch };
}
