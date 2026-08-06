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
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { useLocaleChangeAction } from '@/shared/i18n/use-locale-change-action';
import { loadPublicStatusComponents, loadPublicStatusIncidents, loadPublicStatusOrg } from '../api/public-status-api';
import type { PublicStatusViewModel } from '../model/public-status-contract';
import { createPublicStatusIncidentRange, isPublicStatusIncidentYear } from '../model/public-status-incident-range';
import { publicStatusComponentState, publicStatusIncidentState } from '../model/public-status-model';
import { publicStatusQueryKeys } from './public-status-query-keys';

export function usePublicStatusController(): PublicStatusViewModel {
  const { i18n } = useTranslation();
  const selectLocale = useLocaleChangeAction(i18n.resolvedLanguage);
  const [incidentYear, setIncidentYear] = useState(() => new Date().getFullYear());
  const incidentRange = useMemo(() => createPublicStatusIncidentRange(incidentYear), [incidentYear]);
  const org = useQuery({
    queryKey: publicStatusQueryKeys.org(),
    queryFn: ({ signal }) => loadPublicStatusOrg({ signal })
  });
  const components = useQuery({
    queryKey: publicStatusQueryKeys.components(),
    queryFn: ({ signal }) => loadPublicStatusComponents({ signal })
  });
  const incidents = useQuery({
    queryKey: publicStatusQueryKeys.incidents(incidentRange),
    queryFn: ({ signal }) => loadPublicStatusIncidents(incidentRange, { signal })
  });
  const componentState = publicStatusComponentState({
    org: org.data,
    components: components.data,
    orgError: org.error,
    componentsError: components.error,
    orgPending: org.isPending,
    componentsPending: components.isPending
  });
  const incidentState = publicStatusIncidentState({
    incidents: incidents.data,
    error: incidents.error,
    pending: incidents.isPending
  });
  return {
    componentState,
    incidentRange,
    incidentState,
    locale: resolveLocale(i18n.resolvedLanguage),
    org: org.error ? undefined : org.data,
    components: componentState === 'ready' ? (components.data ?? []) : [],
    incidents: incidentState === 'ready' ? (incidents.data?.content ?? []) : [],
    refresh: () => Promise.all([org.refetch(), components.refetch(), incidents.refetch()]),
    refreshing:
      (org.isFetching && !org.isPending) ||
      (components.isFetching && !components.isPending) ||
      (incidents.isFetching && !incidents.isPending),
    selectLocale,
    selectIncidentYear: (year: number) => {
      if (isPublicStatusIncidentYear(year, new Date().getFullYear())) setIncidentYear(year);
    }
  };
}
