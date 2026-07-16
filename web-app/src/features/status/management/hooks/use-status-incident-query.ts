/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  readStatusIncidentQuery,
  writeStatusIncidentQuery
} from '../model/status-incident-query';

export function useStatusIncidentQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readStatusIncidentQuery(searchParams), [searchParams]);
  const [draftSearch, setDraftSearch] = useState(query.search);
  const committedSearch = useRef(query.search);

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
