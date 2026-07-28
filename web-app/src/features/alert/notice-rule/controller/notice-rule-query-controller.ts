/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft, zeroBasedPageChange } from '@/shared/query-context';

import { readNoticeRuleQuery, writeNoticeRuleQuery } from '../model/notice-rule-model';

export function useNoticeRuleQueryController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const query = useMemo(() => readNoticeRuleQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const canonicalSearch = useMemo(() => writeNoticeRuleQuery(query).toString(), [query]);
  const { value: name, setValue: setName } = useStringQueryDraft(canonicalSearch, query.name);

  useCanonicalQuerySearch(locationSearch, canonicalSearch, setSearchParams);

  const search = useCallback(() => {
    setSearchParams(writeNoticeRuleQuery({ ...query, name: name.trim(), pageIndex: 0 }));
  }, [name, query, setSearchParams]);
  const changePage = useCallback(
    (page: number, pageSize: number) => {
      setSearchParams(writeNoticeRuleQuery({ ...query, ...zeroBasedPageChange(page, pageSize, query.pageSize) }));
    },
    [query, setSearchParams]
  );
  const replacePageIndex = useCallback(
    (pageIndex: number) => {
      setSearchParams(writeNoticeRuleQuery({ ...query, pageIndex }), { replace: true });
    },
    [query, setSearchParams]
  );

  return { query, name, setName, search, changePage, replacePageIndex };
}
