export type HertzBeatProductSurface = 'otlp' | 'entities' | 'metrics' | 'logs' | 'traces' | 'alerts';

export type ExternalProductReferenceContext = 'product-copy' | 'source-connector' | 'migration-source' | 'compatibility-note';

export type ForbiddenProductLanguageIssue =
  | 'generic-apm-only-narrative'
  | 'external-product-style-copy'
  | 'service-map-copy'
  | 'generic-query-tool-actions';

const surfaceVocabulary: Record<HertzBeatProductSurface, string[]> = {
  otlp: ['采集闭环', '采集集群', '接入质量', '实体归并', '模板绑定', '最后上报时间'],
  entities: ['实体中心', '实体归并', '采集来源', '上下游关系', '健康状态', '模板绑定'],
  metrics: ['关联指标', '监控模板', '阈值规则', '采集来源', '服务健康'],
  logs: ['关联日志', '采集来源', '异常定位', '实体上下文', '告警回溯'],
  traces: ['关联链路', '服务调用', 'traceId/spanId', '上下游关系', '依赖影响'],
  alerts: ['告警中心', '告警降噪', '静默', '抑制', '通知闭环', '分组收敛']
};

export const HERTZBEAT_PRODUCT_LANGUAGE = {
  positioning: '开源私有化的企业运维可观测平台',
  identity: 'HertzBeat 面向私有化可观测和企业运维视角，优先表达采集、实体、模板、三信号和告警闭环。',
  coreLoop: ['采集器', '监控模板', '实体中心', 'OTLP 三信号', '告警闭环'],
  requiredVocabulary: ['采集闭环', '监控模板', '采集集群', '实体归并', '告警降噪', '私有化可观测', '企业运维视角'],
  surfaceVocabulary,
  externalProductPolicy:
    'External product names are allowed only as source connector, migration source, or compatibility-note references; they must not define HertzBeat page identity, layout, or action language.',
  forbiddenNarratives: [
    'Do not describe HertzBeat as only an APM platform.',
    'Do not copy SigNoZ, Datadog, or Google Cloud Observability page structure, proprietary wording, component style, or cloud-console shape.',
    'Do not use generic query-tool actions as the main operations loop when collector, template, entity, and alert closure are the HertzBeat product truth.'
  ]
} as const;

const externalProductPattern = /\b(?:SigNoZ|Datadog|Google Cloud Observability|Google Application Topology)\b/i;
const externalStylePattern = /\b(?:SigNoZ|Datadog|Google Cloud Observability|Google Application Topology)(?:[-\s]?style|[-\s]?first)?\b/i;
const genericApmPattern = /(?:单纯\s*)?APM\s*(?:平台|platform)/i;
const serviceMapPattern = /\bService Map\b|\bApplication Topology\b|Google\s+Application\s+Topology/i;
const genericActionPattern = /\b(?:Save this view|Create an Alert|Add to Dashboard)\b/i;

export function getHertzBeatSurfaceVocabulary(surface: HertzBeatProductSurface) {
  return [...surfaceVocabulary[surface]];
}

export function isAllowedExternalProductReference(reference: string, context: ExternalProductReferenceContext) {
  if (!externalProductPattern.test(reference)) {
    return true;
  }

  if (externalStylePattern.test(reference) && context === 'product-copy') {
    return false;
  }

  return context === 'source-connector' || context === 'migration-source' || context === 'compatibility-note';
}

export function findForbiddenProductLanguage(
  value: string,
  options: { context?: ExternalProductReferenceContext } = {}
): ForbiddenProductLanguageIssue[] {
  const context = options.context ?? 'product-copy';
  const issues = new Set<ForbiddenProductLanguageIssue>();

  if (genericApmPattern.test(value)) {
    issues.add('generic-apm-only-narrative');
  }

  if (externalProductPattern.test(value) && !isAllowedExternalProductReference(value, context)) {
    issues.add('external-product-style-copy');
  }

  if (serviceMapPattern.test(value)) {
    issues.add('service-map-copy');
  }

  if (genericActionPattern.test(value)) {
    issues.add('generic-query-tool-actions');
  }

  return [...issues];
}
