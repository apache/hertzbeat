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

import { useEffect } from 'react';

import { authoritativePageIndexCorrection } from '@/shared/pagination';

import { writeAlertQuery, type AlertPage, type AlertQuery } from '../model/alert-model';

type ReplaceSearchParams = (next: string, options: { replace: boolean }) => void;

export function useAlertCenterPageCorrection(
  query: AlertQuery,
  page: AlertPage | undefined,
  replaceSearchParams: ReplaceSearchParams
) {
  const correctedPageIndex = page ? authoritativePageIndexCorrection(query.pageIndex, page.totalPages) : undefined;
  const correctedSource =
    correctedPageIndex === undefined
      ? undefined
      : writeAlertQuery({ ...query, pageIndex: correctedPageIndex }).toString();

  useEffect(() => {
    // Only a successfully parsed page can prove that concurrent removals invalidated the current route.
    if (correctedSource !== undefined) replaceSearchParams(correctedSource, { replace: true });
  }, [correctedSource, replaceSearchParams]);
}
