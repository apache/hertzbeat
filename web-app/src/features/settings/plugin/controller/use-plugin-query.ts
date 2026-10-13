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

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { loadPlugins } from '../api/plugin-api';
import {
  pluginPageSizes,
  readPluginQuery,
  writePluginQuery,
  type PluginPageSize,
  type PluginQuery
} from '../model/plugin-model';
import { pluginQueryKeys } from './plugin-query-keys';

export function usePluginQuery(enabled = true) {
  const [params, setParams] = useSearchParams();
  const source = params.toString();
  const query = useMemo(() => readPluginQuery(new URLSearchParams(source)), [source]);
  const queryRef = useRef(query);
  const canonical = writePluginQuery(query).toString();
  const [draft, setDraft] = useState({ query: query.search, value: query.search });
  const [selection, setSelection] = useState<{ query: string; ids: number[] }>({ query: canonical, ids: [] });
  const searchDraft = draft.query === query.search ? draft.value : query.search;
  const selectedIds = selection.query === canonical ? selection.ids : [];
  const result = useQuery({
    queryKey: pluginQueryKeys.page(query),
    queryFn: ({ signal }) => loadPlugins(query, signal),
    retry: false,
    enabled
  });

  useLayoutEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    if (source !== canonical) setParams(canonical, { replace: true });
  }, [canonical, setParams, source]);

  const navigate = useCallback(
    (next: PluginQuery, replace = false) => {
      queryRef.current = next;
      setParams(writePluginQuery(next), { replace });
    },
    [setParams]
  );
  const submitSearch = (value = searchDraft) => navigate({ ...queryRef.current, search: value.trim(), pageIndex: 0 });
  const setPage = (pageIndex: number, pageSize: PluginPageSize) =>
    navigate({ ...queryRef.current, pageIndex, pageSize });
  const setSearchDraft = (value: string) => setDraft({ query: query.search, value });
  const setSelected = useCallback((ids: number[]) => setSelection({ query: canonical, ids }), [canonical]);

  return {
    query,
    queryRef,
    result,
    searchDraft,
    selectedIds,
    navigate,
    setSearchDraft,
    setSelected,
    setPage,
    submitSearch,
    pageSizes: pluginPageSizes
  };
}
