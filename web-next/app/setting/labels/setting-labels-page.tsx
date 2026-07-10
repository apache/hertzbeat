'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { LabelManageSurface } from '@/components/pages/label-manage-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { createEmptyLabelDraft, deleteLabel, loadLabelData, saveLabel } from '@/lib/label-manage/controller';
import { buildLabelUrl, normalizeLabelQueryType, type LabelQueryState } from '@/lib/label-manage/query-state';
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
const LABEL_MONITOR_HANDOFF_CONTEXT_KEYS = ['source', 'returnTo', 'pageSize', 'timeRange', 'live', 'probe'];

function buildLabelMonitorHandoffHref(labelText: string, currentSearchParams: URLSearchParams) {
  const params = new URLSearchParams();
  params.set('labels', labelText);
  for (const key of LABEL_MONITOR_HANDOFF_CONTEXT_KEYS) {
    for (const value of currentSearchParams.getAll(key)) {
      params.append(key, value);
    }
  }
  return `/monitors?${params.toString()}`;
}

export default function SettingLabelsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeSearch = searchParams.get('search') ?? '';
  const routeType = normalizeLabelQueryType(searchParams.get('type') ?? '');
  const [search, setSearch] = useState(routeSearch);
  const [query, setQuery] = useState<LabelQueryState>({ search: routeSearch, type: routeType });
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

  useEffect(() => {
    setSearch(routeSearch);
    setQuery({ search: routeSearch, type: routeType });
  }, [routeSearch, routeType]);

  const replaceRouteQuery = useCallback(
    (nextQuery: LabelQueryState) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextSearch = nextQuery.search.trim();
      const nextType = normalizeLabelQueryType(nextQuery.type);
      if (nextSearch) {
        params.set('search', nextSearch);
      } else {
        params.delete('search');
      }
      if (nextType) {
        params.set('type', nextType);
      } else {
        params.delete('type');
      }
      const nextParamString = params.toString();
      const nextUrl = nextParamString ? `/setting/labels?${nextParamString}` : '/setting/labels';
      const currentParamString = searchParams.toString();
      const currentUrl = currentParamString ? `/setting/labels?${currentParamString}` : '/setting/labels';
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [router, searchParams]
  );

  const selectCopiedLabelText = useCallback((text: string) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return false;
    const source = Array.from(document.querySelectorAll<HTMLElement>('[data-label-copy-source]')).find(
      element => element.dataset.labelCopySource === text
    );
    const selection = window.getSelection();
    if (!source || !selection) return false;
    const range = document.createRange();
    range.selectNodeContents(source);
    selection.removeAllRanges();
    selection.addRange(range);
    source.focus({ preventScroll: true });
    return true;
  }, []);

  const handleLabelCopyFailure = useCallback(
    (text: string) => {
      const didSelect = selectCopiedLabelText(text);
      setActionError(t(didSelect ? 'setting.labels.copy-fallback' : 'common.notify.copy-fail'));
    },
    [selectCopiedLabelText, t]
  );

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
        buildMonitorHandoffHref={labelText => buildLabelMonitorHandoffHref(labelText, searchParams)}
        onSearchChange={setSearch}
        onSearch={() => {
          const nextQuery = { search, type: '' };
          setQuery(nextQuery);
          replaceRouteQuery(nextQuery);
        }}
        onSearchClear={() => {
          const nextQuery = { search: '', type: '' };
          setSearch('');
          setQuery(nextQuery);
          replaceRouteQuery(nextQuery);
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
            handleLabelCopyFailure(text);
            return;
          }
          void navigator.clipboard
            .writeText(text)
            .then(() => setActionMessage(t('common.notify.copy-success')))
            .catch(() => handleLabelCopyFailure(text));
        }}
        onEdit={label => {
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setIsNameValidationVisible(false);
          setDeleteTarget(null);
          setDraftLabel({ ...label });
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
        onDraftChange={patch => setDraftLabel(previous => (previous ? { ...previous, ...patch } : previous))}
        onCloseDialog={() => {
          setIsNameValidationVisible(false);
          setDraftLabel(null);
        }}
        onSaveDialog={visibleDraft => {
          const draftToSave = visibleDraft ?? draftLabel;
          if (!draftToSave) return;
          const trimmedLabelName = (draftToSave.name ?? '').trim();
          if (trimmedLabelName.length === 0) {
            setDraftLabel(draftToSave);
            setIsNameValidationVisible(true);
            return;
          }
          const isEdit = !isManageModalAdd && Boolean(draftToSave.id);
          setDraftLabel(draftToSave);
          setActionMessage(null);
          setActionError(null);
          setActionMeta(null);
          setIsNameValidationVisible(false);
          setIsSavePending(true);
          void saveLabel(apiMessagePost, apiMessagePut, draftToSave, isManageModalAdd)
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
      handleLabelCopyFailure,
      isDeletePending,
      isLoadPending,
      isManageModalAdd,
      isNameValidationVisible,
      isSavePending,
      replaceRouteQuery,
      search,
      searchParams,
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
