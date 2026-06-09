import {
  createSignalDashboardPanelDraft,
  type SignalDashboardPanelDraft,
  type SignalDashboardPanelDraftSignal,
  type SignalDashboardPanelVisualization
} from './signal-dashboard-panel-drafts';
import {
  buildAlertListUrl,
  queryStateFromParams as alertQueryStateFromParams
} from './alert-manage/query-state';
import {
  buildLogUrls,
  queryStateFromParams as logQueryStateFromParams,
  resolveLogWorkbenchView
} from './log-manage/query-state';
import {
  buildOtlpMetricsConsoleUrl,
  queryStateFromParams as metricsQueryStateFromParams
} from './otlp-metrics/controller';
import { readSignalRouteContext, type SignalPanelEditContext } from './signal-route-context';
import {
  MANUAL_TIME_CONTEXT_REFRESH_INTERVAL,
  normalizeTimeContextValue,
  resolveTimeContextBounds,
  resolveTimeContextRefreshInterval
} from './time-context';
import {
  buildTraceUrls,
  queryStateFromParams as traceQueryStateFromParams,
  resolveTraceExplorerView
} from './trace-manage/query-state';

export type SignalDashboard = {
  id?: number;
  dashboardKey: string;
  title: string;
  description: string;
  tags: string;
  layout: string;
  widgets: string;
  variables?: string;
  panelMap?: string;
  version?: string;
  createTime?: string;
  updateTime?: string;
};

export type SignalDashboardWidget = {
  id: string;
  draftKey?: string;
  signal: 'logs' | 'traces' | 'metrics' | 'alerts' | string;
  title: string;
  description?: string;
  visualization: string;
  route: string;
  querySnapshot?: string;
  payload?: unknown;
};

export type SignalDashboardPanelEditMetadata = {
  intent: 'edit-panel';
  dashboardKey?: string;
  panelId?: string;
  draftKey?: string;
  returnTo?: string;
  returnLabel?: string;
};

export type SignalDashboardLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SignalDashboardPreviewPanel = {
  widget: SignalDashboardWidget;
  layout: SignalDashboardLayoutItem;
};

export type SignalDashboardResolvedPreviewPanel = SignalDashboardPreviewPanel & {
  resolvedRoute: string;
  resolvedQuerySnapshot: string;
};

export type SignalDashboardPanelExecutionPlan = {
  panelId: string;
  signal: string;
  visualization: string;
  state: 'ready' | 'unsupported';
  sourceRoute: string;
  resolvedRoute: string;
  resolvedQuerySnapshot: string;
  view?: string;
  primaryUrl?: string;
  apiUrls: Record<string, string>;
  unsupportedReason?: 'unsupported-route' | 'unsupported-signal';
};

export type SignalDashboardPanelExecutionResult = {
  panelId: string;
  state: 'loading' | 'ready' | 'error' | 'unsupported';
  primaryUrl?: string;
  apiUrl?: string;
  data?: unknown;
  errorMessage?: string;
};

export type SignalDashboardPanelRuntimeSummary = {
  panelId: string;
  state: SignalDashboardPanelExecutionResult['state'];
  signal: string;
  visualization: string;
  kind: 'loading' | 'unsupported' | 'error' | 'page' | 'time-series' | 'overview' | 'metrics-console' | 'object' | 'empty';
  itemCount: number;
  totalCount?: number;
  seriesCount?: number;
  sampleCount?: number;
  latestObservedAt?: string | number | null;
  errorMessage?: string;
};

export type SignalDashboardPanelRuntimePreviewRow = {
  key: string;
  title: string;
  copy: string;
  meta?: string;
  relatedSignal?: 'alerts' | 'logs' | 'traces';
  relatedHandoffHref?: string;
};

export type SignalDashboardPanelRuntimePreviewBar = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  heightPct: number;
};

export type SignalDashboardPanelRuntimeTableRow = {
  key: string;
  observedAt: string;
  service: string;
  serviceNamespace?: string;
  status: string;
  name: string;
  message: string;
  traceId: string;
  spanId: string;
  duration: string;
  breakoutAttributes?: SignalDashboardRuntimeBreakoutAttribute[];
};

export type SignalDashboardPanelRuntimeTraceWaterfallRow = {
  key: string;
  traceId: string;
  spanId: string;
  parentSpanId: string;
  service: string;
  serviceNamespace?: string;
  name: string;
  status: string;
  observedAt: string;
  duration: string;
  durationNanos: number;
  leftPct: number;
  widthPct: number;
  depth: number;
  source: 'spans' | 'list-roots';
  tone: 'default' | 'danger';
  breakoutAttributes?: SignalDashboardRuntimeBreakoutAttribute[];
};

export type SignalDashboardPanelRuntimeMetricsPoint = {
  key: string;
  timestamp: number;
  value: number;
  xPct: number;
  yPct: number;
};

export type SignalDashboardPanelRuntimeMetricsSeries = {
  key: string;
  label: string;
  labels: Record<string, string>;
  sampleCount: number;
  latestTimestamp?: number;
  latestValue?: number;
  minValue?: number;
  maxValue?: number;
  pathD: string;
  points: SignalDashboardPanelRuntimeMetricsPoint[];
};

export type SignalDashboardPanelRuntimeMetricsChart = {
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  xMinLabel: string;
  xMaxLabel: string;
  yMinLabel: string;
  yMaxLabel: string;
  seriesCount: number;
  sampleCount: number;
  series: SignalDashboardPanelRuntimeMetricsSeries[];
  tooltipRows: SignalDashboardPanelRuntimePreviewRow[];
};

export type SignalDashboardPanelRuntimePreview = {
  panelId: string;
  mode: 'state' | 'rows' | 'bars';
  state: SignalDashboardPanelExecutionResult['state'];
  kind: SignalDashboardPanelRuntimeSummary['kind'];
  rows: SignalDashboardPanelRuntimePreviewRow[];
  bars: SignalDashboardPanelRuntimePreviewBar[];
};

export type SignalDashboardPanelRuntimeRenderer =
  | 'state-panel'
  | 'logs-table'
  | 'trace-table'
  | 'log-trend-chart'
  | 'trace-overview'
  | 'metrics-chart'
  | 'object-panel';

export type SignalDashboardPanelRuntimeRenderDescriptor = {
  panelId: string;
  renderer: SignalDashboardPanelRuntimeRenderer;
  signal: string;
  visualization: string;
  state: SignalDashboardPanelExecutionResult['state'];
  kind: SignalDashboardPanelRuntimeSummary['kind'];
  mode: SignalDashboardPanelRuntimePreview['mode'];
  itemCount: number;
  totalCount?: number;
  seriesCount?: number;
  sampleCount?: number;
  rows: SignalDashboardPanelRuntimePreviewRow[];
  bars: SignalDashboardPanelRuntimePreviewBar[];
  tableRows: SignalDashboardPanelRuntimeTableRow[];
  traceWaterfallRows: SignalDashboardPanelRuntimeTraceWaterfallRow[];
  metricsChart: SignalDashboardPanelRuntimeMetricsChart | null;
};

export type SignalDashboardRuntimeSyncTooltipRow = {
  key: string;
  panelId: string;
  signal: string;
  source: 'metrics-point' | 'table-row' | 'trace-waterfall-row';
  label: string;
  value: string;
  meta?: string;
  traceId?: string;
  spanId?: string;
  serviceName?: string;
  serviceNamespace?: string;
  resourceFilter?: string;
  operationName?: string;
  relatedSignal?: 'logs' | 'traces';
  relatedHandoffHref?: string;
  breakoutAttributes?: SignalDashboardRuntimeBreakoutAttribute[];
};

export type SignalDashboardRuntimeSyncTooltip = {
  timestamp: string;
  state: 'idle' | 'active';
  rowCount: number;
  rows: SignalDashboardRuntimeSyncTooltipRow[];
};

export type SignalDashboardRuntimeBreakoutAttribute = {
  key: string;
  name: string;
  value: string;
};

export type SignalDashboardRuntimeSyncTooltipOptions = {
  timeRange?: SignalDashboardTimeRange;
  returnTo?: string;
};

export type SignalDashboardRuntimeSyncCrosshairPanel = {
  panelId: string;
  signal: string;
  xPct: number;
  pointCount: number;
};

export type SignalDashboardRuntimeSyncCrosshair = {
  timestamp: string;
  state: 'idle' | 'active';
  panelCount: number;
  pointCount: number;
  panels: SignalDashboardRuntimeSyncCrosshairPanel[];
};

export type SignalDashboardRuntimeMetricsTooltip = {
  timestamp: string;
  state: 'latest' | 'sync';
  rowCount: number;
  rows: SignalDashboardPanelRuntimePreviewRow[];
};

export type SignalDashboardRuntimeEvidenceFilterSource =
  | 'service'
  | 'serviceNamespace'
  | 'traceId'
  | 'spanId'
  | 'entityId'
  | 'entityType'
  | 'entityName'
  | 'signalSource'
  | 'collector'
  | 'template';

export type SignalDashboardRuntimeEvidenceFilterCandidate = {
  key: string;
  variableName: string;
  value: string;
  source: SignalDashboardRuntimeEvidenceFilterSource;
};

export type SignalDashboardRuntimeEvidenceFilterSuggestion = SignalDashboardRuntimeEvidenceFilterCandidate & {
  variableType: SignalDashboardVariableType;
};

export type SignalDashboardLayoutPatch = {
  dx?: number;
  dy?: number;
  dw?: number;
  dh?: number;
};

export type SignalDashboardVariableType = 'custom' | 'textbox' | 'query' | 'dynamic';

export type SignalDashboardVariable = {
  name: string;
  type: SignalDashboardVariableType;
  value: string;
  description?: string;
  options?: string[];
  multi?: boolean;
};

export type SignalDashboardVariableOption = {
  key: string;
  variableName: string;
  value: string;
  label: string;
  source: 'static' | 'runtime';
  count: number;
};

export type SignalDashboardTimeRange = {
  start?: string;
  end?: string;
  timeRange?: string;
  refresh?: string;
  live?: string;
};

export type SignalDashboardRefreshState = {
  mode: 'auto' | 'manual';
  intervalSeconds: number;
  tickMs: number;
};

type ApiMessage<T> = {
  code: number;
  msg?: string;
  data?: T;
};

type BuildSignalDashboardCompositionInput = {
  dashboardKey: string;
  title: string;
  description: string;
  tags: string[];
  drafts: SignalDashboardPanelDraft[];
};

type BuildSignalServiceOverviewDashboardInput = {
  serviceName: string;
  serviceNamespace?: string;
  environment?: string;
  entityId?: string;
  entityType?: string;
  entityName?: string;
  source?: string;
  collector?: string;
  template?: string;
  timeRange?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
};

type BuildSignalOperationDrilldownDashboardInput = BuildSignalServiceOverviewDashboardInput & {
  operationName: string;
};

type ResolveSignalDashboardPreviewOptions = {
  timeRange?: SignalDashboardTimeRange;
  now?: number;
};

type SignalDashboardPanelExecutor = (url: string) => Promise<unknown>;

const DEFAULT_DASHBOARD_KEY = 'signals-overview';
const VARIABLE_NAME_PATTERN = /[^A-Za-z0-9_.-]+/g;
const VARIABLE_REFERENCE_BOUNDARY_PATTERN = '[^A-Za-z0-9_.-]';

export function normalizeSignalDashboardKey(value: string, fallback = DEFAULT_DASHBOARD_KEY) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
  return normalized || fallback;
}

