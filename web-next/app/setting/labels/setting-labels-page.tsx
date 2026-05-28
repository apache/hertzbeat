'use client';

import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { LabelManageSurface } from '@/components/pages/label-manage-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { createEmptyLabelDraft, deleteLabel, loadLabelData, saveLabel } from '@/lib/label-manage/controller';
import { buildLabelUrl, type LabelQueryState } from '@/lib/label-manage/query-state';
import { buildLabelDisplayName } from '@/lib/label-manage/view-model';
import type { Label } from '@/lib/types';

const SETTING_LABELS_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_LABEL_DATA = {
  list: {
    content: [],
    totalElements: 0,
    pageIndex: 0,
    pageSize: 9999
  }
};

export default function SettingLabelsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<LabelQueryState>({ search: '', type: '' });
  const [draftLabel, setDraftLabel] = useState<Label | null>(null);
  const [isManageModalAdd, setIsManageModalAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null);
  const [isLoadPending, setIsLoadPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [isNameValidationVisible, setIsNameValidationVisible] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMeta, setActionMeta] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const labelListUrl = useMemo(() => buildLabelUrl(query), [query]);
  const labelManageCacheKey = useMemo(
    () => ['setting-labels', labelListUrl, reloadVersion].join(':'),
    [labelListUrl, reloadVersion]
  );

  const load = useCallback(async () => {
    setIsLoadPending(true);
    try {
      return await loadLabelData(apiMessageGet, query);
    } finally {
      setIsLoadPending(false);
    }
  }, [query]);

  const renderSurface = useCallback(
    (data: Awaited<ReturnType<typeof loadLabelData>>, loadError: string | null = null, retry?: () => void) => (
      <LabelManageSurface
        t={t}
        data={data}
        search={search}
        draftLabel={draftLabel}
        isManageModalAdd={isManageModalAdd}
        isNameValidationVisible={isNameValidationVisible}
        deleteTarget={deleteTarget}
        isLoadPending={isLoadPending}
        isDeletePending={isDeletePending}
        isSavePending={isSavePending}
        actionMessage={actionMessage}
        actionError={actionError}
        actionMeta={actionMeta}
        loadError={loadError}
        formatTime={formatTime}
        onSearchChange={setSearch}
        onSearch={() => setQuery({ search, type: '' })}
        onSearchClear={() => {
          setSearch('');
          setQuery({ search: '', type: '' });
        }}
        onRefresh={() => {
          if (retry) {
            retry();
            return;
          }
          setReloadVersion(version => version + 1);
        }}
        onNew={() => {
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setIsNameValidationVisible(false);
          setDeleteTarget(null);
          setDraftLabel(createEmptyLabelDraft());
          setIsManageModalAdd(true);
        }}
        onCopy={label => {
          const text = buildLabelDisplayName(label);
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            setActionError(t('common.notify.copy-fail'));
            return;
          }
          void navigator.clipboard
            .writeText(text)
            .then(() => setActionMessage(t('common.notify.copy-success')))
            .catch(() => setActionError(t('common.notify.copy-fail')));
        }}
        onEdit={label => {
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setIsNameValidationVisible(false);
          setDeleteTarget(null);
          setDraftLabel(label);
          setIsManageModalAdd(false);
        }}
        onDeleteRequest={label => {
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setDeleteTarget(label);
        }}
        onDeleteCancel={() => {
          if (!isDeletePending) setDeleteTarget(null);
        }}
        onDeleteConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setDeleteTarget(null);
          setIsDeletePending(true);
          void deleteLabel(apiMessageDelete, target.id)
            .then(() => {
              setActionMessage(t('common.notify.delete-success'));
              setReloadVersion(version => version + 1);
            })
            .catch(error => {
              setActionError(t('common.notify.delete-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsDeletePending(false);
            });
        }}
        onDraftChange={patch => setDraftLabel(previous => {
          if (!previous) return previous;
          if (!isManageModalAdd && previous.id) {
            const sourceLabel = data.list.content.find(label => label.id === previous.id);
            if (sourceLabel) Object.assign(sourceLabel, patch);
          }
          return { ...previous, ...patch };
        })}
        onCloseDialog={() => {
          setIsNameValidationVisible(false);
          setDraftLabel(null);
        }}
        onSaveDialog={() => {
          if (!draftLabel) return;
          if (draftLabel.name == undefined || draftLabel.name.length === 0) {
            setIsNameValidationVisible(true);
            return;
          }
          const isEdit = !isManageModalAdd && Boolean(draftLabel.id);
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setIsNameValidationVisible(false);
          setIsSavePending(true);
          void saveLabel(apiMessagePost, apiMessagePut, draftLabel, isManageModalAdd)
            .then(() => {
              setIsNameValidationVisible(false);
              setDraftLabel(null);
              setActionMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
              setReloadVersion(version => version + 1);
            })
            .catch(error => {
              setActionError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsSavePending(false);
            });
        }}
      />
    ),
    [
      actionError,
      actionMessage,
      actionMeta,
      deleteTarget,
      draftLabel,
      isDeletePending,
      isLoadPending,
      isManageModalAdd,
      isNameValidationVisible,
      isSavePending,
      search,
      t
    ]
  );

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.labels.loading')}
      cacheKey={labelManageCacheKey}
      cacheSettledTtlMs={SETTING_LABELS_SETTLED_CACHE_TTL_MS}
      renderError={(message, retry) => renderSurface(EMPTY_LABEL_DATA, message, retry)}
    >
      {data => renderSurface(data)}
    </ClientWorkbench>
  );
}
