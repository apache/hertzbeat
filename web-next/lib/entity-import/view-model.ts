import type { EntityDefinitionActivity, EntityDefinitionFormat, EntityDefinitionWorkspaceTemplate, EntityDto, Entity } from '@/lib/types';
import { buildEntityEditorAttributionRows, type EntityEditorAttributionRow, type EntityEditorAttributionState } from '@/lib/entity-editor/view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

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

export function buildImportMetrics(
  input: { format: EntityDefinitionFormat; templateCount: number; activityCount: number },
  t: Translator
) {
  return [
    { label: translate(t, 'entity.definition.import.format', 'Import format'), value: input.format.toUpperCase() },
    { label: translate(t, 'entity.definition.workspace.template.custom', 'Templates'), value: String(input.templateCount) },
    { label: translate(t, 'entity.definition.import.activity.shared-title', 'Recent activity'), value: String(input.activityCount) }
  ];
}

export function buildTemplateRows(items: EntityDefinitionWorkspaceTemplate[]) {
  return items.map(item => ({
    key: String(item.id),
    title: item.name,
    copy: item.summary || item.kind || '-',
    meta: `${(item.format || '-').toUpperCase()} · ${localizeTemplateSource(item.source)}`
  }));
}

export function buildActivityRows(items: EntityDefinitionActivity[], _t: Translator) {
  return items.map(item => ({
    title: localizeActivityText(item.summary),
    copy: localizeActivityText(item.detail || item.activityType),
    meta: `${localizeActivityStatus(item.status)} · ${(item.format || '-').toUpperCase()}`
  }));
}

