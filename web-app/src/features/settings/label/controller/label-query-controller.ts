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

import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { settingsPaths } from '@/shared/settings/settings-routes';

import { readLabelQuery, writeLabelQuery, type LabelPageSize } from '../model/label-query-model';

export function useLabelQueryController() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const query = useMemo(() => readLabelQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonicalSearch = useMemo(() => writeLabelQuery(query).toString(), [query]);

  useEffect(() => {
    if (pathname === settingsPaths.labels && locationSearch !== canonicalSearch) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [canonicalSearch, locationSearch, pathname, setSearchParams]);

  const setSearch = useCallback(
    (value: string) => {
      const search = value.trim();
      setSearchParams(
        writeLabelQuery({
          ...query,
          search,
          pageIndex: search === query.search ? query.pageIndex : 0
        })
      );
    },
    [query, setSearchParams]
  );

  const setPage = useCallback(
    (pageIndex: number, pageSize: LabelPageSize) => {
      setSearchParams(writeLabelQuery({ ...query, pageIndex, pageSize }));
    },
    [query, setSearchParams]
  );

  return { query, setPage, setSearch };
}
