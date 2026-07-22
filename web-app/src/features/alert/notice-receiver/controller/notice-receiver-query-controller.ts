/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { readNoticeReceiverQuery, writeNoticeReceiverQuery } from '../model/notice-receiver-model';

export function useNoticeReceiverQueryController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const query = useMemo(() => readNoticeReceiverQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonicalSearch = useMemo(() => writeNoticeReceiverQuery(query).toString(), [query]);
  const [draft, setDraft] = useState({ query, value: query.name });

  if (draft.query !== query) {
    setDraft({ query, value: query.name });
  }
  const name = draft.query === query ? draft.value : query.name;

  useEffect(() => {
    if (locationSearch !== canonicalSearch) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [canonicalSearch, locationSearch, setSearchParams]);

  const search = useCallback(() => {
    setSearchParams(writeNoticeReceiverQuery({ ...query, name: name.trim(), pageIndex: 0 }));
  }, [name, query, setSearchParams]);

  const changePage = useCallback(
    (page: number, pageSize: number) => {
      setSearchParams(writeNoticeReceiverQuery({ ...query, pageIndex: page - 1, pageSize }));
    },
    [query, setSearchParams]
  );

  const setName = useCallback(
    (value: string) => {
      setDraft({ query, value });
    },
    [query]
  );

  return { query, name, setName, search, changePage };
}
