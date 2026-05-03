'use client';

import React from 'react';
import { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EntityDetailSurface } from '@/components/pages/entity-detail-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { loadEntityDetail } from '@/lib/entity-detail/controller';
import { apiMessageDelete, apiMessageGet } from '@/lib/api-client';
import { readSignalRouteContext } from '@/lib/signal-route-context';
import type { EntityDetailDto } from '@/lib/types';

export default function EntityDetailPage({ params }: { params: Promise<{ entityId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const routeContext = readSignalRouteContext(searchParams);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const load = useCallback(async (): Promise<EntityDetailDto> => {
    void reloadNonce;
    const resolved = await params;
    return loadEntityDetail(apiMessageGet, resolved.entityId);
  }, [params, reloadNonce]);

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
    <ClientWorkbench load={load} loadingCopy={t('entities.detail.loading')}>
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