function stableWidgetId(draft: SignalDashboardPanelDraft, index: number) {
  return `${draft.signal}-${draft.draftKey || index}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJsonArray(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseWidgetPanelMap(value: string | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, string>>((map, [key, rawValue]) => {
      if (typeof rawValue === 'string') map[key] = rawValue;
      return map;
    }, {});
  } catch {
    return {};
  }
}

function parseResolvedPanelUrl(route: string): URL | null {
  try {
    return new URL(route, 'http://hertzbeat.local');
  } catch {
    return null;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeLayoutItem(value: unknown, index: number): SignalDashboardLayoutItem | null {
  if (!isRecord(value) || typeof value.i !== 'string') return null;
  return {
    i: value.i,
    x: Math.max(0, Math.min(11, Math.trunc(toFiniteNumber(value.x, (index % 2) * 6)))),
    y: Math.max(0, Math.trunc(toFiniteNumber(value.y, Math.floor(index / 2) * 4))),
    w: Math.max(1, Math.min(12, Math.trunc(toFiniteNumber(value.w, 6)))),
    h: Math.max(1, Math.trunc(toFiniteNumber(value.h, 4)))
  };
}

function normalizeWidget(value: unknown): SignalDashboardWidget | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.route !== 'string') {
    return null;
  }
  return {
    id: value.id,
    draftKey: typeof value.draftKey === 'string' ? value.draftKey : undefined,
    signal: typeof value.signal === 'string' ? value.signal : 'metrics',
    title: value.title,
    description: typeof value.description === 'string' ? value.description : undefined,
    visualization: typeof value.visualization === 'string' ? value.visualization : 'table',
    route: value.route,
    querySnapshot: typeof value.querySnapshot === 'string' ? value.querySnapshot : undefined,
    payload: value.payload
  };
}

function parseWidgetPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      const parsedPayload = JSON.parse(payload);
      return isRecord(parsedPayload) ? parsedPayload : {};
    } catch {
      return {};
    }
  }
  return isRecord(payload) ? payload : {};
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function readSignalDashboardWidgetPanelEditMetadata(
  widget: Pick<SignalDashboardWidget, 'payload'> | null | undefined
): SignalDashboardPanelEditMetadata | null {
  const payload = parseWidgetPayload(widget?.payload);
  const dashboardPanelEdit = payload.dashboardPanelEdit;
  if (!isRecord(dashboardPanelEdit) || dashboardPanelEdit.intent !== 'edit-panel') {
    return null;
  }
  return {
    intent: 'edit-panel',
    dashboardKey: optionalString(dashboardPanelEdit.dashboardKey),
    panelId: optionalString(dashboardPanelEdit.panelId),
    draftKey: optionalString(dashboardPanelEdit.draftKey),
    returnTo: optionalString(dashboardPanelEdit.returnTo),
    returnLabel: optionalString(dashboardPanelEdit.returnLabel)
  };
}

export function buildSignalDashboardPanelEditHref(input: {
  route: string;
  dashboardKey: string;
  panelId: string;
  draftKey?: string;
  returnTo: string;
  returnLabel: string;
}) {
  const url = new URL(input.route || '/dashboard', 'http://localhost');
  url.searchParams.set('intent', 'edit-panel');
  url.searchParams.set('dashboardKey', input.dashboardKey);
  url.searchParams.set('panelId', input.panelId);
  if (input.draftKey) {
    url.searchParams.set('draftKey', input.draftKey);
  }
  url.searchParams.set('returnTo', input.returnTo);
  url.searchParams.set('returnLabel', input.returnLabel);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizeSignalDashboardVariableName(value: string) {
  return value.trim().replace(VARIABLE_NAME_PATTERN, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '').slice(0, 128);
}

function normalizeVariableType(value: unknown): SignalDashboardVariableType {
  return value === 'query' || value === 'dynamic' || value === 'textbox' ? value : 'custom';
}

function normalizeVariable(value: unknown): SignalDashboardVariable | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null;
  const name = normalizeSignalDashboardVariableName(value.name);
  if (!name) return null;
  const rawOptions = Array.isArray(value.options) ? value.options : [];
  const options = rawOptions.map(option => String(option).trim()).filter(Boolean).slice(0, 64);
  return {
    name,
    type: normalizeVariableType(value.type),
    value: typeof value.value === 'string' ? value.value.slice(0, 512) : '',
    description: typeof value.description === 'string' ? value.description.slice(0, 512) : undefined,
    options,
    multi: Boolean(value.multi)
  };
}

export function parseSignalDashboardVariables(dashboard: Pick<SignalDashboard, 'variables'>): SignalDashboardVariable[] {
  return parseJsonArray(dashboard.variables)
    .map(normalizeVariable)
    .filter((variable): variable is SignalDashboardVariable => variable !== null);
}

export function serializeSignalDashboardVariables(variables: SignalDashboardVariable[]) {
  return JSON.stringify(variables
    .map(normalizeVariable)
    .filter((variable): variable is SignalDashboardVariable => variable !== null));
}

function collectRouteParam(route: string, name: string) {
  try {
    return new URL(route, 'http://hertzbeat.local').searchParams.get(name)?.trim() || '';
  } catch {
    return '';
  }
}

function addDraftVariable(
  variables: Map<string, SignalDashboardVariable>,
  name: string,
  value: string,
  description: string
) {
  const normalizedName = normalizeSignalDashboardVariableName(name);
  if (!normalizedName || !value || variables.has(normalizedName)) return;
  variables.set(normalizedName, {
    name: normalizedName,
    type: 'textbox',
    value,
    description,
    options: [],
    multi: false
  });
}

export function buildSignalDashboardVariablesFromDrafts(drafts: SignalDashboardPanelDraft[]): SignalDashboardVariable[] {
  const variables = new Map<string, SignalDashboardVariable>();
  for (const draft of drafts) {
    addDraftVariable(variables, 'service.name', collectRouteParam(draft.route, 'serviceName'), 'Service context from panel drafts');
    addDraftVariable(variables, 'service.namespace', collectRouteParam(draft.route, 'serviceNamespace'), 'Service namespace context from panel drafts');
    addDraftVariable(variables, 'deployment.environment.name', collectRouteParam(draft.route, 'environment'), 'Environment context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.entity_id', collectRouteParam(draft.route, 'entityId'), 'Entity context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.entity_type', collectRouteParam(draft.route, 'entityType'), 'Entity type context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.entity_name', collectRouteParam(draft.route, 'entityName'), 'Entity name context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.source', collectRouteParam(draft.route, 'source'), 'Signal source context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.collector', collectRouteParam(draft.route, 'collector'), 'Collector context from panel drafts');
    addDraftVariable(variables, 'hertzbeat.template', collectRouteParam(draft.route, 'template'), 'Template context from panel drafts');
    addDraftVariable(variables, 'operation.name', collectRouteParam(draft.route, 'operationName'), 'Operation context from panel drafts');
  }
  return [...variables.values()];
}

export function updateSignalDashboardVariables(
  dashboard: SignalDashboard,
  variables: SignalDashboardVariable[]
): SignalDashboard {
  return {
    ...dashboard,
    variables: serializeSignalDashboardVariables(variables)
  };
}

export function resolveSignalDashboardVariableValue(variable: SignalDashboardVariable) {
  if (variable.multi) {
    const selectedValues = variable.value.split(',').map(value => value.trim()).filter(Boolean);
    const values = selectedValues.length > 0 ? selectedValues : variable.options || [];
    return values.map(value => value.trim()).filter(Boolean).join('|');
  }
  return variable.value.trim() || variable.options?.[0] || '';
}

export function selectSignalDashboardVariableOption(
  variables: SignalDashboardVariable[],
  variableName: string,
  optionValue: string
) {
  const normalizedName = normalizeSignalDashboardVariableName(variableName);
  const normalizedValue = textValue(optionValue)?.slice(0, 512) || '';
  if (!normalizedName) return variables;

  return variables.map(variable => {
    const normalizedVariable = normalizeVariable(variable);
    if (!normalizedVariable || normalizedVariable.name !== normalizedName) return variable;
    if (!normalizedValue) {
      return {
        ...normalizedVariable,
        value: ''
      };
    }
    if (normalizedVariable.multi) {
      const selectedValues = normalizedVariable.value.split(',').map(value => value.trim()).filter(Boolean);
      const existingIndex = selectedValues.indexOf(normalizedValue);
      const nextValues = existingIndex >= 0
        ? selectedValues.filter(value => value !== normalizedValue)
        : [...selectedValues, normalizedValue];
      return {
        ...normalizedVariable,
        value: nextValues.join(',')
      };
    }
    return {
      ...normalizedVariable,
      value: normalizedValue
    };
  });
}

export function applySignalDashboardVariables(value: string | undefined, variables: SignalDashboardVariable[]) {
  if (!value || variables.length === 0) return value || '';
  return variables
    .filter(variable => variable.name)
    .sort((left, right) => right.name.length - left.name.length)
    .reduce((nextValue, variable) => {
      const resolvedValue = resolveSignalDashboardVariableValue(variable);
      const pattern = new RegExp(`\\$${escapeRegExp(variable.name)}(?=$|${VARIABLE_REFERENCE_BOUNDARY_PATTERN})`, 'g');
      return nextValue.replace(pattern, () => resolvedValue);
    }, value);
}

function variableAliasNames(variableName: string) {
  const aliases = new Set([variableName]);
  const camelCase = variableName.replace(/[._-]+([A-Za-z0-9])/g, (_, token: string) => token.toUpperCase());
  aliases.add(camelCase);
  if (variableName === 'service.name') {
    aliases.add('serviceName');
  }
  if (variableName === 'service.namespace') {
    aliases.add('serviceNamespace');
  }
  if (variableName === 'deployment.environment.name') {
    aliases.add('environment');
    aliases.add('deploymentEnvironmentName');
  }
  if (variableName === 'hertzbeat.entity_id') {
    aliases.add('entityId');
    aliases.add('entityID');
  }
  if (variableName === 'hertzbeat.entity_type') {
    aliases.add('entityType');
  }
  if (variableName === 'hertzbeat.entity_name') {
    aliases.add('entityName');
  }
  if (variableName === 'hertzbeat.source') {
    aliases.add('source');
  }
  if (variableName === 'hertzbeat.collector') {
    aliases.add('collector');
  }
  if (variableName === 'hertzbeat.template') {
    aliases.add('template');
  }
  return aliases;
}

function addVariableOptionCount(counts: Map<string, number>, value: unknown) {
  const text = textValue(value);
  if (!text || text.length > 128) return;
  counts.set(text, (counts.get(text) || 0) + 1);
}

function collectRuntimeVariableValues(
  source: unknown,
  aliases: Set<string>,
  counts: Map<string, number>,
  depth = 0
) {
  if (depth > 6 || source == null) return;
  if (Array.isArray(source)) {
    source.slice(0, 100).forEach(item => collectRuntimeVariableValues(item, aliases, counts, depth + 1));
    return;
  }
  if (!isRecord(source)) return;
  Object.entries(source).forEach(([key, value]) => {
    if (aliases.has(key)) {
      addVariableOptionCount(counts, value);
    }
    collectRuntimeVariableValues(value, aliases, counts, depth + 1);
  });
}

export function buildSignalDashboardVariableOptions(
  variables: SignalDashboardVariable[],
  plans: SignalDashboardPanelExecutionPlan[],
  results: Record<string, SignalDashboardPanelExecutionResult>
): Record<string, SignalDashboardVariableOption[]> {
  const readyResults = plans
    .map(plan => results[plan.panelId])
    .filter((result): result is SignalDashboardPanelExecutionResult => result?.state === 'ready' && result.data != null);

  return variables.reduce<Record<string, SignalDashboardVariableOption[]>>((optionsByName, variable) => {
    const normalized = normalizeVariable(variable);
    if (!normalized) return optionsByName;

    const staticCounts = new Map<string, number>();
    normalized.options?.forEach(option => addVariableOptionCount(staticCounts, option));
    const staticOptions = [...staticCounts.entries()].map(([value, count]) => ({
      key: `${normalized.name}:static:${value}`,
      variableName: normalized.name,
      value,
      label: value,
      source: 'static' as const,
      count
    }));

    if (normalized.type !== 'query' && normalized.type !== 'dynamic') {
      optionsByName[normalized.name] = staticOptions.slice(0, 32);
      return optionsByName;
    }

    const aliases = variableAliasNames(normalized.name);
    const runtimeCounts = new Map<string, number>();
    readyResults.forEach(result => collectRuntimeVariableValues(result.data, aliases, runtimeCounts));
    const staticValues = new Set(staticOptions.map(option => option.value));
    const runtimeOptions = [...runtimeCounts.entries()]
      .filter(([value]) => !staticValues.has(value))
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([value, count]) => ({
        key: `${normalized.name}:runtime:${value}`,
        variableName: normalized.name,
        value,
        label: value,
        source: 'runtime' as const,
        count
      }));

    optionsByName[normalized.name] = [...staticOptions, ...runtimeOptions].slice(0, 32);
    return optionsByName;
  }, {});
}

export function filterSignalDashboardVariableOptions(
  options: SignalDashboardVariableOption[],
  search: string | undefined
) {
  const query = search?.trim().toLowerCase();
  if (!query) return options;
  return options.filter(option => {
    return option.value.toLowerCase().includes(query)
      || option.label.toLowerCase().includes(query)
      || option.source.toLowerCase().includes(query);
  });
}

export function normalizeSignalDashboardTimeRange(value: SignalDashboardTimeRange | undefined): SignalDashboardTimeRange {
  const start = normalizeTimeContextValue('start', value?.start);
  const end = normalizeTimeContextValue('end', value?.end);
  const timeRange = normalizeTimeContextValue('timeRange', value?.timeRange);
  const refresh = normalizeTimeContextValue('refresh', value?.refresh);
  const live = normalizeTimeContextValue('live', value?.live);
  const refreshContext = live === 'false'
    ? { live }
    : {
        ...(refresh ? { refresh } : {}),
        ...(live ? { live } : {})
      };
  if (start || end) {
    return {
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
      ...refreshContext
    };
  }
  return {
    ...(timeRange ? { timeRange } : {}),
    ...refreshContext
  };
}

export function resolveSignalDashboardTimeRange(value: SignalDashboardTimeRange | undefined, now = Date.now()): SignalDashboardTimeRange {
  const normalized = normalizeSignalDashboardTimeRange(value);
  const bounds = resolveTimeContextBounds(normalized, now);
  if (!bounds) return normalized;
  return {
    ...bounds,
    ...(normalized.refresh ? { refresh: normalized.refresh } : {}),
    ...(normalized.live ? { live: normalized.live } : {})
  };
}

export function resolveSignalDashboardRefreshState(value: SignalDashboardTimeRange | undefined): SignalDashboardRefreshState {
  const normalized = normalizeSignalDashboardTimeRange(value);
  if (!normalized.refresh || normalized.live === 'false') {
    return {
      mode: 'manual',
      intervalSeconds: MANUAL_TIME_CONTEXT_REFRESH_INTERVAL,
      tickMs: 0
    };
  }
  const intervalSeconds = resolveTimeContextRefreshInterval({
    refresh: normalized.refresh,
    live: normalized.live
  });
  if (intervalSeconds === MANUAL_TIME_CONTEXT_REFRESH_INTERVAL) {
    return {
      mode: 'manual',
      intervalSeconds,
      tickMs: 0
    };
  }
  return {
    mode: 'auto',
    intervalSeconds,
    tickMs: intervalSeconds * 1000
  };
}

function isRoutelikeDashboardValue(value: string) {
  return value.startsWith('/') || /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

export function applySignalDashboardTimeRange(value: string | undefined, timeRange: SignalDashboardTimeRange | undefined) {
  const source = value || '';
  if (!source) return source;
  const normalized = normalizeSignalDashboardTimeRange(timeRange);
  if (!normalized.start && !normalized.end && !normalized.timeRange && !normalized.refresh && !normalized.live) return source;
  if (!isRoutelikeDashboardValue(source)) return source;
  try {
    const url = new URL(source, 'http://hertzbeat.local');
    if (normalized.start || normalized.end) {
      url.searchParams.delete('timeRange');
      url.searchParams.delete('from');
      url.searchParams.delete('to');
      if (normalized.start) url.searchParams.set('start', normalized.start);
      if (normalized.end) url.searchParams.set('end', normalized.end);
    } else if (normalized.timeRange) {
      url.searchParams.delete('start');
      url.searchParams.delete('end');
      url.searchParams.delete('from');
      url.searchParams.delete('to');
      url.searchParams.set('timeRange', normalized.timeRange);
    }
    if (normalized.refresh) {
      url.searchParams.set('refresh', normalized.refresh);
    } else {
      url.searchParams.delete('refresh');
    }
    if (normalized.live) {
      url.searchParams.set('live', normalized.live);
    } else {
      url.searchParams.delete('live');
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return source;
  }
}

function clampLayoutItem(layout: SignalDashboardLayoutItem): SignalDashboardLayoutItem {
  const w = Math.max(1, Math.min(12, Math.trunc(layout.w)));
  const h = Math.max(1, Math.trunc(layout.h));
  return {
    i: layout.i,
    w,
    h,
    x: Math.max(0, Math.min(12 - w, Math.trunc(layout.x))),
    y: Math.max(0, Math.trunc(layout.y))
  };
}

export function parseSignalDashboardPreviewPanels(dashboard: SignalDashboard): SignalDashboardPreviewPanel[] {
  const widgets = parseJsonArray(dashboard.widgets)
    .map(normalizeWidget)
    .filter((widget): widget is SignalDashboardWidget => widget !== null);
  const layoutById = new Map(
    parseJsonArray(dashboard.layout)
      .map(normalizeLayoutItem)
      .filter((layout): layout is SignalDashboardLayoutItem => layout !== null)
      .map(layout => [layout.i, layout])
  );

  return widgets.map((widget, index) => ({
    widget,
    layout: layoutById.get(widget.id) || {
      i: widget.id,
      x: (index % 2) * 6,
      y: Math.floor(index / 2) * 4,
      w: 6,
      h: 4
    }
})).sort((left, right) => left.layout.y - right.layout.y || left.layout.x - right.layout.x);
}

export function resolveSignalDashboardPreviewPanels(
  dashboard: SignalDashboard,
  options: ResolveSignalDashboardPreviewOptions = {}
): SignalDashboardResolvedPreviewPanel[] {
  const variables = parseSignalDashboardVariables(dashboard);
  const timeRange = resolveSignalDashboardTimeRange(options.timeRange, options.now);
  return parseSignalDashboardPreviewPanels(dashboard).map(panel => ({
    ...panel,
    resolvedRoute: applySignalDashboardTimeRange(applySignalDashboardVariables(panel.widget.route, variables), timeRange),
    resolvedQuerySnapshot: applySignalDashboardTimeRange(
      applySignalDashboardVariables(panel.widget.querySnapshot || panel.widget.route, variables),
      timeRange
    )
  }));
}

function createSearchParamReader(params: URLSearchParams) {
  return {
    get: (name: string) => params.get(name)
  };
}

function unsupportedExecutionPlan(
  panel: SignalDashboardResolvedPreviewPanel,
  reason: SignalDashboardPanelExecutionPlan['unsupportedReason']
): SignalDashboardPanelExecutionPlan {
  return {
    panelId: panel.widget.id,
    signal: panel.widget.signal,
    visualization: panel.widget.visualization,
    state: 'unsupported',
    sourceRoute: panel.widget.route,
    resolvedRoute: panel.resolvedRoute,
    resolvedQuerySnapshot: panel.resolvedQuerySnapshot,
    apiUrls: {},
    unsupportedReason: reason
  };
}

function appendMetricsFilterClause(baseFilter: string | undefined, clause: string) {
  return [baseFilter?.trim(), clause.trim()].filter(Boolean).join(' and ');
}

function buildScopedMetricsFilter(query: ReturnType<typeof metricsQueryStateFromParams>) {
  const explicitFilter = query.filter?.trim();
  if (explicitFilter) return explicitFilter;
  return [
    query.serviceName?.trim() ? `service.name="${query.serviceName.trim()}"` : '',
    query.serviceNamespace?.trim() ? `service.namespace="${query.serviceNamespace.trim()}"` : ''
  ].filter(Boolean).join(' and ') || undefined;
}

export function buildSignalDashboardPanelExecutionPlan(
  panel: SignalDashboardResolvedPreviewPanel
): SignalDashboardPanelExecutionPlan {
  const url = parseResolvedPanelUrl(panel.resolvedRoute);
  if (!url) return unsupportedExecutionPlan(panel, 'unsupported-route');
  const reader = createSearchParamReader(url.searchParams);
  const signal = panel.widget.signal;

  if (signal === 'logs') {
    if (url.pathname !== '/log/manage') return unsupportedExecutionPlan(panel, 'unsupported-route');
    const query = logQueryStateFromParams(reader);
    const routeContext = readSignalRouteContext(reader);
    const urls = buildLogUrls(query, routeContext);
    const view = resolveLogWorkbenchView(reader);
    const isGroupPanel = Boolean(query.groupBy?.trim());
    const apiUrls = {
      list: urls.listUrl,
      overview: urls.overviewUrl,
      trend: urls.trendUrl,
      coverage: urls.coverageUrl,
      groupBy: urls.groupByUrl
    };
    return {
      panelId: panel.widget.id,
      signal,
      visualization: panel.widget.visualization,
      state: 'ready',
      sourceRoute: panel.widget.route,
      resolvedRoute: panel.resolvedRoute,
      resolvedQuerySnapshot: panel.resolvedQuerySnapshot,
      view,
      primaryUrl: isGroupPanel ? apiUrls.groupBy : panel.widget.visualization === 'time-series' ? apiUrls.trend : apiUrls.list,
      apiUrls
    };
  }

  if (signal === 'traces') {
    if (url.pathname !== '/trace/manage') return unsupportedExecutionPlan(panel, 'unsupported-route');
    const query = traceQueryStateFromParams(reader);
    const routeContext = readSignalRouteContext(reader);
    const urls = buildTraceUrls(query, routeContext);
    const view = resolveTraceExplorerView(reader);
    const template = url.searchParams.get('template')?.trim() || '';
    const isGroupPanel = Boolean(query.groupBy?.trim() && urls.groupByUrl);
    const apiUrls = {
      list: urls.listUrl,
      overview: urls.overviewUrl,
      ...(urls.groupByUrl ? { groupBy: urls.groupByUrl } : {})
    };
    return {
      panelId: panel.widget.id,
      signal,
      visualization: panel.widget.visualization,
      state: 'ready',
      sourceRoute: panel.widget.route,
      resolvedRoute: panel.resolvedRoute,
      resolvedQuerySnapshot: panel.resolvedQuerySnapshot,
      view,
      primaryUrl: (isGroupPanel || isTraceExceptionTemplate(template)) && apiUrls.groupBy
        ? apiUrls.groupBy
        : panel.widget.visualization === 'time-series' ? apiUrls.overview : apiUrls.list,
      apiUrls
    };
  }

  if (signal === 'metrics') {
    if (!url.pathname.startsWith('/ingestion/otlp/metrics')) return unsupportedExecutionPlan(panel, 'unsupported-route');
    const query = metricsQueryStateFromParams(reader);
    const scopedFilter = buildScopedMetricsFilter(query);
    const apiUrls = query.template === 'service-apdex'
      ? {
          console: buildOtlpMetricsConsoleUrl({
            ...query,
            query: 'http.server.duration.bucket',
            filter: appendMetricsFilterClause(scopedFilter, 'le="0.5"'),
            aggregation: 'sum',
            temporalAggregation: 'rate',
            groupBy: 'service.name'
          }),
          apdexTolerating: buildOtlpMetricsConsoleUrl({
            ...query,
            query: 'http.server.duration.bucket',
            filter: appendMetricsFilterClause(scopedFilter, 'le="2.0"'),
            aggregation: 'sum',
            temporalAggregation: 'rate',
            groupBy: 'service.name'
          }),
          apdexTotal: buildOtlpMetricsConsoleUrl({
            ...query,
            query: 'http.server.duration.count',
            filter: scopedFilter,
            aggregation: 'sum',
            temporalAggregation: 'rate',
            groupBy: 'service.name'
          })
        }
      : query.template === 'service-db-call-duration' || query.template === 'service-external-call-duration'
        ? {
            console: buildOtlpMetricsConsoleUrl({
              ...query,
              query: query.template === 'service-db-call-duration' ? 'signoz_db_latency_sum' : 'signoz_external_call_latency_sum',
              filter: scopedFilter,
              aggregation: 'sum',
              temporalAggregation: 'rate'
            }),
            averageCount: buildOtlpMetricsConsoleUrl({
              ...query,
              query: query.template === 'service-db-call-duration' ? 'signoz_db_latency_count' : 'signoz_external_call_latency_count',
              filter: scopedFilter,
              aggregation: 'sum',
              temporalAggregation: 'rate'
            })
          }
      : {
          console: buildOtlpMetricsConsoleUrl(query)
        };
    return {
      panelId: panel.widget.id,
      signal,
      visualization: panel.widget.visualization,
      state: 'ready',
      sourceRoute: panel.widget.route,
      resolvedRoute: panel.resolvedRoute,
      resolvedQuerySnapshot: panel.resolvedQuerySnapshot,
      view: query.inspector || 'graph',
      primaryUrl: apiUrls.console,
      apiUrls
    };
  }

  if (signal === 'alerts') {
    if (url.pathname !== '/alert') return unsupportedExecutionPlan(panel, 'unsupported-route');
    const query = alertQueryStateFromParams(reader);
    const apiUrls = {
      list: buildAlertListUrl(query),
      summary: '/alerts/summary'
    };
    return {
      panelId: panel.widget.id,
      signal,
      visualization: panel.widget.visualization,
      state: 'ready',
      sourceRoute: panel.widget.route,
      resolvedRoute: panel.resolvedRoute,
      resolvedQuerySnapshot: panel.resolvedQuerySnapshot,
      view: 'list',
      primaryUrl: apiUrls.list,
      apiUrls
    };
  }

  return unsupportedExecutionPlan(panel, 'unsupported-signal');
}

export function buildSignalDashboardExecutionPlans(
  dashboard: SignalDashboard,
  options: ResolveSignalDashboardPreviewOptions = {}
): SignalDashboardPanelExecutionPlan[] {
  return resolveSignalDashboardPreviewPanels(dashboard, options).map(buildSignalDashboardPanelExecutionPlan);
}

function signalDashboardExecutionApiPath(url: string) {
  return url.startsWith('/api') ? url : `/api${url}`;
}

function signalFromRuntimeRow(value: string): SignalDashboardPanelDraftSignal | null {
  return value === 'logs' || value === 'traces' || value === 'metrics' || value === 'alerts' ? value : null;
}

function runtimeEvidenceVisualization(signal: SignalDashboardPanelDraftSignal, route: string): SignalDashboardPanelVisualization {
  const url = parseResolvedPanelUrl(route);
  if (signal === 'alerts') {
    return 'list';
  }
  if (signal === 'logs') {
    return url?.searchParams.get('view') === 'table' ? 'table' : 'list';
  }
  if (signal === 'traces') {
    const view = url?.searchParams.get('view');
    if (view === 'trace') return 'trace';
    if (view === 'time-series') return 'time-series';
    return 'table';
  }
  return url?.searchParams.get('inspector') === 'table' ? 'table' : 'graph';
}

function runtimeEvidencePanelLabel(
  signal: SignalDashboardPanelDraftSignal,
  row: SignalDashboardRuntimeSyncTooltipRow,
  route: string
) {
  const url = parseResolvedPanelUrl(route);
  if (signal === 'metrics') {
    return url?.searchParams.get('query')?.trim() || row.label || row.signal;
  }
  if (signal === 'alerts') {
    return url?.searchParams.get('search')?.trim() || row.label || row.signal;
  }
  return row.label || row.signal;
}

export function createSignalDashboardPanelDraftFromRuntimeEvidence(input: {
  row: SignalDashboardRuntimeSyncTooltipRow;
  route: string;
  titlePrefix: string;
}): SignalDashboardPanelDraft | null {
  const signal = signalFromRuntimeRow(input.row.signal);
  if (!signal || !input.route.trim()) return null;
  const evidenceLabel = runtimeEvidencePanelLabel(signal, input.row, input.route);
  const title = `${input.titlePrefix}: ${evidenceLabel}`.slice(0, 160);
  const description = [
    input.row.source,
    input.row.value,
    input.row.meta
  ].filter(Boolean).join(' · ');
  return createSignalDashboardPanelDraft({
    signal,
    title,
    description,
    visualization: runtimeEvidenceVisualization(signal, input.route),
    route: input.route,
    payload: {
      source: 'signal-dashboard-runtime-evidence',
      sourcePanelId: input.row.panelId,
      evidenceRowKey: input.row.key,
      evidenceSource: input.row.source,
      evidenceLabel,
      evidenceSeriesLabel: input.row.label,
      evidenceValue: input.row.value,
      ...(input.row.traceId ? { traceId: input.row.traceId } : {}),
      ...(input.row.spanId ? { spanId: input.row.spanId } : {}),
      ...(input.row.relatedSignal ? { relatedSignal: input.row.relatedSignal } : {})
    }
  });
}

function normalizeBreakoutAttributeName(value: string) {
  const trimmed = value.trim();
  return /^[A-Za-z0-9_.:-]+$/.test(trimmed) ? trimmed : '';
}

export function createSignalDashboardPanelDraftFromRuntimeBreakout(input: {
  row: SignalDashboardRuntimeSyncTooltipRow;
  route: string;
  attribute: SignalDashboardRuntimeBreakoutAttribute;
  titlePrefix: string;
}): SignalDashboardPanelDraft | null {
  const signal = signalFromRuntimeRow(input.row.signal);
  const attributeName = normalizeBreakoutAttributeName(input.attribute.name);
  if (!signal || !input.route.trim() || !attributeName) return null;
  const url = parseResolvedPanelUrl(input.route);
  if (!url) return null;
  url.searchParams.set('groupBy', attributeName);
  url.searchParams.set('groupLimit', url.searchParams.get('groupLimit') || '8');
  if (signal === 'metrics') {
    url.searchParams.delete('series');
  } else if (signal === 'logs') {
    url.searchParams.delete('traceId');
    url.searchParams.delete('spanId');
    url.searchParams.delete('logTimeUnixNano');
    url.searchParams.set('view', 'list');
  } else if (signal === 'traces') {
    url.searchParams.delete('traceId');
    url.searchParams.delete('spanId');
    url.searchParams.set('view', 'list');
  }
  if (signal === 'metrics' && !url.searchParams.get('inspector')) {
    url.searchParams.set('inspector', 'graph');
  }
  const route = `${url.pathname}${url.search}${url.hash}`;
  const evidenceLabel = runtimeEvidencePanelLabel(signal, input.row, route);
  const attributeValue = input.attribute.value.trim();
  return createSignalDashboardPanelDraft({
    signal,
    title: `${input.titlePrefix}: ${attributeName}`.slice(0, 160),
    description: [
      `breakout by ${attributeName}`,
      attributeValue
    ].filter(Boolean).join(' · '),
    visualization: signal === 'metrics' ? 'graph' : 'list',
    route,
    payload: {
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: input.row.panelId,
      evidenceRowKey: input.row.key,
      evidenceSource: input.row.source,
      evidenceLabel,
      evidenceValue: input.row.value,
      breakoutAttribute: attributeName,
      ...(attributeValue ? { breakoutAttributeValue: attributeValue } : {})
    }
  });
}

export function createSignalDashboardPanelDraftFromFilterSelection(input: {
  variable: SignalDashboardVariable;
  signal: string;
  route: string;
  sourcePanelId?: string;
  titlePrefix: string;
}): SignalDashboardPanelDraft | null {
  const signal = signalFromRuntimeRow(input.signal);
  const variableName = normalizeSignalDashboardVariableName(input.variable.name);
  const variableValue = input.variable.value.trim();
  if (!signal || !input.route.trim() || !variableName || !variableValue) return null;
  return createSignalDashboardPanelDraftsFromFilterSelection(input)[0] || null;
}

function routeWithSearchParam(route: string, key: string, value: string) {
  const url = parseResolvedPanelUrl(route);
  if (!url) return route;
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function routeWithSearchParams(route: string, values: Record<string, string>) {
  const url = parseResolvedPanelUrl(route);
  if (!url) return route;
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

function copyRouteSearchParams(source: URL, target: URL, keys: string[]) {
  keys.forEach(key => {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  });
}

function serviceCompanionRoute(input: {
  sourceRoute: string;
  signal: SignalDashboardPanelDraftSignal;
  serviceName: string;
  visualization: SignalDashboardPanelVisualization;
}) {
  const sourceUrl = parseResolvedPanelUrl(input.sourceRoute);
  const targetUrl = new URL(
    input.signal === 'metrics'
      ? '/ingestion/otlp/metrics'
      : input.signal === 'logs' ? '/log/manage' : input.signal === 'alerts' ? '/alert' : '/trace/manage',
    'http://hertzbeat.local'
  );
  if (sourceUrl) {
    copyRouteSearchParams(sourceUrl, targetUrl, [
      'environment',
      'deployment.environment.name',
      'timeRange',
      'start',
      'end',
      'refresh',
      'live',
      'entityId',
      'entityType',
      'entityName',
      'source',
      'serviceNamespace',
      'collector',
      'template'
    ]);
    if (input.signal === 'metrics') {
      targetUrl.searchParams.set('query', sourceUrl.searchParams.get('query') || 'http.server.duration');
    }
  }
  targetUrl.searchParams.set('serviceName', input.serviceName);
  if (input.signal === 'metrics') {
    if (!targetUrl.searchParams.get('query')) targetUrl.searchParams.set('query', 'http.server.duration');
    targetUrl.searchParams.set('inspector', input.visualization === 'table' ? 'table' : 'graph');
  } else if (input.signal === 'logs') {
    targetUrl.searchParams.set('view', input.visualization === 'table' ? 'table' : 'list');
  } else if (input.signal === 'alerts') {
    targetUrl.searchParams.set('status', 'firing');
    targetUrl.searchParams.set('search', input.serviceName);
  } else {
    targetUrl.searchParams.set('view', input.visualization === 'time-series' ? 'time-series' : 'table');
  }
  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

function serviceMetricRedRoute(input: {
  sourceRoute: string;
  serviceName: string;
  query: string;
  values: Record<string, string>;
}) {
  const route = serviceCompanionRoute({
    sourceRoute: input.sourceRoute,
    signal: 'metrics',
    serviceName: input.serviceName,
    visualization: 'graph'
  });
  return routeWithSearchParams(route, {
    query: input.query,
    filter: serviceMetricFilter({
      sourceRoute: input.sourceRoute,
      serviceName: input.serviceName
    }),
    inspector: 'graph',
    ...input.values
  });
}

function serviceMetricFilter(input: {
  sourceRoute: string;
  serviceName: string;
  clauses?: string[];
}) {
  const serviceNamespace = collectRouteParam(input.sourceRoute, 'serviceNamespace');
  return [
    `service.name="${input.serviceName}"`,
    serviceNamespace ? `service.namespace="${serviceNamespace}"` : '',
    ...(input.clauses || [])
  ].filter(Boolean).join(' and ');
}

function serviceMetricApdexRoute(input: {
  sourceRoute: string;
  serviceName: string;
}) {
  return serviceMetricRedRoute({
    sourceRoute: input.sourceRoute,
    serviceName: input.serviceName,
    query: 'http.server.duration.bucket',
    values: {
      template: 'service-apdex',
      aggregation: 'sum',
      temporalAggregation: 'rate',
      groupBy: 'service.name',
      legendFormat: '{{service.name}} - apdex'
    }
  });
}

function serviceMetricCallDurationRoute(input: {
  sourceRoute: string;
  serviceName: string;
  template: 'service-db-call-duration' | 'service-external-call-duration';
  query: string;
  groupBy: string;
  legendFormat: string;
}) {
  return serviceMetricRedRoute({
    sourceRoute: input.sourceRoute,
    serviceName: input.serviceName,
    query: input.query,
    values: {
      template: input.template,
      aggregation: 'sum',
      temporalAggregation: 'rate',
      groupBy: input.groupBy,
      legendFormat: input.legendFormat
    }
  });
}

function serviceLogErrorsRoute(sourceRoute: string, serviceName: string) {
  const route = serviceCompanionRoute({
    sourceRoute,
    signal: 'logs',
    serviceName,
    visualization: 'table'
  });
  return routeWithSearchParams(route, {
    severityText: 'ERROR',
    view: 'table'
  });
}

function serviceTraceErrorsRoute(sourceRoute: string, serviceName: string) {
  const route = serviceCompanionRoute({
    sourceRoute,
    signal: 'traces',
    serviceName,
    visualization: 'table'
  });
  return routeWithSearchParams(route, {
    errorOnly: 'true',
    view: 'table'
  });
}

function serviceTraceExceptionsRoute(sourceRoute: string, serviceName: string) {
  const route = serviceCompanionRoute({
    sourceRoute,
    signal: 'traces',
    serviceName,
    visualization: 'list'
  });
  return routeWithSearchParams(route, {
    template: 'service-exceptions',
    errorOnly: 'true',
    spanScope: 'all',
    groupBy: 'exception.type',
    groupOrder: 'error-count-desc',
    groupLimit: '8',
    view: 'list'
  });
}

function serviceTraceExceptionMessagesRoute(sourceRoute: string, serviceName: string) {
  const route = serviceCompanionRoute({
    sourceRoute,
    signal: 'traces',
    serviceName,
    visualization: 'list'
  });
  return routeWithSearchParams(route, {
    template: 'service-exception-messages',
    errorOnly: 'true',
    spanScope: 'all',
    groupBy: 'exception.message',
    groupOrder: 'error-count-desc',
    groupLimit: '8',
    view: 'list'
  });
}

function isTraceExceptionTemplate(template: string) {
  return template === 'service-exceptions' || template === 'service-exception-messages';
}

function serviceAlertsRoute(sourceRoute: string, serviceName: string) {
  return routeWithSearchParams(serviceCompanionRoute({
    sourceRoute,
    signal: 'alerts',
    serviceName,
    visualization: 'list'
  }), {
    source: 'dashboard',
    signal: 'alerts'
  });
}

function filterTemplateTitle(titlePrefix: string, suffix: string, filterLabel: string) {
  return `${titlePrefix}${suffix}: ${filterLabel}`.slice(0, 160);
}

export function createSignalDashboardPanelDraftsFromFilterSelection(input: {
  variable: SignalDashboardVariable;
  signal: string;
  route: string;
  sourcePanelId?: string;
  titlePrefix: string;
}): SignalDashboardPanelDraft[] {
  const signal = signalFromRuntimeRow(input.signal);
  const variableName = normalizeSignalDashboardVariableName(input.variable.name);
  const variableValue = input.variable.value.trim();
  if (!signal || !input.route.trim() || !variableName || !variableValue) return [];
  const filterLabel = `${variableName}=${variableValue}`;
  type FilterTemplate = {
    key: string;
    signal: SignalDashboardPanelDraftSignal;
    titleSuffix: string;
    descriptionSuffix?: string;
    visualization: SignalDashboardPanelVisualization;
    route: string;
  };
  const primaryTemplates: FilterTemplate[] = signal === 'metrics'
    ? [
        {
          key: 'metrics-graph',
          signal,
          titleSuffix: '',
          visualization: 'graph',
          route: routeWithSearchParam(input.route, 'inspector', 'graph')
        },
        {
          key: 'metrics-table',
          signal,
          titleSuffix: ' table',
          descriptionSuffix: 'table',
          visualization: 'table',
          route: routeWithSearchParam(input.route, 'inspector', 'table')
        }
      ]
    : signal === 'logs'
      ? [
          {
            key: 'logs-list',
            signal,
            titleSuffix: '',
            visualization: 'list',
            route: routeWithSearchParam(input.route, 'view', 'list')
          },
          {
            key: 'logs-table',
            signal,
            titleSuffix: ' table',
            descriptionSuffix: 'table',
            visualization: 'table',
            route: routeWithSearchParam(input.route, 'view', 'table')
          }
        ]
      : [
          {
            key: 'traces-table',
            signal,
            titleSuffix: '',
            visualization: 'table',
            route: routeWithSearchParam(input.route, 'view', 'table')
          },
          {
            key: 'traces-trend',
            signal,
            titleSuffix: ' trend',
            descriptionSuffix: 'trend',
            visualization: 'time-series',
            route: routeWithSearchParam(input.route, 'view', 'time-series')
          }
        ];
  const isServiceFilter = SERVICE_VARIABLE_NAMES.has(variableName.toLowerCase());
  const serviceMetricTemplates: FilterTemplate[] = isServiceFilter
    ? [
        {
          key: 'metrics-latency-p95',
          signal: 'metrics' as const,
          titleSuffix: ' latency p95',
          descriptionSuffix: 'latency p95',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'http.server.duration',
            values: {
              aggregation: 'p95',
              groupBy: 'route',
              legendFormat: '{{service.name}} - p95',
              formula: 'A * 1000'
            }
          })
        },
        {
          key: 'metrics-request-rate',
          signal: 'metrics' as const,
          titleSuffix: ' request rate',
          descriptionSuffix: 'request rate',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'http_server_duration_milliseconds_count',
            values: {
              aggregation: 'sum',
              temporalAggregation: 'rate',
              groupBy: 'route',
              legendFormat: '{{service.name}} - rps'
            }
          })
        },
        {
          key: 'metrics-error-rate',
          signal: 'metrics' as const,
          titleSuffix: ' error rate',
          descriptionSuffix: 'error rate',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'http_server_duration_milliseconds_count',
            values: {
              filter: serviceMetricFilter({
                sourceRoute: input.route,
                serviceName: variableValue,
                clauses: ['status_code="STATUS_CODE_ERROR"']
              }),
              aggregation: 'sum',
              temporalAggregation: 'rate',
              groupBy: 'status_code',
              legendFormat: '{{service.name}} - errors'
            }
          })
        },
        {
          key: 'metrics-apdex',
          signal: 'metrics' as const,
          titleSuffix: ' apdex',
          descriptionSuffix: 'apdex',
          visualization: 'graph' as const,
          route: serviceMetricApdexRoute({
            sourceRoute: input.route,
            serviceName: variableValue
          })
        },
        {
          key: 'metrics-db-call-rate',
          signal: 'metrics' as const,
          titleSuffix: ' db calls rate',
          descriptionSuffix: 'db calls rate',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'signoz_db_latency_count',
            values: {
              aggregation: 'sum',
              temporalAggregation: 'rate',
              groupBy: 'db.system',
              legendFormat: '{{db.system}} - db rps'
            }
          })
        },
        {
          key: 'metrics-db-call-duration',
          signal: 'metrics' as const,
          titleSuffix: ' db call duration',
          descriptionSuffix: 'db call duration',
          visualization: 'graph' as const,
          route: serviceMetricCallDurationRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            template: 'service-db-call-duration',
            query: 'signoz_db_latency_sum',
            groupBy: 'db.system',
            legendFormat: '{{db.system}} - avg ms'
          })
        },
        {
          key: 'metrics-external-call-rate',
          signal: 'metrics' as const,
          titleSuffix: ' external calls rate',
          descriptionSuffix: 'external calls rate',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'signoz_external_call_latency_count',
            values: {
              aggregation: 'sum',
              temporalAggregation: 'rate',
              groupBy: 'external.service.address',
              legendFormat: '{{external.service.address}} - rps'
            }
          })
        },
        {
          key: 'metrics-external-call-duration',
          signal: 'metrics' as const,
          titleSuffix: ' external call duration',
          descriptionSuffix: 'external call duration',
          visualization: 'graph' as const,
          route: serviceMetricCallDurationRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            template: 'service-external-call-duration',
            query: 'signoz_external_call_latency_sum',
            groupBy: 'external.service.address',
            legendFormat: '{{external.service.address}} - avg ms'
          })
        },
        {
          key: 'metrics-key-operations',
          signal: 'metrics' as const,
          titleSuffix: ' key operations',
          descriptionSuffix: 'key operations',
          visualization: 'graph' as const,
          route: serviceMetricRedRoute({
            sourceRoute: input.route,
            serviceName: variableValue,
            query: 'http.server.duration',
            values: {
              aggregation: 'p95',
              groupBy: 'operation',
              legendFormat: '{{operation}} - p95',
              formula: 'A * 1000',
              limit: '10'
            }
          })
        }
      ]
    : [];
  const companionTemplates: FilterTemplate[] = isServiceFilter
    ? ([
        {
          key: 'logs-list',
          signal: 'logs' as const,
          titleSuffix: ' logs',
          descriptionSuffix: 'logs',
          visualization: 'list' as const,
          route: serviceCompanionRoute({
            sourceRoute: input.route,
            signal: 'logs',
            serviceName: variableValue,
            visualization: 'list'
          })
        },
        {
          key: 'logs-errors',
          signal: 'logs' as const,
          titleSuffix: ' log errors',
          descriptionSuffix: 'log errors',
          visualization: 'table' as const,
          route: serviceLogErrorsRoute(input.route, variableValue)
        },
        {
          key: 'traces-table',
          signal: 'traces' as const,
          titleSuffix: ' traces',
          descriptionSuffix: 'traces',
          visualization: 'table' as const,
          route: serviceCompanionRoute({
            sourceRoute: input.route,
            signal: 'traces',
            serviceName: variableValue,
            visualization: 'table'
          })
        },
        {
          key: 'traces-errors',
          signal: 'traces' as const,
          titleSuffix: ' trace errors',
          descriptionSuffix: 'trace errors',
          visualization: 'table' as const,
          route: serviceTraceErrorsRoute(input.route, variableValue)
        },
        {
          key: 'traces-exceptions',
          signal: 'traces' as const,
          titleSuffix: ' exceptions',
          descriptionSuffix: 'exceptions',
          visualization: 'list' as const,
          route: serviceTraceExceptionsRoute(input.route, variableValue)
        },
        {
          key: 'traces-exception-messages',
          signal: 'traces' as const,
          titleSuffix: ' exception messages',
          descriptionSuffix: 'exception messages',
          visualization: 'list' as const,
          route: serviceTraceExceptionMessagesRoute(input.route, variableValue)
        },
        {
          key: 'alerts-firing',
          signal: 'alerts' as const,
          titleSuffix: ' firing alerts',
          descriptionSuffix: 'firing alerts',
          visualization: 'list' as const,
          route: serviceAlertsRoute(input.route, variableValue)
        }
      ] satisfies FilterTemplate[]).filter(template => template.signal !== signal)
    : [];
  const templates = [...primaryTemplates, ...serviceMetricTemplates, ...companionTemplates];
  const drafts = templates.map(template => createSignalDashboardPanelDraft({
    signal: template.signal,
    title: filterTemplateTitle(input.titlePrefix, template.titleSuffix, filterLabel),
    description: template.descriptionSuffix ? `${filterLabel} · ${template.descriptionSuffix}` : filterLabel,
    visualization: template.visualization,
    route: template.route,
    payload: {
      source: 'signal-dashboard-filter-selection',
      sourcePanelId: input.sourcePanelId,
      variableName,
      variableValue,
      variableType: input.variable.type,
      templateKey: template.key
    }
  }));
  const seenDraftKeys = new Set<string>();
  return drafts.filter(draft => {
    const key = `${draft.signal}:${draft.draftKey}`;
    if (seenDraftKeys.has(key)) return false;
    seenDraftKeys.add(key);
    return true;
  });
}

function serviceOverviewRoute(input: BuildSignalServiceOverviewDashboardInput) {
  const url = new URL('/ingestion/otlp/metrics', 'http://hertzbeat.local');
  url.searchParams.set('query', 'http.server.duration');
  url.searchParams.set('serviceName', input.serviceName);
  [
    ['serviceNamespace', input.serviceNamespace],
    ['environment', input.environment],
    ['entityId', input.entityId],
    ['entityType', input.entityType],
    ['entityName', input.entityName],
    ['source', input.source],
    ['collector', input.collector],
    ['template', input.template],
    ['timeRange', input.timeRange],
    ['start', input.start],
    ['end', input.end],
    ['refresh', input.refresh],
    ['live', input.live]
  ].forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}${url.hash}`;
}

