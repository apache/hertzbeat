import type { EntityDetailDto } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export function buildEntityDetailUrl(entityId: string) {
  return `/entities/${entityId}/detail`;
}

function isRecoverableEntityDetailError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('404') ||
    error.message.includes('Entity not exist') ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('socket hang up')
  );
}

export function buildFallbackEntityDetail(entityId: string): EntityDetailDto {
  const parsedId = Number.parseInt(entityId, 10);
  const normalizedId = Number.isFinite(parsedId) ? parsedId : undefined;

  return {
    entity: {
      entity: {
        id: normalizedId,
        name: normalizedId != null ? `entity-${normalizedId}` : 'entity-draft',
        displayName: normalizedId != null ? `实体 ${normalizedId}` : '实体草稿',
        type: 'service',
        status: 'unknown',
        owner: 'platform',
        environment: 'prod',
        system: 'catalog',
        source: 'manual',
        description: '后端实体详情暂不可用时展示的临时工作台。'
      },
      identities: [],
      monitorBinds: [],
      relations: []
    },
    evidenceSummary: {
      activeAlertCount: 0,
      downMonitorCount: 0,
      healthyMonitorCount: 0,
      identityCount: 0,
      logHintCount: 0,
      lastEvidenceAt: null
    },
    alertSummary: {
      totalActiveAlerts: 0,
      latestStatusChangeAt: null
    },
    monitorSummary: {
      totalBoundMonitors: 0,
      latestStatusChangeAt: null
    },
    logSummary: {
      hintCount: 0,
      preferredQueryTitle: null,
      fallbackSearchTerm: null
    },
    traceSummary: {
      recentTraceCount: 0,
      recentErrorTraceCount: 0,
      latestObservedAt: null,
      active: false,
      latestTraceId: null
    },
    boundMonitors: [],
    activeAlerts: [],
    nextActions: [
      {
        actionType: 'definition',
        title: '打开定义',
        summary: '先检查定义工作台，再补齐归属和证据。',
        actionLabel: '打开定义',
        priority: 1
      }
    ]
  };
}

export async function loadEntityDetail(apiGet: ApiGetter, entityId: string) {
  try {
    return await apiGet<EntityDetailDto>(buildEntityDetailUrl(entityId));
  } catch (error) {
    if (isRecoverableEntityDetailError(error)) {
      return buildFallbackEntityDetail(entityId);
    }
    throw error;
  }
}
