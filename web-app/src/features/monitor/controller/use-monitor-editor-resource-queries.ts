/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import { loadLabelSuggestions } from '@/features/settings';

import { loadMonitorApps, loadMonitorCollectors, loadMonitorDetail, loadMonitorParamDefines } from '../api/monitor-api';
import { normalizeMonitorScrape, type MonitorEditorMode, type MonitorScrape } from '../model/monitor-contract';
import { monitorQueryKeys } from './monitor-query-keys';
import { combineMonitorEditorDefines, selectMonitorEditorApp } from './monitor-editor-resource-model';

export type MonitorEditorResourceInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  validRoute: boolean;
  requestedApp: string;
  requestedScrape: MonitorScrape;
  rawScrape: string | null;
};

export function useMonitorEditorResourceQueries(input: MonitorEditorResourceInput) {
  const base = useMonitorEditorBaseQueries(input);
  const app = selectMonitorEditorApp(input.mode, input.requestedApp, base.detail.data, base.apps.data);
  const scrape =
    input.mode === 'edit'
      ? normalizeMonitorScrape(input.rawScrape ?? base.detail.data?.monitor.scrape)
      : input.requestedScrape;
  const definitions = useMonitorEditorDefinitionQueries(input, app, scrape);
  return { ...base, ...definitions, app, scrape, source: `${input.mode}:${input.id ?? 'new'}:${app}:${scrape}` };
}

function useMonitorEditorBaseQueries(input: MonitorEditorResourceInput) {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
  const detailId = input.mode === 'edit' ? input.id : undefined;
  const apps = useQuery({
    queryKey: monitorQueryKeys.apps(locale),
    queryFn: ({ signal }) => loadMonitorApps(locale, signal),
    enabled: input.validRoute,
    retry: false
  });
  const collectors = useQuery({
    queryKey: monitorQueryKeys.collectors(),
    queryFn: ({ signal }) => loadMonitorCollectors(signal),
    enabled: input.validRoute,
    retry: false
  });
  const labelSuggestions = useQuery({
    queryKey: monitorQueryKeys.labelSuggestions(),
    queryFn: ({ signal }) => loadLabelSuggestions(signal),
    enabled: input.validRoute,
    retry: false
  });
  const detail = useQuery({
    queryKey: monitorQueryKeys.detail(detailId),
    queryFn: detailId === undefined ? skipToken : ({ signal }) => loadMonitorDetail(detailId, signal),
    retry: false
  });
  return { apps, collectors, detail, labelSuggestions };
}

function useMonitorEditorDefinitionQueries(input: MonitorEditorResourceInput, app: string, scrape: MonitorScrape) {
  const appDefines = useQuery({
    queryKey: monitorQueryKeys.appDefines(app),
    queryFn: ({ signal }) => loadMonitorParamDefines(app, signal),
    enabled: input.validRoute && Boolean(app),
    retry: false
  });
  const sdDefines = useQuery({
    queryKey: monitorQueryKeys.sdDefines(scrape),
    queryFn: ({ signal }) => loadMonitorParamDefines(scrape, signal),
    enabled: input.validRoute && Boolean(app) && scrape !== 'static',
    retry: false
  });
  const defines = useMemo(
    () => combineMonitorEditorDefines(appDefines.data ?? [], sdDefines.data ?? [], scrape),
    [appDefines.data, scrape, sdDefines.data]
  );
  return { appDefines, sdDefines, defines };
}
