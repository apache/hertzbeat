// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  lastSurfaceProps: null as null | Record<string, any>,
  renderErrorMessage: null as string | null,
  renderData: {
    list: {
      content: [
        {
          collector: {
            name: 'edge-a',
            ip: '10.0.0.1',
            status: 0,
            mode: 'public',
            version: '1.0.0',
            gmtUpdate: '2026-04-10T10:00:00Z'
          },
          pinMonitorNum: 2,
          dispatchMonitorNum: 5
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessageDelete = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());
const loadCollectorData = vi.hoisted(() => vi.fn());
const buildCollectorDeployCommands = vi.hoisted(() => vi.fn());
const deleteCollectors = vi.hoisted(() => vi.fn());
const generateCollectorIdentity = vi.hoisted(() => vi.fn());
const goOnlineCollectors = vi.hoisted(() => vi.fn());
const goOfflineCollectors = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    renderError
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
    renderError?: (message: string, retry: () => void) => React.ReactNode;
  }) => {
    mockState.lastLoad = load;
    if (mockState.renderErrorMessage && renderError) {
      return <div data-client-workbench="true">{renderError(mockState.renderErrorMessage, vi.fn())}</div>;
    }
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/collector-manage-surface', () => ({
  CollectorManageSurface: (props: any) => {
    mockState.lastSurfaceProps = props;
    const {
      search,
      data,
      selectedCollectors,
      actionMessage,
      actionError,
      actionMeta,
      actionTone,
      actionFeedbackContract,
      loadError,
      deleteTarget,
      isDeletePending,
      isLoadPending,
      deployOpen,
      deployName,
      deployIdentity,
      deployError,
      deployCopyMessage,
      isDeployPending,
      deployNameValidationVisible,
      onDeploy,
      onDeployNameChange,
      onDeployGenerate,
      onDeployClose
    } = props;
    return (
      <div
        data-collector-manage-surface="otlp-cold-collector-console"
        data-collector-manage-style-baseline="hertzbeat-cold-matte"
        data-collector-delete-warning-contract="angular-no-select-warning"
        data-collector-delete-confirm-contract="angular-modal-confirm"
        data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
        data-collector-delete-feedback-contract="angular-delete-notify"
        data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
        data-collector-delete-api-contract="angular-repeated-collectors-query"
        data-collector-delete-page-clamp-contract="angular-update-page-index"
        data-collector-delete-page-clamp-owner="route-state-contract"
        data-collector-search-submit-contract="angular-enter-and-clear"
        data-collector-search-clear-contract="angular-cleared-load"
        data-collector-search-clear-owner="shared-search-row"
        data-collector-operate-warning-contract="angular-no-select-online-offline"
        data-collector-operate-confirm-contract="angular-modal-confirm"
        data-collector-operate-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
        data-collector-operate-feedback-contract="angular-operate-notify"
        data-collector-operate-feedback-contract-owner="hertzbeat-ui-inline-feedback"
        data-collector-operate-api-contract="angular-put-repeated-collectors-query"
        data-collector-mutation-loading-contract="angular-nz-table-loading"
        data-collector-load-failure-contract="angular-console-only-shell"
        data-collector-load-failure-owner="collector-route-controller"
        data-collector-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
        data-collector-table-loading-contract="angular-load-collectors-table"
        data-collector-table-loading-owner="angular-nz-table-loading"
        data-collector-table-loading-scope="load-search-refresh-pagination-mutation"
        data-collector-table-loading-source={isLoadPending || isDeletePending ? 'route-load-or-mutation' : 'idle'}
        data-collector-deploy-modal-contract="angular-generate-identity-modal"
        data-collector-deploy-api-contract="angular-post-generate-identity"
        data-collector-deploy-failure-contract="angular-apply-fail-notification"
        data-collector-deploy-validation-contract="angular-submit-marks-required"
        data-collector-deploy-validation-raw-contract="angular-required-before-trim"
        data-collector-deploy-validation-raw-owner="collector-route-controller"
        data-collector-deploy-loading-contract="angular-nz-ok-loading"
        data-collector-deploy-mask-contract="angular-mask-closable-false"
        data-collector-deploy-width-contract="angular-width-45-percent"
        data-collector-deploy-field-layout-contract="angular-label-7-control-12"
        data-collector-deploy-field-layout-owner="route-form-field-grid"
        data-collector-deploy-command-contract="angular-docker-package-shells"
        data-collector-deploy-command-owner="hertzbeat-ui-code-editor"
        data-collector-deploy-package-link-contract="angular-github-releases-link"
        data-collector-deploy-copy-contract="angular-copy-identity"
        data-collector-deploy-copy-feedback-contract="angular-copy-success-duration-800"
        data-collector-deploy-close-reset-contract="angular-close-clears-name"
        data-collector-deploy-close-reset-owner="collector-route-controller"
        data-collector-deploy-close-pending-result-contract="angular-close-ignores-late-generate"
        data-collector-deploy-close-pending-result-owner="collector-route-controller"
        data-collector-pagination-contract="angular-search-pagination"
        data-collector-pagination-owner="hertzbeat-ui-pagination-bar"
      >
        <section data-collector-admin-layout="full-width-admin-list">
          <span>Refresh</span>
          <span>Deploy collector</span>
          <span>Online collector</span>
          <span>Offline collector</span>
          <span>Delete collector</span>
          <span>Search</span>
          <span>Collector cluster</span>
          <span>{search}</span>
          <span>{selectedCollectors?.length ?? 0}</span>
          <span>{actionMessage ?? 'no-action-message'}</span>
          <span>{actionError ?? 'no-action-error'}</span>
          <span>{actionMeta ?? 'no-action-meta'}</span>
          <span>{actionTone ?? 'no-action-tone'}</span>
          <span>{actionFeedbackContract ?? 'no-action-feedback-contract'}</span>
          <span>{deleteTarget ? deleteTarget.label : 'no-delete-target'}</span>
          <span>{isDeletePending ? 'delete-pending' : 'delete-idle'}</span>
          <span>{isLoadPending ? 'route-load-pending' : 'route-load-idle'}</span>
          <span data-test-deploy-open={deployOpen ? 'true' : 'false'}>{deployOpen ? 'deploy-open' : 'deploy-closed'}</span>
          <span data-test-deploy-name={deployName ?? ''}>{deployName ?? ''}</span>
          <span data-test-deploy-identity={deployIdentity ?? ''}>{deployIdentity ?? ''}</span>
          <span data-test-deploy-error={deployError ?? ''}>{deployError ?? ''}</span>
          <span data-test-deploy-copy={deployCopyMessage ?? ''}>{deployCopyMessage ?? ''}</span>
          <span data-test-deploy-pending={isDeployPending ? 'true' : 'false'}>{isDeployPending ? 'deploy-pending' : 'deploy-idle'}</span>
          <span>{deployNameValidationVisible ? 'deploy-name-dirty-invalid' : 'deploy-name-pristine'}</span>
          <span>{data.list.content[0]?.collector.name ?? 'no-collector-name'}</span>
          <span>{data.list.content[0]?.collector.ip ?? 'no-collector-ip'}</span>
          <span>collector-pagination</span>
          <button data-test-deploy-open-button="true" onClick={onDeploy}>deploy</button>
          <button data-test-deploy-name-button="true" onClick={() => onDeployNameChange?.(' edge-b ')}>name</button>
          <button data-test-deploy-generate-button="true" onClick={onDeployGenerate}>generate</button>
          <button data-test-deploy-close-button="true" onClick={onDeployClose}>close</button>
        </section>
      </div>
    );
  }
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessageDelete,
  apiMessagePost,
  apiMessagePut
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/collector-manage/controller', () => ({
  loadCollectorData,
  buildCollectorDeployCommands,
  deleteCollectors,
  generateCollectorIdentity,
  goOnlineCollectors,
  goOfflineCollectors
}));

