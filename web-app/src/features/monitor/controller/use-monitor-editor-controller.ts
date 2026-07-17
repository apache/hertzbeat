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
import { App } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams, type NavigateFunction } from 'react-router-dom';

import {
  classifyMonitorDetailReadError, classifyMonitorReadError, detectMonitor, loadMonitorApps, loadMonitorCollectors,
  loadMonitorDetail, loadMonitorParamDefines, loadNewMonitorEvidence, saveMonitor, type MonitorDetail,
  type MonitorParamDefine
} from '../api/monitor-api';
import { monitorScrapeValues, type MonitorScrape } from '../api/monitor-contract';
import {
  buildMonitorPayload, createMonitorEditorDraft, MonitorParamDraftError, monitorWritableConverged,
  transitionMonitorEditorDraft, validateMonitorEditorDraft, type MonitorEditorDraft, type MonitorParamFormValue
} from '../model/monitor-editor-model';
import { parseMonitorRouteId } from '../model/monitor-detail-model';
import { safeMonitorReturnTo } from '../model/monitor-model';
import { isSelectableMonitorApp } from '../model/monitor-model';

export type MonitorEditorEvidence =
  | { kind: 'loading' }
  | { kind: 'missing' | 'unavailable' | 'error' }
  | { kind: 'ready' };

