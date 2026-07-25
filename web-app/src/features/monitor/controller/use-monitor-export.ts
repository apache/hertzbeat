/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import { MonitorExportError, requestMonitorExport } from '../api/monitor-export-api';
import { saveMonitorExport } from '../model/monitor-export-download';
import type { MonitorExportFormat, MonitorExportScope } from '../model/monitor-export-model';

export function useMonitorExport(selectedIds: number[]) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const canExport = useSession().session?.roles.includes('ADMIN') ?? false;
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);

  const run = async (scope: MonitorExportScope, format: MonitorExportFormat) => {
    if (!canExport || active.current || (scope.kind === 'selected' && scope.ids.length === 0)) return false;
    const controller = new AbortController();
    active.current = controller;
    setExporting(true);
    try {
      const artifact = await requestMonitorExport(scope, format, controller.signal);
      saveMonitorExport(artifact);
      if (mounted.current) void message.success(t('monitor.export.success'));
      return true;
    } catch (error) {
      if (mounted.current) {
        const kind = error instanceof MonitorExportError ? error.kind : 'error';
        void message.error(t(`monitor.export.failure.${kind}`));
      }
      return false;
    } finally {
      if (active.current === controller) active.current = null;
      if (mounted.current) setExporting(false);
    }
  };

  return {
    canExport,
    exporting,
    exportSelected: (format: MonitorExportFormat) => run({ kind: 'selected', ids: selectedIds }, format),
    exportAll: (format: MonitorExportFormat) => run({ kind: 'all' }, format)
  };
}
