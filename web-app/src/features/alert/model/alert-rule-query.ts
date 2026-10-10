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

import { compactTablePageSizes } from '@/shared/pagination';
import { readZeroBasedPage, writeZeroBasedPage } from '@/shared/query-context';

export const alertRulePageSizes = compactTablePageSizes;

export type AlertRuleQuery = { search: string; pageIndex: number; pageSize: number };

export function readAlertRuleQuery(params: URLSearchParams): AlertRuleQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    ...readZeroBasedPage(params, alertRulePageSizes, 8)
  };
}

export function writeAlertRuleQuery(query: AlertRuleQuery) {
  const params = writeZeroBasedPage(query.pageIndex, query.pageSize);
  if (query.search) params.set('search', query.search);
  return params;
}
