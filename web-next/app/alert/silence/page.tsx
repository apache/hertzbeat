'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertSilenceSurface } from '../../../components/pages/alert-silence-surface';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../../lib/api-client';
import { buildAlertSilenceFormDraft, createAlertSilence, deleteAlertSilence, deleteAlertSilences, loadAlertSilenceDetail, updateAlertSilence, type AlertSilenceFormDraft } from '../../../lib/alert-silence/controller';
import { buildAlertSilenceUrl } from '../../../lib/alert-silence/query-state';
import { queryStateFromParams } from '../../../lib/alert-manage/query-state';
import { buildAlertSilenceEvidenceContext, validateAlertSilenceForm } from '../../../lib/alert-silence/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptions } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import type { AlertSilence, PageResult } from '../../../lib/types';

type SilenceDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

export default function AlertSilencePage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const returnContext = useMemo(() => queryStateFromParams(searchParams), [searchParams]);
  const signalContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const signal = searchParams.get('signal');
  const silenceEvidenceContext = useMemo(
    () => buildAlertSilenceEvidenceContext(signal, signalContext, t),
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
  const [draft, setDraft] = useState<AlertSilenceFormDraft>(() => buildAlertSilenceFormDraft(null, silenceEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<SilenceDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    const [list, labelOptions] = await Promise.all([
      apiMessageGet<PageResult<AlertSilence>>(buildAlertSilenceUrl(query)),
      loadAlertLabelOptions(apiMessageGet).catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
    ]);
    return { list, labelOptions, refreshTick };
  }, [query, refreshTick]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('alert.silence.loading')}>
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          setDraft(buildAlertSilenceFormDraft(null, silenceEvidenceContext?.draftPatch));
          setEditorError(null);
          setEditorMessage(null);
          setEditorOpen(true);
        }

        async function handleEdit(silenceId?: number) {
          const targetId = silenceId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertSilenceDetail(apiMessageGet, targetId);
            setDraft(buildAlertSilenceFormDraft(detail));
            setEditorOpen(true);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.load-failed'));
          } finally {
            setEditorLoading(false);
          }
        }

        async function handleSave() {
          const validationError = validateAlertSilenceForm(draft, t);
          if (validationError) {
            setEditorError(validationError);
            return;
          }
          setEditorSaving(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            if (draft.id) {
              await updateAlertSilence(apiMessagePut as any, draft);
            } else {
              await createAlertSilence(apiMessagePost as any, draft);
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

        async function handleToggleEnabled(silence?: AlertSilence) {
          const target = silence ?? selected;
          if (!target) return;
          try {
            await updateAlertSilence(apiMessagePut as any, {
              ...buildAlertSilenceFormDraft(target),
              enable: !(target.enable ?? true),
            });
            setEditorMessage(t('common.save-success'));
            setEditorError(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.save-failed'));
          }
        }

        async function handleDelete(silenceId?: number) {
          const targetId = silenceId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertSilences(apiMessageDelete as any, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertSilence(apiMessageDelete as any, request.ids[0]);
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
            <AlertSilenceSurface
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
              evidenceContext={silenceEvidenceContext}
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
              onEdit={silenceId => void handleEdit(silenceId)}
              onSave={() => void handleSave()}
              onToggleEnabled={silence => void handleToggleEnabled(silence)}
              onDelete={silenceId => void handleDelete(silenceId)}
              onDeleteSelected={() => void handleDeleteSelected()}
              onCloseEditor={() => setEditorOpen(false)}
              onDraftChange={setDraft}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.silence.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.silence.delete.confirm.single')
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
