'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertInhibitSurface } from '../../../components/pages/alert-inhibit-surface';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../../lib/api-client';
import { buildAlertInhibitFormDraft, createAlertInhibit, deleteAlertInhibit, deleteAlertInhibits, loadAlertInhibitDetail, updateAlertInhibit, type AlertInhibitFormDraft } from '../../../lib/alert-inhibit/controller';
import { buildAlertInhibitUrl } from '../../../lib/alert-inhibit/query-state';
import { queryStateFromParams } from '../../../lib/alert-manage/query-state';
import { buildAlertInhibitEvidenceContext, validateAlertInhibitForm } from '../../../lib/alert-inhibit/view-model';
import { clearAlertInhibitEqualLabels, clearAlertInhibitTarget, copyAlertInhibitSourceToTarget, dropSeverityFromAlertInhibitTarget } from '../../../lib/alert-manage/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptions } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import type { AlertInhibit, PageResult } from '../../../lib/types';

type InhibitDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

export default function AlertInhibitPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const returnContext = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const signalContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const signal = searchParams.get('signal');
  const inhibitEvidenceContext = useMemo(
    () => buildAlertInhibitEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AlertInhibitFormDraft>(() => buildAlertInhibitFormDraft(null, inhibitEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<InhibitDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    const [list, labelOptions] = await Promise.all([
      apiMessageGet<PageResult<AlertInhibit>>(buildAlertInhibitUrl(query)),
      loadAlertLabelOptions(apiMessageGet).catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
    ]);
    return { list, labelOptions, refreshTick };
  }, [query, refreshTick]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('alert.inhibit.loading')}>
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          setDraft(buildAlertInhibitFormDraft(null, inhibitEvidenceContext?.draftPatch));
          setEditorError(null);
          setEditorMessage(null);
          setEditorOpen(true);
        }

        async function handleEdit(inhibitId?: number) {
          const targetId = inhibitId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertInhibitDetail(apiMessageGet, targetId);
            setDraft(buildAlertInhibitFormDraft(detail));
            setEditorOpen(true);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.load-failed'));
          } finally {
            setEditorLoading(false);
          }
        }

        async function handleSave() {
          const validationError = validateAlertInhibitForm(draft, t);
          if (validationError) {
            setEditorError(validationError);
            return;
          }
          setEditorSaving(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            if (draft.id) {
              await updateAlertInhibit(apiMessagePut as any, draft);
            } else {
              await createAlertInhibit(apiMessagePost as any, draft);
            }
            setEditorMessage(t('common.save-success'));
            setEditorOpen(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.save-failed'));
          } finally {
            setEditorSaving(false);
          }
        }

        async function handleToggleEnabled(inhibit?: AlertInhibit) {
          const target = inhibit ?? selected;
          if (!target) return;
          try {
            await updateAlertInhibit(apiMessagePut as any, {
              ...buildAlertInhibitFormDraft(target),
              enable: !(target.enable ?? true),
            });
            setEditorMessage(t('common.save-success'));
            setEditorError(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.save-failed'));
          }
        }

        async function handleDelete(inhibitId?: number) {
          const targetId = inhibitId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertInhibits(apiMessageDelete as any, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertInhibit(apiMessageDelete as any, request.ids[0]);
            }
            setSelectedId(null);
            setEditorOpen(false);
            setEditorMessage(t('common.delete-success'));
            setEditorError(null);
            setDeleteRequest(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.delete-failed'));
          } finally {
            setDeletePending(false);
          }
        }

        function handleRefresh() {
          setRefreshTick(value => value + 1);
        }

        async function handleDeleteSelected() {
          if (checkedIds.length === 0) return;
          setDeleteRequest({ kind: 'batch', ids: checkedIds });
        }

        return (
          <>
            <AlertInhibitSurface
              t={t}
              data={data}
              search={search}
              selectedId={selectedId}
              checkedIds={checkedIds}
              editorOpen={editorOpen}
              editorLoading={editorLoading}
              editorSaving={editorSaving}
              editorMessage={editorMessage}
              editorError={editorError}
              returnContext={returnContext}
              evidenceContext={inhibitEvidenceContext}
              draft={draft}
              labelOptions={labelOptions}
              formatTime={formatTime}
              onSearchChange={setSearch}
              onApplyFilter={() => setQuery(search)}
              onClearFilter={() => {
                setSearch('');
                setQuery('');
              }}
              onRefresh={handleRefresh}
              onSelect={setSelectedId}
              onCheckedIdsChange={setCheckedIds}
              onNew={() => void handleNew()}
              onEdit={inhibitId => void handleEdit(inhibitId)}
              onSave={() => void handleSave()}
              onToggleEnabled={inhibit => void handleToggleEnabled(inhibit)}
              onDelete={inhibitId => void handleDelete(inhibitId)}
              onDeleteSelected={() => void handleDeleteSelected()}
              onCloseEditor={() => setEditorOpen(false)}
              onDraftChange={setDraft}
              onCopySourceToTarget={() => setDraft(prev => copyAlertInhibitSourceToTarget(prev))}
              onDropSeverity={() => setDraft(prev => dropSeverityFromAlertInhibitTarget(prev))}
              onClearTarget={() => setDraft(prev => clearAlertInhibitTarget(prev))}
              onClearEqual={() => setDraft(prev => clearAlertInhibitEqualLabels(prev))}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.inhibit.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.inhibit.delete.confirm.single')
                }
                confirmLabel={t('common.button.ok')}
                cancelLabel={t('common.button.cancel')}
                pending={deletePending}
                onCancel={() => setDeleteRequest(null)}
                onConfirm={() => void handleConfirmedDelete()}
              />
            </div>
          </>
        );
      }}
    </ClientWorkbench>
  );
}
