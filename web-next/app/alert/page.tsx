'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCenterSurface } from '../../components/pages/alert-center-surface';
import { useI18n } from '../../components/providers/i18n-provider';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { apiMessageDelete, apiMessageGet, apiMessagePut } from '../../lib/api-client';
import {
  applyAlertClosureOperation,
  buildAlertQueryAfterClosureOperation,
  loadAlertCenterData,
  type AlertClosureOperationAction,
  type AlertPageData
} from '../../lib/alert-manage/controller';
import {
  buildAlertCompatRouteUrl,
  hasAlertEntityContext,
  queryStateFromParams,
  type AlertQueryState
} from '../../lib/alert-manage/query-state';
import { buildAlertClosureOperationFeedback } from '../../lib/alert-manage/view-model';

const EMPTY_ALERT_QUERY: AlertQueryState = {
  search: '',
  status: '',
  severity: '',
  entityId: '',
  entityName: '',
  returnTo: ''
};

export default function AlertCenterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const [draft, setDraft] = useState<AlertQueryState>(initialQuery);
  const [query, setQuery] = useState<AlertQueryState>(initialQuery);
  const [operationFeedback, setOperationFeedback] = useState<{ tone: 'success' | 'danger'; copy: string } | null>(null);

  useEffect(() => {
    setDraft(initialQuery);
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (searchParams.has('returnLabel') || searchParams.get('returnTo')?.includes('returnLabel')) {
      router.replace(buildAlertCompatRouteUrl(searchParams));
    }
  }, [router, searchParams]);

  const load = useCallback(async (): Promise<AlertPageData> => {
    return loadAlertCenterData(apiMessageGet, query);
  }, [query]);

  const handleClosureAction = useCallback(async (action: AlertClosureOperationAction, groupId: number) => {
    setOperationFeedback(null);
    try {
      await applyAlertClosureOperation(apiMessagePut as any, apiMessageDelete as any, action, groupId);
      setOperationFeedback({ tone: 'success', copy: buildAlertClosureOperationFeedback(action, t) });
      setDraft(current => buildAlertQueryAfterClosureOperation(current, action));
      setQuery(current => buildAlertQueryAfterClosureOperation(current, action));
    } catch (error) {
      setOperationFeedback({
        tone: 'danger',
        copy: t('alert.center.operation.failed', {
          reason: error instanceof Error ? error.message : t('common.failed')
        })
      });
    }
  }, [t]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('alert.center.loading')}>
      {data => (
        <AlertCenterSurface
          t={t}
          data={data}
          draft={draft}
          onDraftChange={setDraft}
          onRefresh={() => setQuery({ ...draft })}
          onClearFilters={() => {
            const cleared = {
              ...draft,
              search: '',
              severity: '',
              status: hasAlertEntityContext(draft) ? 'firing' : ''
            };
            setDraft(cleared);
            setQuery(cleared);
          }}
          operationFeedback={operationFeedback}
          onClosureAction={(action, groupId) => void handleClosureAction(action, groupId)}
        />
      )}
    </ClientWorkbench>
  );
}
