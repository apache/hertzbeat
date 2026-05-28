import type { OtlpEntityBindingSummary, OtlpIngestionGuide, OtlpIngestionOverview } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type Protocol = 'http' | 'grpc';
type ReadinessTone = 'success' | 'warning' | 'danger' | 'neutral';
type TimeFormatter = (value: number | null | undefined) => string;

export type OtlpCollectionLoopLink = {
  key:
    | 'otlp-intake'
    | 'traditional-monitoring'
    | 'collector-cluster'
    | 'monitoring-template'
    | 'service-discovery'
    | 'object-directory';
  title: string;
  copy: string;
  href: string;
  meta: string;
};

export type OtlpReadinessRow = {
  key: 'signals' | 'latest-report' | 'entity-binding' | 'service-discovery';
  title: string;
  copy: string;
  meta: string;
  tone: ReadinessTone;
};

export type OtlpSelfCheckRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
  tone: ReadinessTone;
};

export type OtlpUnboundCandidateRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
  href: string;
  signals: string[];
  canonicalIdentitySummary: string;
};

function toFiniteCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function cleanText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function defaultFormatTime(value: number | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (item: number) => String(item).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function translateText(t: Translator | undefined, key: string, params?: Record<string, string | number | null | undefined>) {
  if (!t) return key;
  const translated = t(key, params);
  return translated && translated !== key ? translated : key;
}

function translateGuideText(value: string | null | undefined, t?: Translator) {
  const text = cleanText(value);
  if (!text) return '-';
  if (!t || !text.startsWith('otlp.guide.')) return text;
  const translated = t(text);
  return translated && translated !== text ? translated : text;
}

export function buildSignalRows(
  signals: Array<Pick<OtlpIngestionOverview['metrics'], 'signal' | 'active' | 'summary' | 'intakeMode' | 'totalCount'>>,
  t: Translator
) {
  return signals.map(signal => ({
    title: `${signal.signal.toUpperCase()} · ${signal.active ? t('common.active') : t('common.idle')}`,
    copy: signal.summary || '-',
    meta: `${signal.intakeMode || '-'} · ${signal.totalCount || 0}`
  }));
}

export function buildGuideRows(signals: OtlpIngestionGuide['signals'] = [], t?: Translator) {
  return signals.map(item => ({
    title: `${item.signal} · ${item.protocol || '-'}`,
    copy: translateGuideText(item.summary || item.note, t),
    meta: item.endpoint || '-'
  }));
}

export function buildBindingRows(items: OtlpEntityBindingSummary['recentBoundEntities'] = []) {
  return items.map(item => ({
    title: item.displayName || item.name || `entity-${item.entityId}`,
    copy: `${item.primaryIdentityKey || '-'} = ${item.primaryIdentityValue || '-'}`,
    meta: `binds ${item.monitorBindCount}`
  }));
}

export function buildUnboundCandidateRows(
  items: OtlpEntityBindingSummary['recentUnboundCandidates'] = []
): OtlpUnboundCandidateRow[] {
  return items.map((item, index) => {
    const primaryIdentityKey = cleanText(item.primaryIdentityKey) || 'service.name';
    const title = cleanText(item.suggestedName) || cleanText(item.primaryIdentityValue) || `candidate-${index + 1}`;
    const primaryIdentityValue = cleanText(item.primaryIdentityValue) || title;
    const namespace = cleanText(item.namespace);
    const environment = cleanText(item.environment);
    const signals = (item.signals || []).map(cleanText).filter(Boolean) as string[];
    const meta = [namespace, environment, signals.length > 0 ? signals.join(', ') : undefined]
      .filter(Boolean)
      .join(' · ') || 'OTLP resource';
    const query = new URLSearchParams();
    query.set('identityKey', primaryIdentityKey);
    query.set('identityValue', primaryIdentityValue);
    query.set('serviceName', title);
    if (namespace) query.set('serviceNamespace', namespace);
    if (environment) query.set('environment', environment);
    const canonicalIdentitySummary = Object.entries(item.canonicalIdentities || {})
      .filter(([key, value]) => cleanText(key) && cleanText(value))
      .map(([key, value]) => `${key}=${value}`)
      .join(';');

    return {
      key: [primaryIdentityKey, primaryIdentityValue, namespace, environment].filter(Boolean).join(':') || `candidate-${index + 1}`,
      title,
      copy: `${primaryIdentityKey} = ${primaryIdentityValue}`,
      meta,
      href: `/entities/discovery?${query.toString()}`,
      signals,
      canonicalIdentitySummary
    };
  });
}

export function buildReadinessRows(
  overview: OtlpIngestionOverview,
  bindings: Partial<OtlpEntityBindingSummary> = {},
  formatTime: TimeFormatter = defaultFormatTime,
  t?: Translator
): OtlpReadinessRow[] {
  const metricsCount = toFiniteCount(overview.metrics?.totalCount);
  const logsCount = toFiniteCount(overview.logs?.totalCount);
  const tracesCount = toFiniteCount(overview.traces?.totalCount);
  const activeSignalCount = Math.min(3, toFiniteCount(overview.activeSignalCount));
  const boundEntityCount = toFiniteCount(overview.boundEntityCount) || toFiniteCount(bindings.recentBoundEntities?.length);
  const recentServiceCount = toFiniteCount(overview.recentServiceCount);
  const latestReportCopy = overview.latestObservedAt ? formatTime(overview.latestObservedAt) : translateText(t, 'otlp.readiness.latest.empty');
  const latestReportMeta = overview.latestObservedAt
    ? translateText(t, 'otlp.readiness.latest.received')
    : translateText(t, 'otlp.readiness.latest.waiting');

  return [
    {
      key: 'signals',
      title: translateText(t, 'otlp.readiness.signals.title'),
      copy: translateText(t, 'otlp.readiness.signals.copy', { active: activeSignalCount, total: 3 }),
      meta: `Metrics ${metricsCount} · Logs ${logsCount} · Traces ${tracesCount}`,
      tone: activeSignalCount > 0 ? 'success' : 'neutral'
    },
    {
      key: 'latest-report',
      title: translateText(t, 'otlp.readiness.latest.title'),
      copy: latestReportCopy,
      meta: latestReportMeta,
      tone: overview.latestObservedAt ? 'neutral' : 'warning'
    },
    {
      key: 'entity-binding',
      title: translateText(t, 'otlp.readiness.entity.title'),
      copy: translateText(t, 'otlp.readiness.entity.copy', { count: boundEntityCount }),
      meta: translateText(t, 'otlp.readiness.entity.meta'),
      tone: boundEntityCount > 0 ? 'success' : 'warning'
    },
    {
      key: 'service-discovery',
      title: translateText(t, 'otlp.readiness.discovery.title'),
      copy: translateText(t, 'otlp.readiness.discovery.copy', { count: recentServiceCount }),
      meta: translateText(t, 'otlp.readiness.discovery.meta'),
      tone: recentServiceCount > 0 ? 'success' : 'neutral'
    }
  ];
}

function readinessStatusTone(status: string | null | undefined): ReadinessTone {
  if (status === 'success') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'danger' || status === 'error') return 'danger';
  return 'neutral';
}

