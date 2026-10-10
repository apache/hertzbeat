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
import { useNavigate } from 'react-router-dom';
import type { HertzBeatDashboardDocument } from '@/platform/perses';
import { useQueryDraft } from '@/shared/query-context';
import { useSharedTime } from '@/shared/time';
import {
  buildDashboardViewPath,
  readDashboardViewQuery,
  type DashboardQueryControls
} from '../model/signal-dashboard-view-query';

const refreshIntervals = { '0s': 0, '30s': 30000, '1m': 60000 } as const;

export function useSignalDashboardTime(params: URLSearchParams, document: HertzBeatDashboardDocument | undefined) {
  const time = useSharedTime();
  const navigate = useNavigate();
  const query = readDashboardViewQuery(params);
  const defaults = dashboardTimeDefaults(document);
  const duration = query.duration ?? defaults.duration;
  const controls = useQueryDraft<DashboardQueryControls>(`${params}:${defaults.key}`, {
    duration,
    variables: query.variables
  });
  const refreshInterval = defaults.refreshInterval;
  useEffect(() => {
    if (!document || !query.valid || query.hasExact) return;
    if (time.range !== duration) time.setRange(duration);
    if (time.autoRefreshMs !== refreshInterval) time.setAutoRefresh(refreshInterval);
  }, [document, duration, query.hasExact, query.valid, refreshInterval, time]);
  const timeWindow = dashboardWindow(query, duration, time);
  const validView = !!timeWindow;
  const timeZone = query.timeZone ?? defaults.timeZone;
  const commit = () => {
    const selectedTime =
      query.hasExact && !controls.value.presetSelected
        ? { window: query.window! }
        : { duration: controls.value.duration };
    if ('window' in selectedTime && !selectedTime.window) throw new Error('Invalid dashboard time');
    const path = buildDashboardViewPath(query.key, controls.value.variables, timeZone, selectedTime);
    time.setRange(controls.value.duration);
    time.requestRefresh();
    void navigate(path);
  };
  return {
    query,
    controls: controls.value,
    setControls: controls.setValue,
    commit,
    timeWindow,
    timeZone,
    validView,
    refreshRevision: time.refreshRevision,
    refresh: time.requestRefresh,
    returnPath:
      timeWindow && query.key
        ? buildDashboardViewPath(query.key, query.variables, timeZone, { window: timeWindow })
        : undefined
  };
}

function dashboardTimeDefaults(document: HertzBeatDashboardDocument | undefined) {
  return {
    key: document?.metadata.name ?? '',
    duration: document?.spec.duration ?? '30m',
    refreshInterval: refreshIntervals[document?.spec.refreshInterval ?? '0s'],
    timeZone: document?.spec.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
function dashboardWindow(
  query: ReturnType<typeof readDashboardViewQuery>,
  duration: DashboardQueryControls['duration'],
  time: ReturnType<typeof useSharedTime>
) {
  if (!query.valid) return undefined;
  if (query.hasExact) return query.window;
  return time.range === duration ? time.window : undefined;
}
