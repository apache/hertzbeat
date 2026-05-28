'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { CollectorManageSurface, type CollectorDeleteTarget } from '@/components/pages/collector-manage-surface';
import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import {
  buildCollectorDeployCommands,
  deleteCollectors,
  generateCollectorIdentity,
  goOfflineCollectors,
  goOnlineCollectors,
  loadCollectorData
} from '@/lib/collector-manage/controller';
import { buildCollectorUrl, type CollectorQueryState } from '@/lib/collector-manage/query-state';

const SETTING_COLLECTOR_SETTLED_CACHE_TTL_MS = 10_000;
const COLLECTOR_DEPLOY_COPY_SUCCESS_DURATION_MS = 800;
type CollectorManagePageData = Awaited<ReturnType<typeof loadCollectorData>>;

export default function SettingCollectorPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<CollectorQueryState>({ pageIndex: 0, pageSize: 8, search: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedCollectors, setSelectedCollectors] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMeta, setActionMeta] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'success' | 'warning' | 'critical'>('success');
  const [actionFeedbackContract, setActionFeedbackContract] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectorDeleteTarget | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isLoadPending, setIsLoadPending] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deployIdentity, setDeployIdentity] = useState('');
  const [deployHost, setDeployHost] = useState('127.0.0.1');
  const [deployDockerShell, setDeployDockerShell] = useState('');
  const [deployPackageShell, setDeployPackageShell] = useState('');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployCopyMessage, setDeployCopyMessage] = useState<string | null>(null);
  const [isDeployPending, setIsDeployPending] = useState(false);
  const [deployNameValidationVisible, setDeployNameValidationVisible] = useState(false);
  const deployCopyClearTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const deployGenerationRequestRef = useRef(0);
  const collectorListUrl = useMemo(() => buildCollectorUrl(query), [query]);
  const collectorManageCacheKey = useMemo(
    () => ['setting-collector', collectorListUrl, reloadVersion].join(':'),
    [collectorListUrl, reloadVersion]
  );

  const load = useCallback(async () => {
    setIsLoadPending(true);
    try {
      return await loadCollectorData(apiMessageGet, query);
    } finally {
      setIsLoadPending(false);
    }
  }, [query]);

  const clearActionFeedback = useCallback(() => {
    setActionMessage(null);
    setActionError(null);
    setActionMeta(null);
    setActionTone('success');
    setActionFeedbackContract(null);
  }, []);

  const buildFallbackCollectorData = useCallback((): CollectorManagePageData => ({
    list: {
      content: [],
      totalElements: 0,
      pageIndex: query.pageIndex ?? 0,
      pageSize: query.pageSize ?? 8
    }
  }), [query.pageIndex, query.pageSize]);

  const clearDeployCopyTimer = useCallback(() => {
    if (!deployCopyClearTimerRef.current) return;
    window.clearTimeout(deployCopyClearTimerRef.current);
    deployCopyClearTimerRef.current = null;
  }, []);

  useEffect(() => clearDeployCopyTimer, [clearDeployCopyTimer]);

  const openBatchOperateTarget = useCallback((action: 'online' | 'offline') => {
    clearActionFeedback();
    if (selectedCollectors.length === 0) {
      setActionTone('warning');
      setActionFeedbackContract(action === 'online' ? 'angular-no-select-online' : 'angular-no-select-offline');
      setActionError(t(action === 'online' ? 'collector.notify.no-select-online' : 'collector.notify.no-select-offline'));
      return;
    }
    setDeleteTarget({
      action,
      collectors: selectedCollectors,
      label: t('setting.collector.selected-count', { count: selectedCollectors.length }),
      mode: 'batch'
    });
  }, [clearActionFeedback, selectedCollectors, t]);

  const closeDeployDialog = useCallback(() => {
    clearDeployCopyTimer();
    deployGenerationRequestRef.current += 1;
    setDeployOpen(false);
    setDeployName('');
    setDeployIdentity('');
    setDeployHost('127.0.0.1');
    setDeployDockerShell('');
    setDeployPackageShell('');
    setDeployError(null);
    setDeployCopyMessage(null);
    setIsDeployPending(false);
    setDeployNameValidationVisible(false);
  }, [clearDeployCopyTimer]);

  function renderCollectorSurface(data: CollectorManagePageData, loadError: string | null = null, retryLoad?: () => void) {
    return (
      <CollectorManageSurface
          t={t}
          data={data}
          search={search}
          selectedCollectors={selectedCollectors}
          actionMessage={actionMessage}
          actionError={actionError}
          actionMeta={actionMeta}
          actionTone={actionTone}
          actionFeedbackContract={actionFeedbackContract}
          loadError={loadError}
          deleteTarget={deleteTarget}
          isDeletePending={isDeletePending}
          isLoadPending={isLoadPending}
          deployOpen={deployOpen}
          deployName={deployName}
          deployIdentity={deployIdentity}
          deployHost={deployHost}
          deployDockerShell={deployDockerShell}
          deployPackageShell={deployPackageShell}
          deployError={deployError}
          deployCopyMessage={deployCopyMessage}
          isDeployPending={isDeployPending}
          deployNameValidationVisible={deployNameValidationVisible}
          formatTime={formatTime}
          onSearchChange={setSearch}
          onSearch={() => {
            clearActionFeedback();
            setSelectedCollectors([]);
            setQuery(current => ({ ...current, pageIndex: 0, search }));
          }}
          onSearchClear={() => {
            clearActionFeedback();
            setSelectedCollectors([]);
            setSearch('');
            setQuery(current => ({ ...current, pageIndex: 0, search: '' }));
          }}
          onRefresh={() => {
            clearActionFeedback();
            setSelectedCollectors([]);
            if (retryLoad) {
              retryLoad();
              return;
            }
            setReloadVersion(version => version + 1);
          }}
          onDeploy={() => {
            clearDeployCopyTimer();
            clearActionFeedback();
            setDeployOpen(true);
            setDeployIdentity('');
            setDeployError(null);
            setDeployCopyMessage(null);
            setDeployNameValidationVisible(false);
          }}
          onGoOnline={() => openBatchOperateTarget('online')}
          onGoOffline={() => openBatchOperateTarget('offline')}
          onDelete={() => {
            clearActionFeedback();
            if (selectedCollectors.length === 0) {
              setActionTone('warning');
              setActionFeedbackContract('angular-no-select-warning');
              setActionError(t('common.notify.no-select-delete'));
              return;
            }
            setDeleteTarget({
              action: 'delete',
              collectors: selectedCollectors,
              label: t('setting.collector.selected-count', { count: selectedCollectors.length }),
              mode: 'batch'
            });
          }}
          onSelectedCollectorsChange={setSelectedCollectors}
          onPageIndexChange={pageIndex => {
            clearActionFeedback();
            setSelectedCollectors([]);
            setQuery(current => ({ ...current, pageIndex }));
          }}
          onPageSizeChange={pageSize => {
            clearActionFeedback();
            setSelectedCollectors([]);
            setQuery(current => ({ ...current, pageIndex: 0, pageSize }));
          }}
          onDeleteCancel={() => {
            if (!isDeletePending) setDeleteTarget(null);
          }}
          onDeleteConfirm={() => {
            if (!deleteTarget) return;
            clearActionFeedback();
            setIsDeletePending(true);
            const targetCollectors = deleteTarget.collectors;
            const mutation =
              deleteTarget.action === 'online'
                ? goOnlineCollectors(apiMessagePut, targetCollectors)
                : deleteTarget.action === 'offline'
                  ? goOfflineCollectors(apiMessagePut, targetCollectors)
                  : deleteCollectors(apiMessageDelete, targetCollectors);
            void mutation
              .then(() => {
                setActionTone('success');
                setActionFeedbackContract(deleteTarget.action === 'online' || deleteTarget.action === 'offline' ? 'angular-operate-notify' : 'angular-delete-notify');
                setActionMessage(t(deleteTarget.action === 'online' || deleteTarget.action === 'offline' ? 'common.notify.operate-success' : 'common.notify.delete-success'));
                setSelectedCollectors([]);
                if (deleteTarget.action !== 'online' && deleteTarget.action !== 'offline') {
                  setQuery(current => {
                    const remainingTotal = Math.max(0, data.list.totalElements - targetCollectors.length);
                    const lastPageIndex = Math.max(0, Math.ceil(remainingTotal / current.pageSize) - 1);
                    return current.pageIndex > lastPageIndex ? { ...current, pageIndex: lastPageIndex } : current;
                  });
                }
                setDeleteTarget(null);
                setReloadVersion(version => version + 1);
              })
              .catch(error => {
                const isOperateAction = deleteTarget.action === 'online' || deleteTarget.action === 'offline';
                setActionTone('critical');
                setActionFeedbackContract(isOperateAction ? 'angular-operate-fail' : 'angular-delete-fail');
                setActionError(t(isOperateAction ? 'common.notify.operate-fail' : 'common.notify.delete-fail'));
                setActionMeta(error instanceof Error ? error.message : null);
              })
              .finally(() => {
                setIsDeletePending(false);
              });
          }}
          onDeployNameChange={value => {
            clearDeployCopyTimer();
            setDeployName(value);
            setDeployError(null);
            setDeployCopyMessage(null);
            setDeployNameValidationVisible(false);
          }}
          onDeployGenerate={() => {
            const collector = deployName.trim();
            if (isDeployPending) return;
            if (deployName.length === 0) {
              setDeployNameValidationVisible(true);
              return;
            }
            setDeployError(null);
            clearDeployCopyTimer();
            setDeployCopyMessage(null);
            setDeployNameValidationVisible(false);
            setIsDeployPending(true);
            const deployGenerationRequest = deployGenerationRequestRef.current + 1;
            deployGenerationRequestRef.current = deployGenerationRequest;
            void generateCollectorIdentity(apiMessagePost, collector)
              .then(result => {
                if (deployGenerationRequestRef.current !== deployGenerationRequest) return;
                const identity = result.identity ?? '';
                const managerHost = result.host ?? '127.0.0.1';
                const commands = buildCollectorDeployCommands(t, identity, managerHost);
                setDeployName(collector);
                setDeployIdentity(identity);
                setDeployHost(managerHost);
                setDeployDockerShell(commands.dockerShell);
                setDeployPackageShell(commands.packageShell);
              })
              .catch(error => {
                if (deployGenerationRequestRef.current !== deployGenerationRequest) return;
                setDeployError(error instanceof Error ? error.message : t('common.notify.apply-fail'));
              })
              .finally(() => {
                if (deployGenerationRequestRef.current !== deployGenerationRequest) return;
                setIsDeployPending(false);
              });
          }}
          onDeployClose={closeDeployDialog}
          onDeployCopy={value => {
            clearDeployCopyTimer();
            setDeployCopyMessage(t('common.notify.copy-success'));
            deployCopyClearTimerRef.current = window.setTimeout(() => {
              setDeployCopyMessage(null);
              deployCopyClearTimerRef.current = null;
            }, COLLECTOR_DEPLOY_COPY_SUCCESS_DURATION_MS);
            void navigator.clipboard?.writeText(value).catch(() => undefined);
          }}
          onRowGoOnline={collector => {
            clearActionFeedback();
            setDeleteTarget({
              action: 'online',
              collectors: [collector],
              label: collector,
              mode: 'single'
            });
          }}
          onRowGoOffline={collector => {
            clearActionFeedback();
            setDeleteTarget({
              action: 'offline',
              collectors: [collector],
              label: collector,
              mode: 'single'
            });
          }}
          onRowDelete={collector => {
            clearActionFeedback();
            setDeleteTarget({
              action: 'delete',
              collectors: [collector],
              label: collector,
              mode: 'single'
            });
          }}
        />
    );
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.collector.loading')}
      cacheKey={collectorManageCacheKey}
      cacheSettledTtlMs={SETTING_COLLECTOR_SETTLED_CACHE_TTL_MS}
      renderError={(message, retry) => renderCollectorSurface(buildFallbackCollectorData(), message, retry)}
    >
      {data => renderCollectorSurface(data)}
    </ClientWorkbench>
  );
}
