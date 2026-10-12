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

import type { LogFacetField } from '@/shared/log-field';
import type { LogRow } from './explore-signal-contract';
import type { LogTransactionState } from './explore-log-transactions';
import type { LOG_SEVERITY_CATEGORIES } from './explore-query';
type LogTransactionItem = {
  identity: string;
  seedCount: number;
  relatedCount: number;
  firstTimeUnixNano: string;
  lastTimeUnixNano: string;
  durationNanos: string;
  maximumSeverity: (typeof LOG_SEVERITY_CATEGORIES)[number] | null;
};
export type LogTransactionsResult = {
  window: { start: number; end: number };
  request: Omit<LogTransactionState, 'field'> & { field: LogFacetField };
  seedLogCount: number;
  usableSeedLogCount: number;
  oversizedSeedLogCount: number;
  otherExcludedSeedLogCount: number;
  transactionCount: number;
  relatedLogCount: number;
  truncated: boolean;
  items: LogTransactionItem[];
};
export type LogTransactionDetailResult = {
  window: { start: number; end: number };
  field: LogFacetField;
  identity: string;
  qualified: boolean;
  total: number | null;
  rows: LogRow[];
  offset: number;
  limit: number;
  sort: 'oldest' | 'newest';
};
