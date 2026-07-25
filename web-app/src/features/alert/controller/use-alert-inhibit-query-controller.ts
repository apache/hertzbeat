/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import { readAlertInhibitQuery, writeAlertInhibitQuery, type AlertInhibitQuery } from '../model/alert-inhibit-model';

export function useAlertInhibitQueryController() {
  const [params, setParams] = useSearchParams();
  const query = readAlertInhibitQuery(params);
  const source = writeAlertInhibitQuery(query).toString();
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const updateQuery = (patch: Partial<AlertInhibitQuery>) => {
    setParams(writeAlertInhibitQuery({ ...query, ...patch }));
  };
  const replacePageIndex = useCallback(
    (pageIndex: number) =>
      setParams(writeAlertInhibitQuery({ search: query.search, pageSize: query.pageSize, pageIndex }), {
        replace: true
      }),
    [query.pageSize, query.search, setParams]
  );

  return {
    state: { query, search, source },
    replacePageIndex,
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) =>
        updateQuery({
          pageIndex: pageSize === query.pageSize ? page - 1 : 0,
          pageSize
        })
    }
  };
}
