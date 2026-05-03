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

function toFiniteCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function defaultFormatTime(value: number | null | undefined) {
  if (!value) return '暂无上报';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无上报';
  const pad = (item: number) => String(item).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

export function buildGuideRows(signals: OtlpIngestionGuide['signals'] = []) {
  return signals.map(item => ({
    title: `${item.signal} · ${item.protocol || '-'}`,
    copy: item.summary || item.note || '-',
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

export function buildReadinessRows(
  overview: OtlpIngestionOverview,
  bindings: Partial<OtlpEntityBindingSummary> = {},
  formatTime: TimeFormatter = defaultFormatTime
): OtlpReadinessRow[] {
  const metricsCount = toFiniteCount(overview.metrics?.totalCount);
  const logsCount = toFiniteCount(overview.logs?.totalCount);
  const tracesCount = toFiniteCount(overview.traces?.totalCount);
  const activeSignalCount = Math.min(3, toFiniteCount(overview.activeSignalCount));
  const boundEntityCount = toFiniteCount(overview.boundEntityCount) || toFiniteCount(bindings.recentBoundEntities?.length);
  const recentServiceCount = toFiniteCount(overview.recentServiceCount);
  const latestReportCopy = overview.latestObservedAt ? formatTime(overview.latestObservedAt) : '暂无上报';
  const latestReportMeta = overview.latestObservedAt ? '已收到遥测' : '等待首条遥测';

  return [
    {
      key: 'signals',
      title: '三信号接入',
      copy: `${activeSignalCount} / 3 活跃`,
      meta: `Metrics ${metricsCount} · Logs ${logsCount} · Traces ${tracesCount}`,
      tone: activeSignalCount > 0 ? 'success' : 'neutral'
    },
    {
      key: 'latest-report',
      title: '最近上报',
      copy: latestReportCopy,
      meta: latestReportMeta,
      tone: overview.latestObservedAt ? 'neutral' : 'warning'
    },
    {
      key: 'entity-binding',
      title: '实体归因',
      copy: `${boundEntityCount} 个实体`,
      meta: '对象目录',
      tone: boundEntityCount > 0 ? 'success' : 'warning'
    },
    {
      key: 'service-discovery',
      title: '服务发现',
      copy: `${recentServiceCount} 个服务`,
      meta: '最近 24 小时',
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

export function buildCollectionLoopLinks(): OtlpCollectionLoopLink[] {
  return [
    {
      key: 'otlp-intake',
      title: 'OTLP 三信号接入',
      copy: '接入 OpenTelemetry 指标、日志和链路，再进入对应工作台排查。',
      href: '/ingestion/otlp',
      meta: '三信号'
    },
    {
      key: 'traditional-monitoring',
      title: '传统监控资源',
      copy: '继续保留主机、数据库、中间件、网络设备等模板化监控。',
      href: '/monitors',
      meta: '已有资源'
    },
    {
      key: 'collector-cluster',
      title: '采集器集群',
      copy: '管理私有化部署中的采集节点、任务分发和接入状态。',
      href: '/setting/collector',
      meta: 'Collector'
    },
    {
      key: 'monitoring-template',
      title: '监控模板',
      copy: '维护多协议采集模板，让传统监控和 OTLP 实体归到同一对象。',
      href: '/setting/define',
      meta: '模板'
    },
    {
      key: 'service-discovery',
      title: '服务发现',
      copy: '把新发现的服务、资源和遥测身份确认到 HertzBeat 实体。',
      href: '/entities/discovery',
      meta: '发现'
    },
    {
      key: 'object-directory',
      title: '对象目录',
      copy: '围绕实体查看资源、三信号、拓扑和告警处理上下文。',
      href: '/entities',
      meta: '实体'
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

export function filterGuideRowsByProtocol(signals: OtlpIngestionGuide['signals'] = [], protocol: Protocol) {
  return buildGuideRows(signals.filter(item => !item.protocol || item.protocol === protocol));
}

export function filterGuideSnippetsByProtocol(snippets: OtlpIngestionGuide['snippets'] = [], protocol: Protocol) {
  return snippets.filter(item => !item.protocol || item.protocol === protocol);
}