describe('setting collector page', () => {
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.lastSurfaceProps = null;
    mockState.renderErrorMessage = null;
    apiMessageGet.mockReset();
    apiMessageDelete.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    loadCollectorData.mockReset().mockImplementation(async (apiGet, query) => {
      await apiGet(`/collector?pageIndex=${query.pageIndex}&pageSize=${query.pageSize}${query.search ? `&name=${query.search}` : ''}`);
      return mockState.renderData;
    });
    buildCollectorDeployCommands.mockReset().mockReturnValue({ dockerShell: 'docker shell', packageShell: 'package shell' });
    deleteCollectors.mockReset().mockResolvedValue(undefined);
    generateCollectorIdentity.mockReset().mockResolvedValue({ identity: 'identity-123', host: '10.0.0.10' });
    goOnlineCollectors.mockReset().mockResolvedValue(undefined);
    goOfflineCollectors.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  it('renders the collector toolbar and table shell inside the route contract', async () => {
    const { default: SettingCollectorPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingCollectorPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-collector-delete-warning-contract="angular-no-select-warning"');
    expect(html).toContain('data-collector-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-delete-api-contract="angular-repeated-collectors-query"');
    expect(html).toContain('data-collector-delete-page-clamp-contract="angular-update-page-index"');
    expect(html).toContain('data-collector-delete-page-clamp-owner="route-state-contract"');
    expect(html).toContain('data-collector-search-submit-contract="angular-enter-and-clear"');
    expect(html).toContain('data-collector-search-clear-contract="angular-cleared-load"');
    expect(html).toContain('data-collector-search-clear-owner="shared-search-row"');
    expect(html).toContain('data-collector-operate-warning-contract="angular-no-select-online-offline"');
    expect(html).toContain('data-collector-operate-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-collector-operate-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-operate-feedback-contract="angular-operate-notify"');
    expect(html).toContain('data-collector-operate-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-operate-api-contract="angular-put-repeated-collectors-query"');
    expect(html).toContain('data-collector-mutation-loading-contract="angular-nz-table-loading"');
    expect(html).toContain('data-collector-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-collector-load-failure-owner="collector-route-controller"');
    expect(html).toContain('data-collector-load-failure="none"');
    expect(html).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(html).toContain('data-collector-table-loading-owner="angular-nz-table-loading"');
    expect(html).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-collector-table-loading-source="idle"');
    expect(html).toContain('data-collector-deploy-modal-contract="angular-generate-identity-modal"');
    expect(html).toContain('data-collector-deploy-api-contract="angular-post-generate-identity"');
    expect(html).toContain('data-collector-deploy-failure-contract="angular-apply-fail-notification"');
    expect(html).toContain('data-collector-deploy-validation-contract="angular-submit-marks-required"');
    expect(html).toContain('data-collector-deploy-validation-raw-contract="angular-required-before-trim"');
    expect(html).toContain('data-collector-deploy-validation-raw-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-collector-deploy-mask-contract="angular-mask-closable-false"');
    expect(html).toContain('data-collector-deploy-width-contract="angular-width-45-percent"');
    expect(html).toContain('data-collector-deploy-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-collector-deploy-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-collector-deploy-command-contract="angular-docker-package-shells"');
    expect(html).toContain('data-collector-deploy-command-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-collector-deploy-package-link-contract="angular-github-releases-link"');
    expect(html).toContain('data-collector-deploy-copy-contract="angular-copy-identity"');
    expect(html).toContain('data-collector-deploy-copy-feedback-contract="angular-copy-success-duration-800"');
    expect(html).toContain('data-collector-deploy-close-reset-contract="angular-close-clears-name"');
    expect(html).toContain('data-collector-deploy-close-reset-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-close-pending-result-contract="angular-close-ignores-late-generate"');
    expect(html).toContain('data-collector-deploy-close-pending-result-owner="collector-route-controller"');
    expect(html).toContain('data-collector-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-collector-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-collector-summary-rail=');
    expect(html).toContain('Refresh');
    expect(html).toContain('Deploy collector');
    expect(html).toContain('Online collector');
    expect(html).toContain('Offline collector');
    expect(html).toContain('Delete collector');
    expect(html).toContain('Search');
    expect(html).toContain('Collector cluster');
    expect(html).toContain('no-action-message');
    expect(html).toContain('no-action-error');
    expect(html).toContain('no-action-meta');
    expect(html).toContain('success');
    expect(html).toContain('no-action-feedback-contract');
    expect(html).toContain('no-delete-target');
    expect(html).toContain('delete-idle');
    expect(html).toContain('route-load-idle');
    expect(html).toContain('deploy-name-pristine');
    expect(html).toContain('edge-a');
    expect(html).toContain('10.0.0.1');
    expect(html).toContain('collector-pagination');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/collector?pageIndex=0&pageSize=8');
  });

  it('keeps the collector shell mounted on list load failure like Angular console-only handling', async () => {
    mockState.renderErrorMessage = 'backend refused collector load';
    const { default: SettingCollectorPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingCollectorPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-collector-load-failure-owner="collector-route-controller"');
    expect(html).toContain('data-collector-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).toContain('collector-pagination');
    expect(html).not.toContain('backend refused collector load');
  });

  it('keeps collector management remounts on a short settled cache window while reloads invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/collector/setting-collector-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_COLLECTOR_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-collector', collectorListUrl, reloadVersion].join(':')");
    expect(source).toContain('[collectorListUrl, reloadVersion]');
    expect(source).toContain("const [query, setQuery] = useState<CollectorQueryState>({ pageIndex: 0, pageSize: 8, search: '' })");
    expect(source).toContain('const [selectedCollectors, setSelectedCollectors] = useState<string[]>([])');
    expect(source).toContain('const [actionMessage, setActionMessage] = useState<string | null>(null)');
    expect(source).toContain('const [actionError, setActionError] = useState<string | null>(null)');
    expect(source).toContain('const [actionMeta, setActionMeta] = useState<string | null>(null)');
    expect(source).toContain("const [actionTone, setActionTone] = useState<'success' | 'warning' | 'critical'>('success')");
    expect(source).toContain('const [actionFeedbackContract, setActionFeedbackContract] = useState<string | null>(null)');
    expect(source).toContain('const [deleteTarget, setDeleteTarget] = useState<CollectorDeleteTarget | null>(null)');
    expect(source).toContain('const [isDeletePending, setIsDeletePending] = useState(false)');
    expect(source).toContain('const [isLoadPending, setIsLoadPending] = useState(false)');
    expect(source).toContain('buildFallbackCollectorData');
    expect(source).toContain('renderError={(message, retry) => renderCollectorSurface(buildFallbackCollectorData(), message, retry)}');
    expect(source).toContain('loadError={loadError}');
    expect(source).toContain('const [deployOpen, setDeployOpen] = useState(false)');
    expect(source).toContain("const [deployHost, setDeployHost] = useState('127.0.0.1')");
    expect(source).toContain('const [deployDockerShell, setDeployDockerShell] = useState');
    expect(source).toContain('const [deployPackageShell, setDeployPackageShell] = useState');
    expect(source).toContain('const [deployNameValidationVisible, setDeployNameValidationVisible] = useState(false)');
    expect(source).toContain("setActionError(t('common.notify.no-select-delete'))");
    expect(source).toContain("setActionError(t(action === 'online' ? 'collector.notify.no-select-online' : 'collector.notify.no-select-offline'))");
    expect(source).toContain("setActionMessage(t(deleteTarget.action === 'online' || deleteTarget.action === 'offline' ? 'common.notify.operate-success' : 'common.notify.delete-success'))");
    expect(source).toContain("setActionError(t(isOperateAction ? 'common.notify.operate-fail' : 'common.notify.delete-fail'))");
    expect(source).toContain('setActionMeta(error instanceof Error ? error.message : null)');
    expect(source).toContain('const remainingTotal = Math.max(0, data.list.totalElements - targetCollectors.length)');
    expect(source).toContain('const lastPageIndex = Math.max(0, Math.ceil(remainingTotal / current.pageSize) - 1)');
    expect(source).toContain('current.pageIndex > lastPageIndex ? { ...current, pageIndex: lastPageIndex } : current');
    expect(source).toContain('setSelectedCollectors([]);');
    expect(source).not.toContain('setSelectedCollectors(collectors => collectors.filter');
    expect(source).toContain('deleteCollectors(apiMessageDelete, targetCollectors)');
    expect(source).toContain('goOnlineCollectors(apiMessagePut, targetCollectors)');
    expect(source).toContain('goOfflineCollectors(apiMessagePut, targetCollectors)');
    expect(source).toContain('generateCollectorIdentity(apiMessagePost, collector)');
    expect(source).toContain('buildCollectorDeployCommands(t, identity, managerHost)');
    expect(source).toContain('COLLECTOR_DEPLOY_COPY_SUCCESS_DURATION_MS = 800');
    expect(source).toContain('const deployCopyClearTimerRef = useRef');
    expect(source).toContain('const deployGenerationRequestRef = useRef(0);');
    expect(source).toContain('const clearDeployCopyTimer = useCallback');
    expect(source).toContain('const closeDeployDialog = useCallback');
    expect(source).toContain('deployGenerationRequestRef.current += 1;');
    expect(source).toContain("setDeployOpen(false);");
    expect(source).toContain("setDeployName('');");
    expect(source).toContain('window.clearTimeout(deployCopyClearTimerRef.current)');
    expect(source).toContain('deployCopyClearTimerRef.current = window.setTimeout');
    expect(source).toContain('COLLECTOR_DEPLOY_COPY_SUCCESS_DURATION_MS');
    expect(source).toContain('setIsDeployPending(true);');
    expect(source).toContain('setIsDeployPending(false);');
    expect(source).toContain("setDeployError(error instanceof Error ? error.message : t('common.notify.apply-fail'))");
    expect(source).toContain('setIsLoadPending(true);');
    expect(source).toContain('setIsLoadPending(false);');
    expect(source).toContain('return await loadCollectorData(apiMessageGet, query);');
    expect(source).toContain("setDeployError(error instanceof Error ? error.message : t('common.notify.apply-fail'))");
    expect(source).toContain("setDeployCopyMessage(t('common.notify.copy-success'))");
    expect(source).toContain('onRefresh={() => {');
    expect(source).toContain('setReloadVersion(version => version + 1);');
    expect(source).toContain('selectedCollectors={selectedCollectors}');
    expect(source).toContain('actionMeta={actionMeta}');
    expect(source).toContain('actionFeedbackContract={actionFeedbackContract}');
    expect(source).toContain('deployOpen={deployOpen}');
    expect(source).toContain('deployIdentity={deployIdentity}');
    expect(source).toContain('deployDockerShell={deployDockerShell}');
    expect(source).toContain('deployPackageShell={deployPackageShell}');
    expect(source).toContain('deployNameValidationVisible={deployNameValidationVisible}');
    expect(source).toContain('onSelectedCollectorsChange={setSelectedCollectors}');
    expect(source).toContain('onPageIndexChange={pageIndex => {');
    expect(source).toContain('setQuery(current => ({ ...current, pageIndex }))');
    expect(source).toContain('onPageSizeChange={pageSize => {');
    expect(source).toContain('setQuery(current => ({ ...current, pageIndex: 0, pageSize }))');
    expect(source).toContain('setQuery(current => ({ ...current, pageIndex: 0, search }))');
    expect(source).toContain('onSearchClear={() => {');
    expect(source).toContain("setSearch('');");
    expect(source).toContain("setQuery(current => ({ ...current, pageIndex: 0, search: '' }))");
    expect(source).toContain('onDeployGenerate={() => {');
    expect(source).toContain('if (isDeployPending) return;');
    expect(source).toContain('const collector = deployName.trim();');
    expect(source).toContain('if (deployName.length === 0) {');
    expect(source).toContain('const deployGenerationRequest = deployGenerationRequestRef.current + 1;');
    expect(source).toContain('deployGenerationRequestRef.current = deployGenerationRequest;');
    expect(source).toContain('if (deployGenerationRequestRef.current !== deployGenerationRequest) return;');
    expect(source).toContain('setDeployNameValidationVisible(true);');
    expect(source).toContain('setDeployNameValidationVisible(false);');
    expect(source).toContain('onDeployCopy={value => {');
    expect(source).toContain("onGoOnline={() => openBatchOperateTarget('online')}");
    expect(source).toContain("onGoOffline={() => openBatchOperateTarget('offline')}");
    expect(source).toContain('deleteTarget={deleteTarget}');
    expect(source).toContain('isDeletePending={isDeletePending}');
    expect(source).toContain('isLoadPending={isLoadPending}');
    expect(source).toContain('cacheKey={collectorManageCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_COLLECTOR_SETTLED_CACHE_TTL_MS}');
  });

  it('ignores late collector deploy identity results after the dialog is closed', async () => {
    let resolveGenerate: ((value: { identity: string; host: string }) => void) | undefined;
    generateCollectorIdentity.mockImplementationOnce(() => new Promise(resolve => {
      resolveGenerate = resolve as (value: { identity: string; host: string }) => void;
    }));
    const { default: SettingCollectorPage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<SettingCollectorPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeploy();
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeployNameChange(' edge-b ');
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeployGenerate();
      await Promise.resolve();
    });

    expect(generateCollectorIdentity).toHaveBeenCalledWith(apiMessagePost, 'edge-b');
    expect(mockState.lastSurfaceProps?.isDeployPending).toBe(true);

    await act(async () => {
      mockState.lastSurfaceProps?.onDeployClose();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.deployOpen).toBe(false);
    expect(mockState.lastSurfaceProps?.deployName).toBe('');
    expect(mockState.lastSurfaceProps?.deployIdentity).toBe('');
    expect(mockState.lastSurfaceProps?.isDeployPending).toBe(false);

    await act(async () => {
      resolveGenerate?.({ identity: 'late-identity', host: '10.0.0.20' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.deployOpen).toBe(false);
    expect(mockState.lastSurfaceProps?.deployName).toBe('');
    expect(mockState.lastSurfaceProps?.deployIdentity).toBe('');
    expect(mockState.lastSurfaceProps?.deployDockerShell).toBe('');
    expect(mockState.lastSurfaceProps?.deployPackageShell).toBe('');
    expect(mockState.lastSurfaceProps?.isDeployPending).toBe(false);
    expect(buildCollectorDeployCommands).not.toHaveBeenCalled();
  });
});
