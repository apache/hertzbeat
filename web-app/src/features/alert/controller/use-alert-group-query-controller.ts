/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  readAlertGroupQuery,
  writeAlertGroupQuery,
  type AlertGroupQuery
} from '../alert-group-model';

export function useAlertGroupQueryController() {
  const [params, setParams] = useSearchParams();
  const query = readAlertGroupQuery(params);
  const source = writeAlertGroupQuery(query).toString();
  const [searchState, setSearchState] = useState({ source, value: query.search });
  const queryChanged = searchState.source !== source;
  if (queryChanged) setSearchState({ source, value: query.search });
  const search = queryChanged ? query.search : searchState.value;
  const updateQuery = (patch: Partial<AlertGroupQuery>) => {
    setParams(writeAlertGroupQuery({ ...query, ...patch }));
  };

  return {
    state: { query, search },
    actions: {
      setSearch: (value: string) => setSearchState(current => ({ ...current, value })),
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({
        pageIndex: pageSize === query.pageSize ? page - 1 : 0,
        pageSize
      })
    }
  };
}
