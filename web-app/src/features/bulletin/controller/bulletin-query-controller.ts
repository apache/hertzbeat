/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readBulletinQuery, writeBulletinQuery } from '../model/bulletin-model';

export function useBulletinQueryController() {
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = useMemo(() => readBulletinQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonical = useMemo(() => writeBulletinQuery(query).toString(), [query]);
  const [draft, setDraft] = useState({ key: locationSearch, value: query.search });
  const search = draft.key === locationSearch ? draft.value : query.search;
  useEffect(() => { if (canonical !== locationSearch) setParams(canonical, { replace: true }); }, [canonical, locationSearch, setParams]);
  return {
    query, search, setSearch: useCallback((value: string) => setDraft({ key: locationSearch, value }), [locationSearch]),
    submitSearch: useCallback(() => {
      const value = search.trim();
      const next = writeBulletinQuery({ ...query, search: value, pageIndex: 0 });
      setDraft({ key: next.toString(), value });
      setParams(next);
    }, [query, search, setParams]),
    changePage: useCallback((page: number, pageSize: number) => setParams(writeBulletinQuery({ ...query, pageIndex: page - 1, pageSize })), [query, setParams])
  };
}