export function buildImportPreviewRows(items: EntityDto[], t: Translator): ImportPreviewRow[] {
  return items.map((dto, index) => {
    const entity = dto.entity || {};
    const gapKeys: ImportPreviewRow['gapKeys'] = [];
    const gaps: string[] = [];
    const attributionRows = buildEntityEditorAttributionRows(dto);
    const attributionState = resolveImportAttributionState(dto, attributionRows);

    if (trim(entity.owner) == null) {
      gapKeys.push('owner');
      gaps.push(translate(t, 'entity.field.owner', 'Owner'));
    }
    if (trim(entity.system) == null && requiresSystem(entity.type)) {
      gapKeys.push('system');
      gaps.push(translate(t, 'entity.field.system', 'System'));
    }
    if (entity.type === 'api' && (entity.implementedBy || []).length === 0) {
      gapKeys.push('implementedBy');
      gaps.push(translate(t, 'entity.field.implemented-by', 'Implemented by'));
    }
    if ((dto.identities || []).length === 0 && (dto.monitorBinds || []).length === 0) {
      gapKeys.push('telemetry');
      gaps.push(translate(t, 'entity.definition.import.gap.telemetry', 'Telemetry bindings'));
    }
    if (trim(entity.runbook) == null) {
      gapKeys.push('runbook');
      gaps.push(translate(t, 'entity.field.runbook', 'Runbook'));
    }

    return {
      key: String(entity.name || entity.displayName || index),
      dto,
      title: getEntityTitle(entity),
      subtitle: getEntitySubtitle(entity),
      kindLabel: translate(t, `entity.type.${entity.type}`, humanize(entity.type || 'entity')),
      sourceLabel: translate(t, `entity.source.${entity.source}`, humanize(entity.source || 'manual')),
      telemetryLabel:
        (dto.monitorBinds || []).length > 0 || (dto.identities || []).length > 0
          ? translate(t, 'entity.definition.import.telemetry.ready', 'Telemetry binding detected')
          : translate(t, 'entity.definition.import.telemetry.pending', 'Telemetry binding still missing'),
      attributionLabel: localizeAttributionState(attributionState),
      attributionState,
      attributionRows,
      gapKeys,
      gaps,
      validationLabel:
        gaps.length === 0
          ? translate(t, 'entity.definition.import.validation.ready', 'Ready to import')
          : translate(t, 'entity.definition.import.validation.needs-attention', 'Needs attention before import'),
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

function localizeAttributionState(state: EntityEditorAttributionState) {
  if (state === 'ready') {
    return '归因完整';
  }
  if (state === 'missing') {
    return '归因缺失';
  }
  return '归因待确认';
}

export function buildImportSummaryFacts(rows: ImportPreviewRow[], t: Translator) {
  const readyCount = rows.filter(row => row.gaps.length === 0).length;
  const attentionCount = rows.filter(row => row.gaps.length > 0).length;
  const telemetryPendingCount = rows.filter(row => row.gapKeys.includes('telemetry')).length;

  return [
    {
      label: translate(t, 'entity.definition.import.summary.ready', 'Ready to import'),
      value: String(readyCount)
    },
    {
      label: translate(t, 'entity.definition.import.summary.attention', 'Needs attention'),
      value: String(attentionCount)
    },
    {
      label: translate(t, 'entity.definition.import.summary.telemetry', 'Telemetry still missing'),
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
      title: translate(t, 'entity.definition.import.queue.ready.title', 'Ready to import'),
      summary: translate(
        t,
        'entity.definition.import.queue.ready.copy',
        'These definitions already meet the basic requirements and can move straight into import or save.'
      ),
      actionLabel: translate(t, 'entity.definition.import.queue.ready.action', 'View ready definitions'),
      scope: 'ready',
      rows: readyRows
    });
  }

  if (attentionRows.length > 0) {
    groups.push({
      key: 'attention',
      title: translate(t, 'entity.definition.import.queue.attention.title', 'Needs attention first'),
      summary: translate(
        t,
        'entity.definition.import.queue.attention.copy',
        'These definitions still miss owner, system, runbook, or interface details. Fix them before import.'
      ),
      actionLabel: translate(t, 'entity.definition.import.queue.attention.action', 'View blocked definitions'),
      scope: 'attention',
      rows: attentionRows
    });
  }

  if (telemetryRows.length > 0) {
    groups.push({
      key: 'telemetry',
      title: translate(t, 'entity.definition.import.queue.telemetry.title', 'Still needs telemetry after import'),
      summary: translate(
        t,
        'entity.definition.import.queue.telemetry.copy',
        'These definitions still do not have telemetry bindings and should return to telemetry discovery after import.'
      ),
      actionLabel: translate(t, 'entity.definition.import.queue.telemetry.action', 'View telemetry-pending definitions'),
      scope: 'telemetry',
      rows: telemetryRows
    });
  }

  return groups;
}

function getEntityTitle(entity?: Entity) {
  return entity?.displayName || entity?.name || '-';
}

function getEntitySubtitle(entity?: Entity) {
  if (entity == null || entity.displayName == null || entity.displayName === entity.name) {
    return undefined;
  }

  return entity.name;
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

function localizeActivityStatus(status?: string | null) {
  const normalized = (status || '').trim().toLowerCase();
  if (normalized === 'success') return '成功';
  if (normalized === 'saved') return '已保存';
  if (normalized === 'starter') return '初始';
  if (normalized === 'failed' || normalized === 'failure' || normalized === 'error') return '失败';
  if (normalized === 'preview') return '预览';
  return status || '-';
}

function localizeActivityText(value?: string | null) {
  if (value == null || value.trim() === '') return '-';
  return value
    .replace(/\bTelemetry discovery applied\b/g, '遥测发现已应用')
    .replace(/\bCatalog entity updated\b/g, '目录实体已更新')
    .replace(/\bCatalog entity created\b/g, '目录实体已创建')
    .replace(/\bendpoint:/g, '端点:')
    .replace(/\bservice:/g, '服务:')
    .replace(/\bsystem:/g, '系统:')
    .replace(/\bsource:/g, '来源:')
    .replace(/\bowner:/g, '负责人:')
    .replace(/\benvironment:/g, '环境:')
    .replace(/\bevidence:/g, '证据:')
    .replace(/\bmonitor binds\b/g, '监控绑定');
}

function localizeTemplateSource(source?: string | null) {
  const normalized = (source || '').trim().toLowerCase();
  if (normalized === 'workspace') return '工作区';
  if (normalized === 'saved') return '已保存';
  if (normalized === 'starter') return '初始';
  if (normalized === 'custom') return '自定义';
  return source || '-';
}

function translate(t: Translator, key: string, fallback: string, params?: Record<string, string | number | null | undefined>) {
  const translated = t(key, params);
  return translated === key ? fallback : translated;
}
