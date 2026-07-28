/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
  const submitSearch = () => navigate({ ...queryRef.current, search: searchDraft.trim(), pageIndex: 0 });
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
