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

import { DEFAULT_LOG_ANALYSIS, addLogFormula, addLogSource, migrateLogQuerySet } from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';

export function writeQuerySet(
  raw: string | undefined,
  query: string,
  searchSyntax: string | undefined,
  kind: 'query' | 'formula',
  onChange: (raw: string) => void,
  onQueryChange: ((query: string) => void) | undefined
) {
  const base = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
  const current = base.querySet ?? migrateLogQuerySet(base, query, searchSyntax);
  const next = kind === 'query' ? addLogSource(current) : addLogFormula(current);
  const rest = { ...base };
  delete rest.comparison;
  onChange(JSON.stringify({ ...rest, representation: 'timeseries', querySet: next }));
  if (!base.querySet) onQueryChange?.('');
}
