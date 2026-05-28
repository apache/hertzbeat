'use client';

import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { PluginManageSurface, type PluginDeleteTarget } from '@/components/pages/plugin-manage-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { clampPluginPageIndexAfterDelete, createEmptyPluginDraft, deletePlugins, loadPluginData, loadPluginParamDraft, savePlugin, savePluginParams, togglePluginStatus, updatePluginParamDraft, validatePluginUploadDraft, type PluginManagePageData, type PluginParamDraft, type PluginUploadDraft } from '@/lib/plugin-manage/controller';
import { buildPluginUrl, type PluginQueryState } from '@/lib/plugin-manage/query-state';
import type { Plugin } from '@/lib/types';

const SETTING_PLUGINS_SETTLED_CACHE_TTL_MS = 10_000;

export default function SettingPluginsPage() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<PluginQueryState>({ search: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [draftPlugin, setDraftPlugin] = useState<PluginUploadDraft | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [paramDraft, setParamDraft] = useState<PluginParamDraft | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMeta, setActionMeta] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'success' | 'warning' | 'critical'>('success');
  const [actionKind, setActionKind] = useState<'enable' | 'delete' | 'upload' | 'params'>('enable');
  const [uploadValidation, setUploadValidation] = useState<{ name?: boolean; jarFile?: boolean }>({});
  const [isUploadPending, setIsUploadPending] = useState(false);
  const [isParamPending, setIsParamPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PluginDeleteTarget | null>(null);
  const [isLoadPending, setIsLoadPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isTogglePending, setIsTogglePending] = useState(false);
  const [optimisticEnableStatus, setOptimisticEnableStatus] = useState<Record<number, boolean>>({});
  const pluginListUrl = useMemo(() => buildPluginUrl(query), [query]);
  const pluginManageCacheKey = useMemo(
    () => ['setting-plugins', pluginListUrl, reloadVersion].join(':'),
    [pluginListUrl, reloadVersion]
  );

  const load = useCallback(async () => {
    setIsLoadPending(true);
    try {
      return await loadPluginData(apiMessageGet, query);
    } finally {
      setOptimisticEnableStatus({});
      setIsLoadPending(false);
    }
  }, [query]);

  const clearActionFeedback = useCallback(() => {
    setActionMessage(null);
    setActionError(null);
    setActionMeta(null);
    setActionTone('success');
  }, []);

  const buildFallbackPluginData = useCallback((): PluginManagePageData => ({
    list: {
      content: [],
      totalElements: 0,
      pageIndex: query.pageIndex ?? 0,
      pageSize: query.pageSize ?? 8
    }
  }), [query.pageIndex, query.pageSize]);

  function renderPluginSurface(data: PluginManagePageData, loadError: string | null = null, retryLoad?: () => void) {
    return (
      <PluginManageSurface
        t={t}
        data={data}
        search={search}
        selectedIds={selectedIds}
        draftPlugin={draftPlugin}
        isUploadDialogOpen={isUploadDialogOpen}
        paramDraft={paramDraft}
        actionMessage={actionMessage}
        actionError={actionError}
        actionMeta={actionMeta}
        actionTone={actionTone}
        actionKind={actionKind}
        loadError={loadError}
        uploadValidation={uploadValidation}
        isUploadPending={isUploadPending}
        isParamPending={isParamPending}
        deleteTarget={deleteTarget}
        isLoadPending={isLoadPending}
        isDeletePending={isDeletePending}
        isTogglePending={isTogglePending}
        optimisticEnableStatus={optimisticEnableStatus}
        onSearchChange={setSearch}
        onSearch={() => {
          clearActionFeedback();
          setSelectedIds([]);
          setQuery({ search, pageIndex: 0, pageSize: query.pageSize });
        }}
        onSearchClear={() => {
          clearActionFeedback();
          setSelectedIds([]);
          setSearch('');
          setQuery({ search: '', pageIndex: 0, pageSize: query.pageSize });
        }}
        onRefresh={() => {
          clearActionFeedback();
          setSelectedIds([]);
          if (retryLoad) {
            retryLoad();
            return;
          }
          setReloadVersion(version => version + 1);
        }}
        onNew={() => {
          clearActionFeedback();
          setDeleteTarget(null);
          setParamDraft(null);
          if (!draftPlugin) {
            setUploadValidation({});
            setDraftPlugin(createEmptyPluginDraft());
          }
          setIsUploadDialogOpen(true);
        }}
        onDeleteSelected={() => {
          clearActionFeedback();
          if (selectedIds.length === 0) {
            setActionKind('delete');
            setActionTone('warning');
            setActionError(t('common.notify.no-select-delete'));
            return;
          }
          setActionKind('delete');
          setDeleteTarget({
            ids: selectedIds,
            label: t('setting.plugins.selected-count', { count: selectedIds.length }),
            mode: 'batch'
          });
        }}
        onDeleteCancel={() => {
          if (!isDeletePending) setDeleteTarget(null);
        }}
        onDeleteConfirm={() => {
          if (!deleteTarget) return;
          clearActionFeedback();
          setActionKind('delete');
          setIsDeletePending(true);
          const targetIds = deleteTarget.ids;
          void deletePlugins(apiMessageDelete, targetIds)
            .then(() => {
              const pageSize = data.list.pageSize ?? query.pageSize ?? 8;
              const currentPageIndex = data.list.pageIndex ?? query.pageIndex ?? 0;
              const nextPageIndex = clampPluginPageIndexAfterDelete({
                pageIndex: currentPageIndex + 1,
                pageSize,
                totalElements: data.list.totalElements ?? 0,
                deleteCount: targetIds.length
              });
              setActionTone('success');
              setActionMessage(t('common.notify.delete-success'));
              setSelectedIds([]);
              setDeleteTarget(null);
              setQuery(previous => ({
                ...previous,
                pageIndex: nextPageIndex,
                pageSize
              }));
              setReloadVersion(version => version + 1);
            })
            .catch(error => {
              setActionTone('critical');
              setActionError(t('common.notify.delete-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsDeletePending(false);
            });
        }}
        onSelectedIdsChange={setSelectedIds}
        onPageIndexChange={pageIndex => {
          clearActionFeedback();
          setSelectedIds([]);
          setQuery(current => ({ ...current, pageIndex }));
        }}
        onPageSizeChange={pageSize => {
          clearActionFeedback();
          setSelectedIds([]);
          setQuery(current => ({ ...current, pageIndex: 0, pageSize }));
        }}
        onEditParams={(plugin: Plugin) => {
          clearActionFeedback();
          setDraftPlugin(null);
          setDeleteTarget(null);
          setActionKind('params');
          setIsParamPending(true);
          void loadPluginParamDraft(apiMessageGet, plugin, locale)
            .then(draft => {
              setParamDraft(draft);
            })
            .catch(error => {
              setActionTone('critical');
              setActionError(t('common.notify.edit-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsParamPending(false);
            });
        }}
        onParamChange={(field, value) => {
          setParamDraft(previous => (previous ? updatePluginParamDraft(previous, field, value) : previous));
        }}
        onCloseParamDialog={() => {
          setParamDraft(null);
        }}
        onSaveParamDialog={() => {
          if (!paramDraft) return;
          clearActionFeedback();
          setActionKind('params');
          setIsParamPending(true);
          void savePluginParams(apiMessagePost, paramDraft.params)
            .then(() => {
              setActionTone('success');
              setActionMessage(t('common.notify.edit-success'));
              setParamDraft(null);
            })
            .catch(error => {
              setActionTone('critical');
              setActionError(t('common.notify.edit-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsParamPending(false);
            });
        }}
        onToggleEnabled={plugin => {
          clearActionFeedback();
          setActionKind('enable');
          setOptimisticEnableStatus(current => ({
            ...current,
            [plugin.id]: !Boolean(plugin.enableStatus)
          }));
          setIsTogglePending(true);
          void togglePluginStatus(apiMessagePut, plugin)
            .then(() => {
              setActionTone('success');
              setActionMessage(t('common.notify.edit-success'));
              setSelectedIds([]);
              setReloadVersion(version => version + 1);
            })
            .catch(error => {
              setActionTone('critical');
              setActionError(t('common.notify.edit-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsTogglePending(false);
            });
        }}
        onDeleteOne={plugin => {
          clearActionFeedback();
          setActionKind('delete');
          setDeleteTarget({
            ids: [plugin.id],
            label: plugin.name,
            mode: 'single'
          });
        }}
        onDraftChange={patch => {
          setUploadValidation(previous => ({
            ...previous,
            ...(Object.prototype.hasOwnProperty.call(patch, 'name') ? { name: false } : {}),
            ...(Object.prototype.hasOwnProperty.call(patch, 'jarFile') ? { jarFile: false } : {})
          }));
          setDraftPlugin(previous => (previous ? { ...previous, ...patch } : previous));
        }}
        onCloseDialog={() => {
          setIsUploadDialogOpen(false);
        }}
        onSaveDialog={() => {
          if (!draftPlugin) return;
          clearActionFeedback();
          setActionKind('upload');
          const validation = validatePluginUploadDraft(draftPlugin);
          if (!validation.name || !validation.jarFile) {
            setUploadValidation({
              name: !validation.name,
              jarFile: !validation.jarFile
            });
            return;
          }
          setUploadValidation({});
          setIsUploadPending(true);
          void savePlugin(apiMessagePost, draftPlugin)
            .then(() => {
              setActionTone('success');
              setActionMessage(t('common.notify.new-success'));
              setUploadValidation({});
              setIsUploadDialogOpen(false);
              setDraftPlugin(null);
              setSelectedIds([]);
              setReloadVersion(version => version + 1);
            })
            .catch(error => {
              setActionTone('critical');
              setActionError(t('common.notify.new-fail'));
              setActionMeta(error instanceof Error ? error.message : null);
            })
            .finally(() => {
              setIsUploadPending(false);
            });
        }}
      />
    );
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.plugins.loading')}
      cacheKey={pluginManageCacheKey}
      cacheSettledTtlMs={SETTING_PLUGINS_SETTLED_CACHE_TTL_MS}
      renderError={(message, retry) => renderPluginSurface(buildFallbackPluginData(), message, retry)}
    >
      {data => renderPluginSurface(data)}
    </ClientWorkbench>
  );
}
