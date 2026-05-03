import type { CollectorSummary, GrafanaDashboard, Monitor, Param, ParamDefine } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;
type ApiPutter = <T>(url: string, payload: unknown) => Promise<T>;

export type MonitorEditorMode = 'new' | 'edit';

export type MonitorEditorDraft = {
  monitor: Monitor;
  collector: string;
  grafanaDashboard: GrafanaDashboard;
  params: Param[];
  paramDefines: ParamDefine[];
  advancedParams: Param[];
  advancedParamDefines: ParamDefine[];
  scrapeParams: Param[];
  scrapeParamDefines: ParamDefine[];
  collectors: string[];
};

export type MonitorScrapeDraft = {
  scrapeParams: Param[];
  scrapeParamDefines: ParamDefine[];
};

type ParamCollectionKind = 'params' | 'advancedParams' | 'scrapeParams';
type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type MonitorDetailResponse = {
  monitor: Monitor;
  params?: Param[];
  collector?: string | null;
  grafanaDashboard?: GrafanaDashboard;
};

function paramType(type?: string) {
  if (type === 'number') return 0;
  if (type === 'key-value') return 3;
  if (type === 'array') return 4;
  return 1;
}

function coerceParamValue(value: unknown, define?: ParamDefine) {
  if (define?.type === 'number') {
    if (value == null || value === '') return null;
    return Number(value);
  }
  if (define?.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  }
  if (define?.type === 'key-value' || define?.type === 'array') {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? '');
  }
  return value ?? '';
}

function trimParamValue(value: unknown, define?: ParamDefine) {
  if (typeof value === 'string' && define?.type !== 'key-value' && define?.type !== 'array') {
    return value.trim();
  }
  return value;
}

function trimParamCollection(params: Param[], defines: ParamDefine[] = []) {
  return params.map((param, index) => ({
    ...param,
    paramValue: trimParamValue(param.paramValue, defines[index])
  }));
}

function normalizeMonitorInstanceForSave(monitor: Monitor, params: Param[]) {
  const hostParam = params.find(param => param.field === 'host');
  const hostValue =
    typeof hostParam?.paramValue === 'string'
      ? hostParam.paramValue.trim()
      : hostParam?.paramValue != null
        ? String(hostParam.paramValue)
        : '';

  if (!hostValue) {
    return monitor;
  }

  // Match Angular monitor-form behavior: submit host as instance and let backend append port.
  return {
    ...monitor,
    instance: hostValue
  };
}

function normalizeMonitorFields(monitor: Monitor): Monitor {
  return {
    ...monitor,
    name: monitor.name?.trim() || '',
    ...(monitor.description !== undefined ? { description: monitor.description?.trim() || '' } : {}),
    ...(monitor.cronExpression !== undefined ? { cronExpression: monitor.cronExpression?.trim() || '' } : {})
  };
}

function isParamValuePresent(value: unknown, define?: ParamDefine) {
  if (define?.type === 'boolean') {
    return typeof value === 'boolean';
  }
  if (define?.type === 'number') {
    return value !== null && value !== undefined && value !== '';
  }
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function resolveParamLabel(define: ParamDefine) {
  if (typeof define.name === 'string' && define.name.trim()) return define.name.trim();
  return define.field;
}

export function isValidMonitorCronExpression(cronExpression: string): boolean {
  if (!cronExpression || cronExpression.trim() === '') {
    return false;
  }

  const cronRegex =
    /^\s*(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)(\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?))?\s*$/;

  return cronRegex.test(cronExpression);
}

export function validateMonitorEditorDraft(draft: MonitorEditorDraft, t: Translator) {
  const normalizedMonitor = normalizeMonitorFields(draft.monitor);
  if (!normalizedMonitor.app?.trim()) return t('monitor.editor.validation.app');
  if (!normalizedMonitor.name?.trim()) return t('monitor.editor.validation.name');

  const collections: Array<{ params: Param[]; defines: ParamDefine[] }> = [
    { params: draft.params, defines: draft.paramDefines },
    { params: draft.advancedParams, defines: draft.advancedParamDefines },
    { params: draft.scrapeParams, defines: draft.scrapeParamDefines }
  ];

  for (const collection of collections) {
    for (const [index, define] of collection.defines.entries()) {
      if (!define.required) continue;
      const param = collection.params[index];
      if (param?.display === false) continue;
      if (!isParamValuePresent(param?.paramValue, define)) {
        return t('monitor.editor.validation.param-required', {
          field: resolveParamLabel(define)
        });
      }
    }
  }

  if (normalizedMonitor.scheduleType === 'cron') {
    if (!isValidMonitorCronExpression(normalizedMonitor.cronExpression || '')) {
      return t('monitor.editor.validation.cron');
    }
  } else if (normalizedMonitor.intervals == null || !Number.isFinite(Number(normalizedMonitor.intervals)) || Number(normalizedMonitor.intervals) <= 0) {
    return t('monitor.editor.validation.intervals');
  }

  return null;
}

