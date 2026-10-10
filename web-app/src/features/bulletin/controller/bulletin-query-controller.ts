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

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import { readBulletinQuery, writeBulletinQuery } from '../model/bulletin-model';

export function useBulletinQueryController() {
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = useMemo(() => readBulletinQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonical = useMemo(() => writeBulletinQuery(query).toString(), [query]);
  const { value: search, setValue: setSearch } = useStringQueryDraft(query.search, query.search);

  useEffect(() => {
    if (canonical !== locationSearch) {
      setParams(canonical, { replace: true });
    }
  }, [canonical, locationSearch, setParams]);

  const submitSearch = useCallback(() => {
    const value = search.trim();
    const next = writeBulletinQuery({ ...query, search: value, pageIndex: 0 });
    setSearch(value);
    setParams(next);
  }, [query, search, setSearch, setParams]);

  const changePage = useCallback(
    (page: number, pageSize: number) => {
      setParams(
        writeBulletinQuery({
          ...query,
          pageIndex: page - 1,
          pageSize
        })
      );
    },
    [query, setParams]
  );
  const replacePageIndex = useCallback(
    (pageIndex: number) => {
      setParams(writeBulletinQuery({ ...query, pageIndex }), { replace: true });
    },
    [query, setParams]
  );

  return {
    changePage,
    query,
    replacePageIndex,
    search,
    setSearch,
    submitSearch
  };
}