function serviceOverviewVariableType(name: string): SignalDashboardVariableType {
  return name === 'service.name' || name === 'service.namespace' || name === 'deployment.environment.name'
    ? 'query'
    : name.startsWith('hertzbeat.') ? 'dynamic' : 'textbox';
}

function operationDrilldownVariableType(name: string): SignalDashboardVariableType {
  return name === 'operation.name' || name === 'service.name' || name === 'service.namespace' || name === 'deployment.environment.name'
    ? 'query'
    : name.startsWith('hertzbeat.') ? 'dynamic' : 'textbox';
}

function operationMetricRoute(input: {
  sourceRoute: string;
  serviceName: string;
  operationName: string;
  query: string;
  values: Record<string, string>;
}) {
  return serviceMetricRedRoute({
    sourceRoute: input.sourceRoute,
    serviceName: input.serviceName,
    query: input.query,
    values: {
      filter: serviceMetricFilter({
        sourceRoute: input.sourceRoute,
        serviceName: input.serviceName,
        clauses: [`operation="${input.operationName}"`]
      }),
      ...input.values
    }
  });
}

function operationTraceRoute(sourceRoute: string, serviceName: string, operationName: string, values: Record<string, string>) {
  return routeWithSearchParams(serviceCompanionRoute({
    sourceRoute,
    signal: 'traces',
    serviceName,
    visualization: values.view === 'time-series' ? 'time-series' : 'table'
  }), {
    operationName,
    ...values
  });
}

