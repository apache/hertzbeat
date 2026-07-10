'use client';

import React from 'react';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EntityDetailSurface } from '@/components/pages/entity-detail-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { apiMessageDelete } from '@/lib/api-client';
import { api } from '@/lib/api-facade';
import { buildEntityDetailUrl, loadEntityDetailFromFacade } from '@/lib/entity-detail/controller';
import { appendSignalRouteContext, stripReturnLabelFromHref, type SignalRouteContext } from '@/lib/signal-route-context';
import type { EntityDetailDto } from '@/lib/types';
import { resetWorkbenchLoadCache } from '@/lib/workbench-load-cache';

const ENTITY_DETAIL_SETTLED_CACHE_TTL_MS = 10_000;
const ENTITY_DETAIL_LOAD_TIMEOUT_MS = 15_000;

export function buildEntityDetailDeleteReturnHref(routeContext?: SignalRouteContext, currentEntityId?: string | number | null) {
  const normalizedReturnTo = stripReturnLabelFromHref(routeContext?.returnTo);
  if (normalizedReturnTo?.startsWith('/') && !normalizedReturnTo.startsWith('//')) {
    const normalizedEntityId = currentEntityId == null ? null : String(currentEntityId);
    const returnPath = normalizedReturnTo.split(/[?#]/, 1)[0];
    const currentEntityPath = normalizedEntityId ? `/entities/${encodeURIComponent(normalizedEntityId)}` : null;
    const isCurrentEntityRoute = currentEntityPath != null && (returnPath === currentEntityPath || returnPath.startsWith(`${currentEntityPath}/`));
    if (!isCurrentEntityRoute) {
      return normalizedReturnTo;
    }
    // After deletion the current entity route is stale, so fall back to the list while preserving inherited context below.
  }

  const params = new URLSearchParams();
  appendSignalRouteContext(params, routeContext ?? {});
  params.delete('returnTo');
  const query = params.toString();
  return query ? `/entities?${query}` : '/entities';
}

export function buildEntityDetailDeleteSuccessHref(returnHref: string, deletedEntityId?: string | number | null) {
  const url = new URL(returnHref, 'http://hertzbeat.local');
  url.searchParams.set('deleteResult', 'success');
  if (deletedEntityId != null) {
    url.searchParams.set('deletedEntity', String(deletedEntityId));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function EntityDetailPage({
  createdResult = false,
  updatedResult = false,
  entityId,
  routeContext
}: {
  createdResult?: boolean;
  updatedResult?: boolean;
  entityId: string;
  routeContext?: SignalRouteContext;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [reloadNonce, setReloadNonce] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const entityDetailUrl = React.useMemo(() => buildEntityDetailUrl(entityId), [entityId]);
  const deleteReturnHref = React.useMemo(() => buildEntityDetailDeleteReturnHref(routeContext, entityId), [entityId, routeContext]);
  const entityDetailCacheKey = React.useMemo(
    () => ['entity-detail', entityDetailUrl, reloadNonce].join(':'),
    [entityDetailUrl, reloadNonce]
  );
  const load = useCallback(async (): Promise<EntityDetailDto> => {
    void reloadNonce;
    return loadEntityDetailFromFacade(api.entities.detail, entityId, t);
  }, [entityId, reloadNonce, t]);

  const handleRefresh = useCallback(() => {
    setActionError(null);
    setReloadNonce(current => current + 1);
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(
    async (entityId: string | number | null | undefined) => {
      if (entityId == null) {
        return;
      }

      setActionError(null);

      try {
        await apiMessageDelete<void>(`/entities/${entityId}`);
        resetWorkbenchLoadCache();
        startTransition(() => {
          router.push(buildEntityDetailDeleteSuccessHref(deleteReturnHref, entityId));
          router.refresh();
        });
      } catch (error) {
        setActionError(error instanceof Error ? error.message : t('entities.detail.delete.failed'));
      }
    },
    [deleteReturnHref, router, t]
  );

  return (
    <ClientWorkbench
      key={entityDetailCacheKey}
      load={load}
      loadingTitle={t('entities.detail.loading.title')}
      loadingCopy={t('entities.detail.loading.copy')}
      loadTimeoutMs={ENTITY_DETAIL_LOAD_TIMEOUT_MS}
      loadingDelayMs={150}
      cacheKey={entityDetailCacheKey}
      cacheSettledTtlMs={ENTITY_DETAIL_SETTLED_CACHE_TTL_MS}
    >
      {detail => (
        <EntityDetailSurface
          detail={detail}
          routeContext={routeContext}
          createdResult={createdResult}
          updatedResult={updatedResult}
          actionError={actionError}
          isPending={isPending}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
        />
      )}
    </ClientWorkbench>
  );
}
