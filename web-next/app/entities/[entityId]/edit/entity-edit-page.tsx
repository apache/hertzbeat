'use client';

import React from 'react';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HzButton, HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityEditorSurface } from '@/components/pages/entity-editor-surface';
import { api } from '@/lib/api-facade';
import { appendSignalRouteContext, stripReturnLabelFromHref, type SignalRouteContext } from '@/lib/signal-route-context';
import type { EntityCatalogSuggestions, EntityDto } from '@/lib/types';
import {
  buildEntityEditorCatalogSuggestionsUrl,
  buildEntityEditorEntityUrl,
  loadEntityEditorCatalogSuggestionsFromFacade,
  loadEntityEditorEntityFromFacade
} from '../../../../lib/entity-editor/controller';

const ENTITY_EDIT_SETTLED_CACHE_TTL_MS = 10_000;

export function buildEntityEditorListReturnHref(routeContext?: SignalRouteContext) {
  const normalizedReturnTo = stripReturnLabelFromHref(routeContext?.returnTo);
  if (normalizedReturnTo?.startsWith('/entities') && !normalizedReturnTo.startsWith('//')) {
    return normalizedReturnTo;
  }

  const params = new URLSearchParams();
  appendSignalRouteContext(params, routeContext ?? {});
  params.delete('returnTo');
  const query = params.toString();
  return query ? `/entities?${query}` : '/entities';
}

export default function EntityEditPage({
  entityId,
  routeContext
}: {
  entityId: string;
  routeContext?: SignalRouteContext;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const entityEditorEntityUrl = React.useMemo(() => buildEntityEditorEntityUrl(entityId), [entityId]);
  const entityEditorCatalogUrl = React.useMemo(() => buildEntityEditorCatalogSuggestionsUrl(), []);
  const listReturnHref = React.useMemo(() => buildEntityEditorListReturnHref(routeContext), [routeContext]);
  const entityEditCacheKey = React.useMemo(
    () => ['entity-edit', entityEditorEntityUrl, entityEditorCatalogUrl].join(':'),
    [entityEditorEntityUrl, entityEditorCatalogUrl]
  );
  const load = useCallback(async (): Promise<{ entityId: string; dto: EntityDto; catalogSuggestions: EntityCatalogSuggestions }> => {
    const [dto, catalogSuggestions] = await Promise.all([
      loadEntityEditorEntityFromFacade(api.entities.editorEntity, entityId),
      loadEntityEditorCatalogSuggestionsFromFacade(api.entities.catalogSuggestions)
    ]);
    return { entityId, dto, catalogSuggestions };
  }, [entityId]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.edit.loading')}
      cacheKey={entityEditCacheKey}
      cacheSettledTtlMs={ENTITY_EDIT_SETTLED_CACHE_TTL_MS}
      renderError={(message, retry) => (
        <section
          className="mx-auto w-full max-w-[1320px] px-3 py-6"
          data-entity-editor-route-state="error"
          data-entity-editor-route-state-owner="hertzbeat-ui-inline-feedback"
          data-entity-editor-edit-error-state="missing-entity"
        >
          <HzInlineFeedback
            tone="critical"
            title={t('common.load-failed')}
            description={
              <>
                {message}
                <span className="sr-only">{t('entities.editor.action.all-entities.help')}</span>
              </>
            }
            variant="embedded"
            data-entity-editor-route-state-feedback="error"
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <HzButton
              size="sm"
              intent="primary"
              onClick={retry}
              data-entity-editor-route-state-retry="true"
              data-entity-editor-route-state-retry-owner="hertzbeat-ui-button"
            >
              {t('common.button.retry')}
            </HzButton>
            <HzButton
              size="sm"
              intent="secondary"
              onClick={() => router.push(listReturnHref)}
              data-entity-editor-route-state-list-return="true"
              data-entity-editor-route-state-list-return-owner="hertzbeat-ui-button"
              data-entity-editor-route-state-list-return-target={listReturnHref}
            >
              {t('entities.detail.action.all-entities')}
            </HzButton>
          </div>
        </section>
      )}
    >
      {data => (
        <EntityEditorSurface
          initial={data.dto}
          mode="edit"
          entityId={data.entityId}
          catalogSuggestions={data.catalogSuggestions}
          routeContext={routeContext}
        />
      )}
    </ClientWorkbench>
  );
}
