import type { EntitySummaryInfo } from '@/lib/types';
import { buildLightweightEntityHealthAffordance } from '../entity-health-affordance';
import { appendSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type EntityStatusTone = 'success' | 'warning' | 'danger' | 'neutral';
type EntityRowNavigationContext = Pick<SignalRouteContext, 'returnTo' | 'source' | 'timeRange' | 'start' | 'end' | 'refresh' | 'live' | 'tz' | 'timezone' | 'probe' | 'monitorId' | 'monitorName' | 'monitorApp' | 'monitorInstance'>;

function entityStatusTone(status: string | null | undefined): EntityStatusTone {
  const normalized = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'healthy' || normalized === 'up' || normalized === 'normal') return 'success';
  if (normalized === 'warning') return 'warning';
  if (['abnormal', 'critical', 'down', 'offline', 'unhealthy'].includes(normalized)) return 'danger';
  return 'neutral';
}

export function isEntityHealthyStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
  return normalized === 'healthy' || normalized === 'up' || normalized === 'normal';
}

export function isEntityPendingEvidenceStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
  return !normalized || normalized === 'unknown' || normalized === 'paused';
}

export function isEntityAbnormalStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase().replace(/[\s-]+/g, '_');
  return ['abnormal', 'critical', 'degraded', 'down', 'offline', 'unhealthy', 'warning'].includes(normalized);
}

export function resolveEntityListStatusReason(reason: string | null | undefined, t: Translator) {
  const normalized = reason?.trim();
  if (!normalized) {
    return '';
  }
  if (normalized === 'no live evidence bound yet') {
    return t('entities.list.row.status.no-live-evidence');
  }
  return t('entities.list.row.status.reason', { reason: normalized });
}

function buildEntityRowKey(entity: Partial<NonNullable<EntitySummaryInfo['entity']>>, index: number) {
  const id = entity.id == null ? '' : String(entity.id).trim();
  if (id) return id;

  const name = entity.name?.trim() || entity.displayName?.trim() || 'entity';
  const type = entity.type?.trim() || 'unknown';
  return `${name}-${type}-${index}`;
}

export function buildEntityMetrics(items: Array<Pick<EntitySummaryInfo, 'activeAlertCount' | 'monitorCount' | 'relationCount'>>, t: Translator) {
  const totalAlerts = items.reduce((sum, item) => sum + (item.activeAlertCount || 0), 0);
  const totalMonitors = items.reduce((sum, item) => sum + (item.monitorCount || 0), 0);
  const totalRelations = items.reduce((sum, item) => sum + (item.relationCount || 0), 0);

  return [
    { label: t('entities.list.metric.alerts'), value: String(totalAlerts), tone: totalAlerts > 0 ? 'warning' : undefined },
    { label: t('entities.list.metric.monitors'), value: String(totalMonitors), tone: totalMonitors > 0 ? 'success' : undefined },
    { label: t('entities.list.metric.relations'), value: String(totalRelations) }
  ];
}

export function buildEntityRows(
  items: EntitySummaryInfo[],
  t: Translator,
  entityTypeLabel: (type: string | null | undefined) => string,
  entityEnvironmentLabel: (environment: string | null | undefined) => string,
  formatTime: (value?: number | string | null) => string
) {
  const emptyValue = t('common.none');

  return items.map((item, index) => {
    const entity = item.entity || {};
    return {
      key: buildEntityRowKey(entity, index),
      title: entity.displayName || entity.name || t('entities.list.item.fallback'),
      copy: `${entityTypeLabel(entity.type)} · ${entity.owner || emptyValue} · ${entityEnvironmentLabel(entity.environment)}`,
      meta: t('entities.list.item.meta', {
        monitorCount: item.monitorCount || 0,
        alertCount: item.activeAlertCount || 0,
        time: formatTime(item.lastEvidenceAt || null)
      })
    };
  });
}

