import type { EntityDefinitionActivity, EntityDefinitionFormat, EntityDefinitionWorkspaceTemplate, EntityDto, Entity } from '@/lib/types';
import {
  buildEntityEditorAttributionRows,
  translateEntityEditorViewModel,
  type EntityEditorAttributionRow,
  type EntityEditorAttributionState
} from '@/lib/entity-editor/view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const KNOWN_IMPORT_ENTITY_TYPES = new Set(['system', 'service', 'api', 'endpoint', 'database', 'queue', 'middleware', 'host', 'pod', 'container']);
const KNOWN_IMPORT_ENTITY_SOURCES = new Set(['manual', 'telemetry', 'otel_resource', 'workspace', 'discovery', 'template', 'import']);
const KNOWN_IMPORT_FORMATS = new Set(['yaml', 'json', 'curl']);
export const IMPORT_PREVIEW_VISIBLE_ROW_LIMIT = 100;

export type ImportPreviewRow = {
  key: string;
  dto: EntityDto;
  title: string;
  subtitle?: string;
  kindLabel: string;
  sourceLabel: string;
  telemetryLabel: string;
  gapKeys: Array<'owner' | 'system' | 'implementedBy' | 'telemetry' | 'runbook'>;
  gaps: string[];
  attributionLabel: string;
  attributionState: EntityEditorAttributionState;
  attributionRows: EntityEditorAttributionRow[];
  validationLabel: string;
  readinessScore: number;
};

export type ImportQueueGroup = {
  key: 'ready' | 'attention' | 'telemetry';
  title: string;
  summary: string;
  actionLabel: string;
  scope: 'ready' | 'attention' | 'telemetry';
  rows: ImportPreviewRow[];
};

export function buildImportPreviewViewport(rows: ImportPreviewRow[], limit = IMPORT_PREVIEW_VISIBLE_ROW_LIMIT) {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  const visibleRows = rows.slice(0, normalizedLimit);

  return {
    visibleRows,
    totalCount: rows.length,
    overflowCount: Math.max(0, rows.length - visibleRows.length)
  };
}

export function buildImportMetrics(
  input: { format: EntityDefinitionFormat; templateCount: number; activityCount: number },
  t: Translator
) {
  return [
    { label: t('entity.definition.import.format'), value: formatLabel(input.format, t) },
    { label: t('entity.definition.workspace.template.custom'), value: String(input.templateCount) },
    { label: t('entities.definition.workspace.activity-title'), value: String(input.activityCount) }
  ];
}

export function buildTemplateRows(items: EntityDefinitionWorkspaceTemplate[], t: Translator) {
  return items.map(item => ({
    key: String(item.id),
    title: item.name,
    copy: trim(item.summary) ?? trim(item.kind) ?? emptyImportValue(t),
    meta: `${formatLabel(item.format, t)} · ${localizeTemplateSource(item.source, t)}`
  }));
}

export function buildActivityRows(items: EntityDefinitionActivity[], t: Translator) {
  return items.map(item => ({
    title: localizeActivityText(item.summary, t),
    copy: localizeActivityText(item.detail || item.activityType, t),
    meta: `${localizeActivityStatus(item.status, t)} · ${formatLabel(item.format, t)}`
  }));
}

export function buildImportPreviewRows(items: EntityDto[], t: Translator): ImportPreviewRow[] {
  return items.map((dto, index) => {
    const entity = dto.entity || {};
    const gapKeys: ImportPreviewRow['gapKeys'] = [];
    const gaps: string[] = [];
    const rawAttributionRows = buildEntityEditorAttributionRows(dto, (key, params) =>
      translateOrFallback(t, key, translateEntityEditorViewModel(key, params), params)
    );
    const identities = dto.identities || [];
    const monitorBinds = dto.monitorBinds || [];
    const hasIdentityEvidence = identities.length > 0;
    const hasMonitorBindEvidence = monitorBinds.length > 0;
    const attributionRows = rawAttributionRows.map(row =>
      row.key === 'monitor-binding' && !hasMonitorBindEvidence && hasIdentityEvidence
        ? {
            ...row,
            meta: t('entity.definition.import.monitor-bind.optional-meta'),
            state: 'review' as const
          }
        : row
    );
    const attributionState = resolveImportAttributionState(dto, attributionRows);

    if (trim(entity.owner) == null) {
      gapKeys.push('owner');
      gaps.push(t('entity.field.owner'));
    }
    if (trim(entity.system) == null && requiresSystem(entity.type)) {
      gapKeys.push('system');
      gaps.push(t('entity.field.system'));
    }
    if (entity.type === 'api' && (entity.implementedBy || []).length === 0) {
      gapKeys.push('implementedBy');
      gaps.push(t('entity.field.implemented-by'));
    }
    if (!hasIdentityEvidence && !hasMonitorBindEvidence) {
      gapKeys.push('telemetry');
      gaps.push(t('entity.definition.import.gap.telemetry'));
    }
    if (trim(entity.runbook) == null) {
      gapKeys.push('runbook');
      gaps.push(t('entity.field.runbook'));
    }

    return {
      key: String(entity.name || entity.displayName || index),
      dto,
      title: getEntityTitle(entity, t),
      subtitle: getEntitySubtitle(entity),
      kindLabel: localizeImportEntityKind(entity.type, t),
      sourceLabel: localizeImportEntitySource(entity.source, t),
      telemetryLabel:
        hasMonitorBindEvidence || hasIdentityEvidence
          ? t('entity.definition.import.telemetry.ready')
          : t('entity.definition.import.telemetry.pending'),
      attributionLabel: localizeImportAttributionState(attributionState, t),
      attributionState,
      attributionRows,
      gapKeys,
      gaps,
      validationLabel:
        gaps.length === 0
          ? t('entity.definition.import.validation.ready')
          : t('entity.definition.import.validation.needs-attention'),
      readinessScore: Math.max(0, 100 - gaps.length * 20)
    };
  });
}