function operationLogRoute(sourceRoute: string, serviceName: string, operationName: string, values: Record<string, string>) {
  return routeWithSearchParams(serviceCompanionRoute({
    sourceRoute,
    signal: 'logs',
    serviceName,
    visualization: values.view === 'table' ? 'table' : 'list'
  }), {
    attributeFilter: `http.route:${operationName}`,
    ...values
  });
}

export function buildSignalServiceOverviewDashboard(input: BuildSignalServiceOverviewDashboardInput): SignalDashboard {
  const serviceName = input.serviceName.trim();
  if (!serviceName) {
    throw new Error('Service overview dashboard requires a service name');
  }
  const serviceLabel = input.entityName?.trim() || serviceName;
  const sourceRoute = serviceOverviewRoute({ ...input, serviceName });
  const drafts = createSignalDashboardPanelDraftsFromFilterSelection({
    variable: {
      name: 'service.name',
      type: 'query',
      value: serviceName,
      options: [serviceName],
      multi: false
    },
    signal: 'metrics',
    route: sourceRoute,
    titlePrefix: 'Service overview'
  });
  const dashboard = buildSignalDashboardCompositionFromDrafts({
    dashboardKey: normalizeSignalDashboardKey(`service-${serviceName}-overview`),
    title: `${serviceLabel} service overview`,
    description: `Service-level RED, Apdex, logs, traces, exceptions, and alerts for ${serviceLabel}.`,
    tags: ['service', 'apm', 'metrics', 'logs', 'traces', 'alerts'],
    drafts
  });
  return updateSignalDashboardVariables(
    dashboard,
    parseSignalDashboardVariables(dashboard).map(variable => ({
      ...variable,
      type: serviceOverviewVariableType(variable.name),
      options: variable.value ? [variable.value] : variable.options
    }))
  );
}

