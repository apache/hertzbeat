/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { saveBrowserDownload } from '@/shared/browser-download';

import { loadAlertGroups } from '../api/alert-api';
import { buildAlertCenterCsvArtifact } from '../model/alert-center-export';
import {
  alertCenterAllExportQuery,
  collectAlertCenterExportGroups,
  filterAlertGroupsByUpdatedRange,
  type AlertCenterExportRange
} from '../model/alert-center-export-scope';
import type { AlertGroup, AlertQuery } from '../model/alert-model';

export function useAlertCenterExport({ query, selectedGroups }: { query: AlertQuery; selectedGroups: AlertGroup[] }) {
  const { message } = App.useApp();
  const { t } = useTranslation();
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

  const run = useCallback(
    async (collect: (signal: AbortSignal) => Promise<AlertGroup[]>) => {
      if (active.current) return false;
      const request = new AbortController();
      active.current = request;
      setExporting(true);
      try {
        const groups = await collect(request.signal);
        saveBrowserDownload(buildAlertCenterCsvArtifact(groups));
        if (mounted.current) void message.success?.(t('alert.export.success', { count: groups.length }));
        return true;
      } catch {
        if (mounted.current && !request.signal.aborted) void message.error?.(t('alert.export.failure'));
        return false;
      } finally {
        if (active.current === request) active.current = null;
        if (mounted.current) setExporting(false);
      }
    },
    [message, t]
  );

  const exportSelected = useCallback(() => run(() => Promise.resolve(selectedGroups)), [run, selectedGroups]);
  const exportFiltered = useCallback(
    () => run(signal => collectAlertCenterExportGroups(query, loadAlertGroups, signal)),
    [query, run]
  );
  const exportAll = useCallback(
    () => run(signal => collectAlertCenterExportGroups(alertCenterAllExportQuery(), loadAlertGroups, signal)),
    [run]
  );
  const exportTimeRange = useCallback(
    (range: AlertCenterExportRange) =>
      run(async signal => {
        const groups = await collectAlertCenterExportGroups(alertCenterAllExportQuery(), loadAlertGroups, signal);
        return filterAlertGroupsByUpdatedRange(groups, range);
      }),
    [run]
  );

  return { exporting, exportAll, exportFiltered, exportSelected, exportTimeRange };
}