function resolveImportAttributionState(dto: EntityDto, rows: EntityEditorAttributionRow[]): EntityEditorAttributionState {
  const hasTelemetryEvidence = (dto.identities || []).length > 0 || (dto.monitorBinds || []).length > 0;
  if (!hasTelemetryEvidence) {
    return 'missing';
  }

  return rows.every(row => row.state === 'ready') ? 'ready' : 'review';
}

function localizeImportAttributionState(state: EntityEditorAttributionState, t: Translator) {
  if (state === 'ready') {
    return t('entity.definition.import.attribution.ready');
  }
  if (state === 'missing') {
    return t('entity.definition.import.attribution.missing');
  }
  return t('entity.definition.import.attribution.review');
}

export function buildImportSummaryFacts(rows: ImportPreviewRow[], t: Translator) {
  const readyCount = rows.filter(row => row.gaps.length === 0).length;
  const attentionCount = rows.filter(row => row.gaps.length > 0).length;
  const telemetryPendingCount = rows.filter(row => row.gapKeys.includes('telemetry')).length;

  return [
    {
      label: t('entity.definition.import.summary.ready'),
      value: String(readyCount)
    },
    {
      label: t('entity.definition.import.summary.attention'),
      value: String(attentionCount)
    },
    {
      label: t('entity.definition.import.summary.telemetry'),
      value: String(telemetryPendingCount)
    }
  ];
}

export function buildImportQueueGroups(rows: ImportPreviewRow[], t: Translator): ImportQueueGroup[] {
  const readyRows = rows.filter(row => row.gaps.length === 0);
  const attentionRows = rows.filter(row => row.gaps.length > 0);
  const telemetryRows = rows.filter(row => row.gapKeys.includes('telemetry'));
  const groups: ImportQueueGroup[] = [];

  if (readyRows.length > 0) {
    groups.push({
      key: 'ready',
      title: t('entity.definition.import.queue.ready.title'),
      summary: t('entity.definition.import.queue.ready.copy'),
      actionLabel: t('entity.definition.import.queue.ready.action'),
      scope: 'ready',
      rows: readyRows
    });
  }

  if (attentionRows.length > 0) {
    groups.push({
      key: 'attention',
      title: t('entity.definition.import.queue.attention.title'),
      summary: t('entity.definition.import.queue.attention.copy'),
      actionLabel: t('entity.definition.import.queue.attention.action'),
      scope: 'attention',
      rows: attentionRows
    });
  }

  if (telemetryRows.length > 0) {
    groups.push({
      key: 'telemetry',
      title: t('entity.definition.import.queue.telemetry.title'),
      summary: t('entity.definition.import.queue.telemetry.copy'),
      actionLabel: t('entity.definition.import.queue.telemetry.action'),
      scope: 'telemetry',
      rows: telemetryRows
    });
  }

  return groups;
}

export function formatImportPreviewRowCopy(row: ImportPreviewRow, t: Translator) {
  const subtitle = trim(row.subtitle);
  const gapSummary =
    row.gaps.length > 0
      ? t('entity.definition.import.validation.needs-attention-fields', { fields: row.gaps.join(' · ') })
      : row.validationLabel;

  return subtitle == null ? gapSummary : `${subtitle} · ${gapSummary}`;
}

function emptyImportValue(t: Translator) {
  return translateOrFallback(t, 'common.none', 'None');
}