export function buildSignalOperationDrilldownDashboard(input: BuildSignalOperationDrilldownDashboardInput): SignalDashboard {
  const serviceName = input.serviceName.trim();
  const operationName = input.operationName.trim();
  if (!serviceName || !operationName) {
    throw new Error('Operation drilldown dashboard requires a service name and operation name');
  }
  const serviceLabel = input.entityName?.trim() || serviceName;
  const sourceRoute = routeWithSearchParams(serviceOverviewRoute({ ...input, serviceName }), {
    operationName
  });
  const filterLabel = `operation.name=${operationName}`;
  const drafts = [
    createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: `Operation drilldown latency p95: ${filterLabel}`,
      description: `${filterLabel} · latency p95`,
      visualization: 'graph',
      route: operationMetricRoute({
        sourceRoute,
        serviceName,
        operationName,
        query: 'http.server.duration',
        values: {
          aggregation: 'p95',
          groupBy: 'operation',
          legendFormat: '{{operation}} - p95',
          formula: 'A * 1000'
        }
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-latency-p95',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: `Operation drilldown request rate: ${filterLabel}`,
      description: `${filterLabel} · request rate`,
      visualization: 'graph',
      route: operationMetricRoute({
        sourceRoute,
        serviceName,
        operationName,
        query: 'http_server_duration_milliseconds_count',
        values: {
          aggregation: 'sum',
          temporalAggregation: 'rate',
          groupBy: 'operation',
          legendFormat: '{{operation}} - rps'
        }
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-request-rate',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: `Operation drilldown error rate: ${filterLabel}`,
      description: `${filterLabel} · error rate`,
      visualization: 'graph',
      route: operationMetricRoute({
        sourceRoute,
        serviceName,
        operationName,
        query: 'http_server_duration_milliseconds_count',
        values: {
          filter: serviceMetricFilter({
            sourceRoute,
            serviceName,
            clauses: [`operation="${operationName}"`, 'status_code="STATUS_CODE_ERROR"']
          }),
          aggregation: 'sum',
          temporalAggregation: 'rate',
          groupBy: 'status_code',
          legendFormat: '{{operation}} - errors'
        }
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-error-rate',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'logs',
      title: `Operation drilldown logs: ${filterLabel}`,
      description: `${filterLabel} · logs`,
      visualization: 'list',
      route: operationLogRoute(sourceRoute, serviceName, operationName, {
        view: 'list'
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-logs',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'logs',
      title: `Operation drilldown log errors: ${filterLabel}`,
      description: `${filterLabel} · log errors`,
      visualization: 'table',
      route: operationLogRoute(sourceRoute, serviceName, operationName, {
        severityText: 'ERROR',
        view: 'table'
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-log-errors',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'traces',
      title: `Operation drilldown traces: ${filterLabel}`,
      description: `${filterLabel} · traces`,
      visualization: 'table',
      route: operationTraceRoute(sourceRoute, serviceName, operationName, {
        view: 'table'
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-traces',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'traces',
      title: `Operation drilldown trace errors: ${filterLabel}`,
      description: `${filterLabel} · trace errors`,
      visualization: 'table',
      route: operationTraceRoute(sourceRoute, serviceName, operationName, {
        errorOnly: 'true',
        view: 'table'
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-trace-errors',
        serviceName,
        operationName
      }
    }),
    createSignalDashboardPanelDraft({
      signal: 'traces',
      title: `Operation drilldown exceptions: ${filterLabel}`,
      description: `${filterLabel} · exceptions`,
      visualization: 'list',
      route: operationTraceRoute(sourceRoute, serviceName, operationName, {
        template: 'service-exceptions',
        errorOnly: 'true',
        spanScope: 'all',
        groupBy: 'exception.type',
        groupOrder: 'error-count-desc',
        groupLimit: '8',
        view: 'list'
      }),
      payload: {
        source: 'signal-dashboard-operation-drilldown',
        templateKey: 'operation-exceptions',
        serviceName,
        operationName
      }
    })
  ];
  const dashboard = buildSignalDashboardCompositionFromDrafts({
    dashboardKey: normalizeSignalDashboardKey(`service-${serviceName}-operation-${operationName}-drilldown`),
    title: `${serviceLabel} ${operationName} operation drilldown`,
    description: `Operation-level RED, logs, traces, and exceptions for ${operationName} in ${serviceLabel}.`,
    tags: ['service', 'operation', 'apm', 'metrics', 'logs', 'traces'],
    drafts
  });
  return updateSignalDashboardVariables(
    dashboard,
    parseSignalDashboardVariables(dashboard).map(variable => ({
      ...variable,
      type: operationDrilldownVariableType(variable.name),
      options: variable.value ? [variable.value] : variable.options
    }))
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Signal dashboard panel execution failed';
}

function numericValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numericLikeValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function textValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function firstTextValue(...values: unknown[]) {
  return values.map(textValue).find(value => value != null);
}

function boundedCopy(value: unknown, fallback = '-', maxLength = 120) {
  const text = textValue(value);
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function epochMillisValue(value: unknown): number | undefined {
  const numeric = numericLikeValue(value);
  if (numeric != null) {
    if (numeric > 1_000_000_000_000_000) return numeric / 1_000_000;
    return numeric;
  }
  const text = textValue(value);
  if (!text) return undefined;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function percentValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function summarizePageResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (!Array.isArray(data.content)) return null;
  const itemCount = data.content.length;
  const totalCount = numericValue(data.totalElements) ?? itemCount;
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: totalCount > 0 || itemCount > 0 ? 'page' : 'empty',
    itemCount,
    totalCount
  };
}

function summarizeTrendResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (!isRecord(data.hourlyStats)) return null;
  const values = Object.values(data.hourlyStats).map(numericValue).filter((value): value is number => value != null);
  const totalCount = values.reduce((sum, value) => sum + value, 0);
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: values.length > 0 ? 'time-series' : 'empty',
    itemCount: values.length,
    totalCount,
    sampleCount: values.length
  };
}

function summarizeOverviewResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  const totalCount = numericValue(data.totalLogs) ?? numericValue(data.totalTraceCount);
  if (totalCount == null) return null;
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: totalCount > 0 ? 'overview' : 'empty',
    itemCount: totalCount,
    totalCount,
    latestObservedAt: typeof data.latestObservedAt === 'string' || typeof data.latestObservedAt === 'number' ? data.latestObservedAt : null
  };
}

function summarizeMetricsConsoleResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (!isRecord(data.results) && !isRecord(data.stats)) return null;
  const frames = isRecord(data.results) && Array.isArray(data.results.frames) ? data.results.frames : [];
  const sampleCount = frames.reduce((sum, frame) => {
    return sum + (isRecord(frame) && Array.isArray(frame.data) ? frame.data.length : 0);
  }, 0);
  const stats = isRecord(data.stats) ? data.stats : {};
  const seriesCount = numericValue(stats.nonEmptySeries) ?? frames.length;
  const totalCount = numericValue(stats.totalSeries) ?? frames.length;
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: totalCount > 0 || seriesCount > 0 || sampleCount > 0 ? 'metrics-console' : 'empty',
    itemCount: frames.length,
    totalCount,
    seriesCount,
    sampleCount,
    latestObservedAt: typeof stats.latestObservedAt === 'string' || typeof stats.latestObservedAt === 'number' ? stats.latestObservedAt : null
  };
}

function readAlertGroupsData(data: Record<string, unknown>): Record<string, unknown> {
  return isRecord(data.groups) ? data.groups : data;
}

function readAlertSummaryData(data: Record<string, unknown>): Record<string, unknown> {
  return isRecord(data.summary) ? data.summary : {};
}

function buildAlertRelatedHandoff(plan: SignalDashboardPanelExecutionPlan, values: {
  search?: unknown;
  status?: unknown;
  severity?: unknown;
  serviceName?: unknown;
  serviceNamespace?: unknown;
}) {
  const sourceUrl = parseResolvedPanelUrl(plan.resolvedRoute) || parseResolvedPanelUrl(plan.sourceRoute);
  const target = new URL('/alert', 'http://hertzbeat.local');
  if (sourceUrl) {
    copyRouteSearchParams(sourceUrl, target, [
      'search',
      'status',
      'severity',
      'serviceName',
      'serviceNamespace',
      'environment',
      'timeRange',
      'start',
      'end',
      'refresh',
      'live',
      'tz',
      'source',
      'signal',
      'entityId',
      'entityType',
      'entityName',
      'returnTo',
      'monitorId',
      'monitorName',
      'monitorApp',
      'monitorInstance',
      'traceId',
      'spanId',
      'collector',
      'template',
      'viewMode',
      'sourceKind',
      'edgeId'
    ]);
  }
  const search = textValue(values.search);
  const status = textValue(values.status);
  const severity = textValue(values.severity);
  const serviceName = textValue(values.serviceName);
  const serviceNamespace = textValue(values.serviceNamespace);
  if (search) target.searchParams.set('search', search);
  if (status) target.searchParams.set('status', status.toLowerCase());
  if (severity) target.searchParams.set('severity', severity.toLowerCase());
  if (serviceName) target.searchParams.set('serviceName', serviceName);
  if (serviceNamespace) target.searchParams.set('serviceNamespace', serviceNamespace);
  const queryString = target.searchParams.toString();
  return queryString ? `${target.pathname}?${queryString}` : target.pathname;
}

function summarizeAlertPanelResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (plan.signal !== 'alerts') return null;
  const groups = readAlertGroupsData(data);
  if (!Array.isArray(groups.content)) return null;
  const itemCount = groups.content.length;
  const totalCount = numericValue(groups.totalElements) ?? numericValue(readAlertSummaryData(data).total) ?? itemCount;
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: totalCount > 0 || itemCount > 0 ? 'object' : 'empty',
    itemCount,
    totalCount
  };
}

function summarizeTraceGroupResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (plan.signal !== 'traces' || !Array.isArray(data.groups)) return null;
  const itemCount = data.groups.length;
  const totalCount = data.groups.reduce((sum, item) => {
    const row = isRecord(item) ? item : {};
    return sum + (numericValue(row.traceCount) ?? numericValue(row.errorTraceCount) ?? numericValue(row.count) ?? 0);
  }, 0);
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: itemCount > 0 ? 'object' : 'empty',
    itemCount,
    totalCount
  };
}

function summarizeLogGroupResult(plan: SignalDashboardPanelExecutionPlan, result: SignalDashboardPanelExecutionResult, data: Record<string, unknown>): SignalDashboardPanelRuntimeSummary | null {
  if (plan.signal !== 'logs' || !Array.isArray(data.groups)) return null;
  const itemCount = data.groups.length;
  const totalCount = data.groups.reduce((sum, item) => {
    const row = isRecord(item) ? item : {};
    return sum + (numericValue(row.logCount) ?? numericValue(row.count) ?? numericValue(row.total) ?? 0);
  }, 0);
  return {
    panelId: result.panelId,
    state: 'ready',
    signal: plan.signal,
    visualization: plan.visualization,
    kind: itemCount > 0 ? 'object' : 'empty',
    itemCount,
    totalCount
  };
}

export function summarizeSignalDashboardPanelRuntime(
  plan: SignalDashboardPanelExecutionPlan,
  result: SignalDashboardPanelExecutionResult | undefined
): SignalDashboardPanelRuntimeSummary {
  if (!result || result.state === 'loading') {
    return {
      panelId: plan.panelId,
      state: 'loading',
      signal: plan.signal,
      visualization: plan.visualization,
      kind: 'loading',
      itemCount: 0
    };
  }
  if (result.state === 'unsupported' || plan.state !== 'ready') {
    return {
      panelId: plan.panelId,
      state: 'unsupported',
      signal: plan.signal,
      visualization: plan.visualization,
      kind: 'unsupported',
      itemCount: 0,
      errorMessage: result.errorMessage || plan.unsupportedReason || 'unsupported-panel'
    };
  }
  if (result.state === 'error') {
    return {
      panelId: plan.panelId,
      state: 'error',
      signal: plan.signal,
      visualization: plan.visualization,
      kind: 'error',
      itemCount: 0,
      errorMessage: result.errorMessage
    };
  }
  if (!isRecord(result.data)) {
    return {
      panelId: plan.panelId,
      state: 'ready',
      signal: plan.signal,
      visualization: plan.visualization,
      kind: 'empty',
      itemCount: 0,
      totalCount: 0
    };
  }
  return (
    summarizeAlertPanelResult(plan, result, result.data) ||
    summarizeLogGroupResult(plan, result, result.data) ||
    summarizeTraceGroupResult(plan, result, result.data) ||
    summarizePageResult(plan, result, result.data) ||
    summarizeTrendResult(plan, result, result.data) ||
    summarizeOverviewResult(plan, result, result.data) ||
    summarizeMetricsConsoleResult(plan, result, result.data) ||
    {
      panelId: plan.panelId,
      state: 'ready',
      signal: plan.signal,
      visualization: plan.visualization,
      kind: 'object',
      itemCount: 0
    }
  );
}

function buildPagePreviewRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewRow[] {
  const pageData = plan.signal === 'alerts' ? readAlertGroupsData(data) : data;
  const content = Array.isArray(pageData.content) ? pageData.content : [];
  return content.slice(0, 3).map((item, index) => {
    const row = isRecord(item) ? item : {};
    if (plan.signal === 'alerts') {
      const labels = isRecord(row.commonLabels)
        ? row.commonLabels
        : isRecord(row.groupLabels) ? row.groupLabels : isRecord(row.labels) ? row.labels : {};
      const annotations = isRecord(row.commonAnnotations) ? row.commonAnnotations : isRecord(row.annotations) ? row.annotations : {};
      const title = firstTextValue(annotations.summary, row.content, labels.alertname, row.groupKey, row.id, `alert-${index + 1}`);
      const service = firstTextValue(labels['service.name'], labels.service, labels.job, labels.instance, row.serviceName, row.monitorName);
      const serviceNamespace = firstTextValue(labels['service.namespace'], labels.serviceNamespace, labels.service_namespace, row.serviceNamespace);
      const status = firstTextValue(row.status, 'firing');
      const severity = firstTextValue(labels.severity, labels.priority, row.severity, row.priority);
      const search = firstTextValue(row.groupKey, labels.alertname, title);
      const copy = [service, firstTextValue(row.status, 'firing')].filter(Boolean).join(' · ');
      const meta = firstTextValue(labels.severity, labels.priority, row.severity, row.priority, row.gmtUpdate, row.gmtCreate);
      return {
        key: `${plan.panelId}:row:${index}`,
        title: boundedCopy(title),
        copy: boundedCopy(copy || firstTextValue(row.groupKey, row.id)),
        meta: boundedCopy(meta, ''),
        relatedSignal: 'alerts' as const,
        relatedHandoffHref: buildAlertRelatedHandoff(plan, { search, status, severity, serviceName: service, serviceNamespace })
      };
    }
    const resource = isRecord(row.resource) ? row.resource : {};
    const title = plan.signal === 'traces'
      ? firstTextValue(row.rootSpanName, row.name, row.traceId, `row-${index + 1}`)
      : firstTextValue(row.severityText, resource['service.name'], row.serviceName, `row-${index + 1}`);
    const copy = plan.signal === 'traces'
      ? firstTextValue(row.serviceName, row.status, row.rootSpanId, row.traceId)
      : firstTextValue(row.body, row.message, row.traceId, row.spanId);
    const meta = plan.signal === 'traces'
      ? firstTextValue(row.durationNanos, row.startTime, row.status)
      : firstTextValue(row.traceId, row.spanId, row.timeUnixNano);
    return {
      key: `${plan.panelId}:row:${index}`,
      title: boundedCopy(title),
      copy: boundedCopy(copy),
      meta: boundedCopy(meta, '')
    };
  });
}

function buildAlertPanelPreviewRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewRow[] {
  const summary = readAlertSummaryData(data);
  const rows: SignalDashboardPanelRuntimePreviewRow[] = [];
  const total = numericValue(summary.total);
  const warning = numericValue(summary.priorityWarningNum);
  const critical = numericValue(summary.priorityCriticalNum);
  const emergency = numericValue(summary.priorityEmergencyNum);
  if (total != null) {
    rows.push({
      key: `${plan.panelId}:summary:total`,
      title: 'firing groups',
      copy: String(total),
      meta: 'alerts',
      relatedSignal: 'alerts',
      relatedHandoffHref: buildAlertRelatedHandoff(plan, { status: 'firing' })
    });
  }
  if (critical != null || emergency != null) {
    rows.push({
      key: `${plan.panelId}:summary:critical`,
      title: 'critical',
      copy: String((critical ?? 0) + (emergency ?? 0)),
      meta: emergency != null ? `emergency ${emergency}` : '',
      relatedSignal: 'alerts',
      relatedHandoffHref: buildAlertRelatedHandoff(plan, { status: 'firing', severity: 'critical' })
    });
  }
  if (warning != null) {
    rows.push({
      key: `${plan.panelId}:summary:warning`,
      title: 'warning',
      copy: String(warning),
      meta: '',
      relatedSignal: 'alerts',
      relatedHandoffHref: buildAlertRelatedHandoff(plan, { status: 'firing', severity: 'warning' })
    });
  }
  return [...rows, ...buildPagePreviewRows(plan, data)].slice(0, 6);
}

function isSafeTraceResourceFilterKey(key: string) {
  return /^[A-Za-z0-9_.:-]+$/.test(key.trim());
}

function isSafeTraceResourceFilterValue(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed && trimmed !== '-' && !trimmed.includes(',') && !/\s+and\s+/i.test(trimmed));
}

function mergeTraceResourceFilterExpression(existing: string | null, expression: string) {
  const current = existing?.trim();
  if (!current) return expression;
  if (current.split(/\s+and\s+/i).map(part => part.trim()).includes(expression)) return current;
  return `${current} and ${expression}`;
}

function buildTraceGroupResourceExpression(groupBy: string, value: string) {
  const normalizedGroupBy = groupBy.trim();
  const normalizedValue = value.trim();
  if (!isSafeTraceResourceFilterValue(normalizedValue)) return null;
  if (normalizedGroupBy === 'service.name' || normalizedGroupBy === 'service_name') {
    return { kind: 'service' as const, value: normalizedValue };
  }
  if (normalizedGroupBy === 'operation' || normalizedGroupBy === 'operation.name' || normalizedGroupBy === 'span.name') {
    return { kind: 'operation' as const, value: normalizedValue };
  }
  if (normalizedGroupBy === 'status') {
    return { kind: 'status' as const, errorOnly: normalizedValue.toUpperCase().includes('ERROR') };
  }
  if (normalizedGroupBy.startsWith('resource:')) {
    const key = normalizedGroupBy.slice('resource:'.length);
    if (!isSafeTraceResourceFilterKey(key)) return null;
    return { kind: 'resource' as const, expression: `${key}=${normalizedValue}` };
  }
  if (!isSafeTraceResourceFilterKey(normalizedGroupBy)) return null;
  return { kind: 'resource' as const, expression: `${normalizedGroupBy}=${normalizedValue}` };
}

function buildTraceGroupRelatedHandoff(plan: SignalDashboardPanelExecutionPlan, groupBy: string, value: string) {
  const sourceUrl = parseResolvedPanelUrl(plan.resolvedRoute) || parseResolvedPanelUrl(plan.sourceRoute);
  if (!sourceUrl) return undefined;
  const filter = buildTraceGroupResourceExpression(groupBy, value);
  if (!filter) return undefined;
  const target = new URL('/trace/manage', 'http://hertzbeat.local');
  copyRouteSearchParams(sourceUrl, target, [
    'serviceName',
    'resourceFilter',
    'operationName',
    'minDurationMs',
    'maxDurationMs',
    'errorOnly',
    'spanScope',
    'environment',
    'deployment.environment.name',
    'timeRange',
    'start',
    'end',
    'refresh',
    'live',
    'entityId',
    'entityType',
    'entityName',
    'serviceNamespace',
    'source',
    'collector',
    'template'
  ]);
  target.searchParams.set('view', 'list');
  if (filter.kind === 'service') {
    target.searchParams.set('serviceName', filter.value);
  } else if (filter.kind === 'operation') {
    target.searchParams.set('operationName', filter.value);
  } else if (filter.kind === 'status') {
    target.searchParams.set('errorOnly', String(filter.errorOnly));
  } else {
    target.searchParams.set(
      'resourceFilter',
      mergeTraceResourceFilterExpression(target.searchParams.get('resourceFilter'), filter.expression)
    );
  }
  return `${target.pathname}${target.search}`;
}

function buildTraceGroupPreviewRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewRow[] {
  const groupBy = firstTextValue(data.groupBy, 'group') || 'group';
  const groups = Array.isArray(data.groups) ? data.groups : [];
  return groups.slice(0, 6).map((item, index) => {
    const row = isRecord(item) ? item : {};
    const title = boundedCopy(firstTextValue(row.value, row.key, row.groupValue, row.group, row.name, `group-${index + 1}`), `group-${index + 1}`);
    const traceCount = numericValue(row.traceCount) ?? numericValue(row.trace_count) ?? numericValue(row.count);
    const errorCount = numericValue(row.errorTraceCount) ?? numericValue(row.error_trace_count) ?? numericValue(row.errorCount);
    const latencyP95 = numericValue(row.latencyP95Ms) ?? numericValue(row.latency_p95_ms) ?? numericValue(row.latencyP95) ?? numericValue(row.p95);
    const latencyAvg = numericValue(row.latencyAvgMs) ?? numericValue(row.latency_avg_ms) ?? numericValue(row.latencyAvg) ?? numericValue(row.avg);
    const countCopy = [
      traceCount != null ? `${traceCount} traces` : '',
      errorCount != null ? `${errorCount} errors` : ''
    ].filter(Boolean).join(' · ');
    const relatedHandoffHref = buildTraceGroupRelatedHandoff(plan, groupBy, title);
    return {
      key: `${plan.panelId}:group:${index}`,
      title,
      copy: boundedCopy(countCopy || firstTextValue(row.count, row.traceCount, row.errorTraceCount), '-'),
      meta: boundedCopy(latencyP95 != null ? `${groupBy} · p95 ${latencyP95}ms` : latencyAvg != null ? `${groupBy} · avg ${latencyAvg}ms` : groupBy),
      ...(relatedHandoffHref ? { relatedSignal: 'traces' as const, relatedHandoffHref } : {})
    };
  });
}

function buildLogGroupRelatedHandoff(plan: SignalDashboardPanelExecutionPlan, groupBy: string, value: string) {
  const sourceUrl = parseResolvedPanelUrl(plan.resolvedRoute) || parseResolvedPanelUrl(plan.sourceRoute);
  if (!sourceUrl) return undefined;
  const normalizedGroupBy = groupBy.trim();
  const normalizedValue = value.trim();
  if (!normalizeBreakoutAttributeName(normalizedGroupBy) || !isSafeTraceResourceFilterValue(normalizedValue)) return undefined;
  const target = new URL('/log/manage', 'http://hertzbeat.local');
  copyRouteSearchParams(sourceUrl, target, [
    'search',
    'traceId',
    'spanId',
    'severityNumber',
    'severityText',
    'resourceFilter',
    'attributeFilter',
    'serviceName',
    'serviceNamespace',
    'environment',
    'timeRange',
    'start',
    'end',
    'refresh',
    'live',
    'entityId',
    'entityType',
    'entityName',
    'source',
    'collector',
    'template'
  ]);
  target.searchParams.set('view', 'list');
  if (normalizedGroupBy.startsWith('attribute:')) {
    target.searchParams.set(
      'attributeFilter',
      mergeTraceResourceFilterExpression(
        target.searchParams.get('attributeFilter'),
        `${normalizedGroupBy.slice('attribute:'.length)}:${normalizedValue}`
      )
    );
  } else {
    const key = normalizedGroupBy.startsWith('resource:') ? normalizedGroupBy.slice('resource:'.length) : normalizedGroupBy;
    target.searchParams.set('resourceFilter', mergeTraceResourceFilterExpression(target.searchParams.get('resourceFilter'), `${key}=${normalizedValue}`));
  }
  return `${target.pathname}${target.search}`;
}

function buildLogGroupPreviewRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewRow[] {
  const groupBy = firstTextValue(data.groupBy, 'group') || 'group';
  const groups = Array.isArray(data.groups) ? data.groups : [];
  return groups.slice(0, 6).map((item, index) => {
    const row = isRecord(item) ? item : {};
    const title = boundedCopy(firstTextValue(row.value, row.key, row.groupValue, row.group, row.name, `group-${index + 1}`), `group-${index + 1}`);
    const logCount = numericValue(row.logCount) ?? numericValue(row.count) ?? numericValue(row.total);
    const errorCount = numericValue(row.errorCount) ?? numericValue(row.errorLogs);
    const relatedHandoffHref = buildLogGroupRelatedHandoff(plan, groupBy, title);
    return {
      key: `${plan.panelId}:group:${index}`,
      title,
      copy: boundedCopy([
        logCount != null ? `${logCount} logs` : '',
        errorCount != null ? `${errorCount} errors` : ''
      ].filter(Boolean).join(' · ') || firstTextValue(row.count, row.logCount), '-'),
      meta: boundedCopy(groupBy),
      ...(relatedHandoffHref ? { relatedSignal: 'logs' as const, relatedHandoffHref } : {})
    };
  });
}

function sourceBreakoutAttributes(source: Record<string, unknown>, prefix: 'resource' | 'attribute'): SignalDashboardRuntimeBreakoutAttribute[] {
  return Object.entries(source).flatMap(([key, rawValue]) => {
    const attributeKey = normalizeBreakoutAttributeName(key);
    const value = syncTooltipIdentifier(textValue(rawValue));
    if (!attributeKey || !value) return [];
    const name = `${prefix}:${attributeKey}`;
    return [{
      key: `${name}:${value}`,
      name,
      value
    }];
  });
}

function prioritizedBreakoutAttributes(attributes: SignalDashboardRuntimeBreakoutAttribute[]) {
  const priority = new Map([
    ['resource:service.name', 0],
    ['resource:deployment.environment.name', 1],
    ['resource:service.namespace', 2],
    ['resource:service.version', 3],
    ['resource:hertzbeat.entity_id', 4],
    ['resource:hertzbeat.entity_type', 5],
    ['resource:hertzbeat.entity_name', 6],
    ['resource:hertzbeat.source', 7],
    ['resource:hertzbeat.collector', 8],
    ['resource:hertzbeat.template', 9],
    ['attribute:http.route', 10],
    ['attribute:exception.type', 11],
    ['attribute:exception.message', 12]
  ]);
  const seen = new Set<string>();
  return attributes
    .filter(attribute => {
      const uniqueKey = `${attribute.name}:${attribute.value}`;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    })
    .sort((left, right) => (priority.get(left.name) ?? 100) - (priority.get(right.name) ?? 100) || left.name.localeCompare(right.name))
    .slice(0, 10);
}

function logRowBreakoutAttributes(row: Record<string, unknown>) {
  const resource = isRecord(row.resource) ? row.resource : isRecord(row.resourceAttributes) ? row.resourceAttributes : {};
  const attributes = isRecord(row.attributes) ? row.attributes : isRecord(row.logAttributes) ? row.logAttributes : {};
  return prioritizedBreakoutAttributes([
    ...sourceBreakoutAttributes(resource, 'resource'),
    ...sourceBreakoutAttributes(attributes, 'attribute'),
    ...(!textValue(resource['service.name']) && textValue(row.serviceName)
      ? [{ key: `resource:service.name:${textValue(row.serviceName)}`, name: 'resource:service.name', value: String(textValue(row.serviceName)) }]
      : [])
  ]);
}

function traceRowBreakoutAttributes(row: Record<string, unknown>) {
  const resource = isRecord(row.resourceAttributes)
    ? row.resourceAttributes
    : isRecord(row.resource) ? row.resource : {};
  const attributes = isRecord(row.attributes)
    ? row.attributes
    : isRecord(row.spanAttributes) ? row.spanAttributes : {};
  return prioritizedBreakoutAttributes([
    ...sourceBreakoutAttributes(resource, 'resource'),
    ...sourceBreakoutAttributes(attributes, 'attribute'),
    ...(!textValue(resource['service.name']) && textValue(row.serviceName)
      ? [{ key: `resource:service.name:${textValue(row.serviceName)}`, name: 'resource:service.name', value: String(textValue(row.serviceName)) }]
      : [])
  ]);
}

function buildPageTableRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimeTableRow[] {
  const content = Array.isArray(data.content) ? data.content : [];
  if (plan.signal !== 'logs' && plan.signal !== 'traces') return [];
  return content.slice(0, 6).map((item, index) => {
    const row = isRecord(item) ? item : {};
    const resource = isRecord(row.resource) ? row.resource : isRecord(row.resourceAttributes) ? row.resourceAttributes : {};
    if (plan.signal === 'traces') {
      return {
        key: `${plan.panelId}:table:${index}`,
        observedAt: boundedCopy(firstTextValue(row.startTime, row.startTimeUnixNano, row.timeUnixNano), '-'),
        service: boundedCopy(firstTextValue(row.serviceName, resource['service.name']), '-'),
        serviceNamespace: boundedCopy(firstTextValue(row.serviceNamespace, resource['service.namespace']), '', 80) || undefined,
        status: boundedCopy(firstTextValue(row.status, row.statusCode, row.error), '-'),
        name: boundedCopy(firstTextValue(row.rootSpanName, row.name, row.traceId), '-'),
        message: boundedCopy(firstTextValue(row.rootSpanId, row.spanId, row.traceId), '-'),
        traceId: boundedCopy(row.traceId, '-'),
        spanId: boundedCopy(firstTextValue(row.rootSpanId, row.spanId), '-'),
        duration: boundedCopy(firstTextValue(row.durationNanos, row.durationMs, row.duration), '-'),
        breakoutAttributes: traceRowBreakoutAttributes(row)
      };
    }
    return {
      key: `${plan.panelId}:table:${index}`,
      observedAt: boundedCopy(firstTextValue(row.timeUnixNano, row.observedTimeUnixNano, row.timestamp, row.time), '-'),
      service: boundedCopy(firstTextValue(resource['service.name'], row.serviceName), '-'),
      serviceNamespace: boundedCopy(firstTextValue(resource['service.namespace'], row.serviceNamespace), '', 80) || undefined,
      status: boundedCopy(firstTextValue(row.severityText, row.severityNumber, row.status), '-'),
      name: boundedCopy(firstTextValue(row.severityText, resource['service.name'], row.serviceName), '-'),
      message: boundedCopy(firstTextValue(row.body, row.message), '-'),
      traceId: boundedCopy(row.traceId, '-'),
      spanId: boundedCopy(row.spanId, '-'),
      duration: '-',
      breakoutAttributes: logRowBreakoutAttributes(row)
    };
  });
}

function readTraceSpanArray(data: Record<string, unknown>): unknown[] {
  if (Array.isArray(data.spans)) return data.spans;
  if (isRecord(data.trace) && Array.isArray(data.trace.spans)) return data.trace.spans;
  if (isRecord(data.detail) && Array.isArray(data.detail.spans)) return data.detail.spans;
  return [];
}

function buildTraceSpanDepths(spans: Record<string, unknown>[]) {
  const bySpanId = new Map<string, Record<string, unknown>>();
  spans.forEach(span => {
    const spanId = textValue(span.spanId);
    if (spanId) bySpanId.set(spanId, span);
  });
  const depths = new Map<string, number>();
  const depthOf = (span: Record<string, unknown>, stack = new Set<string>()): number => {
    const spanId = textValue(span.spanId) || '';
    if (!spanId) return 0;
    const existing = depths.get(spanId);
    if (existing != null) return existing;
    const parentSpanId = textValue(span.parentSpanId);
    if (!parentSpanId || stack.has(parentSpanId)) {
      depths.set(spanId, 0);
      return 0;
    }
    const parent = bySpanId.get(parentSpanId);
    if (!parent) {
      depths.set(spanId, 0);
      return 0;
    }
    stack.add(spanId);
    const depth = depthOf(parent, stack) + 1;
    stack.delete(spanId);
    depths.set(spanId, depth);
    return depth;
  };
  spans.forEach(span => depthOf(span));
  return depths;
}

function buildTraceWaterfallRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimeTraceWaterfallRow[] {
  if (plan.signal !== 'traces') return [];
  const rawSpans = readTraceSpanArray(data);
  const spans = rawSpans.map(item => isRecord(item) ? item : null).filter((item): item is Record<string, unknown> => item != null);
  if (spans.length > 0) {
    const traceStartCandidates = [
      epochMillisValue(data.startTime),
      isRecord(data.trace) ? epochMillisValue(data.trace.startTime) : undefined,
      isRecord(data.detail) ? epochMillisValue(data.detail.startTime) : undefined,
      ...spans.map(span => epochMillisValue(span.startTime))
    ].filter((value): value is number => value != null);
    const traceStartMs = traceStartCandidates.length > 0 ? Math.min(...traceStartCandidates) : 0;
    const spanWindows = spans.map(span => {
      const spanStartMs = epochMillisValue(span.startTime) ?? traceStartMs;
      const durationNanos = Math.max(numericLikeValue(span.durationNanos) ?? numericLikeValue(span.duration) ?? 0, 0);
      const durationMs = Math.max(durationNanos / 1_000_000, 0.5);
      return { span, spanStartMs, durationNanos, durationMs };
    });
    const totalDurationMs = Math.max(
      numericLikeValue(data.durationNanos) != null ? Number(numericLikeValue(data.durationNanos)) / 1_000_000 : 0,
      ...spanWindows.map(window => Math.max(window.spanStartMs - traceStartMs, 0) + window.durationMs),
      1
    );
    const depths = buildTraceSpanDepths(spans);
    return spanWindows.slice(0, 8).map((window, index) => {
      const spanId = boundedCopy(window.span.spanId, `span-${index + 1}`, 80);
      const parentSpanId = boundedCopy(window.span.parentSpanId, '', 80);
      const offsetMs = Math.max(window.spanStartMs - traceStartMs, 0);
      const leftPct = percentValue((offsetMs / totalDurationMs) * 100);
      const widthPct = Math.max(1, Math.min(100 - leftPct, percentValue((window.durationMs / totalDurationMs) * 100)));
      const status = boundedCopy(firstTextValue(window.span.status, window.span.statusCode), 'UNSET', 40);
      return {
        key: `${plan.panelId}:waterfall:${spanId}`,
        traceId: boundedCopy(firstTextValue(window.span.traceId, data.traceId), '-', 80),
        spanId,
        parentSpanId,
        service: boundedCopy(firstTextValue(window.span.serviceName, window.span.resourceAttributes && isRecord(window.span.resourceAttributes) ? window.span.resourceAttributes['service.name'] : undefined), '-', 80),
        serviceNamespace: boundedCopy(firstTextValue(window.span.serviceNamespace, window.span.resourceAttributes && isRecord(window.span.resourceAttributes) ? window.span.resourceAttributes['service.namespace'] : undefined), '', 80) || undefined,
        name: boundedCopy(firstTextValue(window.span.spanName, window.span.name, spanId), '-', 120),
        status,
        observedAt: boundedCopy(window.span.startTime, '-', 80),
        duration: String(window.durationNanos),
        durationNanos: window.durationNanos,
        leftPct,
        widthPct,
        depth: depths.get(textValue(window.span.spanId) || '') ?? 0,
        source: 'spans',
        tone: status.toUpperCase().includes('ERROR') ? 'danger' : 'default',
        breakoutAttributes: traceRowBreakoutAttributes(window.span)
      };
    });
  }
  const pageRows = buildPageTableRows(plan, data);
  const maxDuration = Math.max(...pageRows.map(row => numericLikeValue(row.duration) ?? 0), 1);
  return pageRows.slice(0, 6).map(row => {
    const durationNanos = Math.max(numericLikeValue(row.duration) ?? 0, 0);
    return {
      key: `${row.key}:waterfall`,
      traceId: row.traceId,
      spanId: row.spanId,
      parentSpanId: '',
      service: row.service,
      serviceNamespace: row.serviceNamespace,
      name: row.name,
      status: row.status,
      observedAt: row.observedAt,
      duration: row.duration,
      durationNanos,
      leftPct: 0,
      widthPct: Math.max(6, Math.round((durationNanos / maxDuration) * 100)),
      depth: 0,
      source: 'list-roots',
      tone: row.status.toUpperCase().includes('ERROR') ? 'danger' : 'default',
      breakoutAttributes: row.breakoutAttributes
    };
  });
}

function buildTrendPreviewBars(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewBar[] {
  if (!isRecord(data.hourlyStats)) return [];
  const entries = Object.entries(data.hourlyStats)
    .map(([label, value]) => ({ label, value: numericValue(value) ?? 0 }))
    .slice(-6);
  const maxValue = Math.max(...entries.map(entry => entry.value), 1);
  return entries.map(entry => ({
    key: `${plan.panelId}:bar:${entry.label}`,
    label: entry.label,
    value: entry.value,
    valueLabel: String(entry.value),
    heightPct: Math.max(6, Math.round((entry.value / maxValue) * 100))
  }));
}

function buildOverviewPreviewRows(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewRow[] {
  const rows: SignalDashboardPanelRuntimePreviewRow[] = [];
  const total = numericValue(data.totalLogs) ?? numericValue(data.totalTraceCount);
  const errors = numericValue(data.errorLogs) ?? numericValue(data.errorTraceCount);
  if (total != null) rows.push({ key: `${plan.panelId}:total`, title: 'total', copy: String(total) });
  if (errors != null) rows.push({ key: `${plan.panelId}:errors`, title: 'errors', copy: String(errors) });
  if (data.latestObservedAt != null) rows.push({ key: `${plan.panelId}:latest`, title: 'latest', copy: boundedCopy(data.latestObservedAt) });
  return rows;
}

function buildMetricsPreviewBars(plan: SignalDashboardPanelExecutionPlan, data: Record<string, unknown>): SignalDashboardPanelRuntimePreviewBar[] {
  const frames = isRecord(data.results) && Array.isArray(data.results.frames) ? data.results.frames : [];
  const values = frames.slice(0, 6).map((frame, index) => {
    const frameRecord = isRecord(frame) ? frame : {};
    const schema = isRecord(frameRecord.schema) ? frameRecord.schema : {};
    const labels = isRecord(schema.labels) ? schema.labels : {};
    const rows = Array.isArray(frameRecord.data) ? frameRecord.data : [];
    const lastRow = [...rows].reverse().find(row => Array.isArray(row) && row.length > 1);
    const value = Array.isArray(lastRow) ? numericValue(lastRow[1]) ?? 0 : 0;
    return {
      label: boundedCopy(labels.__name__, `series-${index + 1}`, 40),
      value
    };
  });
  const maxValue = Math.max(...values.map(entry => Math.abs(entry.value)), 0) || 1;
  return values.map(entry => ({
    key: `${plan.panelId}:metric:${entry.label}`,
    label: entry.label,
    value: entry.value,
    valueLabel: String(entry.value),
    heightPct: Math.max(6, Math.round((Math.abs(entry.value) / maxValue) * 100))
  }));
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((record, [key, rawValue]) => {
    const text = textValue(rawValue);
    if (text) record[key] = text;
    return record;
  }, {});
}

function metricSeriesLabel(labels: Record<string, string>, index: number) {
  return boundedCopy(firstTextValue(labels.__name__, labels.metric, labels.name), `series-${index + 1}`, 80);
}

function readMetricFrameSamples(frame: Record<string, unknown>) {
  const rows = Array.isArray(frame.data) ? frame.data : [];
  return rows
    .map(row => {
      if (!Array.isArray(row) || row.length < 2) return null;
      const timestamp = epochMillisValue(row[0]);
      const value = numericLikeValue(row[1]);
      if (timestamp == null || value == null) return null;
      return { timestamp, value };
    })
    .filter((sample): sample is { timestamp: number; value: number } => sample !== null);
}

function metricsChartPath(points: SignalDashboardPanelRuntimeMetricsPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(point.xPct * 100) / 100} ${Math.round((100 - point.yPct) * 100) / 100}`)
    .join(' ');
}

function buildMetricsChartDescriptor(
  plan: SignalDashboardPanelExecutionPlan,
  data: Record<string, unknown>
): SignalDashboardPanelRuntimeMetricsChart | null {
  if (plan.signal !== 'metrics') return null;
  const frames = isRecord(data.results) && Array.isArray(data.results.frames) ? data.results.frames : [];
  const frameSeries = frames
    .slice(0, 6)
    .map((frame, index) => {
      const frameRecord = isRecord(frame) ? frame : {};
      const schema = isRecord(frameRecord.schema) ? frameRecord.schema : {};
      const labels = stringRecord(schema.labels);
      const samples = readMetricFrameSamples(frameRecord);
      if (samples.length === 0) return null;
      const values = samples.map(sample => sample.value);
      const latest = samples[samples.length - 1];
      return {
        key: `${plan.panelId}:metric-series:${index}`,
        label: metricSeriesLabel(labels, index),
        labels,
        samples,
        latestTimestamp: latest.timestamp,
        latestValue: latest.value,
        minValue: Math.min(...values),
        maxValue: Math.max(...values)
      };
    })
    .filter((series): series is {
      key: string;
      label: string;
      labels: Record<string, string>;
      samples: { timestamp: number; value: number }[];
      latestTimestamp: number;
      latestValue: number;
      minValue: number;
      maxValue: number;
    } => series !== null);
  if (frameSeries.length === 0) return null;

  const allSamples = frameSeries.flatMap(series => series.samples);
  const timestamps = allSamples.map(sample => sample.timestamp);
  const values = allSamples.map(sample => sample.value);
  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const series = frameSeries.map(sourceSeries => {
    const points = sourceSeries.samples.slice(-24).map((sample, index) => ({
      key: `${sourceSeries.key}:point:${index}`,
      timestamp: sample.timestamp,
      value: sample.value,
      xPct: xRange > 0 ? percentValue(((sample.timestamp - xMin) / xRange) * 100) : 50,
      yPct: yRange > 0 ? percentValue(((sample.value - yMin) / yRange) * 100) : 50
    }));
    return {
      key: sourceSeries.key,
      label: sourceSeries.label,
      labels: sourceSeries.labels,
      sampleCount: sourceSeries.samples.length,
      latestTimestamp: sourceSeries.latestTimestamp,
      latestValue: sourceSeries.latestValue,
      minValue: sourceSeries.minValue,
      maxValue: sourceSeries.maxValue,
      pathD: metricsChartPath(points),
      points
    };
  });

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    xMinLabel: String(xMin),
    xMaxLabel: String(xMax),
    yMinLabel: String(yMin),
    yMaxLabel: String(yMax),
    seriesCount: series.length,
    sampleCount: allSamples.length,
    series,
    tooltipRows: series.map(item => ({
      key: `${item.key}:latest`,
      title: item.label,
      copy: item.latestValue != null ? String(item.latestValue) : '-',
      meta: item.latestTimestamp != null ? String(item.latestTimestamp) : ''
    }))
  };
}

export function buildSignalDashboardPanelRuntimePreview(
  plan: SignalDashboardPanelExecutionPlan,
  result: SignalDashboardPanelExecutionResult | undefined
): SignalDashboardPanelRuntimePreview {
  const summary = summarizeSignalDashboardPanelRuntime(plan, result);
  if (!result || result.state !== 'ready' || !isRecord(result.data)) {
    return {
      panelId: plan.panelId,
      mode: 'state',
      state: summary.state,
      kind: summary.kind,
      rows: [{
        key: `${plan.panelId}:state`,
        title: summary.kind,
        copy: summary.errorMessage || summary.state
      }],
      bars: []
    };
  }

  if (summary.kind === 'page') {
    return {
      panelId: plan.panelId,
      mode: 'rows',
      state: 'ready',
      kind: summary.kind,
      rows: buildPagePreviewRows(plan, result.data),
      bars: []
    };
  }
  if (summary.kind === 'time-series') {
    return {
      panelId: plan.panelId,
      mode: 'bars',
      state: 'ready',
      kind: summary.kind,
      rows: [],
      bars: buildTrendPreviewBars(plan, result.data)
    };
  }
  if (summary.kind === 'overview') {
    return {
      panelId: plan.panelId,
      mode: 'rows',
      state: 'ready',
      kind: summary.kind,
      rows: buildOverviewPreviewRows(plan, result.data),
      bars: []
    };
  }
  if (summary.kind === 'metrics-console') {
    return {
      panelId: plan.panelId,
      mode: 'bars',
      state: 'ready',
      kind: summary.kind,
      rows: [],
      bars: buildMetricsPreviewBars(plan, result.data)
    };
  }
  if (summary.kind === 'object' && plan.signal === 'alerts') {
    return {
      panelId: plan.panelId,
      mode: 'rows',
      state: 'ready',
      kind: summary.kind,
      rows: buildAlertPanelPreviewRows(plan, result.data),
      bars: []
    };
  }
  if (summary.kind === 'object' && plan.signal === 'logs') {
    return {
      panelId: plan.panelId,
      mode: 'rows',
      state: 'ready',
      kind: summary.kind,
      rows: buildLogGroupPreviewRows(plan, result.data),
      bars: []
    };
  }
  if (summary.kind === 'object' && plan.signal === 'traces') {
    return {
      panelId: plan.panelId,
      mode: 'rows',
      state: 'ready',
      kind: summary.kind,
      rows: buildTraceGroupPreviewRows(plan, result.data),
      bars: []
    };
  }

  return {
    panelId: plan.panelId,
    mode: 'state',
    state: summary.state,
    kind: summary.kind,
    rows: [{
      key: `${plan.panelId}:state`,
      title: summary.kind,
      copy: summary.totalCount != null ? String(summary.totalCount) : summary.state
    }],
    bars: []
  };
}

function selectSignalDashboardPanelRuntimeRenderer(
  summary: SignalDashboardPanelRuntimeSummary
): SignalDashboardPanelRuntimeRenderer {
  if (summary.kind === 'page') {
    if (summary.signal === 'alerts') return 'object-panel';
    return summary.signal === 'traces' ? 'trace-table' : 'logs-table';
  }
  if (summary.kind === 'time-series') {
    return summary.signal === 'logs' ? 'log-trend-chart' : 'state-panel';
  }
  if (summary.kind === 'overview') {
    return summary.signal === 'traces' ? 'trace-overview' : 'state-panel';
  }
  if (summary.kind === 'metrics-console') {
    return 'metrics-chart';
  }
  if (summary.kind === 'object') {
    return 'object-panel';
  }
  return 'state-panel';
}

export function buildSignalDashboardPanelRuntimeRenderDescriptor(
  plan: SignalDashboardPanelExecutionPlan,
  result: SignalDashboardPanelExecutionResult | undefined
): SignalDashboardPanelRuntimeRenderDescriptor {
  const summary = summarizeSignalDashboardPanelRuntime(plan, result);
  const preview = buildSignalDashboardPanelRuntimePreview(plan, result);
  const tableRows = summary.kind === 'page' && result?.state === 'ready' && isRecord(result.data)
    ? buildPageTableRows(plan, result.data)
    : [];
  const traceWaterfallRows = summary.kind === 'page' && result?.state === 'ready' && isRecord(result.data)
    ? buildTraceWaterfallRows(plan, result.data)
    : [];
  const metricsChart = summary.kind === 'metrics-console' && result?.state === 'ready' && isRecord(result.data)
    ? buildMetricsChartDescriptor(plan, result.data)
    : null;
  return {
    panelId: plan.panelId,
    renderer: selectSignalDashboardPanelRuntimeRenderer(summary),
    signal: summary.signal,
    visualization: summary.visualization,
    state: summary.state,
    kind: summary.kind,
    mode: preview.mode,
    itemCount: summary.itemCount,
    totalCount: summary.totalCount,
    seriesCount: summary.seriesCount,
    sampleCount: summary.sampleCount,
    rows: preview.rows,
    bars: preview.bars,
    tableRows,
    traceWaterfallRows,
    metricsChart
  };
}

function syncTooltipIdentifier(value: string | undefined) {
  const trimmed = value?.trim() || '';
  if (!trimmed || trimmed === '-') return '';
  return trimmed;
}

function syncTooltipRelatedHandoff(
  signal: string,
  traceId: string,
  spanId: string,
  options: SignalDashboardRuntimeSyncTooltipOptions = {},
  context: { serviceName?: string; serviceNamespace?: string } = {}
) {
  const nextTraceId = syncTooltipIdentifier(traceId);
  if (!nextTraceId) return {};
  const nextSpanId = syncTooltipIdentifier(spanId);
  const serviceName = syncTooltipIdentifier(context.serviceName);
  const serviceNamespace = syncTooltipIdentifier(context.serviceNamespace);
  if (signal === 'logs') {
    const params = new URLSearchParams({
      traceId: nextTraceId,
      view: 'trace'
    });
    if (nextSpanId) params.set('spanId', nextSpanId);
    if (serviceName) params.set('serviceName', serviceName);
    if (serviceNamespace) params.set('serviceNamespace', serviceNamespace);
    return {
      traceId: nextTraceId,
      ...(nextSpanId ? { spanId: nextSpanId } : {}),
      ...(serviceName ? { serviceName } : {}),
      ...(serviceNamespace ? { serviceNamespace } : {}),
      relatedSignal: 'traces' as const,
      relatedHandoffHref: applySignalDashboardTimeRange(syncTooltipRelatedHref('/trace/manage', params, options.returnTo), options.timeRange)
    };
  }
  if (signal === 'traces') {
    const params = new URLSearchParams({
      traceId: nextTraceId,
      view: 'list'
    });
    if (nextSpanId) params.set('spanId', nextSpanId);
    if (serviceName) params.set('serviceName', serviceName);
    if (serviceNamespace) params.set('serviceNamespace', serviceNamespace);
    return {
      traceId: nextTraceId,
      ...(nextSpanId ? { spanId: nextSpanId } : {}),
      ...(serviceName ? { serviceName } : {}),
      ...(serviceNamespace ? { serviceNamespace } : {}),
      relatedSignal: 'logs' as const,
      relatedHandoffHref: applySignalDashboardTimeRange(syncTooltipRelatedHref('/log/manage', params, options.returnTo), options.timeRange)
    };
  }
  return {};
}

function syncTooltipRelatedHref(path: string, params: URLSearchParams, returnTo: string | undefined) {
  const normalizedReturnTo = returnTo?.trim();
  if (normalizedReturnTo) params.set('returnTo', normalizedReturnTo);
  return `${path}?${params.toString()}`;
}

function metricLabelValue(labels: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = syncTooltipIdentifier(labels[name]);
    if (value) return value;
  }
  return '';
}

function metricResourceFilter(key: string, value: string) {
  if (!key || !value) return '';
  return `${key}=${value}`;
}

const METRIC_BREAKOUT_ATTRIBUTE_PRIORITY = [
  'service.name',
  'service.namespace',
  'deployment.environment.name',
  'hertzbeat.entity_id',
  'hertzbeat.entity_type',
  'hertzbeat.entity_name',
  'hertzbeat.source',
  'hertzbeat.collector',
  'hertzbeat.template',
  'db.system',
  'external.service.address',
  'operation',
  'operationName',
  'http.route',
  'status_code',
  'rpc.method',
  'server.address',
  'net.peer.name'
];

function metricBreakoutAttributes(labels: Record<string, string>): SignalDashboardRuntimeBreakoutAttribute[] {
  const seen = new Set<string>();
  const orderedNames = [
    ...METRIC_BREAKOUT_ATTRIBUTE_PRIORITY,
    ...Object.keys(labels).sort()
  ];
  return orderedNames.flatMap(name => {
    const attributeName = normalizeBreakoutAttributeName(name);
    if (!attributeName || attributeName === '__name__' || seen.has(attributeName)) return [];
    seen.add(attributeName);
    const value = syncTooltipIdentifier(labels[name]);
    if (!value) return [];
    return [{
      key: `${attributeName}:${value}`,
      name: attributeName,
      value
    }];
  }).slice(0, 10);
}

function syncTooltipMetricRelatedHandoff(
  labels: Record<string, string>,
  options: SignalDashboardRuntimeSyncTooltipOptions = {}
) {
  const serviceName = metricLabelValue(labels, ['service.name', 'serviceName', 'service_name', 'service']);
  const serviceNamespace = metricLabelValue(labels, ['service.namespace', 'serviceNamespace', 'service_namespace']);
  const dbSystem = metricLabelValue(labels, ['db.system', 'dbSystem', 'db_system']);
  const externalAddress = metricLabelValue(labels, ['external.service.address', 'externalServiceAddress', 'external_service_address', 'server.address', 'net.peer.name']);
  const operationName = metricLabelValue(labels, ['operation', 'operationName', 'operation_name', 'http.route', 'rpc.method']);
  const resourceFilter = dbSystem
    ? metricResourceFilter('db.system', dbSystem)
    : externalAddress ? metricResourceFilter('external.service.address', externalAddress) : '';
  if (!serviceName && !resourceFilter && !operationName) return {};
  const params = new URLSearchParams({ view: 'list', spanScope: 'all' });
  if (serviceName) params.set('serviceName', serviceName);
  if (serviceNamespace) params.set('serviceNamespace', serviceNamespace);
  if (resourceFilter) params.set('resourceFilter', resourceFilter);
  if (operationName) params.set('operationName', operationName);
  return {
    ...(serviceName ? { serviceName } : {}),
    ...(serviceNamespace ? { serviceNamespace } : {}),
    ...(resourceFilter ? { resourceFilter } : {}),
    ...(operationName ? { operationName } : {}),
    relatedSignal: 'traces' as const,
    relatedHandoffHref: applySignalDashboardTimeRange(syncTooltipRelatedHref('/trace/manage', params, options.returnTo), options.timeRange)
  };
}

const SERVICE_VARIABLE_NAMES = new Set(['service.name', 'servicename', 'service']);
const SERVICE_NAMESPACE_VARIABLE_NAMES = new Set(['service.namespace', 'servicenamespace', 'service_namespace']);
const TRACE_ID_VARIABLE_NAMES = new Set(['traceid', 'trace.id', 'trace_id']);
const SPAN_ID_VARIABLE_NAMES = new Set(['spanid', 'span.id', 'span_id']);
const ENTITY_ID_VARIABLE_NAMES = new Set(['hertzbeat.entity_id', 'hertzbeat.entity.id', 'entityid', 'entity.id', 'entity_id']);
const ENTITY_TYPE_VARIABLE_NAMES = new Set(['hertzbeat.entity_type', 'hertzbeat.entity.type', 'entitytype', 'entity.type', 'entity_type']);
const ENTITY_NAME_VARIABLE_NAMES = new Set(['hertzbeat.entity_name', 'hertzbeat.entity.name', 'entityname', 'entity.name', 'entity_name']);
const SIGNAL_SOURCE_VARIABLE_NAMES = new Set(['hertzbeat.source', 'source', 'signal.source', 'signalsource', 'signal_source']);
const COLLECTOR_VARIABLE_NAMES = new Set(['hertzbeat.collector', 'collector']);
const TEMPLATE_VARIABLE_NAMES = new Set(['hertzbeat.template', 'template']);

function evidenceFilterSourceForVariableName(name: string): SignalDashboardRuntimeEvidenceFilterSource | null {
  const normalizedName = normalizeSignalDashboardVariableName(name).toLowerCase();
  if (SERVICE_VARIABLE_NAMES.has(normalizedName)) return 'service';
  if (SERVICE_NAMESPACE_VARIABLE_NAMES.has(normalizedName)) return 'serviceNamespace';
  if (TRACE_ID_VARIABLE_NAMES.has(normalizedName)) return 'traceId';
  if (SPAN_ID_VARIABLE_NAMES.has(normalizedName)) return 'spanId';
  if (ENTITY_ID_VARIABLE_NAMES.has(normalizedName)) return 'entityId';
  if (ENTITY_TYPE_VARIABLE_NAMES.has(normalizedName)) return 'entityType';
  if (ENTITY_NAME_VARIABLE_NAMES.has(normalizedName)) return 'entityName';
  if (SIGNAL_SOURCE_VARIABLE_NAMES.has(normalizedName)) return 'signalSource';
  if (COLLECTOR_VARIABLE_NAMES.has(normalizedName)) return 'collector';
  if (TEMPLATE_VARIABLE_NAMES.has(normalizedName)) return 'template';
  return null;
}

function breakoutValue(row: SignalDashboardRuntimeSyncTooltipRow, names: string[]) {
  const normalizedNames = new Set(names.flatMap(name => {
    const normalizedName = normalizeBreakoutAttributeName(name);
    return normalizedName
      ? [normalizedName, `resource:${normalizedName}`, `attribute:${normalizedName}`]
      : [];
  }));
  return syncTooltipIdentifier(row.breakoutAttributes
    ?.find(attribute => normalizedNames.has(normalizeBreakoutAttributeName(attribute.name)))
    ?.value);
}

function evidenceFilterValues(row: SignalDashboardRuntimeSyncTooltipRow): Record<SignalDashboardRuntimeEvidenceFilterSource, string> {
  return {
    service: row.signal === 'metrics' ? syncTooltipIdentifier(row.serviceName) : row.signal === 'logs' || row.signal === 'traces' ? syncTooltipIdentifier(row.label) : '',
    serviceNamespace: syncTooltipIdentifier(row.serviceNamespace),
    traceId: syncTooltipIdentifier(row.traceId),
    spanId: syncTooltipIdentifier(row.spanId),
    entityId: breakoutValue(row, ['hertzbeat.entity_id', 'hertzbeat.entity.id', 'entity.id', 'entity_id']),
    entityType: breakoutValue(row, ['hertzbeat.entity_type', 'hertzbeat.entity.type', 'entity.type', 'entity_type']),
    entityName: breakoutValue(row, ['hertzbeat.entity_name', 'hertzbeat.entity.name', 'entity.name', 'entity_name']),
    signalSource: breakoutValue(row, ['hertzbeat.source', 'source', 'signal.source']),
    collector: breakoutValue(row, ['hertzbeat.collector', 'collector']),
    template: breakoutValue(row, ['hertzbeat.template', 'template'])
  };
}

export function buildSignalDashboardRuntimeEvidenceSourceHandoff(
  href: string | undefined,
  row: SignalDashboardRuntimeSyncTooltipRow,
  options: SignalDashboardRuntimeSyncTooltipOptions = {}
) {
  const normalizedHref = href?.trim() || '';
  if (!normalizedHref) return '';
  try {
    const url = new URL(normalizedHref, 'http://hertzbeat.local');
    const valuesBySource = evidenceFilterValues(row);
    if (valuesBySource.traceId) url.searchParams.set('traceId', valuesBySource.traceId);
    if (valuesBySource.spanId) url.searchParams.set('spanId', valuesBySource.spanId);
    if (valuesBySource.service && !url.searchParams.get('serviceName')) {
      url.searchParams.set('serviceName', valuesBySource.service);
    }
    if (valuesBySource.serviceNamespace && !url.searchParams.get('serviceNamespace')) {
      url.searchParams.set('serviceNamespace', valuesBySource.serviceNamespace);
    }
    if (valuesBySource.entityId && !url.searchParams.get('entityId')) {
      url.searchParams.set('entityId', valuesBySource.entityId);
    }
    if (valuesBySource.entityType && !url.searchParams.get('entityType')) {
      url.searchParams.set('entityType', valuesBySource.entityType);
    }
    if (valuesBySource.entityName && !url.searchParams.get('entityName')) {
      url.searchParams.set('entityName', valuesBySource.entityName);
    }
    if (valuesBySource.signalSource && !url.searchParams.get('source')) {
      url.searchParams.set('source', valuesBySource.signalSource);
    }
    if (valuesBySource.collector && !url.searchParams.get('collector')) {
      url.searchParams.set('collector', valuesBySource.collector);
    }
    if (valuesBySource.template && !url.searchParams.get('template')) {
      url.searchParams.set('template', valuesBySource.template);
    }
    const normalizedReturnTo = options.returnTo?.trim();
    if (normalizedReturnTo) url.searchParams.set('returnTo', normalizedReturnTo);
    return applySignalDashboardTimeRange(`${url.pathname}${url.search}${url.hash}`, options.timeRange);
  } catch {
    return normalizedHref;
  }
}

export function buildSignalDashboardRuntimeEvidenceFilters(
  variables: SignalDashboardVariable[],
  row: SignalDashboardRuntimeSyncTooltipRow
): SignalDashboardRuntimeEvidenceFilterCandidate[] {
  const valuesBySource = evidenceFilterValues(row);
  return variables.flatMap(variable => {
    const source = evidenceFilterSourceForVariableName(variable.name);
    if (!source) return [];
    const value = valuesBySource[source];
    if (!value) return [];
    return [{
      key: `${row.key}:filter:${variable.name}:${source}`,
      variableName: variable.name,
      value,
      source
    }];
  });
}

export function buildSignalDashboardRuntimeEvidenceFilterSuggestions(
  variables: SignalDashboardVariable[],
  row: SignalDashboardRuntimeSyncTooltipRow
): SignalDashboardRuntimeEvidenceFilterSuggestion[] {
  const valuesBySource = evidenceFilterValues(row);
  const existingSources = new Set(
    variables
      .map(variable => evidenceFilterSourceForVariableName(variable.name))
      .filter((source): source is SignalDashboardRuntimeEvidenceFilterSource => source != null)
  );
  const suggestions: { source: SignalDashboardRuntimeEvidenceFilterSource; variableName: string; variableType: SignalDashboardVariableType }[] = [
    { source: 'service', variableName: 'service.name', variableType: 'query' },
    { source: 'serviceNamespace', variableName: 'service.namespace', variableType: 'query' },
    { source: 'entityId', variableName: 'hertzbeat.entity_id', variableType: 'textbox' },
    { source: 'entityName', variableName: 'hertzbeat.entity_name', variableType: 'query' },
    { source: 'signalSource', variableName: 'hertzbeat.source', variableType: 'dynamic' },
    { source: 'collector', variableName: 'hertzbeat.collector', variableType: 'dynamic' },
    { source: 'template', variableName: 'hertzbeat.template', variableType: 'dynamic' },
    { source: 'traceId', variableName: 'traceId', variableType: 'textbox' },
    { source: 'spanId', variableName: 'spanId', variableType: 'textbox' }
  ];
  return suggestions.flatMap(suggestion => {
    if (existingSources.has(suggestion.source)) return [];
    const value = valuesBySource[suggestion.source];
    if (!value) return [];
    return [{
      key: `${row.key}:filter-suggestion:${suggestion.variableName}`,
      variableName: suggestion.variableName,
      value,
      source: suggestion.source,
      variableType: suggestion.variableType
    }];
  });
}

export function buildSignalDashboardRuntimeSyncTooltip(
  renderers: SignalDashboardPanelRuntimeRenderDescriptor[],
  timestamp: string | undefined,
  options: SignalDashboardRuntimeSyncTooltipOptions = {}
): SignalDashboardRuntimeSyncTooltip {
  const normalizedTimestamp = timestamp?.trim() || '';
  if (!normalizedTimestamp) {
    return {
      timestamp: '',
      state: 'idle',
      rowCount: 0,
      rows: []
    };
  }

  const rows = renderers.flatMap(renderer => {
    const metricRows = renderer.metricsChart?.series.flatMap(series => {
      return series.points
        .filter(point => String(point.timestamp) === normalizedTimestamp)
        .map(point => ({
          key: `${point.key}:sync`,
          panelId: renderer.panelId,
          signal: renderer.signal,
          source: 'metrics-point' as const,
          label: series.label,
          value: String(point.value),
          meta: String(point.timestamp),
          breakoutAttributes: metricBreakoutAttributes(series.labels),
          ...syncTooltipMetricRelatedHandoff(series.labels, options)
        }));
    }) || [];
    const tableRows = renderer.tableRows
      .filter(row => row.observedAt === normalizedTimestamp)
      .map(row => ({
        key: `${row.key}:sync`,
        panelId: renderer.panelId,
        signal: renderer.signal,
        source: 'table-row' as const,
        label: row.service,
        value: row.message || row.name,
        meta: row.traceId,
        serviceName: row.service,
        serviceNamespace: row.serviceNamespace,
        breakoutAttributes: row.breakoutAttributes,
        ...syncTooltipRelatedHandoff(renderer.signal, row.traceId, row.spanId, options, {
          serviceName: row.service,
          serviceNamespace: row.serviceNamespace
        })
      }));
    const waterfallRows = renderer.traceWaterfallRows
      .filter(row => row.observedAt === normalizedTimestamp)
      .map(row => ({
        key: `${row.key}:sync`,
        panelId: renderer.panelId,
        signal: renderer.signal,
        source: 'trace-waterfall-row' as const,
        label: row.service,
        value: row.name,
        meta: row.duration,
        serviceName: row.service,
        serviceNamespace: row.serviceNamespace,
        breakoutAttributes: row.breakoutAttributes,
        ...syncTooltipRelatedHandoff(renderer.signal, row.traceId, row.spanId, options, {
          serviceName: row.service,
          serviceNamespace: row.serviceNamespace
        })
      }));
    return [...metricRows, ...tableRows, ...waterfallRows];
  });

  return {
    timestamp: normalizedTimestamp,
    state: 'active',
    rowCount: rows.length,
    rows
  };
}

export function buildSignalDashboardRuntimeSyncCrosshair(
  renderers: SignalDashboardPanelRuntimeRenderDescriptor[],
  timestamp: string | undefined
): SignalDashboardRuntimeSyncCrosshair {
  const normalizedTimestamp = timestamp?.trim() || '';
  if (!normalizedTimestamp) {
    return {
      timestamp: '',
      state: 'idle',
      panelCount: 0,
      pointCount: 0,
      panels: []
    };
  }

  const panels = renderers.flatMap(renderer => {
    const points = renderer.metricsChart?.series.flatMap(series => {
      return series.points.filter(point => String(point.timestamp) === normalizedTimestamp);
    }) || [];
    if (points.length === 0) return [];
    const xPct = percentValue(points.reduce((sum, point) => sum + point.xPct, 0) / points.length);
    return [{
      panelId: renderer.panelId,
      signal: renderer.signal,
      xPct,
      pointCount: points.length
    }];
  });

  return {
    timestamp: normalizedTimestamp,
    state: panels.length > 0 ? 'active' : 'idle',
    panelCount: panels.length,
    pointCount: panels.reduce((sum, panel) => sum + panel.pointCount, 0),
    panels
  };
}

export function buildSignalDashboardRuntimeMetricsTooltip(
  chart: SignalDashboardPanelRuntimeMetricsChart | null,
  timestamp: string | undefined
): SignalDashboardRuntimeMetricsTooltip {
  if (!chart) {
    return {
      timestamp: '',
      state: 'latest',
      rowCount: 0,
      rows: []
    };
  }
  const normalizedTimestamp = timestamp?.trim() || '';
  if (normalizedTimestamp) {
    const syncRows = chart.series.flatMap(series => {
      return series.points
        .filter(point => String(point.timestamp) === normalizedTimestamp)
        .map(point => ({
          key: `${point.key}:sync-tooltip`,
          title: series.label,
          copy: String(point.value),
          meta: String(point.timestamp)
        }));
    });
    if (syncRows.length > 0) {
      return {
        timestamp: normalizedTimestamp,
        state: 'sync',
        rowCount: syncRows.length,
        rows: syncRows
      };
    }
  }

  return {
    timestamp: '',
    state: 'latest',
    rowCount: chart.tooltipRows.length,
    rows: chart.tooltipRows
  };
}

function collectMetricSampleSums(data: unknown) {
  const samplesByTimestamp = new Map<number, number>();
  if (!isRecord(data) || !isRecord(data.results) || !Array.isArray(data.results.frames)) return samplesByTimestamp;
  data.results.frames.forEach(frame => {
    const frameRecord = isRecord(frame) ? frame : {};
    readMetricFrameSamples(frameRecord).forEach(sample => {
      samplesByTimestamp.set(sample.timestamp, (samplesByTimestamp.get(sample.timestamp) ?? 0) + sample.value);
    });
  });
  return samplesByTimestamp;
}

function metricSeriesKey(labels: Record<string, string>, index: number) {
  const dimensionEntries = Object.entries(labels)
    .filter(([key]) => key !== '__name__' && key !== 'metric' && key !== 'name')
    .sort(([left], [right]) => left.localeCompare(right));
  return dimensionEntries.length > 0 ? JSON.stringify(dimensionEntries) : `series-${index}`;
}

function collectMetricSampleSeries(data: unknown) {
  const seriesByKey = new Map<string, { labels: Record<string, string>; samplesByTimestamp: Map<number, number> }>();
  if (!isRecord(data) || !isRecord(data.results) || !Array.isArray(data.results.frames)) return seriesByKey;
  data.results.frames.forEach((frame, index) => {
    const frameRecord = isRecord(frame) ? frame : {};
    const schema = isRecord(frameRecord.schema) ? frameRecord.schema : {};
    const labels = stringRecord(schema.labels);
    const key = metricSeriesKey(labels, index);
    const entry = seriesByKey.get(key) || {
      labels,
      samplesByTimestamp: new Map<number, number>()
    };
    readMetricFrameSamples(frameRecord).forEach(sample => {
      entry.samplesByTimestamp.set(sample.timestamp, (entry.samplesByTimestamp.get(sample.timestamp) ?? 0) + sample.value);
    });
    seriesByKey.set(key, entry);
  });
  return seriesByKey;
}

function combineApdexMetricData(input: {
  plan: SignalDashboardPanelExecutionPlan;
  satisfied: unknown;
  tolerating: unknown;
  total: unknown;
}): Record<string, unknown> {
  const satisfiedSamples = collectMetricSampleSums(input.satisfied);
  const toleratingSamples = collectMetricSampleSums(input.tolerating);
  const totalSamples = collectMetricSampleSums(input.total);
  const timestamps = [...new Set([
    ...satisfiedSamples.keys(),
    ...toleratingSamples.keys(),
    ...totalSamples.keys()
  ])].sort((left, right) => left - right);
  const rows = timestamps.flatMap(timestamp => {
    const total = totalSamples.get(timestamp) ?? 0;
    if (total <= 0) return [];
    const satisfied = Math.max(satisfiedSamples.get(timestamp) ?? 0, 0);
    const toleratingBucket = Math.max(toleratingSamples.get(timestamp) ?? satisfied, satisfied);
    const tolerating = Math.max(toleratingBucket - satisfied, 0);
    const score = Math.max(0, Math.min(1, (satisfied + tolerating * 0.5) / total));
    return [[timestamp, Math.round(score * 1000) / 1000]];
  });
  const latest = rows.length > 0 ? rows[rows.length - 1] : undefined;
  return {
    results: {
      frames: rows.length > 0
        ? [{
            schema: {
              name: 'service-apdex',
              labels: {
                __name__: 'apdex',
                metric: 'apdex',
                service: input.plan.resolvedRoute.includes('serviceName=') ? 'service' : ''
              }
            },
            data: rows
          }]
        : []
    },
    stats: {
      totalSeries: rows.length > 0 ? 1 : 0,
      nonEmptySeries: rows.length > 0 ? 1 : 0,
      sampleCount: rows.length,
      latestObservedAt: Array.isArray(latest) ? latest[0] : null
    },
    apdex: {
      thresholdSeconds: 0.5,
      satisfiedUrl: input.plan.apiUrls.console,
      toleratingUrl: input.plan.apiUrls.apdexTolerating,
      totalUrl: input.plan.apiUrls.apdexTotal
    }
  };
}

function combineAverageMetricData(input: {
  plan: SignalDashboardPanelExecutionPlan;
  sum: unknown;
  count: unknown;
  metricName: string;
  scale: number;
}): Record<string, unknown> {
  const sumSeries = collectMetricSampleSeries(input.sum);
  const countSeries = collectMetricSampleSeries(input.count);
  const frames = [...sumSeries.entries()].flatMap(([key, sumEntry]) => {
    const countEntry = countSeries.get(key);
    if (!countEntry) return [];
    const timestamps = [...new Set([
      ...sumEntry.samplesByTimestamp.keys(),
      ...countEntry.samplesByTimestamp.keys()
    ])].sort((left, right) => left - right);
    const rows = timestamps.flatMap(timestamp => {
      const count = countEntry.samplesByTimestamp.get(timestamp) ?? 0;
      if (count <= 0) return [];
      const sum = sumEntry.samplesByTimestamp.get(timestamp) ?? 0;
      return [[timestamp, Math.round((sum / count) * input.scale * 1000) / 1000]];
    });
    if (rows.length === 0) return [];
    return [{
      schema: {
        name: input.metricName,
        labels: {
          ...sumEntry.labels,
          __name__: input.metricName,
          metric: input.metricName
        }
      },
      data: rows
    }];
  });
  const allRows = frames.flatMap(frame => Array.isArray(frame.data) ? frame.data : []);
  const latest = allRows.length > 0 ? allRows[allRows.length - 1] : undefined;
  return {
    results: {
      frames
    },
    stats: {
      totalSeries: frames.length,
      nonEmptySeries: frames.length,
      sampleCount: allRows.length,
      latestObservedAt: Array.isArray(latest) ? latest[0] : null
    },
    average: {
      metric: input.metricName,
      scale: input.scale,
      sumUrl: input.plan.apiUrls.console,
      countUrl: input.plan.apiUrls.averageCount
    }
  };
}

async function defaultSignalDashboardPanelExecutor(url: string) {
  if (typeof fetch === 'undefined') {
    throw new Error('Signal dashboard panel execution API is unavailable');
  }
  const response = await fetch(signalDashboardExecutionApiPath(url), {
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Signal dashboard panel execution failed with ${response.status}`);
  }
  const payload = await response.json() as unknown;
  if (isRecord(payload) && typeof payload.code === 'number') {
    if (payload.code !== 0) {
      throw new Error(typeof payload.msg === 'string' ? payload.msg : 'Signal dashboard panel execution failed');
    }
    return payload.data;
  }
  return payload;
}