export function useMonitorEditorController(mode: 'new' | 'edit') {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { monitorId } = useParams();
  const [searchParams] = useSearchParams();
  const id = parseMonitorRouteId(monitorId);
  const validRoute = validEditorRoute(mode, id);
  const returnTo = safeMonitorReturnTo(searchParams.get('returnTo'));
  const requestedApp = requestedEditorApp(mode, searchParams);
  const rawScrape = searchParams.get('scrape');
  const requestedScrape = validScrape(searchParams.get('scrape'));
  const apps = useQuery({ queryKey: ['monitor-editor-apps'], queryFn: ({ signal }) => loadMonitorApps(signal),
    enabled: validRoute, retry: false });
  const collectors = useQuery({ queryKey: ['monitor-editor-collectors'],
    queryFn: ({ signal }) => loadMonitorCollectors(signal), enabled: validRoute, retry: false });
  const detail = useQuery({ queryKey: ['monitor-editor-detail', id],
    queryFn: ({ signal }) => loadMonitorDetail(id!, signal), enabled: mode === 'edit' && id !== undefined, retry: false });
  const app = selectedEditorApp(mode, detail.data, apps.data, requestedApp);
  const scrape = selectedEditorScrape(mode, searchParams, detail.data, requestedScrape);
  const source = `${mode}:${id ?? 'new'}:${app}:${scrape}`;
  const appDefines = useQuery({ queryKey: ['monitor-editor-defines', app],
    queryFn: ({ signal }) => loadMonitorParamDefines(app, signal), enabled: validRoute && Boolean(app), retry: false });
  const sdDefines = useQuery({ queryKey: ['monitor-editor-defines', scrape],
    queryFn: ({ signal }) => loadMonitorParamDefines(scrape, signal),
    enabled: validRoute && Boolean(app) && scrape !== 'static', retry: false });
  const defines = useMemo(() => combineDefines(appDefines.data ?? [], sdDefines.data ?? [], scrape),
    [appDefines.data, scrape, sdDefines.data]);
  const canonical = useMemo(() => createCanonicalDraft({ mode, id, apps: apps.data, collectors: collectors.data,
    detail: detail.data, app, mainDefines: appDefines.data, scrape, sdDefines: sdDefines.data, defines }),
  [app, appDefines.data, apps.data, collectors.data, defines, detail.data, id, mode, scrape, sdDefines.data]);
  const canonicalDraft = canonical instanceof MonitorParamDraftError ? undefined : canonical;
  const draftState = useEditorDraftState(source, canonicalDraft, defines, scrape);
  const draft = draftState.draft;
  useCanonicalEditorUrl({ validRoute, apps: apps.data, mode, requestedApp, rawScrape, detail: detail.data,
    carrySource: draftState.carrySource, source, searchParams, pathname: location.pathname, navigate });
  const evidence = resolveEvidence(mode, id, apps, collectors, detail, app, appDefines, scrape, sdDefines, canonical);
  const commands = useMonitorEditorCommands({ mode, id, source, draft, defines, before: detail.data,
    returnTo, navigate, message,
    text: { validation: t('monitor.editor.validation'), detectSuccess: t('monitor.editor.detectSuccess'),
      detectFailed: t('monitor.editor.detectFailed'), saveSuccess: t('monitor.editor.saveSuccess'),
      saveFailed: t('monitor.editor.saveFailed') } });
  const updateDraft = draftState.update;

  return {
    state: { evidence, draft, defines, apps: apps.data ?? [], collectors: collectors.data ?? [],
      busy: commands.command !== 'idle', command: commands.command, validationIssues: commands.validationIssues,
      returnTo, scrapeValues: monitorScrapeValues, sourceKey: source },
    actions: {
      updateMonitor: (patch: Partial<MonitorEditorDraft['monitor']>) => updateDraft(current => ({
        ...current, monitor: { ...current.monitor, ...patch }
      })),
      updateCollector: (collector: string) => updateDraft(current => ({ ...current, collector })),
      updateGrafana: (patch: Partial<MonitorEditorDraft['grafanaDashboard']>) => updateDraft(current => ({
        ...current, grafanaDashboard: { ...current.grafanaDashboard, ...patch }
      })),
      updateParam: (field: string, value: MonitorParamFormValue) => updateDraft(current => ({ ...current,
        params: current.params.map(param => param.field === field ? { ...param, paramValue: value } : param) })),
      setParamValid: (field: string, valid: boolean) => updateDraft(current => ({ ...current,
        invalidParamFields: valid ? current.invalidParamFields.filter(item => item !== field)
          : [...new Set([...current.invalidParamFields, field])] })),
      changeSource: (next: { app?: string; scrape?: string }) => {
        const params = new URLSearchParams(searchParams);
        if (next.app !== undefined) params.set('app', next.app);
        if (next.scrape !== undefined) params.set('scrape', validScrape(next.scrape));
        if (draft && next.app === undefined && next.scrape !== undefined) {
          draftState.prepareTransition(`${mode}:${id ?? 'new'}:${app}:${validScrape(next.scrape)}`);
        }
        void navigate(`${location.pathname}?${params.toString()}`);
      },
      detect: commands.detect,
      save: commands.save,
      cancel: commands.cancel,
      retry: () => Promise.all([
        ...(apps.error ? [apps.refetch()] : []), ...(collectors.error ? [collectors.refetch()] : []),
        ...(detail.error && mode === 'edit' && id !== undefined ? [detail.refetch()] : []),
        ...(appDefines.error && app ? [appDefines.refetch()] : []),
        ...(sdDefines.error && app && scrape !== 'static' ? [sdDefines.refetch()] : [])
      ]).then(() => undefined)
    }
  };
}

function validEditorRoute(mode: 'new' | 'edit', id: number | undefined) {
  return mode === 'new' || id !== undefined;
}

function requestedEditorApp(mode: 'new' | 'edit', searchParams: URLSearchParams) {
  return mode === 'new' ? searchParams.get('app')?.trim() ?? '' : '';
}

function selectedEditorApp(mode: 'new' | 'edit', detail: MonitorDetail | undefined,
  apps: Array<{ value?: string | null; hide?: boolean | null; category?: string | null }> | undefined,
  requestedApp: string) {
  if (mode === 'edit') return detail?.monitor.app ?? '';
  return apps?.some(item => item.value === requestedApp && isSelectableMonitorApp(item)) ? requestedApp : '';
}

function selectedEditorScrape(mode: 'new' | 'edit', searchParams: URLSearchParams,
  detail: MonitorDetail | undefined, requested: typeof monitorScrapeValues[number]) {
  return mode === 'edit' ? validScrape(searchParams.get('scrape') ?? detail?.monitor.scrape) : requested;
}