function mergeParamDrafts(defines: ParamDefine[], paramMap: Map<string, Param>) {
  const visibleDefines: ParamDefine[] = [];
  const visibleParams: Param[] = [];
  const advancedDefines: ParamDefine[] = [];
  const advancedParams: Param[] = [];

  for (const define of defines) {
    const existing = paramMap.get(define.field);
    const next: Param = existing
      ? { ...existing }
      : {
          field: define.field,
          type: paramType(define.type),
          paramValue: define.defaultValue
        };
    next.type = paramType(define.type);
    next.paramValue = coerceParamValue(existing?.paramValue ?? define.defaultValue, define);
    if (define.hide) {
      advancedDefines.push(define);
      advancedParams.push(next);
    } else {
      visibleDefines.push(define);
      visibleParams.push(next);
    }
  }

  return {
    paramDefines: visibleDefines,
    params: visibleParams,
    advancedParamDefines: advancedDefines,
    advancedParams
  };
}

async function loadParamDefines(apiGet: ApiGetter, app: string) {
  return apiGet<ParamDefine[]>(`/apps/${app}/params`);
}

async function loadCollectors(apiGet: ApiGetter) {
  const response = await apiGet<{ content?: CollectorSummary[] }>('/collector');
  return (response.content || []).map(item => item.collector?.name).filter((value): value is string => Boolean(value));
}

export async function loadMonitorScrapeDraft(apiGet: ApiGetter, scrape?: string | null, existingParams?: Param[]) {
  if (!scrape || scrape === 'static') {
    return {
      scrapeParams: [],
      scrapeParamDefines: []
    } satisfies MonitorScrapeDraft;
  }
  const defines = await loadParamDefines(apiGet, scrape);
  const paramMap = new Map((existingParams || []).map(param => [String(param.field), param]));
  const merged = mergeParamDrafts(defines, paramMap);
  return {
    scrapeParams: merged.params,
    scrapeParamDefines: merged.paramDefines
  } satisfies MonitorScrapeDraft;
}

function syncDependentCollection(defines: ParamDefine[], params: Param[], fieldValues: Map<string, unknown>) {
  return params.map((param, index) => {
    const define = defines[index];
    if (!define?.depend) {
      return { ...param, display: param.display !== false };
    }
    const visible = Object.entries(define.depend).every(([field, values]) => values.map(String).includes(String(fieldValues.get(field))));
    return { ...param, display: visible };
  });
}

export function syncMonitorDependentDisplay(draft: MonitorEditorDraft): MonitorEditorDraft {
  const fieldValues = new Map<string, unknown>();
  [...draft.params, ...draft.advancedParams, ...draft.scrapeParams].forEach(param => {
    fieldValues.set(String(param.field), param.paramValue);
  });

  return {
    ...draft,
    params: syncDependentCollection(draft.paramDefines, draft.params, fieldValues),
    advancedParams: syncDependentCollection(draft.advancedParamDefines, draft.advancedParams, fieldValues),
    scrapeParams: syncDependentCollection(draft.scrapeParamDefines, draft.scrapeParams, fieldValues)
  };
}

export function updateMonitorEditorParam(draft: MonitorEditorDraft, kind: ParamCollectionKind, index: number, value: unknown): MonitorEditorDraft {
  const nextDraft = {
    ...draft,
    [kind]: draft[kind].map((param, currentIndex) => (currentIndex === index ? { ...param, paramValue: value } : param))
  } as MonitorEditorDraft;

  const changedField = String(nextDraft[kind][index]?.field || '');
  if (changedField === 'ssl' && typeof value === 'boolean') {
    const portIndex = nextDraft.params.findIndex(param => param.field === 'port');
    if (portIndex >= 0) {
      const current = Number(nextDraft.params[portIndex].paramValue);
      if (nextDraft.monitor.app === 'api') {
        if (value && (!Number.isFinite(current) || current === 80)) nextDraft.params[portIndex] = { ...nextDraft.params[portIndex], paramValue: 443 };
        if (!value && (!Number.isFinite(current) || current === 443)) nextDraft.params[portIndex] = { ...nextDraft.params[portIndex], paramValue: 80 };
      }
      if (nextDraft.monitor.app === 'ftp') {
        if (value && (!Number.isFinite(current) || current === 21)) nextDraft.params[portIndex] = { ...nextDraft.params[portIndex], paramValue: 22 };
        if (!value && (!Number.isFinite(current) || current === 22)) nextDraft.params[portIndex] = { ...nextDraft.params[portIndex], paramValue: 21 };
      }
    }
  }

  return syncMonitorDependentDisplay(nextDraft);
}