export async function executeSignalDashboardPanelPlan(
  plan: SignalDashboardPanelExecutionPlan,
  executor: SignalDashboardPanelExecutor = defaultSignalDashboardPanelExecutor
): Promise<SignalDashboardPanelExecutionResult> {
  if (plan.state !== 'ready' || !plan.primaryUrl) {
    return {
      panelId: plan.panelId,
      state: 'unsupported',
      primaryUrl: plan.primaryUrl,
      apiUrl: plan.primaryUrl,
      errorMessage: plan.unsupportedReason || 'unsupported-panel'
    };
  }
  try {
    const data = plan.signal === 'alerts' && plan.apiUrls.summary
      ? await Promise.all([executor(plan.primaryUrl), executor(plan.apiUrls.summary)])
        .then(([groups, summary]) => ({ groups, summary }))
      : plan.signal === 'metrics' && plan.apiUrls.apdexTolerating && plan.apiUrls.apdexTotal
        ? await Promise.all([executor(plan.primaryUrl), executor(plan.apiUrls.apdexTolerating), executor(plan.apiUrls.apdexTotal)])
          .then(([satisfied, tolerating, total]) => combineApdexMetricData({ plan, satisfied, tolerating, total }))
        : plan.signal === 'metrics' && plan.apiUrls.averageCount
          ? await Promise.all([executor(plan.primaryUrl), executor(plan.apiUrls.averageCount)])
            .then(([sum, count]) => combineAverageMetricData({
              plan,
              sum,
              count,
              metricName: plan.apiUrls.averageCount.includes('signoz_external_call_latency_count') ? 'external-call-avg-ms' : 'db-call-avg-ms',
              scale: 1000
            }))
        : await executor(plan.primaryUrl);
    return {
      panelId: plan.panelId,
      state: 'ready',
      primaryUrl: plan.primaryUrl,
      apiUrl: plan.primaryUrl,
      data
    };
  } catch (error) {
    return {
      panelId: plan.panelId,
      state: 'error',
      primaryUrl: plan.primaryUrl,
      apiUrl: plan.primaryUrl,
      errorMessage: errorMessage(error)
    };
  }
}