function createCanonicalDraft(input: {
  mode: 'new' | 'edit'; id: number | undefined; apps: unknown; collectors: unknown; detail: MonitorDetail | undefined;
  app: string; mainDefines: unknown; scrape: MonitorScrape; sdDefines: unknown; defines: MonitorParamDefine[];
}) {
  if (!readyForDraft(input.mode, input.id, input.apps, input.collectors, input.detail, input.app,
    input.mainDefines, input.scrape, input.sdDefines)) return undefined;
  try {
    if (changedEditorScrape(input.mode, input.detail, input.scrape)) return transitionedCanonicalDraft(input);
    return createMonitorEditorDraft(input.detail, input.app, input.scrape, input.defines);
  } catch (error) {
    if (error instanceof MonitorParamDraftError) return error;
    throw error;
  }
}

function changedEditorScrape(mode: 'new' | 'edit', detail: MonitorDetail | undefined, scrape: MonitorScrape) {
  return mode === 'edit' && detail !== undefined && validScrape(detail.monitor.scrape) !== scrape;
}

function transitionedCanonicalDraft(input: Parameters<typeof createCanonicalDraft>[0]) {
  const fresh = createMonitorEditorDraft(undefined, input.app, input.scrape, input.defines);
  const detail = input.detail;
  if (!detail) return fresh;
  return { ...fresh, monitor: { ...detail.monitor, scrape: input.scrape }, collector: detail.collector ?? '',
    grafanaDashboard: detail.grafanaDashboard ?? fresh.grafanaDashboard };
}

function useEditorDraftState(source: string, canonical: MonitorEditorDraft | undefined,
  defines: MonitorParamDefine[], scrape: MonitorScrape) {
  const [drafts, setDrafts] = useState<Record<string, MonitorEditorDraft>>({});
  const [carry, setCarry] = useState<{ source: string; draft: MonitorEditorDraft; defines: MonitorParamDefine[] } | null>(null);
  const transitioned = carry?.source === source && canonical
    ? transitionMonitorEditorDraft(carry.draft, carry.defines, defines, scrape) : undefined;
  const draft = drafts[source] ?? transitioned ?? canonical;
  return {
    draft,
    carrySource: carry?.source,
    update: (updater: (value: MonitorEditorDraft) => MonitorEditorDraft) => {
      if (!draft) return;
      setDrafts(current => ({ ...current, [source]: updater(current[source] ?? draft) }));
    },
    prepareTransition: (target: string) => {
      if (draft) setCarry({ source: target, draft, defines });
    }
  };
}

type CanonicalUrlInput = {
  validRoute: boolean;
  apps: Array<{ value?: string | null }> | undefined;
  mode: 'new' | 'edit';
  requestedApp: string;
  rawScrape: string | null;
  detail: MonitorDetail | undefined;
  carrySource: string | undefined;
  source: string;
  searchParams: URLSearchParams;
  pathname: string;
  navigate: NavigateFunction;
};

function useCanonicalEditorUrl(input: CanonicalUrlInput) {
  useEffect(() => {
    const target = canonicalEditorSearch(input);
    if (target !== undefined) void input.navigate(`${input.pathname}?${target}`, { replace: true });
  }, [input]);
}

function canonicalEditorSearch(input: CanonicalUrlInput) {
  if (!input.validRoute || !input.apps) return undefined;
  const invalidApp = hasInvalidRequestedApp(input);
  const invalidScrape = hasInvalidRequestedScrape(input);
  const directEditDrift = hasDirectEditScrapeDrift(input);
  if (!invalidApp && !invalidScrape && !directEditDrift) return undefined;
  const params = new URLSearchParams(input.searchParams);
  if (invalidApp) params.delete('app');
  if (invalidScrape) params.set('scrape', input.mode === 'edit' ? validScrape(input.detail?.monitor.scrape) : 'static');
  if (directEditDrift) params.set('scrape', validScrape(input.detail!.monitor.scrape));
  return params.toString();
}

function hasInvalidRequestedApp(input: CanonicalUrlInput) {
  if (input.mode !== 'new' || !input.requestedApp) return false;
  return !input.apps?.some(item => item.value === input.requestedApp && isSelectableMonitorApp(item));
}

