import type { CollectorSummary, GrafanaDashboard, Monitor, Param, ParamDefine } from '@/lib/types';
import { resolveLocalizedText, type LocalizedText } from './localized-text';

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
  collectors: Array<MonitorCollectorOption | string>;
};

export type MonitorScrapeDraft = {
  scrapeParams: Param[];
  scrapeParamDefines: ParamDefine[];
};

export type MonitorCollectorOption = {
  name: string;
  ip?: string;
  status?: string | number;
  online?: boolean;
  mode?: string | null;
};

type ParamCollectionKind = 'params' | 'advancedParams' | 'scrapeParams';
type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type MonitorEditorValidationOptions = { locale?: string; validateCronFormat?: boolean };

export type MonitorEditorValidationIssue = {
  message: string;
  label: string;
  focusTarget: string;
};

export type MonitorEditorValidationResult = {
  message: string;
  focusTarget: string | null;
  focusTargets: string[];
};

export type MonitorDetailResponse = {
  monitor: Monitor;
  params?: Param[];
  collector?: string | null;
  grafanaDashboard?: GrafanaDashboard;
};

export type MonitorEditorDraftReaders = {
  readMonitorDetail?: (monitorId: string) => Promise<MonitorDetailResponse>;
  readCollectors: () => Promise<{ content?: CollectorSummary[] }>;
  readParamDefines: (app: string) => Promise<ParamDefine[]>;
};

const SYSTEM_DEFAULT_COLLECTOR = 'main-default-collector';
const MONITOR_NAME_ADJECTIVES = ['quick', 'bright', 'calm', 'brave', 'cool', 'eager', 'gentle', 'lively'];
const MONITOR_NAME_NOUNS = ['probe', 'service', 'signal', 'watch', 'beacon', 'node', 'pulse', 'guard'];
const MONITOR_NAME_DIGITS = '23456789';
const MONITOR_NAME_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz';

function isSystemDefaultCollector(value?: string | null) {
  return value === SYSTEM_DEFAULT_COLLECTOR;
}

function normalizeCollectorForDraft(value?: string | null) {
  return isSystemDefaultCollector(value) ? '' : value || '';
}

function normalizeCollectorForPayload(value?: string | null) {
  const normalized = value?.trim();
  return normalized && !isSystemDefaultCollector(normalized) ? normalized : null;
}

function pickRandomToken(values: string[], random: () => number) {
  return values[Math.floor(random() * values.length)] || values[0];
}

