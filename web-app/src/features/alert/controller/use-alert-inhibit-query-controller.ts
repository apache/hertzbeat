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

import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft, zeroBasedPageChange } from '@/shared/query-context';

import {
  readAlertInhibitManagementContext,
  readAlertInhibitQuery,
  writeAlertInhibitRoute,
  type AlertInhibitQuery,
  type AlertInhibitManagementContext
} from '../model/alert-inhibit-model';

export function useAlertInhibitQueryController() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const locationSearch = params.toString();
  const query = readAlertInhibitQuery(params);
  const management = readAlertInhibitManagementContext(params);
  const source = writeAlertInhibitRoute(query, management).toString();
  useCanonicalQuerySearch(locationSearch, source, setParams);
  const { value: search, setValue: setSearch } = useStringQueryDraft(query.search, query.search);
  const updateQuery = (patch: Partial<AlertInhibitQuery>) => {
    if (patch.search !== undefined) setSearch(patch.search.trim());
    setParams(writeAlertInhibitRoute({ ...query, ...patch }, management));
  };
  const updateManagement = (patch: Pick<AlertInhibitManagementContext, 'mode'>) => {
    if (management) setParams(writeAlertInhibitRoute({ ...query, pageIndex: 0 }, { ...management, ...patch }));
  };
  const replacePageIndex = useCallback(
    (pageIndex: number) =>
      setParams(writeAlertInhibitRoute({ search: query.search, pageSize: query.pageSize, pageIndex }, management), {
        replace: true
      }),
    [management, query.pageSize, query.search, setParams]
  );

  return {
    state: { query, search, source, management },
    replacePageIndex,
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery(zeroBasedPageChange(page, pageSize, query.pageSize)),
      viewAllRules: () => updateManagement({ mode: 'all' }),
      viewMatchedRules: () => updateManagement({ mode: 'matched' }),
      returnToEntity: () => {
        if (management) void navigate(management.returnTo);
      }
    }
  };
}
