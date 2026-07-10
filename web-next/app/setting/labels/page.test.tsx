// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  lastRetry: null as null | (() => void),
  renderErrorMessage: null as string | null,
  lastSurfaceProps: null as null | Record<string, any>,
  currentSearchParams: '',
  routerReplace: vi.fn(),
  renderData: {
    list: {
      content: [
        {
          id: 1,
          name: 'team',
          tagValue: 'ops',
          description: 'ops team',
          type: 1
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());
const apiMessagePut = vi.hoisted(() => vi.fn());
const apiMessageDelete = vi.hoisted(() => vi.fn());
const loadLabelData = vi.hoisted(() => vi.fn());
const saveLabel = vi.hoisted(() => vi.fn());
const deleteLabel = vi.hoisted(() => vi.fn());
let SettingLabelsPage: React.ComponentType;

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.routerReplace
  }),
  useSearchParams: () => new URLSearchParams(mockState.currentSearchParams)
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
      const retry = vi.fn();
      mockState.lastRetry = retry;
      return <div data-client-workbench="true">{renderError(mockState.renderErrorMessage, retry)}</div>;
    }
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/label-manage-surface', () => ({
  LabelManageSurface: (props: any) => {
    mockState.lastSurfaceProps = props;
    const {
      data,
      search,
      draftLabel,
      isManageModalAdd,
      isNameValidationVisible,
      deleteTarget,
      isLoadPending,
      isDeletePending,
      isSavePending,
      actionMessage,
      actionError,
      actionMeta,
      loadError,
      onSearchClear,
      onEdit,
      onDraftChange,
      onCloseDialog
    } = props;
    return (
    <div
      data-label-manage-surface="otlp-hertzbeat-ui-label-console"
      data-label-manage-style-baseline="hertzbeat-ui-matte"
      data-label-action-feedback={actionError ? 'angular-action-error' : actionMessage ? 'angular-action-success' : 'none'}
      data-label-save-feedback={actionError ? 'angular-save-error' : actionMessage ? 'angular-save-success' : 'none'}
      data-label-action-meta={actionMeta ?? 'no-action-meta'}
      data-label-save-feedback-contract="angular-new-edit-notify"
      data-label-save-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-label-save-failure-contract="angular-new-edit-fail-notification"
      data-label-save-failure-owner="hertzbeat-ui-inline-feedback"
      data-label-load-failure-contract="angular-console-only-shell"
      data-label-load-failure-owner="label-route-controller"
      data-label-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
      data-label-copy-feedback-contract="angular-copy-notify"
      data-label-copy-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-label-delete-confirm-contract="angular-modal-confirm"
      data-label-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
      data-label-delete-confirm-state-contract="angular-modal-confirm-state"
      data-label-delete-confirm-state-contract-owner="hertzbeat-ui-confirm-dialog"
      data-label-delete-confirm-state={deleteTarget ? 'open' : 'closed'}
      data-label-delete-confirm-close-contract="angular-close-before-delete-result"
      data-label-delete-confirm-close-owner="route-state-contract"
      data-label-delete-feedback-contract="angular-delete-notify"
      data-label-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-label-delete-failure-contract="angular-delete-fail-notification"
      data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"
      data-label-delete-query-contract="angular-repeated-ids-query"
      data-label-delete-query-owner="route-mutation-contract"
      data-label-card-loading-contract="angular-table-loading"
      data-label-card-loading-owner="label-route-controller"
      data-label-card-loading={isLoadPending || isDeletePending ? 'true' : 'false'}
      data-label-save-loading-contract="angular-nz-ok-loading"
      data-label-save-loading-contract-owner="angular-nz-ok-loading"
      data-label-save-trim-contract="angular-trim-before-save"
      data-label-save-trim-owner="label-manage-controller"
      data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"
      data-label-optional-save-payload-owner="label-manage-controller"
      data-label-type-save-payload-contract="angular-preserve-implicit-type"
      data-label-type-save-payload-owner="label-manage-controller"
      data-label-description-display-contract="angular-truthy-description-raw"
      data-label-description-display-owner="label-manage-surface"
      data-label-dialog-mask-closable-contract="angular-mask-closable-false"
      data-label-dialog-mask-closable-owner="angular-nz-modal"
      data-label-dialog-width-contract="angular-width-30-percent"
      data-label-dialog-width-owner="angular-nz-modal"
      data-label-dialog-field-layout-contract="angular-label-7-control-12"
      data-label-dialog-field-layout-owner="route-form-field-grid"
      data-label-dialog-preview-visibility-contract="angular-name-defined-preview"
      data-label-dialog-preview-visibility-owner="route-form-state"
      data-label-dialog-preview-frame-contract="angular-inline-form-item"
      data-label-dialog-preview-frame-owner="route-form-field-grid"
      data-label-edit-reference-contract="isolated-edit-draft"
      data-label-edit-reference-owner="route-form-state"
      data-label-save-ok-loading={isSavePending ? 'true' : 'false'}
      data-label-save-ok-loading-owner="angular-nz-ok-loading"
      data-label-name-validation-contract="angular-required-before-submit"
      data-label-name-validation-trigger="angular-ok-marks-dirty"
      data-label-name-validation-trigger-owner="route-form-contract"
      data-label-name-validation-trim-contract="local-trim-required-before-submit"
      data-label-name-validation-trim-owner="route-form-contract"
      data-label-name-validation-visible={isNameValidationVisible ? 'true' : 'false'}
      data-label-query-contract="angular-load-all-labels"
      data-label-query-owner="label-query-state"
      data-label-query-param-order-contract="angular-page-index-size-type-search"
      data-label-query-param-order-owner="label-query-state"
      data-label-search-submit="angular-enter-and-clear"
      data-label-search-submit-owner="hertzbeat-ui-search-row"
      data-label-search-clear-wired={typeof onSearchClear === 'function' ? 'true' : 'false'}
      data-label-card-grid-contract="angular-card-grid"
      data-label-card-grid-owner="hertzbeat-ui-label-tag"
      data-label-monitor-handoff-contract="angular-routerlink-monitors-labels"
      data-label-monitor-handoff-owner="next-monitor-query-link"
      data-label-monitor-handoff-builder={typeof props.buildMonitorHandoffHref === 'function' ? 'true' : 'false'}
    >
      <section data-label-admin-layout="full-width-admin-list">
        <span>Label management</span>
        <span>{search}</span>
        <span data-label-test-first-name="true">{data.list.content[0]?.name || 'no-row'}</span>
        <span>{draftLabel ? draftLabel.name : 'no-draft'}</span>
        <span>{String(isManageModalAdd)}</span>
        <span>{deleteTarget ? deleteTarget.name : 'no-delete-target'}</span>
        <span>{actionMessage || actionError || 'no-feedback'}</span>
        <span>{actionMeta || 'no-meta'}</span>
        <span>{loadError || 'no-load-error'}</span>
        <button data-label-test-edit="true" onClick={() => onEdit(data.list.content[0])}>edit</button>
        <button data-label-test-change-name="true" onClick={() => onDraftChange({ name: 'platform' })}>change name</button>
        <button data-label-test-close="true" onClick={onCloseDialog}>close</button>
      </section>
    </div>
    );
  }
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  apiMessageDelete
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

