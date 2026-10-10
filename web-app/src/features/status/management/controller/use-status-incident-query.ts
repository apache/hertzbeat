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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  readStatusIncidentQuery,
  type StatusIncidentQueryViewModel,
  writeStatusIncidentQuery
} from '../model/status-incident-query';

export function useStatusIncidentQuery(): StatusIncidentQueryViewModel {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readStatusIncidentQuery(searchParams), [searchParams]);
  const [draftSearch, setDraftSearch] = useState(query.search);
  const committedSearch = useRef(query.search);

  // Preserve unsaved drafts across pagination history, but follow history when its committed search changes.
  useEffect(() => {
    if (committedSearch.current === query.search) return;
    committedSearch.current = query.search;
    setDraftSearch(query.search);
  }, [query.search]);

  const commit = (next: typeof query) => {
    setSearchParams(writeStatusIncidentQuery(next));
  };

  const submit = () => {
    const search = draftSearch.trim();
    setDraftSearch(search);
    commit({ ...query, search, pageIndex: 0 });
  };

  const changePage = (pageIndex: number, pageSize: number) => {
    commit({
      ...query,
      pageIndex: pageSize === query.pageSize ? pageIndex : 0,
      pageSize
    });
  };

  return { query, draftSearch, setDraftSearch, submit, changePage };
}
