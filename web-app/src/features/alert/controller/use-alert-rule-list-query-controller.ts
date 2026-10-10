/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useLocation, useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft } from '@/shared/query-context';
import { alertRoutePaths } from '@/shared/navigation/app-paths';

import { readAlertRuleQuery, writeAlertRuleQuery, type AlertRuleQuery } from '../model/alert-rule-model';

/** Owns the Alert Rule list URL and its unsent search draft. */
export function useAlertRuleListQueryController() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = readAlertRuleQuery(params);
  const source = writeAlertRuleQuery(query).toString();
  useCanonicalQuerySearch(locationSearch, source, setParams, location.pathname === alertRoutePaths.rules);
  const { value: search, setValue: setSearch } = useStringQueryDraft(query.search, query.search);
  const updateQuery = (patch: Partial<AlertRuleQuery>) => {
    if (patch.search !== undefined) setSearch(patch.search.trim());
    setParams(writeAlertRuleQuery({ ...query, ...patch }));
  };
  return { query, search, setSearch, updateQuery };
}

export type AlertRuleListQueryController = ReturnType<typeof useAlertRuleListQueryController>;