vi.mock('@/lib/label-manage/controller', () => ({
  loadLabelData,
  createEmptyLabelDraft: () => ({ id: 0, name: undefined, tagValue: undefined, description: undefined, type: undefined }),
  cloneLabelDraft: (label: any) => ({ ...label }),
  saveLabel,
  deleteLabel
}));

describe('setting labels page', () => {
  beforeAll(async () => {
    const pageModule = await import('./page');
    SettingLabelsPage = pageModule.default;
  }, 30000);

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.lastRetry = null;
    mockState.renderErrorMessage = null;
    mockState.lastSurfaceProps = null;
    mockState.currentSearchParams = '';
    mockState.routerReplace.mockReset();
    mockState.renderData = {
      list: {
        content: [
          {
            id: 1,
            name: 'team',
            tagValue: 'ops',
            description: 'ops team',
            type: 1
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      }
    };
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    apiMessageDelete.mockReset();
    saveLabel.mockReset().mockResolvedValue(undefined);
    deleteLabel.mockReset().mockResolvedValue(undefined);
    loadLabelData.mockReset().mockImplementation(async (apiGetFn, query) => {
      await apiGetFn(`/label?pageIndex=0&pageSize=9999${query.search ? `&search=${query.search}` : ''}`);
      return mockState.renderData;
    });
  });

  it('renders the shared label surface and keeps the route focused on load composition', async () => {
    const html = renderToStaticMarkup(<SettingLabelsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-label-manage-surface="otlp-hertzbeat-ui-label-console"');
    expect(html).toContain('data-label-manage-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-label-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-label-summary-rail=');
    expect(html).toContain('Label management');
    expect(html).toContain('no-draft');
    expect(html).toContain('false');
    expect(html).toContain('data-label-save-feedback="none"');
    expect(html).toContain('data-label-save-feedback-contract="angular-new-edit-notify"');
    expect(html).toContain('data-label-save-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-save-failure-contract="angular-new-edit-fail-notification"');
    expect(html).toContain('data-label-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-label-load-failure-owner="label-route-controller"');
    expect(html).toContain('data-label-load-failure="none"');
    expect(html).toContain('data-label-copy-feedback-contract="angular-copy-notify"');
    expect(html).toContain('data-label-copy-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-label-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-label-delete-confirm-state-contract="angular-modal-confirm-state"');
    expect(html).toContain('data-label-delete-confirm-state-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-label-delete-confirm-state="closed"');
    expect(html).toContain('data-label-delete-confirm-close-contract="angular-close-before-delete-result"');
    expect(html).toContain('data-label-delete-confirm-close-owner="route-state-contract"');
    expect(html).toContain('data-label-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-label-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-delete-failure-contract="angular-delete-fail-notification"');
    expect(html).toContain('data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-delete-query-contract="angular-repeated-ids-query"');
    expect(html).toContain('data-label-delete-query-owner="route-mutation-contract"');
    expect(html).toContain('data-label-card-loading-contract="angular-table-loading"');
    expect(html).toContain('data-label-card-loading-owner="label-route-controller"');
    expect(html).toContain('data-label-card-loading="false"');
    expect(html).toContain('data-label-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-label-dialog-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-label-dialog-preview-visibility-contract="angular-name-defined-preview"');
    expect(html).toContain('data-label-dialog-preview-visibility-owner="route-form-state"');
    expect(html).toContain('data-label-dialog-preview-frame-contract="angular-inline-form-item"');
    expect(html).toContain('data-label-dialog-preview-frame-owner="route-form-field-grid"');
    expect(html).toContain('data-label-edit-reference-contract="isolated-edit-draft"');
    expect(html).toContain('data-label-edit-reference-owner="route-form-state"');
    expect(html).toContain('data-label-save-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-label-save-loading-contract-owner="angular-nz-ok-loading"');
    expect(html).toContain('data-label-save-trim-contract="angular-trim-before-save"');
    expect(html).toContain('data-label-save-trim-owner="label-manage-controller"');
    expect(html).toContain('data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"');
    expect(html).toContain('data-label-optional-save-payload-owner="label-manage-controller"');
    expect(html).toContain('data-label-type-save-payload-contract="angular-preserve-implicit-type"');
    expect(html).toContain('data-label-type-save-payload-owner="label-manage-controller"');
    expect(html).toContain('data-label-dialog-mask-closable-contract="angular-mask-closable-false"');
    expect(html).toContain('data-label-dialog-mask-closable-owner="angular-nz-modal"');
    expect(html).toContain('data-label-dialog-width-contract="angular-width-30-percent"');
    expect(html).toContain('data-label-dialog-width-owner="angular-nz-modal"');
    expect(html).toContain('data-label-save-ok-loading="false"');
    expect(html).toContain('data-label-save-ok-loading-owner="angular-nz-ok-loading"');
    expect(html).toContain('data-label-name-validation-contract="angular-required-before-submit"');
    expect(html).toContain('data-label-name-validation-trigger="angular-ok-marks-dirty"');
    expect(html).toContain('data-label-name-validation-trigger-owner="route-form-contract"');
    expect(html).toContain('data-label-name-validation-trim-contract="local-trim-required-before-submit"');
    expect(html).toContain('data-label-name-validation-trim-owner="route-form-contract"');
    expect(html).toContain('data-label-name-validation-visible="false"');
    expect(html).toContain('data-label-query-contract="angular-load-all-labels"');
    expect(html).toContain('data-label-query-owner="label-query-state"');
    expect(html).toContain('data-label-query-param-order-contract="angular-page-index-size-type-search"');
    expect(html).toContain('data-label-query-param-order-owner="label-query-state"');
    expect(html).toContain('data-label-search-submit="angular-enter-and-clear"');
    expect(html).toContain('data-label-search-submit-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-label-search-clear-wired="true"');
    expect(html).toContain('data-label-card-grid-contract="angular-card-grid"');
    expect(html).toContain('data-label-card-grid-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-label-monitor-handoff-contract="angular-routerlink-monitors-labels"');
    expect(html).toContain('data-label-monitor-handoff-owner="next-monitor-query-link"');
    expect(html).toContain('no-delete-target');
    expect(html).toContain('no-feedback');
    expect(html).toContain('no-meta');
    expect(html).toContain('no-load-error');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/label?pageIndex=0&pageSize=9999');
  }, 30000);

  it('keeps the Angular label shell visible when list loading fails', () => {
    mockState.renderErrorMessage = 'backend refused label load';

    const html = renderToStaticMarkup(<SettingLabelsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-label-manage-surface="otlp-hertzbeat-ui-label-console"');
    expect(html).toContain('data-label-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-label-load-failure-owner="label-route-controller"');
    expect(html).toContain('data-label-load-failure="angular-console-only-shell"');
    expect(html).toContain('backend refused label load');
    expect(html).toContain('data-label-card-loading="false"');
    expect(html).toContain('data-label-save-feedback="none"');
    expect(html).toContain('data-label-test-first-name="true">no-row');
    expect(html).not.toContain('data-observability-status');
    expect(html).not.toContain('common.load-failed');
    expect(mockState.lastRetry).toBeTypeOf('function');
  });

  it('keeps edits isolated from the list until the label dialog is saved', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-label-test-first-name="true"]')?.textContent).toBe('team');
    expect(mockState.lastSurfaceProps?.draftLabel).toBeNull();

    await act(async () => {
      (container.querySelector('[data-label-test-edit="true"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.draftLabel).not.toBe(mockState.renderData.list.content[0]);
    expect(mockState.lastSurfaceProps?.draftLabel?.name).toBe('team');

    await act(async () => {
      (container.querySelector('[data-label-test-change-name="true"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(mockState.renderData.list.content[0].name).toBe('team');
    expect(container.querySelector('[data-label-test-first-name="true"]')?.textContent).toBe('team');
    expect(mockState.lastSurfaceProps?.draftLabel?.name).toBe('platform');

    await act(async () => {
      (container.querySelector('[data-label-test-close="true"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.draftLabel).toBeNull();
    expect(mockState.renderData.list.content[0].name).toBe('team');
    expect(container.querySelector('[data-label-test-first-name="true"]')?.textContent).toBe('team');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('keeps the route thin and leaves cold label visuals in the shared surface', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain('LabelManageSurface');
    expect(source).toContain('EMPTY_LABEL_DATA');
    expect(source).toContain('renderError={(message, retry) => renderSurface(EMPTY_LABEL_DATA, message, retry)}');
    expect(source).toContain('buildLabelUrl(query)');
    expect(source).toContain('setDraftLabel({ ...label })');
    expect(source).not.toContain('Object.assign(sourceLabel, patch)');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('data-label-card-shell');
    expect(source).not.toContain('data-label-toolbar');
    expect(source).not.toContain('otlp-hertzbeat-ui-label-console');
  });

  it('keeps label management remounts on a short settled cache window while reloads invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_LABELS_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('const [isLoadPending, setIsLoadPending] = useState(false)');
    expect(source).toContain('setIsLoadPending(true);');
    expect(source).toContain('return await loadLabelData(apiMessageGet, query);');
    expect(source).toContain('setIsLoadPending(false);');
    expect(source).toContain('isLoadPending={isLoadPending}');
    expect(source).toContain("['setting-labels', labelListUrl, reloadVersion].join(':')");
    expect(source).toContain('[labelListUrl, reloadVersion]');
    expect(source).toContain('onRefresh={() => {');
    expect(source).toContain('if (retry) {');
    expect(source).toContain('retry();');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={labelManageCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_LABELS_SETTLED_CACHE_TTL_MS}');
  });

  it('resets the search draft and query when the Angular clear event fires', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain("const routeSearch = searchParams.get('search') ?? '';");
    expect(source).toContain("const routeType = normalizeLabelQueryType(searchParams.get('type') ?? '');");
    expect(source).toContain('const replaceRouteQuery = useCallback(');
    expect(source).toContain("const nextUrl = nextParamString ? `/setting/labels?${nextParamString}` : '/setting/labels';");
    expect(source).toContain('if (nextUrl !== currentUrl) {');
    expect(source).toContain('router.replace(nextUrl, { scroll: false });');
    expect(source).toContain('onSearch={() => {');
    expect(source).toContain("const nextQuery = { search, type: '' };");
    expect(source).toContain('replaceRouteQuery(nextQuery);');
    expect(source).toContain('onSearchClear={() => {');
    expect(source).toContain("setSearch('');");
    expect(source).toContain("const nextQuery = { search: '', type: '' };");
    expect(source).toContain('setQuery(nextQuery);');
  });

  it('initializes label search from the URL and preserves route state when search and clear run', async () => {
    mockState.currentSearchParams = 'search=team&type=1&view=grid';
    loadLabelData.mockImplementation(async (_apiGetFn, query) => {
      return {
        ...mockState.renderData,
        query
      };
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.search).toBe('team');
    await act(async () => {
      await mockState.lastLoad?.();
    });
    expect(loadLabelData).toHaveBeenLastCalledWith(apiMessageGet, { search: 'team', type: '1' });

    await act(async () => {
      mockState.lastSurfaceProps?.onSearchChange('ops');
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSearch();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/setting/labels?search=ops&view=grid', { scroll: false });
    await act(async () => {
      await mockState.lastLoad?.();
    });
    expect(loadLabelData).toHaveBeenLastCalledWith(apiMessageGet, { search: 'ops', type: '' });

    mockState.currentSearchParams = 'search=ops&view=grid';
    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSearchClear();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenLastCalledWith('/setting/labels?view=grid', { scroll: false });
    expect(mockState.lastSurfaceProps?.search).toBe('');
    await act(async () => {
      await mockState.lastLoad?.();
    });
    expect(loadLabelData).toHaveBeenLastCalledWith(apiMessageGet, { search: '', type: '' });

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('keeps unsupported route label types out of backend queries while preserving unrelated URL params', async () => {
    mockState.currentSearchParams = 'search=codex-label&type=manual&view=grid';
    loadLabelData.mockImplementation(async (_apiGetFn, query) => {
      return {
        ...mockState.renderData,
        query
      };
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.search).toBe('codex-label');
    await act(async () => {
      await mockState.lastLoad?.();
    });
    expect(loadLabelData).toHaveBeenLastCalledWith(apiMessageGet, { search: 'codex-label', type: '' });

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('builds row monitor handoff links without dropping route context parameters', async () => {
    mockState.currentSearchParams = 'search=team&type=1&source=label-monitor-link-test&returnTo=%2Fsetting%2Fdefine%3Fapp%3Dwebsite&pageSize=8&timeRange=last-30m&live=false&probe=label-monitor-link-test';
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    const href = mockState.lastSurfaceProps?.buildMonitorHandoffHref?.('team:ops');
    expect(href).toContain('/monitors?');
    expect(href).toContain('labels=team%3Aops');
    expect(href).toContain('source=label-monitor-link-test');
    expect(href).toContain('returnTo=%2Fsetting%2Fdefine%3Fapp%3Dwebsite');
    expect(href).toContain('pageSize=8');
    expect(href).toContain('timeRange=last-30m');
    expect(href).toContain('live=false');
    expect(href).toContain('probe=label-monitor-link-test');
    expect(href).not.toContain('search=team');
    expect(href).not.toContain('type=1');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('routes label save feedback through Angular create/edit notification keys', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain('const [actionMessage, setActionMessage] = useState<string | null>(null)');
    expect(source).toContain('const [actionError, setActionError] = useState<string | null>(null)');
    expect(source).toContain('const [actionMeta, setActionMeta] = useState<string | null>(null)');
    expect(source).toContain('const [isNameValidationVisible, setIsNameValidationVisible] = useState(false)');
    expect(source).toContain('actionMessage={actionMessage}');
    expect(source).toContain('actionError={actionError}');
    expect(source).toContain('actionMeta={actionMeta}');
    expect(source).toContain('isNameValidationVisible={isNameValidationVisible}');
    expect(source).toContain('const draftToSave = visibleDraft ?? draftLabel;');
    expect(source).toContain("const trimmedLabelName = (draftToSave.name ?? '').trim();");
    expect(source).toContain('if (trimmedLabelName.length === 0) {');
    expect(source).toContain('setDraftLabel(draftToSave);');
    expect(source).toContain('setIsNameValidationVisible(true);');
    expect(source).toContain('return;');
    expect(source).toContain('setIsNameValidationVisible(false);');
    expect(source).toContain("setActionMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'))");
    expect(source).toContain("setActionError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(source).toContain('setActionMeta(error instanceof Error ? error.message : null)');
    expect(source).not.toContain("setActionMessage(t('common.save-success'))");
    expect(source).not.toContain("setActionError(t('common.save-failed'))");
  });

  it('blocks a whitespace-only label name before save', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onNew();
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDraftChange({ name: '   ', tagValue: 'ops' });
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSaveDialog();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveLabel).not.toHaveBeenCalled();
    expect(mockState.lastSurfaceProps?.isNameValidationVisible).toBe(true);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('blocks an edit save when the visible dialog name is cleared before React state settles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onEdit(mockState.renderData.list.content[0]);
      await Promise.resolve();
    });

    const visibleDraft = {
      ...(mockState.lastSurfaceProps?.draftLabel ?? mockState.renderData.list.content[0]),
      name: '',
      tagValue: 'ops',
      description: 'ops team'
    };

    await act(async () => {
      mockState.lastSurfaceProps?.onSaveDialog(visibleDraft);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveLabel).not.toHaveBeenCalled();
    expect(mockState.lastSurfaceProps?.isNameValidationVisible).toBe(true);
    expect(mockState.lastSurfaceProps?.draftLabel?.name).toBe('');
    expect(mockState.renderData.list.content[0].name).toBe('team');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('keeps Angular label create failure title with backend detail', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    saveLabel.mockRejectedValue(new Error('backend refused label create'));

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onNew();
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDraftChange({ name: 'team', tagValue: 'ops' });
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSaveDialog();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveLabel).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      expect.objectContaining({ name: 'team', tagValue: 'ops' }),
      true
    );
    expect(mockState.lastSurfaceProps?.actionError).toBe(createTranslatorMock({ locale: 'zh-CN' })('common.notify.new-fail'));
    expect(mockState.lastSurfaceProps?.actionMeta).toBe('backend refused label create');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('keeps Angular label edit failure title with backend detail', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    saveLabel.mockRejectedValue(new Error('backend refused label edit'));

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onEdit(mockState.renderData.list.content[0]);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onSaveDialog();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveLabel).toHaveBeenCalledWith(
      apiMessagePost,
      apiMessagePut,
      mockState.renderData.list.content[0],
      false
    );
    expect(mockState.lastSurfaceProps?.actionError).toBe(createTranslatorMock({ locale: 'zh-CN' })('common.notify.edit-fail'));
    expect(mockState.lastSurfaceProps?.actionMeta).toBe('backend refused label edit');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('routes label copy feedback through Angular clipboard notification keys', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain("import { buildLabelDisplayName } from '@/lib/label-manage/view-model'");
    expect(source).toContain('const text = buildLabelDisplayName(label)');
    expect(source).toContain('const selectCopiedLabelText = useCallback((text: string) => {');
    expect(source).toContain("document.querySelectorAll<HTMLElement>('[data-label-copy-source]')");
    expect(source).toContain('element.dataset.labelCopySource === text');
    expect(source).toContain('document.createRange()');
    expect(source).toContain('range.selectNodeContents(source)');
    expect(source).toContain('selection.addRange(range)');
    expect(source).toContain("setActionError(t(didSelect ? 'setting.labels.copy-fallback' : 'common.notify.copy-fail'))");
    expect(source).toContain("'common.notify.copy-fail'");
    expect(source).toContain("then(() => setActionMessage(t('common.notify.copy-success')))");
    expect(source).toContain('catch(() => handleLabelCopyFailure(text))');
    expect(source).not.toContain('navigator.clipboard.writeText(text);');
  });

  it('closes the Angular label delete confirmation before the delete result settles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    deleteLabel.mockReturnValue(new Promise(() => undefined));

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteRequest(mockState.renderData.list.content[0]);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.deleteTarget?.name).toBe('team');

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteConfirm();
      await Promise.resolve();
    });

    expect(deleteLabel).toHaveBeenCalledWith(apiMessageDelete, 1);
    expect(mockState.lastSurfaceProps?.deleteTarget).toBeNull();
    expect(mockState.lastSurfaceProps?.isDeletePending).toBe(true);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('cancels label deletion without mutating backend state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteRequest(mockState.renderData.list.content[0]);
      await Promise.resolve();
    });

    expect(mockState.lastSurfaceProps?.deleteTarget?.name).toBe('team');
    expect(mockState.lastSurfaceProps?.actionMessage).toBeNull();
    expect(mockState.lastSurfaceProps?.actionError).toBeNull();

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteCancel();
      await Promise.resolve();
    });

    expect(deleteLabel).not.toHaveBeenCalled();
    expect(mockState.lastSurfaceProps?.deleteTarget).toBeNull();
    expect(mockState.lastSurfaceProps?.actionMessage).toBeNull();
    expect(mockState.lastSurfaceProps?.actionError).toBeNull();
    expect(mockState.renderData.list.content[0].name).toBe('team');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('keeps Angular label delete failure title with backend detail', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    deleteLabel.mockRejectedValue(new Error('backend refused label delete'));

    await act(async () => {
      root.render(<SettingLabelsPage />);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteRequest(mockState.renderData.list.content[0]);
      await Promise.resolve();
    });

    await act(async () => {
      mockState.lastSurfaceProps?.onDeleteConfirm();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(deleteLabel).toHaveBeenCalledWith(apiMessageDelete, 1);
    expect(mockState.lastSurfaceProps?.deleteTarget).toBeNull();
    expect(mockState.lastSurfaceProps?.actionError).toBe(createTranslatorMock({ locale: 'zh-CN' })('common.notify.delete-fail'));
    expect(mockState.lastSurfaceProps?.actionMeta).toBe('backend refused label delete');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  }, 30000);

  it('routes label delete through Angular confirmation and notification keys', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain('const [deleteTarget, setDeleteTarget] = useState<Label | null>(null)');
    expect(source).toContain('const [isDeletePending, setIsDeletePending] = useState(false)');
    expect(source).toContain('const [isSavePending, setIsSavePending] = useState(false)');
    expect(source).toContain('deleteTarget={deleteTarget}');
    expect(source).toContain('isDeletePending={isDeletePending}');
    expect(source).toContain('isSavePending={isSavePending}');
    expect(source).toContain('onDeleteRequest={label =>');
    expect(source).toContain('setDeleteTarget(label)');
    expect(source).toContain('onDeleteConfirm={() =>');
    expect(source).toContain('const target = deleteTarget;');
    expect(source).toContain('setDeleteTarget(null);');
    expect(source).toContain('void deleteLabel(apiMessageDelete, target.id)');
    expect(source).toContain("setActionMessage(t('common.notify.delete-success'))");
    expect(source).toContain("setActionError(t('common.notify.delete-fail'))");
    expect(source).toContain('setActionMeta(error instanceof Error ? error.message : null)');
    expect(source).not.toContain('onDelete={label =>');
  });

  it('routes label save pending state through Angular nzOkLoading semantics', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/labels/setting-labels-page.tsx'), 'utf8');

    expect(source).toContain('const [isSavePending, setIsSavePending] = useState(false)');
    expect(source).toContain('isSavePending={isSavePending}');
    expect(source).toContain('setIsSavePending(true);');
    expect(source).toContain('setIsSavePending(false);');
    expect(source).toContain('.finally(() => {');
    expect(source).not.toContain('isManageModalOkLoading');
  });

  it('keeps Angular trim-before-save normalization in the label controller', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/label-manage/controller.ts'), 'utf8');

    expect(source).toContain('function normalizeLabelDraft(draft: Label): Label');
    expect(source).toContain("name: (draft.name ?? '').trim()");
    expect(source).toContain('tagValue: draft.tagValue == undefined ? undefined : draft.tagValue.trim()');
    expect(source).toContain('description: draft.description == undefined ? undefined : draft.description.trim()');
    expect(source).toContain('const payload = normalizeLabelDraft(draft)');
  });
});