export function buildSelfCheckRows(checks: OtlpIngestionOverview['readinessChecks'] = []): OtlpSelfCheckRow[] {
  return checks.map(check => ({
    key: check.key,
    title: check.title,
    copy: check.summary || '-',
    meta: check.detail || '-',
    tone: readinessStatusTone(check.status)
  }));
}

export function buildCollectionLoopLinks(t?: Translator): OtlpCollectionLoopLink[] {
  return [
    {
      key: 'otlp-intake',
      title: translateText(t, 'otlp.collection-loop.otlp-intake.title'),
      copy: translateText(t, 'otlp.collection-loop.otlp-intake.copy'),
      href: '/ingestion/otlp',
      meta: translateText(t, 'otlp.collection-loop.otlp-intake.meta')
    },
    {
      key: 'traditional-monitoring',
      title: translateText(t, 'otlp.collection-loop.traditional-monitoring.title'),
      copy: translateText(t, 'otlp.collection-loop.traditional-monitoring.copy'),
      href: '/monitors',
      meta: translateText(t, 'otlp.collection-loop.traditional-monitoring.meta')
    },
    {
      key: 'collector-cluster',
      title: translateText(t, 'otlp.collection-loop.collector-cluster.title'),
      copy: translateText(t, 'otlp.collection-loop.collector-cluster.copy'),
      href: '/setting/collector',
      meta: translateText(t, 'otlp.collection-loop.collector-cluster.meta')
    },
    {
      key: 'monitoring-template',
      title: translateText(t, 'otlp.collection-loop.monitoring-template.title'),
      copy: translateText(t, 'otlp.collection-loop.monitoring-template.copy'),
      href: '/setting/define',
      meta: translateText(t, 'otlp.collection-loop.monitoring-template.meta')
    },
    {
      key: 'service-discovery',
      title: translateText(t, 'otlp.collection-loop.service-discovery.title'),
      copy: translateText(t, 'otlp.collection-loop.service-discovery.copy'),
      href: '/entities/discovery',
      meta: translateText(t, 'otlp.collection-loop.service-discovery.meta')
    },
    {
      key: 'object-directory',
      title: translateText(t, 'otlp.collection-loop.object-directory.title'),
      copy: translateText(t, 'otlp.collection-loop.object-directory.copy'),
      href: '/entities',
      meta: translateText(t, 'otlp.collection-loop.object-directory.meta')
    }
  ];
}

export function buildProtocolOptions(guide: OtlpIngestionGuide, t: Translator): Array<{ key: Protocol; label: string }> {
  return [
    { key: 'http', label: guide.httpProtocolLabel || t('otlp.protocol.http') },
    { key: 'grpc', label: guide.grpcProtocolLabel || t('otlp.protocol.grpc') }
  ];
}

export function buildGuideAuthRows(guide: OtlpIngestionGuide, t: Translator) {
  const rows = [];
  if (guide.authHeaderName || guide.authHeaderExample) {
    rows.push({
      title: t('otlp.guide.auth-header'),
      copy: `${guide.authHeaderName || '-'} · ${guide.authHeaderExample || '-'}`,
      meta: 'auth'
    });
  }
  if (guide.grpcAuthorityExample) {
    rows.push({
      title: t('otlp.guide.grpc-authority'),
      copy: guide.grpcAuthorityExample,
      meta: 'grpc'
    });
  }
  return rows;
}

export function filterGuideRowsByProtocol(signals: OtlpIngestionGuide['signals'] = [], protocol: Protocol, t?: Translator) {
  return buildGuideRows(signals.filter(item => !item.protocol || item.protocol === protocol), t);
}

export function filterGuideSnippetsByProtocol(snippets: OtlpIngestionGuide['snippets'] = [], protocol: Protocol) {
  return snippets.filter(item => !item.protocol || item.protocol === protocol);
}
