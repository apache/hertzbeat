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

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/auth/session-context';
import type { ExactTimeWindow } from '@/shared/query-context';
import { classifyExploreSignalError } from '../api/explore-api';
import { buildMetricLabelsPath, loadMetricLabels } from '../api/explore-metric-labels-api';
import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricLabelSuggestions } from '../model/explore-metric-inventory';
import { exploreQueryKeys } from './explore-query-keys';

export function useMetricLabelSuggestions(
  query: MetricExploreQuery | undefined,
  window: ExactTimeWindow | undefined,
  label?: string
): MetricLabelSuggestions {
  const { session } = useSession();
  const path = suggestionPath(query, window, label);
  const identity = JSON.stringify(session ? [session.username, session.workspaceId, session.roles] : []);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(path), 250);
    return () => clearTimeout(timer);
  }, [path]);
  const enabled = Boolean(path && session?.authenticated);
  const result = useQuery({
    queryKey: exploreQueryKeys.metricLabels(path, identity),
    queryFn: ({ signal }) => loadMetricLabels(query!, window!, label, signal),
    enabled: enabled && path === debounced,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  if (!enabled) return { state: 'idle', items: [], truncated: false };
  if (path !== debounced || result.isFetching || result.isPending)
    return { state: 'loading', items: [], truncated: false };
  if (result.error)
    return {
      state: classifyExploreSignalError(result.error) === 'permission' ? 'permission' : 'error',
      items: [],
      truncated: false
    };
  if (result.data.state !== 'ready') return { state: 'unavailable', items: [], truncated: false };
  return { state: 'ready', items: result.data.items, truncated: result.data.truncated };
}

function suggestionPath(query: MetricExploreQuery | undefined, window: ExactTimeWindow | undefined, label?: string) {
  if (!query || !window) return '';
  try {
    return buildMetricLabelsPath(query, window, label);
  } catch {
    return '';
  }
}