export function updateSignalDashboardPanelLayout(
  dashboard: SignalDashboard,
  widgetId: string,
  patch: SignalDashboardLayoutPatch
): SignalDashboard {
  const panels = parseSignalDashboardPreviewPanels(dashboard);
  const nextLayout = panels.map(panel => {
    if (panel.widget.id !== widgetId) return clampLayoutItem(panel.layout);
    const nextWidth = panel.layout.w + (patch.dw || 0);
    const nextHeight = panel.layout.h + (patch.dh || 0);
    return clampLayoutItem({
      i: panel.layout.i,
      x: panel.layout.x + (patch.dx || 0),
      y: panel.layout.y + (patch.dy || 0),
      w: nextWidth,
      h: nextHeight
    });
  });
  return {
    ...dashboard,
    layout: JSON.stringify(nextLayout)
  };
}

export function updateSignalDashboardPanelWidgetFromDraft(
  dashboard: SignalDashboard,
  widgetId: string,
  draft: SignalDashboardPanelDraft
): SignalDashboard {
  let found = false;
  const widgets = parseJsonArray(dashboard.widgets)
    .map(normalizeWidget)
    .filter((widget): widget is SignalDashboardWidget => widget !== null)
    .map(widget => {
      if (widget.id !== widgetId) return widget;
      found = true;
      return {
        ...widget,
        draftKey: draft.draftKey,
        signal: draft.signal,
        title: draft.title,
        description: draft.description,
        visualization: draft.visualization,
        route: draft.route,
        querySnapshot: draft.querySnapshot || draft.route,
        payload: draft.payload || null
      };
    });
  if (!found) return dashboard;

  let panelMap: Record<string, unknown> = {};
  try {
    const parsedPanelMap = dashboard.panelMap ? JSON.parse(dashboard.panelMap) : {};
    panelMap = isRecord(parsedPanelMap) ? parsedPanelMap : {};
  } catch {
    panelMap = {};
  }
  return {
    ...dashboard,
    widgets: JSON.stringify(widgets),
    panelMap: JSON.stringify({
      ...panelMap,
      [widgetId]: draft.draftKey
    })
  };
}