function hasInvalidRequestedScrape(input: CanonicalUrlInput) {
  return input.rawScrape !== null && input.rawScrape !== validScrape(input.rawScrape);
}

function hasDirectEditScrapeDrift(input: CanonicalUrlInput) {
  if (input.mode !== 'edit' || !input.detail || input.rawScrape === null) return false;
  return validScrape(input.rawScrape) !== validScrape(input.detail.monitor.scrape) && input.carrySource !== input.source;
}

type CommandText = { validation: string; detectSuccess: string; detectFailed: string; saveSuccess: string; saveFailed: string };
type MessageApi = { warning: (text: string) => unknown; success: (text: string) => unknown; error: (text: string) => unknown };

function useMonitorEditorCommands(input: {
  mode: 'new' | 'edit'; id: number | undefined; source: string; draft: MonitorEditorDraft | undefined;
  before: MonitorDetail | undefined;
  defines: MonitorParamDefine[]; returnTo: string; navigate: NavigateFunction; message: MessageApi; text: CommandText;
}) {
  const operation = useRef<{ token: symbol; source: string; controller: AbortController } | null>(null);
  const [state, setState] = useState<CommandState>({
    source: input.source, command: 'idle', showValidation: false
  });
  useEffect(() => {
    const active = operation.current;
    if (active && active.source !== input.source) active.controller.abort();
  }, [input.source]);
  const operationRef = operation;
  useEffect(() => () => { operationRef.current?.controller.abort(); }, [operationRef]);
  const run = (action: 'detect' | 'save') => executeMonitorCommand(action, input, operation, setState);
  return {
    command: state.source === input.source ? state.command : 'idle',
    validationIssues: state.source === input.source && state.showValidation && input.draft
      ? validateMonitorEditorDraft(input.draft, input.defines) : [],
    detect: () => run('detect'), save: () => run('save'),
    cancel: () => { operation.current?.controller.abort(); void input.navigate(input.returnTo); }
  };
}

async function executeMonitorCommand(action: 'detect' | 'save', input: Parameters<typeof useMonitorEditorCommands>[0],
  operation: React.MutableRefObject<{ token: symbol; source: string; controller: AbortController } | null>,
  setState: React.Dispatch<React.SetStateAction<CommandState>>) {
  if (!input.draft || operation.current?.source === input.source) return;
  if (validateMonitorEditorDraft(input.draft, input.defines).length > 0) {
    setState({ source: input.source, command: 'idle', showValidation: true });
    void input.message.warning(input.text.validation);
    return;
  }
  const active = { token: Symbol(input.source), source: input.source, controller: new AbortController() };
  operation.current = active;
  setState({ source: input.source, command: runningCommand(action), showValidation: false });
  const payload = buildMonitorPayload(input.draft.monitor, input.draft.collector, input.draft.params,
    input.defines, input.draft.grafanaDashboard);
  try {
    await performMonitorCommand(action, input, payload, active.controller.signal);
    if (!isCurrentOperation(operation.current, active) || active.controller.signal.aborted) return;
    notifyMonitorCommandSuccess(action, input);
  } catch {
    if (isCurrentOperation(operation.current, active) && !active.controller.signal.aborted) {
      notifyMonitorCommandError(action, input);
    }
  } finally {
    if (operation.current?.token === active.token) {
      operation.current = null;
      setState({ source: input.source, command: 'idle', showValidation: false });
    }
  }
}

function runningCommand(action: 'detect' | 'save'): CommandState['command'] {
  return action === 'detect' ? 'detecting' : 'saving';
}

async function performMonitorCommand(action: 'detect' | 'save', input: Parameters<typeof useMonitorEditorCommands>[0],
  payload: ReturnType<typeof buildMonitorPayload>, signal: AbortSignal) {
  if (action === 'detect') return detectMonitor(payload, signal);
  return saveAndProve(input, payload, signal);
}

function notifyMonitorCommandSuccess(action: 'detect' | 'save', input: Parameters<typeof useMonitorEditorCommands>[0]) {
  void input.message.success(action === 'detect' ? input.text.detectSuccess : input.text.saveSuccess);
  if (action !== 'save' || !input.draft) return;
  const target = input.mode === 'edit' ? input.returnTo
    : `/monitors?app=${encodeURIComponent(input.draft.monitor.app)}`;
  void input.navigate(target);
}

