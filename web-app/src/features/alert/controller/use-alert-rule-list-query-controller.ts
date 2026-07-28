/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft } from '@/shared/query-context';

import { readAlertRuleQuery, writeAlertRuleQuery, type AlertRuleQuery } from '../model/alert-rule-model';

/** Owns the Alert Rule list URL and its unsent search draft. */
export function useAlertRuleListQueryController() {
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = readAlertRuleQuery(params);
  const source = writeAlertRuleQuery(query).toString();
  useCanonicalQuerySearch(locationSearch, source, setParams);
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const updateQuery = (patch: Partial<AlertRuleQuery>) => {
    setParams(writeAlertRuleQuery({ ...query, ...patch }));
  };
  return { query, search, setSearch, updateQuery };
}

export type AlertRuleListQueryController = ReturnType<typeof useAlertRuleListQueryController>;
