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

import type { LogSubquery } from '../model/explore-log-subquery';

type Request<Operation> = {
  version: 1;
  parameters: Record<string, string>;
  subquery: LogSubquery;
  operation: Operation;
};
export type SubqueryPageRequest = Request<{
  kind: 'page';
  pageIndex: number;
  pageSize: number;
  sort: { field: string; direction: 'asc' | 'desc'; type?: 'number' | 'text' | undefined };
}>;
export type SubqueryTrendRequest = Request<{ kind: 'trend'; intervalMs: number }>;
export type SubqueryFacetRequest = Request<{
  kind: 'facet';
  field: string;
  limit: number;
  valueSearch?: string | undefined;
}>;
export type SubqueryAnalysisRequest = Request<{
  kind: 'analysis';
  view: 'timeseries';
  grouping: Array<{ field: string; limit: number }>;
  measure: { function: string; field: string } | null;
  limit: number;
  order: 'count-asc' | 'count-desc' | 'measure-asc' | 'measure-desc';
  minCount: number;
  intervalMs: number;
}>;
