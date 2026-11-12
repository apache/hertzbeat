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

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { loadMonitorI18nResources } from '../api/monitor-app-guidance-api';
import { emptyMonitorMetricLabels, selectMonitorMetricLabels } from '../model/monitor-metric-labels';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorMetricLabels(app: string | undefined) {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
  const resources = useQuery({
    queryKey: monitorQueryKeys.i18nResources(locale),
    queryFn: ({ signal }) => loadMonitorI18nResources(locale, signal),
    enabled: Boolean(app),
    retry: false
  });
  return useMemo(
    () =>
      resources.data && !resources.isError ? selectMonitorMetricLabels(app, resources.data) : emptyMonitorMetricLabels,
    [app, resources.data, resources.isError]
  );
}