function capitalizeMonitorNamePart(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function generateMonitorEditorReadableName(random: () => number = Math.random) {
  const adjective = capitalizeMonitorNamePart(pickRandomToken(MONITOR_NAME_ADJECTIVES, random));
  const noun = capitalizeMonitorNamePart(pickRandomToken(MONITOR_NAME_NOUNS, random));
  const randomDigits = Array.from({ length: 2 }, () => MONITOR_NAME_DIGITS.charAt(Math.floor(random() * MONITOR_NAME_DIGITS.length))).join('');
  const randomChars = Array.from({ length: 2 }, () => MONITOR_NAME_CHARS.charAt(Math.floor(random() * MONITOR_NAME_CHARS.length))).join('');
  return `${adjective}_${noun}_${randomDigits}${randomChars}`;
}

export function applyMonitorHostNameAutofill(
  draft: MonitorEditorDraft,
  {
    mode,
    field,
    generateName = generateMonitorEditorReadableName
  }: { mode: MonitorEditorMode; field?: string; generateName?: () => string }
) {
  if (mode !== 'new' || field !== 'host' || draft.monitor.name?.trim()) {
    return draft;
  }

  return {
    ...draft,
    monitor: {
      ...draft.monitor,
      name: generateName()
    }
  };
}

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

function resolveParamLabel(define: ParamDefine, locale = 'en-US') {
  return resolveLocalizedText(define.name as LocalizedText, locale, define.field);
}

export function isValidMonitorCronExpression(cronExpression: string): boolean {
  if (!cronExpression || cronExpression.trim() === '') {
    return false;
  }

  const cronRegex =
    /^\s*(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?)(\s+(\*|\*\/[0-9]+|[0-9]+(\/[0-9]+)?|[0-9]+-[0-9]+(\/[0-9]+)?|\?))?\s*$/;

  return cronRegex.test(cronExpression);
}

export function collectMonitorEditorValidationIssues(
  draft: MonitorEditorDraft,
  t: Translator,
  options: MonitorEditorValidationOptions = {}
): MonitorEditorValidationIssue[] {
  const locale = options.locale || 'en-US';
  const validateCronFormat = options.validateCronFormat !== false;
  const normalizedMonitor = normalizeMonitorFields(draft.monitor);
  const issues: MonitorEditorValidationIssue[] = [];
  if (!normalizedMonitor.app?.trim()) {
    issues.push({
      message: t('monitor.editor.validation.app'),
      label: t('common.app'),
      focusTarget: 'app'
    });
  }

  const pushRequiredParamIssues = (collections: Array<{ params: Param[]; defines: ParamDefine[]; include?: (define: ParamDefine) => boolean }>) => {
    for (const collection of collections) {
      for (const [index, define] of collection.defines.entries()) {
        if (collection.include && !collection.include(define)) continue;
        if (!define.required) continue;
        const param = collection.params[index];
        if (param?.display === false) continue;
        if (!isParamValuePresent(param?.paramValue, define)) {
          const label = resolveParamLabel(define, locale);
          issues.push({
            message: t('monitor.editor.validation.param-required', {
              field: label
            }),
            label,
            focusTarget: `param:${define.field}`
          });
        }
      }
    }
  };
  const staticScrape = (draft.monitor.scrape || 'static') === 'static';

  pushRequiredParamIssues([
    ...(staticScrape
      ? [{ params: draft.params, defines: draft.paramDefines, include: (define: ParamDefine) => define.field === 'host' }]
      : [{ params: draft.scrapeParams, defines: draft.scrapeParamDefines }])
  ]);

  if (!normalizedMonitor.name?.trim()) {
    issues.push({
      message: t('monitor.editor.validation.name'),
      label: t('monitor.name'),
      focusTarget: 'monitor-name'
    });
  }

  pushRequiredParamIssues([
    { params: draft.params, defines: draft.paramDefines, include: define => !staticScrape || define.field !== 'host' },
    { params: draft.advancedParams, defines: draft.advancedParamDefines }
  ]);

  if (normalizedMonitor.scheduleType === 'cron') {
    const cronExpression = normalizedMonitor.cronExpression || '';
    if (!cronExpression.trim() || (validateCronFormat && !isValidMonitorCronExpression(cronExpression))) {
      issues.push({
        message: t('monitor.editor.validation.cron'),
        label: t('monitor.cronExpression'),
        focusTarget: 'cron-expression'
      });
    }
  } else if (normalizedMonitor.intervals == null || !Number.isFinite(Number(normalizedMonitor.intervals)) || Number(normalizedMonitor.intervals) <= 0) {
    issues.push({
      message: t('monitor.editor.validation.intervals'),
      label: t('monitor.intervals'),
      focusTarget: 'intervals'
    });
  }

  return issues;
}

function formatMonitorEditorValidationIssues(issues: MonitorEditorValidationIssue[], t: Translator) {
  if (issues.length === 0) return null;
  if (issues.length === 1) return issues[0].message;
  return t('monitor.editor.validation.summary', {
    count: issues.length,
    fields: issues.map(issue => issue.label).join(', ')
  });
}

export function validateMonitorEditorDraftResult(
  draft: MonitorEditorDraft,
  t: Translator,
  options: MonitorEditorValidationOptions = {}
): MonitorEditorValidationResult | null {
  const issues = collectMonitorEditorValidationIssues(draft, t, options);
  const message = formatMonitorEditorValidationIssues(issues, t);
  if (!message) return null;
  return {
    message,
    focusTarget: issues[0]?.focusTarget || null,
    focusTargets: issues.map(issue => issue.focusTarget)
  };
}

export function validateMonitorEditorDraft(draft: MonitorEditorDraft, t: Translator, options: MonitorEditorValidationOptions = {}) {
  return validateMonitorEditorDraftResult(draft, t, options)?.message ?? null;
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

export function buildMonitorEditorParamDefinesUrl(app: string) {
  return `/apps/${app}/params`;
}

export function buildMonitorEditorCollectorsUrl() {
  return '/collector';
}

export function buildMonitorEditCacheKey(monitorId: number | string) {
  return ['monitor-editor-edit', buildMonitorEditorMonitorUrl(String(monitorId)), buildMonitorEditorCollectorsUrl()].join(':');
}

export function buildMonitorEditorMonitorUrl(monitorId: string) {
  return `/monitor/${monitorId}`;
}

async function loadParamDefines(apiGet: ApiGetter, app: string) {
  return apiGet<ParamDefine[]>(buildMonitorEditorParamDefinesUrl(app));
}

async function loadCollectors(apiGet: ApiGetter) {
  const response = await apiGet<{ content?: CollectorSummary[] }>(buildMonitorEditorCollectorsUrl());
  return normalizeCollectorSummaries(response);
}

function normalizeCollectorSummaries(response: { content?: CollectorSummary[] }) {
  return (response.content || [])
    .map(item => item.collector)
    .filter((collector): collector is NonNullable<CollectorSummary['collector']> => {
      if (!collector?.name) return false;
      return !isSystemDefaultCollector(collector.name);
    })
    .map(collector => ({
      name: String(collector.name),
      ip: collector.ip,
      status: collector.status,
      online: collector.online,
      mode: collector.mode
    }));
}

export async function loadMonitorScrapeDraft(apiGet: ApiGetter, scrape?: string | null, existingParams?: Param[]) {
  return loadMonitorScrapeDraftFromFacade(app => loadParamDefines(apiGet, app), scrape, existingParams);
}

export async function loadMonitorScrapeDraftFromFacade(
  readParamDefines: (app: string) => Promise<ParamDefine[]>,
  scrape?: string | null,
  existingParams?: Param[]
) {
  if (!scrape || scrape === 'static') {
    return {
      scrapeParams: [],
      scrapeParamDefines: []
    } satisfies MonitorScrapeDraft;
  }
  const defines = await readParamDefines(scrape);
  const paramMap = new Map((existingParams || []).map(param => [String(param.field), param]));
  const merged = mergeParamDrafts(defines, paramMap);
  return {
    scrapeParams: merged.params,
    scrapeParamDefines: merged.paramDefines
  } satisfies MonitorScrapeDraft;
}

export function shouldPreserveMonitorScrapeParamsForLoad(previousScrape: string | null | undefined, nextScrape: string) {
  return !previousScrape && nextScrape !== 'static';
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

export function resolveMonitorEditorParamChangeNotice(draft: MonitorEditorDraft, kind: ParamCollectionKind, index: number, value: unknown) {
  const changedField = String(draft[kind][index]?.field || '');
  if (changedField !== 'ssl' || typeof value !== 'boolean') {
    return null;
  }

  const portParam = draft.params.find(param => param.field === 'port');
  if (!portParam) {
    return null;
  }

  const current = Number(portParam.paramValue);
  if (draft.monitor.app === 'api') {
    if (value && (!Number.isFinite(current) || current === 80)) return 'monitor.new.notify.change-to-https';
    if (!value && (!Number.isFinite(current) || current === 443)) return 'monitor.new.notify.change-to-http';
  }
  if (draft.monitor.app === 'ftp') {
    if (value && (!Number.isFinite(current) || current === 21)) return 'monitor.new.notify.change-to-sftp';
    if (!value && (!Number.isFinite(current) || current === 22)) return 'monitor.new.notify.change-to-ftp';
  }
  return null;
}

export async function loadMonitorEditorDraft(apiGet: ApiGetter, mode: MonitorEditorMode, options: { app?: string; monitorId?: string }) {
  return loadMonitorEditorDraftFromFacade(
    {
      readMonitorDetail: monitorId => apiGet<MonitorDetailResponse>(buildMonitorEditorMonitorUrl(monitorId)),
      readCollectors: () => apiGet<{ content?: CollectorSummary[] }>(buildMonitorEditorCollectorsUrl()),
      readParamDefines: app => loadParamDefines(apiGet, app)
    },
    mode,
    options
  );
}

export async function loadMonitorEditorDraftFromFacade(
  readers: MonitorEditorDraftReaders,
  mode: MonitorEditorMode,
  options: { app?: string; monitorId?: string }
) {
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
    if (!readers.readMonitorDetail) {
      throw new Error('Monitor detail reader is required for edit drafts');
    }
    const detail = await readers.readMonitorDetail(options.monitorId);
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
    collector = normalizeCollectorForDraft(detail.collector);
    grafanaDashboard = detail.grafanaDashboard || { enabled: false };
  }

  const [collectors, mainDefines, scrapeDefines] = await Promise.all([
    readers.readCollectors().then(normalizeCollectorSummaries),
    readers.readParamDefines(monitor.app),
    monitor.scrape && monitor.scrape !== 'static' ? readers.readParamDefines(monitor.scrape) : Promise.resolve<ParamDefine[]>([])
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
    collector: normalizeCollectorForPayload(draft.collector),
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
    collector: normalizeCollectorForPayload(draft.collector),
    params
  };
}

export function buildMonitorDetectSuccessDetail(draft: MonitorEditorDraft, t: Translator) {
  const payload = buildMonitorDetectPayload(draft);
  const monitor = payload.monitor;
  const name = monitor.name || t('monitor.name');
  const target = monitor.instance || t('common.unknown');
  const scrape = monitor.scrape || 'static';
  const collector = payload.collector || t('monitor.collector.system.default');
  const schedule =
    monitor.scheduleType === 'cron'
      ? `${t('monitor.scheduleType.cron')} ${monitor.cronExpression || t('common.unknown')}`
      : `${monitor.intervals ?? t('common.unknown')} ${t('common.time.unit.second')}`;

  return t('monitor.detect.success-detail', {
    name,
    target,
    scrape,
    collector,
    schedule
  });
}

export async function createMonitor(apiPost: ApiPoster, draft: MonitorEditorDraft) {
  return apiPost<unknown>('/monitor', buildMonitorSavePayload(draft));
}

export async function createMonitorFromFacade(writeCreateMonitor: (payload: unknown) => Promise<unknown>, draft: MonitorEditorDraft) {
  return writeCreateMonitor(buildMonitorSavePayload(draft));
}

export async function updateMonitor(apiPut: ApiPutter, draft: MonitorEditorDraft) {
  return apiPut<unknown>('/monitor', buildMonitorSavePayload(draft));
}

export async function updateMonitorFromFacade(writeUpdateMonitor: (payload: unknown) => Promise<unknown>, draft: MonitorEditorDraft) {
  return writeUpdateMonitor(buildMonitorSavePayload(draft));
}

export async function detectMonitor(apiPost: ApiPoster, draft: MonitorEditorDraft) {
  return apiPost<unknown>('/monitor/detect', buildMonitorDetectPayload(draft));
}

export async function detectMonitorFromFacade(writeDetectMonitor: (payload: unknown) => Promise<unknown>, draft: MonitorEditorDraft) {
  return writeDetectMonitor(buildMonitorDetectPayload(draft));
}
