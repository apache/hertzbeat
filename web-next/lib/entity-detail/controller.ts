import type { EntityDetailDto } from '@/lib/types';
import { interpolate, type TranslationParams } from '@/lib/i18n';
import { SUPPLEMENTAL_MESSAGES } from '@/lib/i18n-runtime-messages';

type ApiGetter = <T>(url: string) => Promise<T>;
type EntityDetailReader = <T = EntityDetailDto>(entityId: string | number) => Promise<T>;
type EntityDetailTranslator = (key: string, params?: TranslationParams) => string;

function defaultEntityDetailTranslator(key: string, params?: TranslationParams) {
  return interpolate(SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? key, params);
}

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

function resolveFallbackDetailReason(error?: unknown) {
  if (!(error instanceof Error)) {
    return 'recoverable-detail-load-failed';
  }

  if (error.message.includes('404') || error.message.includes('Entity not exist')) {
    return 'entity-detail-missing';
  }

  return 'recoverable-detail-load-failed';
}

export function buildFallbackEntityDetail(
  entityId: string,
  t: EntityDetailTranslator = defaultEntityDetailTranslator,
  reason = 'recoverable-detail-load-failed'
): EntityDetailDto {
  const parsedId = Number.parseInt(entityId, 10);
  const normalizedId = Number.isFinite(parsedId) ? parsedId : undefined;
  const missingEntity = reason === 'entity-detail-missing';

  return {
    entity: {
      entity: {
        id: normalizedId,
        name: normalizedId != null ? `entity-${normalizedId}` : 'entity-draft',
        displayName:
          normalizedId != null
            ? t('entities.detail.fallback.display-name', { id: normalizedId })
            : t('entities.detail.fallback.draft-name'),
        type: 'service',
        status: 'unavailable',
        owner: 'platform',
        environment: undefined,
        system: 'catalog',
        source: 'unavailable',
        description: t(missingEntity ? 'entities.detail.state.missing.description' : 'entities.detail.fallback.description')
      },
      identities: [],
      monitorBinds: [],
      relations: []
    },
    detailState: {
      state: 'unavailable',
      message: t(missingEntity ? 'entities.detail.state.missing.copy' : 'entities.detail.state.unavailable.copy'),
      reason
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
    topologyNeighbors: [],
    nextActions: [
      {
        actionType: 'definition',
        title: t('entities.detail.action-text.open-definition'),
        summary: t('entities.detail.action-text.review-definition'),
        actionLabel: t('entities.detail.action-text.open-definition'),
        priority: 1
      }
    ]
  };
}

async function loadEntityDetailWithFallback(
  readDetail: () => Promise<EntityDetailDto>,
  entityId: string,
  t: EntityDetailTranslator = defaultEntityDetailTranslator
) {
  try {
    return await readDetail();
  } catch (error) {
    if (isRecoverableEntityDetailError(error)) {
      return buildFallbackEntityDetail(entityId, t, resolveFallbackDetailReason(error));
    }
    throw error;
  }
}

export async function loadEntityDetail(apiGet: ApiGetter, entityId: string, t: EntityDetailTranslator = defaultEntityDetailTranslator) {
  return loadEntityDetailWithFallback(() => apiGet<EntityDetailDto>(buildEntityDetailUrl(entityId)), entityId, t);
}

export async function loadEntityDetailFromFacade(
  readEntityDetail: EntityDetailReader,
  entityId: string,
  t: EntityDetailTranslator = defaultEntityDetailTranslator
) {
  return loadEntityDetailWithFallback(() => readEntityDetail<EntityDetailDto>(entityId), entityId, t);
}
