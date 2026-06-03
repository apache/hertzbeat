export type HertzBeatProductSurface = 'otlp' | 'entities' | 'metrics' | 'logs' | 'traces' | 'alerts';

export type ExternalProductReferenceContext = 'product-copy' | 'source-connector' | 'migration-source' | 'compatibility-note';

export type ForbiddenProductLanguageIssue =
  | 'generic-apm-only-narrative'
  | 'external-product-style-copy'
  | 'service-map-copy'
  | 'generic-query-tool-actions';

const surfaceVocabulary: Record<HertzBeatProductSurface, string[]> = {
  otlp: ['collection closure', 'collector fleet', 'ingest quality', 'entity merge', 'template binding', 'last report time'],
  entities: ['entity catalog', 'entity merge', 'collection source', 'upstream/downstream relations', 'health state', 'template binding'],
  metrics: ['related metrics', 'monitor template', 'threshold rule', 'collection source', 'service health'],
  logs: ['related logs', 'collection source', 'exception localization', 'entity context', 'alert backtracking'],
  traces: ['related traces', 'service calls', 'traceId/spanId', 'upstream/downstream relations', 'dependency impact'],
  alerts: ['alert center', 'alert noise reduction', 'silence', 'inhibit', 'notification closure', 'group convergence']
};

export const HERTZBEAT_PRODUCT_LANGUAGE = {
  positioning: 'open-source private-deployable enterprise operations observability platform',
  identity:
    'HertzBeat is framed around private-deployable observability and enterprise operations: collectors, entities, templates, OTLP three signals, and alert closure.',
  coreLoop: ['collectors', 'monitor templates', 'entity catalog', 'OTLP three signals', 'alert closure'],
  requiredVocabulary: [
    'collection closure',
    'monitor template',
    'collector fleet',
    'entity merge',
    'alert noise reduction',
    'private-deployable observability',
    'enterprise operations'
  ],
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
const genericApmPattern = /\b(?:only\s+)?APM\s+platform\b/i;
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