export function buildEntityTableRows(
  items: EntitySummaryInfo[],
  t: Translator,
  entityTypeLabel: (type: string | null | undefined) => string,
  entityEnvironmentLabel: (environment: string | null | undefined) => string,
  entityStatusLabel: (status: string | null | undefined) => string,
  formatTime: (value?: number | string | null) => string,
  navigationContext: EntityRowNavigationContext = {}
) {
  const discoveryCandidateMode = navigationContext.source?.trim() === 'discovery-candidate';
  return items.map((item, index) => {
    const entity = item.entity || {};
    const key = buildEntityRowKey(entity, index);
    const owner = entity.owner?.trim() || t('common.none');
    const displayName = entity.displayName || entity.name || t('entities.list.item.fallback');
    const identityName = entity.name && entity.name !== displayName ? entity.name : '';
    const statusReason = resolveEntityListStatusReason(item.status?.reason, t);

    return {
      key,
      name: displayName,
      identityName,
      owner,
      type: entityTypeLabel(entity.type),
      environment: entityEnvironmentLabel(entity.environment),
      status: entityStatusLabel(entity.status),
      ...(statusReason ? { statusReason } : {}),
      statusTone: entityStatusTone(entity.status),
      health: buildLightweightEntityHealthAffordance({
        status: entity.status,
        monitorCount: item.monitorCount,
        activeAlertCount: item.activeAlertCount
      }, t),
      monitorCount: String(item.monitorCount || 0),
      activeAlertCount: String(item.activeAlertCount || 0),
      identityCount: String(item.identityCount || 0),
      relationCount: String(item.relationCount || 0),
      updatedAt: formatTime(item.lastEvidenceAt || null),
      href: entity.id ? buildEntityTableRowHref(`/entities/${entity.id}`, navigationContext) : '/entities',
      ownerHref: entity.id ? buildEntityTableRowHref(`/entities/${entity.id}/edit`, navigationContext) : '/entities/new',
      metricHref: entity.id ? buildEntitySignalHandoffHref('/ingestion/otlp/metrics', entity, navigationContext) : '/ingestion/otlp/metrics',
      logHref: entity.id ? buildEntitySignalHandoffHref('/log/manage', entity, navigationContext) : '/log/manage',
      traceHref: entity.id ? buildEntitySignalHandoffHref('/trace/manage', entity, navigationContext) : '/trace/manage',
      discoveryCandidateMode
    };
  });
}

function buildEntityTableRowHref(baseHref: string, navigationContext: EntityRowNavigationContext) {
  const params = new URLSearchParams();
  const source = navigationContext.source?.trim();
  const returnTo = navigationContext.returnTo?.trim();
  const monitorId = navigationContext.monitorId?.trim();
  const monitorName = navigationContext.monitorName?.trim();
  const monitorApp = navigationContext.monitorApp?.trim();
  const monitorInstance = navigationContext.monitorInstance?.trim();
  if (source) params.set('source', source);
  if (returnTo) params.set('returnTo', returnTo);
  if (monitorId) params.set('monitorId', monitorId);
  if (monitorName) params.set('monitorName', monitorName);
  if (monitorApp) params.set('monitorApp', monitorApp);
  if (monitorInstance) params.set('monitorInstance', monitorInstance);
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

function buildEntitySignalHandoffHref(baseHref: string, entity: NonNullable<EntitySummaryInfo['entity']>, navigationContext: EntityRowNavigationContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, {
    ...navigationContext,
    entityId: entity.id == null ? undefined : String(entity.id),
    entityType: entity.type,
    entityName: entity.displayName || entity.name,
    serviceName: entity.name,
    environment: entity.environment
  });
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

export function buildSelectedEntityRows(
  selected: EntitySummaryInfo | null,
  t: Translator,
  entityTypeLabel: (type: string | null | undefined) => string,
  entityStatusLabel: (status: string | null | undefined) => string
) {
  if (!selected) {
    const emptyValue = t('common.none');
    return [{ title: t('entities.list.unselected.title'), copy: t('entities.list.unselected.copy'), meta: emptyValue }];
  }

  return [
    {
      title: selected.entity?.displayName || selected.entity?.name || t('entities.list.item.fallback'),
      copy: `${entityTypeLabel(selected.entity?.type)} · ${entityStatusLabel(selected.entity?.status)}`,
      meta: t('entities.list.selected.alerts', { count: selected.activeAlertCount || 0 })
    },
    {
      title: t('entities.list.rail.identity-monitor-relation'),
      copy: `${selected.identityCount || 0} / ${selected.monitorCount || 0} / ${selected.relationCount || 0}`,
      meta: selected.definitionActivitySummary || t('entities.list.selected.definition-activity')
    }
  ];
}
