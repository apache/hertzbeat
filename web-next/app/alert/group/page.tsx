'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertGroupSurface } from '../../../components/pages/alert-group-surface';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../../lib/api-client';
import {
  createAlertGroup,
  deleteAlertGroup,
  deleteAlertGroups,
  loadAlertGroupDetail,
  updateAlertGroup,
  type AlertGroupFormDraft
} from '../../../lib/alert-group/controller';
import { buildAlertGroupUrl } from '../../../lib/alert-group/query-state';
import { buildAlertGroupEvidenceContext, buildAlertGroupFormDraft, validateAlertGroupForm } from '../../../lib/alert-group/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptions } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';
import type { AlertGroupConverge, PageResult } from '../../../lib/types';

type GroupDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

export default function AlertGroupPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const signalContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const signal = searchParams.get('signal');
  const groupEvidenceContext = useMemo(
    () => buildAlertGroupEvidenceContext(signal, signalContext, t),
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
  const [draft, setDraft] = useState<AlertGroupFormDraft>(() => buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<GroupDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    const [list, labelOptions] = await Promise.all([
      apiMessageGet<PageResult<AlertGroupConverge>>(buildAlertGroupUrl(query)),
      loadAlertLabelOptions(apiMessageGet).catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
    ]);
    return { list, labelOptions, refreshTick };
  }, [query, refreshTick]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('alert.group.loading')}>
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          setDraft(buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch));
          setEditorError(null);
          setEditorMessage(null);
          setEditorOpen(true);
        }

        async function handleEdit(groupId?: number) {
          const targetId = groupId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertGroupDetail(apiMessageGet, targetId);
            setDraft(buildAlertGroupFormDraft(detail));
            setEditorOpen(true);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.load-failed'));
          } finally {
            setEditorLoading(false);
          }
        }

        async function handleSave() {
          const validationError = validateAlertGroupForm(draft, t);
          if (validationError) {
            setEditorError(validationError);
            return;
          }
          setEditorSaving(true);
          setEditorError(null);
          setEditorMessage(null);
          try {
            if (draft.id) {
              await updateAlertGroup(apiMessagePut as any, draft);
            } else {
              await createAlertGroup(apiMessagePost as any, draft);
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

        async function handleToggleEnabled(group?: AlertGroupConverge | null) {
          const target = group ?? selected;
          if (!target) return;
          try {
            await updateAlertGroup(apiMessagePut as any, {
              ...buildAlertGroupFormDraft(target),
              enable: !(target.enable ?? true),
            });
            setEditorMessage(t('common.save-success'));
            setEditorError(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.save-failed'));
          }
        }

        async function handleDelete(groupId?: number) {
          const targetId = groupId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertGroups(apiMessageDelete as any, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertGroup(apiMessageDelete as any, request.ids[0]);
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
            <AlertGroupSurface
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
              evidenceContext={groupEvidenceContext}
              draft={draft}
              formatTime={formatTime}
              labelOptions={labelOptions}
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
              onSave={() => void handleSave()}
              onToggleEnabled={group => void handleToggleEnabled(group)}
              onEdit={groupId => void handleEdit(groupId)}
              onDelete={groupId => void handleDelete(groupId)}
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
                    ? t('alert.group.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.group.delete.confirm.single')
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
