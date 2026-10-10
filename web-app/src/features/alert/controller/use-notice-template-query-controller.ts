/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCanonicalQuerySearch, useStringQueryDraft, zeroBasedPageChange } from '@/shared/query-context';

import {
  readNoticeTemplateQuery,
  writeNoticeTemplateQuery,
  type NoticeTemplateQuery
} from '../model/notice-template-model';

export function useNoticeTemplateQueryController() {
  const [params, setParams] = useSearchParams();
  const serializedParams = params.toString();
  const query = useMemo(() => readNoticeTemplateQuery(new URLSearchParams(serializedParams)), [serializedParams]);
  const canonicalSearch = useMemo(() => writeNoticeTemplateQuery(query).toString(), [query]);
  useCanonicalQuerySearch(serializedParams, canonicalSearch, setParams);
  const { value: name, setValue: setName } = useStringQueryDraft(query.name, query.name);
  const updateQuery = useCallback(
    (patch: Partial<NoticeTemplateQuery>) => {
      setParams(writeNoticeTemplateQuery({ ...query, ...patch }));
    },
    [query, setParams]
  );
  const replacePageIndex = useCallback(
    (pageIndex: number) => {
      setParams(writeNoticeTemplateQuery({ ...query, pageIndex }), { replace: true });
    },
    [query, setParams]
  );

  return {
    changePage: (page: number, pageSize: number) => updateQuery(zeroBasedPageChange(page, pageSize, query.pageSize)),
    changePreset: (preset: boolean) => updateQuery({ preset, pageIndex: 0 }),
    name,
    query,
    replacePageIndex,
    setName,
    submitQuery: () => updateQuery({ name: name.trim(), pageIndex: 0 })
  };
}
