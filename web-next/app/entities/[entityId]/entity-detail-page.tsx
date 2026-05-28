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
import type { SignalRouteContext } from '@/lib/signal-route-context';
import type { EntityDetailDto } from '@/lib/types';

const ENTITY_DETAIL_SETTLED_CACHE_TTL_MS = 10_000;

export default function EntityDetailPage({
  entityId,
  routeContext
}: {
  entityId: string;
  routeContext?: SignalRouteContext;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [reloadNonce, setReloadNonce] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const entityDetailUrl = React.useMemo(() => buildEntityDetailUrl(entityId), [entityId]);
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
        startTransition(() => {
          router.push('/entities');
          router.refresh();
        });
      } catch (error) {
        setActionError(error instanceof Error ? error.message : t('entities.detail.delete.failed'));
      }
    },
    [router, t]
  );

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.detail.loading')}
      cacheKey={entityDetailCacheKey}
      cacheSettledTtlMs={ENTITY_DETAIL_SETTLED_CACHE_TTL_MS}
    >
      {detail => (
        <EntityDetailSurface
          detail={detail}
          routeContext={routeContext}
          actionError={actionError}
          isPending={isPending}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
        />
      )}
    </ClientWorkbench>
  );
}
