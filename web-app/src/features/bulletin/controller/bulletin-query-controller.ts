/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
