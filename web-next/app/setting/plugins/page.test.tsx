import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderErrorMessage: null as string | null,
  renderData: {
    list: {
      content: [
        {
          id: 1,
          name: 'smtp',
          enableStatus: true,
          items: [{ type: 'POST_ALERT' }],
          paramCount: 2
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
const loadPluginData = vi.hoisted(() => vi.fn());

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'zh-CN',
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

vi.mock('@/components/pages/plugin-manage-surface', () => ({
  PluginManageSurface: ({ data, search, draftPlugin, isUploadDialogOpen, paramDraft, actionMessage, actionError, actionMeta, actionTone, actionKind, loadError, uploadValidation, isUploadPending, isParamPending, isLoadPending, isTogglePending, optimisticEnableStatus, deleteTarget }: any) => (
    <div
      data-plugin-manage-surface="otlp-cold-plugin-console"
      data-plugin-manage-style-baseline="hertzbeat-cold-matte"
      data-plugin-enable-feedback-contract="angular-edit-notify"
      data-plugin-enable-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-plugin-enable-failure-contract="angular-edit-fail-notification"
      data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"
      data-plugin-enable-optimistic-contract="angular-toggle-mutates-row-before-put"
      data-plugin-enable-optimistic-owner="route-state-contract"
      data-plugin-table-loading-contract="angular-load-plugins-table"
      data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"
      data-plugin-load-failure-contract="angular-console-only-shell"
      data-plugin-load-failure-owner="plugin-route-controller"
      data-plugin-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
      data-plugin-toggle-loading-contract="angular-nz-table-loading"
      data-plugin-toggle-loading-contract-owner="angular-nz-table-loading"
      data-plugin-selection-reset-contract="angular-load-clears-selection"
      data-plugin-selection-reset-owner="route-state-contract"
      data-plugin-query-param-order-contract="angular-page-index-size-search"
      data-plugin-query-param-order-owner="plugin-query-state"
      data-plugin-search-submit-contract="angular-enter-and-clear"
      data-plugin-search-clear-contract="angular-cleared-load"
      data-plugin-search-clear-owner="shared-search-row"
      data-plugin-delete-warning-contract="angular-no-select-warning"
      data-plugin-delete-confirm-contract="angular-modal-confirm"
      data-plugin-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
      data-plugin-delete-feedback-contract="angular-delete-notify"
      data-plugin-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-plugin-delete-failure-contract="angular-delete-fail-notification"
      data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"
      data-plugin-delete-query-contract="angular-repeated-ids-query"
      data-plugin-delete-query-owner="route-mutation-contract"
      data-plugin-delete-page-clamp-contract="angular-update-page-index"
      data-plugin-table-columns-contract="angular-five-column-edit-actions"
      data-plugin-table-columns-owner="angular-nz-table"
      data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"
      data-plugin-table-stable-height-owner="route-layout-contract"
      data-plugin-toolbar-delete-menu-contract="angular-toolbar-ellipsis-delete"
      data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"
      data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
      data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
      data-plugin-upload-validation-contract="angular-required-before-submit"
      data-plugin-upload-invalid-submit-contract="angular-mark-dirty-keep-open"
      data-plugin-upload-invalid-submit-owner="route-validation-contract"
      data-plugin-upload-loading-contract="angular-nz-ok-loading"
      data-plugin-upload-payload-contract="angular-form-data"
      data-plugin-upload-name-payload-contract="angular-raw-name-no-trim"
      data-plugin-upload-name-payload-owner="plugin-manage-controller"
      data-plugin-upload-save-lifecycle-contract="angular-close-success-keep-open-fail"
      data-plugin-upload-save-lifecycle-owner="route-state-contract"
      data-plugin-upload-success-reset-contract="angular-reset-form-after-success"
      data-plugin-upload-success-reset-owner="route-state-contract"
      data-plugin-upload-cancel-contract="angular-cancel-preserves-form"
      data-plugin-upload-cancel-contract-owner="route-state-contract"
      data-plugin-upload-cancel-pending-contract="angular-cancel-allowed-during-ok-loading"
      data-plugin-upload-cancel-pending-owner="angular-nz-modal"
      data-plugin-upload-mask-closable-contract="angular-mask-closable-false"
      data-plugin-upload-width-contract="angular-width-30-percent"
      data-plugin-upload-modal-owner="angular-nz-modal"
      data-plugin-upload-field-layout-contract="angular-label-8-control-14"
      data-plugin-upload-field-layout-owner="route-form-field-grid"
      data-plugin-upload-status-control-contract="angular-nz-switch"
      data-plugin-upload-status-control-owner="hertzbeat-ui-switch"
      data-plugin-upload-file-list-contract="angular-before-upload-single-replace"
      data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"
      data-plugin-upload-file-remove-contract="angular-nz-remove-clears-jar"
      data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"
      data-plugin-upload-feedback-contract="angular-new-notify"
      data-plugin-upload-feedback-contract-owner="hertzbeat-ui-inline-feedback"
      data-plugin-upload-failure-contract="angular-new-fail-notification"
      data-plugin-upload-failure-owner="hertzbeat-ui-inline-feedback"
      data-plugin-param-edit-contract="angular-params-define-modal"
      data-plugin-param-action-visibility-contract="angular-paramcount-zero-only"
      data-plugin-param-action-visibility-owner="plugin-view-model"
      data-plugin-param-mask-closable-contract="angular-mask-closable-false"
      data-plugin-param-modal-owner="angular-nz-modal"
      data-plugin-param-save-contract="angular-params-post"
      data-plugin-param-payload-contract="angular-object-values-payload"
      data-plugin-param-save-lifecycle-contract="angular-close-success-keep-open-fail"
      data-plugin-param-save-lifecycle-owner="route-state-contract"
      data-plugin-param-save-loading-contract="angular-no-ok-loading"
      data-plugin-param-save-loading-owner="angular-modal-ok-contract"
      data-plugin-param-feedback-contract="angular-edit-notify"
      data-plugin-param-failure-contract="angular-edit-fail-notification"
      data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"
      data-plugin-param-empty-contract="angular-empty-params-modal"
      data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"
      data-plugin-param-pending-editable-contract="angular-controls-remain-enabled"
      data-plugin-param-pending-editable-owner="angular-param-modal"
      data-plugin-param-width-contract="angular-default-modal-width"
      data-plugin-param-width-owner="angular-nz-modal"
      data-plugin-param-radio-contract="angular-nz-radio-group"
      data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"
      data-plugin-param-textarea-contract="angular-textarea-rows-8"
      data-plugin-param-textarea-owner="hertzbeat-ui-textarea"
      data-plugin-param-advanced-fields-contract="angular-configurable-and-multi-func"
      data-plugin-param-advanced-fields-owner="hertzbeat-ui-advanced-param-controls"
      data-plugin-param-configurable-field-contract="angular-app-configurable-field"
      data-plugin-param-configurable-field-owner="hertzbeat-ui-configurable-field"
      data-plugin-param-key-value-contract="angular-app-configurable-field"
      data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"
      data-plugin-param-labels-contract="angular-app-configurable-field"
      data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"
      data-plugin-param-label-selector-contract="angular-app-label-selector"
      data-plugin-param-label-selector-owner="cold-label-selector"
      data-plugin-param-metrics-field-contract="angular-app-configurable-field"
      data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
      data-plugin-param-array-contract="angular-app-multi-func-input"
      data-plugin-param-array-owner="hertzbeat-ui-input"
      data-plugin-param-field-layout-contract="angular-label-7-control-8"
      data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"
      data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"
      data-plugin-pagination="cold-dense-pagination"
      data-plugin-pagination-owner="hertzbeat-ui-pagination-bar"
      data-plugin-pagination-contract="angular-search-pagination"
    >
      <section data-plugin-admin-layout="full-width-admin-list">
        <span>插件表格</span>
      </section>
      <span data-plugin-test-row-count="true">{data.list.content.length}</span>
      <span>插件管理</span>
      <span>{search}</span>
      <span>{draftPlugin ? draftPlugin.name : 'no-draft'}</span>
      <span>{isUploadDialogOpen ? 'upload-dialog-open' : 'upload-dialog-closed'}</span>
      <span>{paramDraft ? paramDraft.plugin.name : 'no-param-draft'}</span>
      <span>{actionMessage ?? 'no-action-message'}</span>
      <span>{actionError ?? 'no-action-error'}</span>
      <span>{actionMeta ?? 'no-action-meta'}</span>
      <span>{actionTone ?? 'no-action-tone'}</span>
      <span>{actionKind ?? 'no-action-kind'}</span>
      <span data-plugin-test-load-error={loadError ? 'present' : 'none'} />
      <span>{uploadValidation?.name ? 'name-invalid' : 'name-valid'}</span>
      <span>{isUploadPending ? 'upload-pending' : 'upload-idle'}</span>
      <span>{isParamPending ? 'param-pending' : 'param-idle'}</span>
      <span>{isLoadPending ? 'load-pending' : 'load-idle'}</span>
      <span>{isTogglePending ? 'toggle-pending' : 'toggle-idle'}</span>
      <span>{Object.keys(optimisticEnableStatus ?? {}).length === 0 ? 'no-optimistic-enable-status' : 'optimistic-enable-status'}</span>
      <span>{deleteTarget ? deleteTarget.label : 'no-delete-target'}</span>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  apiMessageDelete
}));

vi.mock('@/lib/plugin-manage/controller', () => ({
  loadPluginData,
  createEmptyPluginDraft: () => ({ name: '', jarFileName: '', jarFile: null, enableStatus: true }),
  savePlugin: vi.fn(),
  loadPluginParamDraft: vi.fn(),
  updatePluginParamDraft: vi.fn((draft, field, value) => ({
    ...draft,
    params: {
      ...draft.params,
      [field]: {
        ...draft.params[field],
        paramValue: value
      }
    }
  })),
  savePluginParams: vi.fn(),
  togglePluginStatus: vi.fn(),
  validatePluginUploadDraft: vi.fn(() => ({ name: true, jarFile: true })),
  deletePlugins: vi.fn(),
  clampPluginPageIndexAfterDelete: vi.fn(() => 0)
}));

describe('setting plugins page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.renderErrorMessage = null;
    apiMessageGet.mockReset();
    apiMessagePost.mockReset();
    apiMessagePut.mockReset();
    apiMessageDelete.mockReset();
    loadPluginData.mockReset().mockImplementation(async (apiGetFn, query) => {
      await apiGetFn(`/plugin?pageIndex=0&pageSize=8${query.search ? `&search=${query.search}` : ''}`);
      return mockState.renderData;
    });
  });

  it('renders the shared plugin surface and keeps the route focused on load composition', async () => {
    const { default: SettingPluginsPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingPluginsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-plugin-enable-feedback-contract="angular-edit-notify"');
    expect(html).toContain('data-plugin-enable-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-enable-failure-contract="angular-edit-fail-notification"');
    expect(html).toContain('data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-enable-optimistic-contract="angular-toggle-mutates-row-before-put"');
    expect(html).toContain('data-plugin-enable-optimistic-owner="route-state-contract"');
    expect(html).toContain('data-plugin-table-loading-contract="angular-load-plugins-table"');
    expect(html).toContain('data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-plugin-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-plugin-load-failure-owner="plugin-route-controller"');
    expect(html).toContain('data-plugin-load-failure="none"');
    expect(html).toContain('data-plugin-toggle-loading-contract="angular-nz-table-loading"');
    expect(html).toContain('data-plugin-toggle-loading-contract-owner="angular-nz-table-loading"');
    expect(html).toContain('data-plugin-selection-reset-contract="angular-load-clears-selection"');
    expect(html).toContain('data-plugin-selection-reset-owner="route-state-contract"');
    expect(html).toContain('data-plugin-search-submit-contract="angular-enter-and-clear"');
    expect(html).toContain('data-plugin-search-clear-contract="angular-cleared-load"');
    expect(html).toContain('data-plugin-search-clear-owner="shared-search-row"');
    expect(html).toContain('data-plugin-query-param-order-contract="angular-page-index-size-search"');
    expect(html).toContain('data-plugin-query-param-order-owner="plugin-query-state"');
    expect(html).toContain('data-plugin-delete-warning-contract="angular-no-select-warning"');
    expect(html).toContain('data-plugin-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-plugin-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-plugin-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-plugin-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-delete-failure-contract="angular-delete-fail-notification"');
    expect(html).toContain('data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-delete-query-contract="angular-repeated-ids-query"');
    expect(html).toContain('data-plugin-delete-query-owner="route-mutation-contract"');
    expect(html).toContain('data-plugin-delete-page-clamp-contract="angular-update-page-index"');
    expect(html).toContain('data-plugin-table-columns-contract="angular-five-column-edit-actions"');
    expect(html).toContain('data-plugin-table-columns-owner="angular-nz-table"');
    expect(html).toContain('data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-table-stable-height-owner="route-layout-contract"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-contract="angular-toolbar-ellipsis-delete"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-upload-validation-contract="angular-required-before-submit"');
    expect(html).toContain('data-plugin-upload-invalid-submit-contract="angular-mark-dirty-keep-open"');
    expect(html).toContain('data-plugin-upload-invalid-submit-owner="route-validation-contract"');
    expect(html).toContain('data-plugin-upload-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-plugin-upload-payload-contract="angular-form-data"');
    expect(html).toContain('data-plugin-upload-name-payload-contract="angular-raw-name-no-trim"');
    expect(html).toContain('data-plugin-upload-name-payload-owner="plugin-manage-controller"');
    expect(html).toContain('data-plugin-upload-save-lifecycle-contract="angular-close-success-keep-open-fail"');
    expect(html).toContain('data-plugin-upload-save-lifecycle-owner="route-state-contract"');
    expect(html).toContain('data-plugin-upload-success-reset-contract="angular-reset-form-after-success"');
    expect(html).toContain('data-plugin-upload-success-reset-owner="route-state-contract"');
    expect(html).toContain('data-plugin-upload-cancel-contract="angular-cancel-preserves-form"');
    expect(html).toContain('data-plugin-upload-cancel-contract-owner="route-state-contract"');
    expect(html).toContain('data-plugin-upload-cancel-pending-contract="angular-cancel-allowed-during-ok-loading"');
    expect(html).toContain('data-plugin-upload-cancel-pending-owner="angular-nz-modal"');
    expect(html).toContain('data-plugin-upload-mask-closable-contract="angular-mask-closable-false"');
    expect(html).toContain('data-plugin-upload-width-contract="angular-width-30-percent"');
    expect(html).toContain('data-plugin-upload-modal-owner="angular-nz-modal"');
    expect(html).toContain('data-plugin-upload-field-layout-contract="angular-label-8-control-14"');
    expect(html).toContain('data-plugin-upload-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-plugin-upload-status-control-contract="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-plugin-upload-file-list-contract="angular-before-upload-single-replace"');
    expect(html).toContain('data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-plugin-upload-file-remove-contract="angular-nz-remove-clears-jar"');
    expect(html).toContain('data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-plugin-upload-feedback-contract="angular-new-notify"');
    expect(html).toContain('data-plugin-upload-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-upload-failure-contract="angular-new-fail-notification"');
    expect(html).toContain('data-plugin-upload-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-param-edit-contract="angular-params-define-modal"');
    expect(html).toContain('data-plugin-param-action-visibility-contract="angular-paramcount-zero-only"');
    expect(html).toContain('data-plugin-param-action-visibility-owner="plugin-view-model"');
    expect(html).toContain('data-plugin-param-mask-closable-contract="angular-mask-closable-false"');
    expect(html).toContain('data-plugin-param-modal-owner="angular-nz-modal"');
    expect(html).toContain('data-plugin-param-save-contract="angular-params-post"');
    expect(html).toContain('data-plugin-param-payload-contract="angular-object-values-payload"');
    expect(html).toContain('data-plugin-param-save-lifecycle-contract="angular-close-success-keep-open-fail"');
    expect(html).toContain('data-plugin-param-save-lifecycle-owner="route-state-contract"');
    expect(html).toContain('data-plugin-param-save-loading-contract="angular-no-ok-loading"');
    expect(html).toContain('data-plugin-param-save-loading-owner="angular-modal-ok-contract"');
    expect(html).toContain('data-plugin-param-feedback-contract="angular-edit-notify"');
    expect(html).toContain('data-plugin-param-failure-contract="angular-edit-fail-notification"');
    expect(html).toContain('data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-param-empty-contract="angular-empty-params-modal"');
    expect(html).toContain('data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-param-pending-editable-contract="angular-controls-remain-enabled"');
    expect(html).toContain('data-plugin-param-pending-editable-owner="angular-param-modal"');
    expect(html).toContain('data-plugin-param-width-contract="angular-default-modal-width"');
    expect(html).toContain('data-plugin-param-width-owner="angular-nz-modal"');
    expect(html).toContain('data-plugin-param-radio-contract="angular-nz-radio-group"');
    expect(html).toContain('data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"');
    expect(html).toContain('data-plugin-param-textarea-contract="angular-textarea-rows-8"');
    expect(html).toContain('data-plugin-param-textarea-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-plugin-param-advanced-fields-contract="angular-configurable-and-multi-func"');
    expect(html).toContain('data-plugin-param-advanced-fields-owner="hertzbeat-ui-advanced-param-controls"');
    expect(html).toContain('data-plugin-param-configurable-field-contract="angular-app-configurable-field"');
    expect(html).toContain('data-plugin-param-configurable-field-owner="hertzbeat-ui-configurable-field"');
    expect(html).toContain('data-plugin-param-key-value-contract="angular-app-configurable-field"');
    expect(html).toContain('data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-plugin-param-labels-contract="angular-app-configurable-field"');
    expect(html).toContain('data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-plugin-param-label-selector-contract="angular-app-label-selector"');
    expect(html).toContain('data-plugin-param-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-plugin-param-metrics-field-contract="angular-app-configurable-field"');
    expect(html).toContain('data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"');
    expect(html).toContain('data-plugin-param-array-contract="angular-app-multi-func-input"');
    expect(html).toContain('data-plugin-param-array-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-plugin-param-field-layout-contract="angular-label-7-control-8"');
    expect(html).toContain('data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-pagination="cold-dense-pagination"');
    expect(html).toContain('data-plugin-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-plugin-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(html).not.toContain('data-plugin-summary-rail=');
    expect(html).not.toContain('插件摘要');
    expect(html).not.toContain('当前插件');
    expect(html).toContain('插件管理');
    expect(html).toContain('no-draft');
    expect(html).toContain('upload-dialog-closed');
    expect(html).toContain('no-param-draft');
    expect(html).toContain('no-action-message');
    expect(html).toContain('no-action-error');
    expect(html).toContain('no-action-meta');
    expect(html).toContain('success');
    expect(html).toContain('enable');
    expect(html).toContain('name-valid');
    expect(html).toContain('upload-idle');
    expect(html).toContain('param-idle');
    expect(html).toContain('load-idle');
    expect(html).toContain('toggle-idle');
    expect(html).toContain('no-optimistic-enable-status');
    expect(html).toContain('no-delete-target');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/plugin?pageIndex=0&pageSize=8');
  });

  it('keeps the Angular plugin table shell visible when plugin loading fails', async () => {
    mockState.renderErrorMessage = 'backend refused plugin load';
    const { default: SettingPluginsPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingPluginsPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-plugin-load-failure-owner="plugin-route-controller"');
    expect(html).toContain('data-plugin-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-plugin-test-row-count="true">0');
    expect(html).toContain('插件表格');
    expect(html).not.toContain('backend refused plugin load');
    expect(html).not.toContain('common.load-failed');
    expect(html).not.toContain('data-observability-status');
  });

  it('keeps route composition out of the old observability/workbench visual owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/plugins/setting-plugins-page.tsx'), 'utf8');

    expect(source).toContain('PluginManageSurface');
    expect(source).toContain('const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)');
    expect(source).toContain('const [actionMessage, setActionMessage] = useState<string | null>(null)');
    expect(source).toContain('const [actionError, setActionError] = useState<string | null>(null)');
    expect(source).toContain("const [actionTone, setActionTone] = useState<'success' | 'warning' | 'critical'>('success')");
    expect(source).toContain("const [paramDraft, setParamDraft] = useState<PluginParamDraft | null>(null)");
    expect(source).toContain("const [actionKind, setActionKind] = useState<'enable' | 'delete' | 'upload' | 'params'>('enable')");
    expect(source).toContain('const [optimisticEnableStatus, setOptimisticEnableStatus] = useState<Record<number, boolean>>({})');
    expect(source).toContain('const [uploadValidation, setUploadValidation] = useState<{ name?: boolean; jarFile?: boolean }>({})');
    expect(source).toContain('const [isUploadPending, setIsUploadPending] = useState(false)');
    expect(source).toContain('const [isParamPending, setIsParamPending] = useState(false)');
    expect(source).toContain('const [deleteTarget, setDeleteTarget] = useState<PluginDeleteTarget | null>(null)');
    expect(source).toContain('const [isLoadPending, setIsLoadPending] = useState(false)');
    expect(source).toContain('buildFallbackPluginData');
    expect(source).toContain('renderError={(message, retry) => renderPluginSurface(buildFallbackPluginData(), message, retry)}');
    expect(source).toContain('loadError={loadError}');
    expect(source).toContain('const [isDeletePending, setIsDeletePending] = useState(false)');
    expect(source).toContain('const [isTogglePending, setIsTogglePending] = useState(false)');
    expect(source).toContain("setActionMessage(t('common.notify.edit-success'))");
    expect(source).toContain("setActionError(t('common.notify.edit-fail'))");
    expect(source).toContain('setActionMeta(error instanceof Error ? error.message : null)');
    expect(source).toContain("setActionError(t('common.notify.no-select-delete'))");
    expect(source).toContain("setActionMessage(t('common.notify.delete-success'))");
    expect(source).toContain("setActionError(t('common.notify.delete-fail'))");
    expect(source).toContain('validatePluginUploadDraft(draftPlugin)');
    expect(source).toContain('if (!validation.name || !validation.jarFile) {');
    expect(source).toContain('setUploadValidation({');
    expect(source).toContain('isUploadDialogOpen={isUploadDialogOpen}');
    expect(source).toContain('setIsUploadDialogOpen(true)');
    expect(source).toContain('setIsUploadDialogOpen(false)');
    expect(source).toContain('onCloseDialog={() => {');
    expect(source).toContain('setIsUploadDialogOpen(false);');
    expect(source).not.toContain('if (!isUploadPending) {');
    expect(source).toContain('if (!draftPlugin) {');
    expect(source).toContain("setActionKind('upload')");
    expect(source).toContain("setActionMessage(t('common.notify.new-success'))");
    expect(source).toContain("setActionError(t('common.notify.new-fail'))");
    expect(source).toContain('setUploadValidation({});');
    expect(source).toContain('setDraftPlugin(null);');
    expect(source).toContain('void deletePlugins(apiMessageDelete, targetIds)');
    expect(source).toContain('void savePlugin(apiMessagePost, draftPlugin)');
    expect(source).toContain('void loadPluginParamDraft(apiMessageGet, plugin, locale)');
    expect(source).toContain("setActionKind('params')");
    expect(source).toContain('updatePluginParamDraft(previous, field, value)');
    expect(source).toContain('void savePluginParams(apiMessagePost, paramDraft.params)');
    expect(source).toContain("setActionMessage(t('common.notify.edit-success'))");
    expect(source).toContain('setParamDraft(null);');
    expect(source).toContain("setActionError(t('common.notify.edit-fail'))");
    expect(source).toContain('onCloseParamDialog={() => {');
    expect(source).toContain('setParamDraft(null);');
    expect(source).not.toContain('if (!isParamPending) setParamDraft(null);');
    expect(source).toContain('isParamPending={isParamPending}');
    expect(source).toContain('clampPluginPageIndexAfterDelete({');
    expect(source).toContain('onPageIndexChange={pageIndex => {');
    expect(source).toContain('onPageSizeChange={pageSize => {');
    expect(source.match(/setSelectedIds\(\[\]\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source).toContain('onSearch={() => {');
    expect(source).toContain('onSearchClear={() => {');
    expect(source).toContain("setQuery({ search: '', pageIndex: 0, pageSize: query.pageSize });");
    expect(source).toContain('onRefresh={() => {');
    expect(source).toContain('setQuery(current => ({ ...current, pageIndex }))');
    expect(source).toContain('setQuery(current => ({ ...current, pageIndex: 0, pageSize }))');
    expect(source).toContain('actionMessage={actionMessage}');
    expect(source).toContain('actionError={actionError}');
    expect(source).toContain('actionMeta={actionMeta}');
    expect(source).toContain('actionTone={actionTone}');
    expect(source).toContain('actionKind={actionKind}');
    expect(source).toContain('uploadValidation={uploadValidation}');
    expect(source).toContain('isUploadPending={isUploadPending}');
    expect(source).toContain('paramDraft={paramDraft}');
    expect(source).toContain('isParamPending={isParamPending}');
    expect(source).toContain('deleteTarget={deleteTarget}');
    expect(source).toContain('isLoadPending={isLoadPending}');
    expect(source).toContain('isDeletePending={isDeletePending}');
    expect(source).toContain('isTogglePending={isTogglePending}');
    expect(source).toContain('optimisticEnableStatus={optimisticEnableStatus}');
    expect(source).toContain('setIsLoadPending(true)');
    expect(source).toContain('setOptimisticEnableStatus({});');
    expect(source).toContain('setIsLoadPending(false)');
    expect(source).toContain('setIsTogglePending(true)');
    expect(source).toContain('setOptimisticEnableStatus(current => ({');
    expect(source).toContain('[plugin.id]: !Boolean(plugin.enableStatus)');
    expect(source).toContain('setIsTogglePending(false)');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('buildPluginFacts');
  });

  it('keeps plugin management remounts on a short settled cache window while reloads invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/setting/plugins/setting-plugins-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_PLUGINS_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-plugins', pluginListUrl, reloadVersion].join(':')");
    expect(source).toContain('[pluginListUrl, reloadVersion]');
    expect(source).toContain('onRefresh={() => {');
    expect(source).toContain('setActionMessage(null);');
    expect(source).toContain('setActionError(null);');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={pluginManageCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_PLUGINS_SETTLED_CACHE_TTL_MS}');
  });
});