function formatLabel(format: string | null | undefined, t: Translator) {
  const normalized = trim(format);
  if (normalized == null) {
    return emptyImportValue(t);
  }

  const key = normalized.toLowerCase();
  return KNOWN_IMPORT_FORMATS.has(key) ? key.toUpperCase() : t('entity.definition.import.format.unknown', { format: normalized });
}

function getEntityTitle(entity: Entity | undefined, t: Translator) {
  return trim(entity?.displayName) ?? trim(entity?.name) ?? emptyImportValue(t);
}

function getEntitySubtitle(entity?: Entity) {
  if (entity == null || entity.displayName == null || entity.displayName === entity.name) {
    return undefined;
  }

  return entity.name;
}

function localizeImportEntityKind(type: string | null | undefined, t: Translator) {
  const normalized = trim(type);
  if (normalized == null) {
    return emptyImportValue(t);
  }

  const key = normalized.toLowerCase();
  return KNOWN_IMPORT_ENTITY_TYPES.has(key)
    ? translateOrFallback(t, `entity.type.${key}`, humanize(normalized))
    : t('entity.definition.import.kind.unknown', { kind: normalized });
}

function localizeImportEntitySource(source: string | null | undefined, t: Translator) {
  const normalized = trim(source);
  if (normalized == null) {
    return emptyImportValue(t);
  }

  const key = normalized.toLowerCase();
  return KNOWN_IMPORT_ENTITY_SOURCES.has(key)
    ? translateOrFallback(t, `entity.source.${key}`, humanize(normalized))
    : t('entity.definition.import.source.unknown', { source: normalized });
}

function requiresSystem(type?: string) {
  return type != null && ['service', 'api', 'endpoint', 'database', 'queue', 'middleware'].includes(type);
}

function humanize(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map(token => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

function trim(value?: string | null) {
  if (value == null) {
    return null;
  }

  const next = value.trim();
  return next === '' ? null : next;
}

function localizeActivityStatus(status: string | null | undefined, t: Translator) {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized === 'success') return t('entity.definition.import.activity.status.success');
  if (normalized === 'saved') return t('entity.definition.import.activity.status.saved');
  if (normalized === 'starter') return t('entity.definition.import.activity.status.starter');
  if (normalized === 'failed' || normalized === 'failure' || normalized === 'error') {
    return t('entity.definition.import.activity.status.failed');
  }
  if (normalized === 'preview') return t('entity.definition.import.activity.status.preview');
  const fallback = trim(status);
  return fallback == null ? emptyImportValue(t) : t('entity.definition.import.activity.status.unknown', { status: fallback });
}

function localizeActivityText(value: string | null | undefined, t: Translator) {
  const normalized = trim(value);
  if (normalized == null) return emptyImportValue(t);
  return normalized
    .replace(/\bTelemetry discovery applied\b/g, t('entity.definition.import.activity.summary.telemetry-discovery-applied'))
    .replace(/\bCatalog entity updated\b/g, t('entity.definition.import.activity.summary.catalog-entity-updated'))
    .replace(/\bCatalog entity created\b/g, t('entity.definition.import.activity.summary.catalog-entity-created'))
    .replace(/\bendpoint:/g, `${t('entity.definition.import.activity.field.endpoint')}:`)
    .replace(/\bservice:/g, `${t('entity.definition.import.activity.field.service')}:`)
    .replace(/\bsystem:/g, `${t('entity.definition.import.activity.field.system')}:`)
    .replace(/\bsource:/g, `${t('entity.definition.import.activity.field.source')}:`)
    .replace(/\bowner:/g, `${t('entity.definition.import.activity.field.owner')}:`)
    .replace(/\benvironment:/g, `${t('entity.definition.import.activity.field.environment')}:`)
    .replace(/\bevidence:/g, `${t('entity.definition.import.activity.field.evidence')}:`)
    .replace(/\bmonitor binds\b/g, t('entity.definition.import.activity.field.monitor-binds'));
}

function localizeTemplateSource(source: string | null | undefined, t: Translator) {
  const normalized = (source || '').trim().toLowerCase();
  if (normalized === 'workspace') return t('entity.definition.import.template.source.workspace');
  if (normalized === 'saved') return t('entity.definition.import.template.source.saved');
  if (normalized === 'starter') return t('entity.definition.import.template.source.starter');
  if (normalized === 'custom') return t('entity.definition.import.template.source.custom');
  const fallback = trim(source);
  return fallback == null ? emptyImportValue(t) : t('entity.definition.import.template.source.unknown', { source: fallback });
}

function translateOrFallback(t: Translator, key: string, fallback: string, params?: Record<string, string | number | null | undefined>) {
  const translated = t(key, params);
  return translated === key ? fallback : translated;
}
