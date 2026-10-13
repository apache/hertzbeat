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

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';
import { resolveLocale } from '@/core/i18n/i18n';
import { loadMonitorNavigationApps, monitorNavigationQueryKeys, type MonitorApp } from '@/features/monitor/navigation';

const emptyMonitorApps: readonly MonitorApp[] = [];

export function MonitorNavigationResourceLoader({ onChange }: { onChange: (apps: readonly MonitorApp[]) => void }) {
  const { i18n } = useTranslation();
  const { loading, session } = useSession();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const enabled = !loading && Boolean(session?.authenticated);
  const query = useQuery({
    queryKey: monitorNavigationQueryKeys.locale(locale),
    queryFn: ({ signal }) => loadMonitorNavigationApps(locale, signal),
    enabled
  });

  useEffect(() => {
    onChange(enabled && query.isSuccess ? query.data : emptyMonitorApps);
  }, [enabled, onChange, query.data, query.isSuccess]);

  return null;
}
