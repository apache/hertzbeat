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

import type { MetricConsole } from './explore-signal-contract';

export const METRIC_INVENTORY_LIMIT = 100;
export const METRIC_SEARCH_MAX_LENGTH = 128;
type MetricDeclaredMetadata = {
  state: 'available' | 'unavailable';
  source: string | null;
  quality: string | null;
  originalName: string | null;
  declaredType: string | null;
  declaredUnit: string | null;
  temporality: string | null;
  description: string | null;
  sampleRole: 'unknown';
  sampleUnit: null;
};
export type MetricLabels = {
  context: MetricConsole['context'];
  source: 'greptime-labels';
  state: 'ready' | 'unavailable' | 'scope_too_large';
  limit: number;
  truncated: boolean;
  items: string[];
};
export type MetricInventory = {
  context: MetricConsole['context'];
  source: 'greptime-inventory';
  limit: number;
  truncated: boolean;
  items: Array<{ metricName: string; family: string | null; metadata?: MetricDeclaredMetadata }>;
};
export type MetricInventoryViewModel = {
  search: string;
  setSearch: (search: string) => void;
  state: 'loading' | 'error' | 'permission' | 'ready';
  data: MetricInventory | undefined;
  retry: () => void;
};

export type MetricLabelSuggestions = {
  state: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error' | 'permission';
  items: string[];
  truncated: boolean;
};
