/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft, zeroBasedPageChange } from '@/shared/query-context';

import { readAlertGroupQuery, writeAlertGroupQuery, type AlertGroupQuery } from '../model/alert-group-model';

export function useAlertGroupQueryController() {
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = readAlertGroupQuery(params);
  const source = writeAlertGroupQuery(query).toString();
  useCanonicalQuerySearch(locationSearch, source, setParams);
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const updateQuery = (patch: Partial<AlertGroupQuery>) => {
    setParams(writeAlertGroupQuery({ ...query, ...patch }));
  };
  const replacePageIndex = useCallback(
    (pageIndex: number) =>
      setParams(
        writeAlertGroupQuery({
          search: query.search,
          pageSize: query.pageSize,
          pageIndex
        }),
        { replace: true }
      ),
    [query.pageSize, query.search, setParams]
  );

  return {
    state: { query, search },
    replacePageIndex,
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery(zeroBasedPageChange(page, pageSize, query.pageSize))
    }
  };
}