export async function loadMonitorEditorDraft(apiGet: ApiGetter, mode: MonitorEditorMode, options: { app?: string; monitorId?: string }) {
  const baseMonitor: Monitor = {
    id: options.monitorId ? Number(options.monitorId) : 0,
    app: options.app || 'website',
    name: '',
    instance: '',
    scrape: 'static',
    intervals: 60,
    scheduleType: 'interval',
    status: 0,
    labels: {},
    annotations: {}
  };

  let monitor = baseMonitor;
  let paramMap = new Map<string, Param>();
  let collector = '';
  let grafanaDashboard: GrafanaDashboard = { enabled: false };

  if (mode === 'edit' && options.monitorId) {
    const detail = await apiGet<MonitorDetailResponse>(`/monitor/${options.monitorId}`);
    monitor = {
      ...baseMonitor,
      ...detail.monitor,
      scrape: detail.monitor.scrape || 'static',
      scheduleType: detail.monitor.scheduleType || 'interval',
      intervals: detail.monitor.intervals ?? 60,
      labels: detail.monitor.labels || {},
      annotations: detail.monitor.annotations || {}
    };
    paramMap = new Map((detail.params || []).map(param => [String(param.field), param]));
    collector = detail.collector || '';
    grafanaDashboard = detail.grafanaDashboard || { enabled: false };
  }

  const [collectors, mainDefines, scrapeDefines] = await Promise.all([
    loadCollectors(apiGet),
    loadParamDefines(apiGet, monitor.app),
    monitor.scrape && monitor.scrape !== 'static' ? loadParamDefines(apiGet, monitor.scrape) : Promise.resolve<ParamDefine[]>([])
  ]);

  const mergedMain = mergeParamDrafts(mainDefines, paramMap);
  const mergedScrape = mergeParamDrafts(scrapeDefines, paramMap);

  return {
    monitor,
    collector,
    grafanaDashboard,
    collectors,
    params: mergedMain.params,
    paramDefines: mergedMain.paramDefines,
    advancedParams: mergedMain.advancedParams,
    advancedParamDefines: mergedMain.advancedParamDefines,
    scrapeParams: mergedScrape.params,
    scrapeParamDefines: mergedScrape.paramDefines
  } satisfies MonitorEditorDraft;
}

export function buildMonitorSavePayload(draft: MonitorEditorDraft) {
  const params = [
    ...trimParamCollection(draft.params, draft.paramDefines),
    ...trimParamCollection(draft.advancedParams, draft.advancedParamDefines),
    ...trimParamCollection(draft.scrapeParams, draft.scrapeParamDefines)
  ];
  return {
    monitor: normalizeMonitorInstanceForSave(normalizeMonitorFields(draft.monitor), params),
    collector: draft.collector,
    params,
    grafanaDashboard: draft.grafanaDashboard
  };
}

export function buildMonitorDetectPayload(draft: MonitorEditorDraft) {
  const params = [
    ...trimParamCollection(draft.params, draft.paramDefines),
    ...trimParamCollection(draft.advancedParams, draft.advancedParamDefines),
    ...trimParamCollection(draft.scrapeParams, draft.scrapeParamDefines)
  ];
  return {
    monitor: normalizeMonitorInstanceForSave(normalizeMonitorFields(draft.monitor), params),
    collector: draft.collector,
    params
  };
}

export async function createMonitor(apiPost: ApiPoster, draft: MonitorEditorDraft) {
  return apiPost<unknown>('/monitor', buildMonitorSavePayload(draft));
}

export async function updateMonitor(apiPut: ApiPutter, draft: MonitorEditorDraft) {
  return apiPut<unknown>('/monitor', buildMonitorSavePayload(draft));
}

export async function detectMonitor(apiPost: ApiPoster, draft: MonitorEditorDraft) {
  return apiPost<unknown>('/monitor/detect', buildMonitorDetectPayload(draft));
}