function notifyMonitorCommandError(action: 'detect' | 'save', input: Parameters<typeof useMonitorEditorCommands>[0]) {
  void input.message.error(action === 'detect' ? input.text.detectFailed : input.text.saveFailed);
}

type CommandState = {
  source: string;
  command: 'idle' | 'detecting' | 'saving';
  showValidation: boolean;
};

async function saveAndProve(input: Parameters<typeof useMonitorEditorCommands>[0],
  payload: ReturnType<typeof buildMonitorPayload>, signal: AbortSignal) {
  await saveMonitor(input.mode, payload, signal);
  const proof = input.mode === 'edit' ? await loadMonitorDetail(input.id!, signal)
    : await loadNewMonitorEvidence(payload.monitor.name ?? '', payload.monitor.app ?? '', signal);
  if (!monitorWritableConverged(input.mode, payload, proof, input.defines, input.before)) {
    throw new MonitorParamDraftError('convergence');
  }
}

function isCurrentOperation(current: { token: symbol; source: string } | null,
  expected: { token: symbol; source: string }) {
  return current?.token === expected.token && current.source === expected.source;
}

function validScrape(value: string | null | undefined): typeof monitorScrapeValues[number] {
  return monitorScrapeValues.includes(value as typeof monitorScrapeValues[number])
    ? value as typeof monitorScrapeValues[number] : 'static';
}

function combineDefines(main: MonitorParamDefine[], sd: MonitorParamDefine[], scrape: MonitorScrape) {
  const fields = new Set<string>();
  const eligibleMain = scrape === 'static' ? main : main.filter(define => define.field !== 'host');
  return [...(scrape === 'static' ? [] : sd), ...eligibleMain]
    .filter(define => !fields.has(define.field) && fields.add(define.field));
}

function readyForDraft(mode: 'new' | 'edit', id: number | undefined, apps: unknown, collectors: unknown,
  detail: MonitorDetail | undefined, app: string, main: unknown, scrape: MonitorScrape, sd: unknown) {
  return Boolean(apps && collectors && app && main && (scrape === 'static' || sd)
    && (mode === 'new' || id !== undefined && detail));
}

function resolveEvidence(mode: 'new' | 'edit', id: number | undefined, apps: ReturnType<typeof useQuery>,
  collectors: ReturnType<typeof useQuery>, detail: ReturnType<typeof useQuery>, app: string,
  main: ReturnType<typeof useQuery>, scrape: MonitorScrape, sd: ReturnType<typeof useQuery>,
  canonical: MonitorEditorDraft | MonitorParamDraftError | undefined): MonitorEditorEvidence {
  if (mode === 'edit' && id === undefined) return { kind: 'missing' };
  if (detail.error) return { kind: classifyMonitorDetailReadError(detail.error) };
  const readError = firstEditorReadError(apps, collectors, main, sd);
  if (readError) return { kind: classifyMonitorReadError(readError) };
  if (canonical instanceof MonitorParamDraftError) return { kind: 'error' };
  if (editorEvidencePending(mode, apps, collectors, detail, app, main, scrape, sd)) return { kind: 'loading' };
  if (!canonical) return mode === 'new' && !app ? { kind: 'ready' } : { kind: 'error' };
  return { kind: 'ready' };
}

function firstEditorReadError(...queries: Array<ReturnType<typeof useQuery>>) {
  return queries.find(query => query.error)?.error;
}

function editorEvidencePending(mode: 'new' | 'edit', apps: ReturnType<typeof useQuery>,
  collectors: ReturnType<typeof useQuery>, detail: ReturnType<typeof useQuery>, app: string,
  main: ReturnType<typeof useQuery>, scrape: MonitorScrape, sd: ReturnType<typeof useQuery>) {
  if (apps.isPending || collectors.isPending) return true;
  if (mode === 'edit' && detail.isPending) return true;
  if (app && main.isPending) return true;
  return scrape !== 'static' && sd.isPending;
}