export async function saveSignalDashboardPanelEditContext(
  editContext: SignalPanelEditContext | null | undefined,
  draft: SignalDashboardPanelDraft
): Promise<SignalDashboard | null> {
  if (!editContext?.dashboardKey || !editContext.panelId) return null;
  const dashboards = await loadSignalDashboards();
  const dashboard = dashboards.find(item => item.dashboardKey === editContext.dashboardKey);
  if (!dashboard) {
    throw new Error('Signal dashboard edit target is unavailable');
  }
  const updatedDashboard = updateSignalDashboardPanelWidgetFromDraft(dashboard, editContext.panelId, draft);
  if (updatedDashboard === dashboard) {
    throw new Error('Signal dashboard edit panel is unavailable');
  }
  return saveSignalDashboard(updatedDashboard);
}

export function buildSignalDashboardCompositionFromDrafts({
  dashboardKey,
  title,
  description,
  tags,
  drafts
}: BuildSignalDashboardCompositionInput): SignalDashboard {
  const widgets = drafts.map((draft, index) => {
    const widgetId = stableWidgetId(draft, index);
    return {
      id: widgetId,
      draftKey: draft.draftKey,
      signal: draft.signal,
      title: draft.title,
      description: draft.description,
      visualization: draft.visualization,
      route: draft.route,
      querySnapshot: draft.querySnapshot || draft.route,
      payload: draft.payload || null
    };
  });
  const layout = widgets.map((widget, index) => ({
    i: widget.id,
    x: (index % 2) * 6,
    y: Math.floor(index / 2) * 4,
    w: 6,
    h: 4
  }));
  const panelMap = Object.fromEntries(widgets.map(widget => [widget.id, widget.draftKey]));

  const variables = buildSignalDashboardVariablesFromDrafts(drafts);

  return {
    dashboardKey,
    title,
    description,
    tags: tags.join(','),
    layout: JSON.stringify(layout),
    widgets: JSON.stringify(widgets),
    variables: serializeSignalDashboardVariables(variables),
    panelMap: JSON.stringify(panelMap),
    version: 'v1'
  };
}

function buildWidgetFromDraft(draft: SignalDashboardPanelDraft, index: number) {
  return {
    id: stableWidgetId(draft, index),
    draftKey: draft.draftKey,
    signal: draft.signal,
    title: draft.title,
    description: draft.description,
    visualization: draft.visualization,
    route: draft.route,
    querySnapshot: draft.querySnapshot || draft.route,
    payload: draft.payload || null
  };
}

function mergeDashboardVariables(
  currentVariables: SignalDashboardVariable[],
  nextVariables: SignalDashboardVariable[]
) {
  const merged = new Map<string, SignalDashboardVariable>();
  currentVariables.forEach(variable => {
    const normalized = normalizeVariable(variable);
    if (normalized) merged.set(normalized.name, normalized);
  });
  nextVariables.forEach(variable => {
    const normalized = normalizeVariable(variable);
    if (normalized && !merged.has(normalized.name)) merged.set(normalized.name, normalized);
  });
  return [...merged.values()];
}

export function mergeSignalDashboardDraftsIntoComposition(
  dashboard: SignalDashboard,
  drafts: SignalDashboardPanelDraft[]
): SignalDashboard {
  if (drafts.length === 0) return dashboard;
  const existingWidgets = parseJsonArray(dashboard.widgets).map(normalizeWidget).filter((widget): widget is SignalDashboardWidget => widget !== null);
  const existingLayout = parseJsonArray(dashboard.layout)
    .map((item, index) => normalizeLayoutItem(item, index))
    .filter((item): item is SignalDashboardLayoutItem => item !== null);
  const existingPanelMap = parseWidgetPanelMap(dashboard.panelMap);
  const existingDraftKeys = new Set(existingWidgets.map(widget => `${widget.signal}:${widget.draftKey || ''}`));
  const nextDrafts = drafts.filter(draft => !existingDraftKeys.has(`${draft.signal}:${draft.draftKey}`));
  if (nextDrafts.length === 0) return dashboard;
  const nextWidgets = nextDrafts.map((draft, index) => buildWidgetFromDraft(draft, existingWidgets.length + index));
  const maxY = existingLayout.reduce((value, item) => Math.max(value, item.y + item.h), 0);
  const nextLayout = nextWidgets.map((widget, index) => ({
    i: widget.id,
    x: (index % 2) * 6,
    y: maxY + Math.floor(index / 2) * 4,
    w: 6,
    h: 4
  }));
  const variables = mergeDashboardVariables(
    parseSignalDashboardVariables(dashboard),
    buildSignalDashboardVariablesFromDrafts(nextDrafts)
  );
  return {
    ...dashboard,
    widgets: JSON.stringify([...existingWidgets, ...nextWidgets]),
    layout: JSON.stringify([...existingLayout, ...nextLayout]),
    panelMap: JSON.stringify({
      ...existingPanelMap,
      ...Object.fromEntries(nextWidgets.map(widget => [widget.id, widget.draftKey]))
    }),
    variables: serializeSignalDashboardVariables(variables),
    version: dashboard.version || 'v1'
  };
}

async function requestSignalDashboard<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (typeof fetch === 'undefined') {
    throw new Error('Signal dashboard API is unavailable');
  }
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Signal dashboard request failed with ${response.status}`);
  }
  const payload = await response.json() as ApiMessage<T>;
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Signal dashboard request failed');
  }
  return payload.data as T;
}

export async function loadSignalDashboards(): Promise<SignalDashboard[]> {
  const dashboards = await requestSignalDashboard<SignalDashboard[]>('/signal/dashboard');
  return Array.isArray(dashboards) ? dashboards : [];
}

export async function saveSignalDashboard(dashboard: SignalDashboard): Promise<SignalDashboard> {
  return requestSignalDashboard<SignalDashboard>('/signal/dashboard', {
    method: 'PUT',
    body: JSON.stringify(dashboard)
  });
}

export async function deleteSignalDashboard(dashboardKey: string): Promise<void> {
  await requestSignalDashboard<void>(`/signal/dashboard/${encodeURIComponent(dashboardKey)}`, {
    method: 'DELETE'
  });
}
