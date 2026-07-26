/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';
import { resolveLocale } from '@/core/i18n/i18n';
import { loadMonitorNavigationApps, type MonitorApp } from '@/features/monitor/navigation';

const emptyMonitorApps: readonly MonitorApp[] = [];

export function MonitorNavigationResourceLoader({ onChange }: { onChange: (apps: readonly MonitorApp[]) => void }) {
  const { i18n } = useTranslation();
  const { loading, session } = useSession();
  const locale = resolveLocale(i18n.resolvedLanguage);
  const enabled = !loading && Boolean(session?.authenticated);
  const query = useQuery({
    queryKey: ['shell', 'monitor-navigation', locale],
    queryFn: ({ signal }) => loadMonitorNavigationApps(locale, signal),
    enabled
  });

  useEffect(() => {
    onChange(emptyMonitorApps);
  }, [enabled, locale, onChange]);

  useEffect(() => {
    if (enabled && query.isSuccess) onChange(query.data);
  }, [enabled, onChange, query.data, query.isSuccess]);

  return null;
}
