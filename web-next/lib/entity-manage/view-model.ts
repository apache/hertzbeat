import type { EntitySummaryInfo } from '@/lib/types';
import { buildLightweightEntityHealthAffordance } from '../entity-health-affordance';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type EntityStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

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

  return items.map(item => {
    const entity = item.entity || {};
    return {
      key: String(entity.id || `${entity.name}-${entity.type}`),
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
  formatTime: (value?: number | string | null) => string
) {
  return items.map(item => {
    const entity = item.entity || {};
    const key = String(entity.id || `${entity.name}-${entity.type}`);

    return {
      key,
      name: entity.displayName || entity.name || t('entities.list.item.fallback'),
      type: entityTypeLabel(entity.type),
      environment: entityEnvironmentLabel(entity.environment),
      status: entityStatusLabel(entity.status),
      statusTone: entityStatusTone(entity.status),
      health: buildLightweightEntityHealthAffordance({
        status: entity.status,
        monitorCount: item.monitorCount,
        activeAlertCount: item.activeAlertCount
      }, t),
      monitorCount: String(item.monitorCount || 0),
      activeAlertCount: String(item.activeAlertCount || 0),
      relationCount: String(item.relationCount || 0),
      updatedAt: formatTime(item.lastEvidenceAt || null),
      href: entity.id ? `/entities/${entity.id}` : '/entities'
    };
  });
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
