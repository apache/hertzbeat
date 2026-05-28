import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('plugin manage surface', () => {
  it('renders the OTLP cold-matte plugin console, dense table, translated types, and upload dialog shell', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.none': '无类型',
        'common.file.select': '选择文件'
      }
    });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'smtp',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }, { type: 'POST_COLLECT' }],
                paramCount: 2
              },
              {
                id: 2,
                name: 'slack',
                enableStatus: false,
                items: [],
                paramCount: 0
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search="smtp"
        selectedIds={[1]}
        draftPlugin={{
          name: 'smtp',
          jarFileName: 'smtp.jar',
          enableStatus: true
        }}
        actionMessage="Edit Success!"
        actionKind="enable"
        isTogglePending
        optimisticEnableStatus={{ 2: false }}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-plugin-header="cold-compact-header"');
    expect(html).toContain('data-plugin-command-row="standard-equal-buttons"');
    expect(html).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-plugin-enable-feedback-contract="angular-edit-notify"');
    expect(html).toContain('data-plugin-enable-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-enable-optimistic-contract="angular-toggle-mutates-row-before-put"');
    expect(html).toContain('data-plugin-enable-optimistic-owner="route-state-contract"');
    expect(html).toContain('data-plugin-enable-optimistic-state="overridden"');
    expect(html).toContain('data-plugin-enable-optimistic-next-status="false"');
    expect(html).toContain('data-plugin-table-loading-contract="angular-load-plugins-table"');
    expect(html).toContain('data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-plugin-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-plugin-load-failure-owner="plugin-route-controller"');
    expect(html).toContain('data-plugin-load-failure="none"');
    expect(html).toContain('data-plugin-enable-feedback="angular-edit-notify"');
    expect(html).toContain('data-plugin-enable-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-toggle-loading-contract="angular-nz-table-loading"');
    expect(html).toContain('data-plugin-toggle-loading-contract-owner="angular-nz-table-loading"');
    expect(html).toContain('data-plugin-selection-reset-contract="angular-load-clears-selection"');
    expect(html).toContain('data-plugin-selection-reset-owner="route-state-contract"');
    expect(html).toContain('data-plugin-table-columns-contract="angular-five-column-edit-actions"');
    expect(html).toContain('data-plugin-table-columns-owner="angular-nz-table"');
    expect(html).toContain('data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-table-stable-height-owner="route-layout-contract"');
    expect(html).toContain('data-plugin-table-loading="true"');
    expect(html).toContain('data-plugin-table-loading-owner="angular-nz-table-loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Edit Success!');
    expect(html).toContain('data-plugin-manage-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-plugin-manage-search-owner="shared-search-row"');
    expect(html).toContain('data-plugin-search-submit-contract="angular-enter-and-clear"');
    expect(html).toContain('data-plugin-search-clear-contract="angular-cleared-load"');
    expect(html).toContain('data-plugin-search-clear-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-action="clear"');
    expect(html).toContain('data-cold-search-trailing-actions="detached-secondary"');
    expect(html).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(html).toContain('data-plugin-table-stable-height="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-table-fill-stage="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(html).toContain('data-plugin-table-columns="angular-five-column-edit-actions"');
    expect(html).not.toContain('>参数</th>');
    expect(html).toContain('data-plugin-pagination="cold-dense-pagination"');
    expect(html).toContain('data-plugin-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-plugin-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-plugin-query-param-order-contract="angular-page-index-size-search"');
    expect(html).toContain('data-plugin-query-param-order-owner="plugin-query-state"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-plugin-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-plugin-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-plugin-select-all="cold-checkbox"');
    expect(html).toContain('data-plugin-action-menu-clipping="none"');
    expect(html).toContain('data-plugin-toolbar-delete-menu="angular-toolbar-ellipsis-delete"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-contract="angular-toolbar-ellipsis-delete"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-layer="overlay-visible-above-panel"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-open="false"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-trigger="angular-toolbar-ellipsis-delete"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-panel="angular-toolbar-ellipsis-delete"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-clearance-panel="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-plugin-row-delete-menu-layer="overlay-visible-above-panel"');
    expect(html).toContain('data-plugin-row-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-plugin-row-delete-menu-open="false"');
    expect(html).toContain('data-plugin-row-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(html).toContain('data-plugin-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-row-delete-menu-panel-open="false"');
    expect(html).toContain('data-plugin-delete-selected="angular-batch-delete-entry"');
    expect(html).toContain('data-plugin-delete-selected-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-row="1"');
    expect(html).toContain('data-plugin-row="2"');
    expect(html).toContain('data-plugin-row-delete-menu="1"');
    expect(html).toContain('data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-plugin-row-delete-menu-trigger="1"');
    expect(html).toContain('data-plugin-row-delete-menu-panel="1"');
    expect(html).toContain('data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-delete-one="1"');
    expect(html).toContain('data-plugin-delete-one-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-plugin-row-actions="angular-row-actions-contextual"');
    expect(html).toContain('data-plugin-row-actions-owner="cold-icon-actions"');
    expect(html).toContain('data-plugin-row-action="params"');
    expect(html).toContain('data-plugin-row-action="delete"');
    expect(html).toContain('data-plugin-row-action-owner="row-contextual-icon-button"');
    expect(html).toContain('data-plugin-row-action-label="smtp"');
    expect(html).not.toContain('data-plugin-summary-rail=');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('插件管理');
    expect(html).toContain('上传插件');
    expect(html).toContain('搜索插件');
    expect(html).toContain('插件名称');
    expect(html).toContain('插件类型');
    expect(html).toContain('启用状态');
    expect(html).toContain('操作');
    expect(html).toContain('smtp');
    expect(html).toContain('slack');
    expect(html).toContain('告警后');
    expect(html).toContain('采集后');
    expect(html).toContain('无类型');
    expect(html).toContain('已启用');
    expect(html).toContain('已停用');
    expect(html).toContain('已选择');
    expect(html).toContain('第 1 / 1 页 · 1-2 / 2');
    expect(html).not.toContain('POST_ALERT');
    expect(html).not.toContain('POST_COLLECT');
    expect(html).toContain('编辑插件参数 smtp');
    expect(html).toContain('删除插件 smtp');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('data-overlay-dialog-mask-closable="false"');
    expect(html).toContain('data-plugin-upload-mask-closable="false"');
    expect(html).toContain('data-plugin-upload-width="angular-width-30-percent"');
    expect(html).toContain('data-plugin-upload-modal-owner="angular-nz-modal"');
    expect(html).toContain('data-plugin-upload-field-layout-contract="angular-label-8-control-14"');
    expect(html).toContain('data-plugin-upload-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-plugin-upload-field-layout="angular-label-8-control-14"');
    expect(html).toContain('data-plugin-upload-label-span="8"');
    expect(html).toContain('data-plugin-upload-control-span="14"');
    expect(html).toContain('data-plugin-upload-status-control="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-hz-ui="switch"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('Jar包');
    expect(html).toContain('选择文件');
    expect(html).toContain('取消');
    expect(html).toContain('保存');
    expect(html).not.toContain('data-plugin-manage-route="angular-plugin-table"');
    expect(html).not.toContain('data-plugin-manage-table="angular-nz-table"');
  });

  it('keeps a cold table empty state inside the plugin table body', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(html).toContain('data-plugin-table-stable-height="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-table-stable-height-owner="route-layout-contract"');
    expect(html).toContain('data-plugin-table-fill-stage="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(html).toContain('colSpan="5"');
    expect(html).toContain('data-plugin-manage-empty-state="cold-table-empty"');
    expect(html).toContain('data-plugin-manage-empty-icon="cold-empty-box"');
    expect(html).toContain('暂无数据');
  });

  it('keeps the Angular plugin management shell mounted without showing backend load errors', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        loadError="backend refused plugin load"
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(html).toContain('data-plugin-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-plugin-load-failure-owner="plugin-route-controller"');
    expect(html).toContain('data-plugin-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-plugin-manage-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(html).toContain('data-plugin-manage-empty-state="cold-table-empty"');
    expect(html).toContain('插件管理');
    expect(html).not.toContain('backend refused plugin load');
    expect(html).not.toContain('data-observability-status');
  });

  it('keeps the plugin page on the cold visual owner instead of WorkbenchPage or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/plugin-manage-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-plugin-manage-surface="otlp-cold-plugin-console"');
    expect(source).toContain('data-plugin-manage-style-baseline={coldPluginVisual.canvasName}');
    expect(source).toContain('data-plugin-header="cold-compact-header"');
    expect(source).toContain('data-plugin-command-row="standard-equal-buttons"');
    expect(source).toContain('data-plugin-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-plugin-enable-feedback-contract="angular-edit-notify"');
    expect(source).toContain('data-plugin-enable-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-enable-optimistic-contract="angular-toggle-mutates-row-before-put"');
    expect(source).toContain('data-plugin-enable-optimistic-owner="route-state-contract"');
    expect(source).toContain('const resolveEnableStatus = (plugin: Plugin) => (');
    expect(source).toContain("data-plugin-enable-optimistic-state={hasOptimisticEnableStatus ? 'overridden' : 'source'}");
    expect(source).toContain("data-plugin-enable-optimistic-next-status={displayEnableStatus ? 'true' : 'false'}");
    expect(source).toContain('data-plugin-table-loading-contract="angular-load-plugins-table"');
    expect(source).toContain('data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(source).toContain('data-plugin-load-failure-contract="angular-console-only-shell"');
    expect(source).toContain('data-plugin-load-failure-owner="plugin-route-controller"');
    expect(source).toContain("data-plugin-load-failure={loadError ? 'angular-console-only-shell' : 'none'}");
    expect(source).toContain("actionKind === 'enable'");
    expect(source).toContain('data-plugin-enable-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-toggle-loading-contract="angular-nz-table-loading"');
    expect(source).toContain('data-plugin-toggle-loading-contract-owner="angular-nz-table-loading"');
    expect(source).toContain('data-plugin-selection-reset-contract="angular-load-clears-selection"');
    expect(source).toContain('data-plugin-selection-reset-owner="route-state-contract"');
    expect(source).toContain('data-plugin-table-columns-contract="angular-five-column-edit-actions"');
    expect(source).toContain('data-plugin-table-columns-owner="angular-nz-table"');
    expect(source).toContain('const tableLoading = Boolean(isLoadPending || isDeletePending || isTogglePending);');
    expect(source).toContain("data-plugin-table-loading={tableLoading ? 'true' : 'false'}");
    expect(source).toContain('data-plugin-table-loading-owner="angular-nz-table-loading"');
    expect(source).toContain('data-plugin-delete-warning-contract="angular-no-select-warning"');
    expect(source).toContain('data-plugin-delete-confirm-contract="angular-modal-confirm"');
    expect(source).toContain('data-plugin-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-plugin-delete-feedback-contract="angular-delete-notify"');
    expect(source).toContain('data-plugin-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-delete-failure-contract="angular-delete-fail-notification"');
    expect(source).toContain('data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-enable-failure-contract="angular-edit-fail-notification"');
    expect(source).toContain('data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-delete-failure={isDeleteFailure ? \'angular-delete-fail-notification\' : undefined}');
    expect(source).toContain('data-plugin-delete-feedback-title={');
    expect(source).toContain("data-plugin-delete-feedback-detail={isDeleteFailure ? 'backend-message' : undefined}");
    expect(source).toContain('data-plugin-enable-failure={isEnableFailure ? \'angular-edit-fail-notification\' : undefined}');
    expect(source).toContain('data-plugin-enable-failure-owner={isEnableFailure ? \'hertzbeat-ui-inline-feedback\' : undefined}');
    expect(source).toContain('data-plugin-enable-feedback-title={');
    expect(source).toContain("data-plugin-enable-feedback-detail={isEnableFailure ? 'backend-message' : undefined}");
    expect(source).toContain('data-plugin-delete-query-contract="angular-repeated-ids-query"');
    expect(source).toContain('data-plugin-delete-query-owner="route-mutation-contract"');
    expect(source).toContain('data-plugin-delete-page-clamp-contract="angular-update-page-index"');
    expect(source).toContain('data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"');
    expect(source).toContain('data-plugin-table-stable-height-owner="route-layout-contract"');
    expect(source).toContain('data-plugin-upload-validation-contract="angular-required-before-submit"');
    expect(source).toContain('data-plugin-upload-invalid-submit-contract="angular-mark-dirty-keep-open"');
    expect(source).toContain('data-plugin-upload-invalid-submit-owner="route-validation-contract"');
    expect(source).toContain('data-plugin-upload-loading-contract="angular-nz-ok-loading"');
    expect(source).toContain('data-plugin-upload-payload-contract="angular-form-data"');
    expect(source).toContain('data-plugin-upload-name-payload-contract="angular-raw-name-no-trim"');
    expect(source).toContain('data-plugin-upload-name-payload-owner="plugin-manage-controller"');
    expect(source).toContain('data-plugin-upload-save-lifecycle-contract="angular-close-success-keep-open-fail"');
    expect(source).toContain('data-plugin-upload-save-lifecycle-owner="route-state-contract"');
    expect(source).toContain('data-plugin-upload-success-reset-contract="angular-reset-form-after-success"');
    expect(source).toContain('data-plugin-upload-success-reset-owner="route-state-contract"');
    expect(source).toContain('data-plugin-upload-cancel-contract="angular-cancel-preserves-form"');
    expect(source).toContain('data-plugin-upload-cancel-contract-owner="route-state-contract"');
    expect(source).toContain('data-plugin-upload-cancel-pending-contract="angular-cancel-allowed-during-ok-loading"');
    expect(source).toContain('data-plugin-upload-cancel-pending-owner="angular-nz-modal"');
    expect(source).toContain('data-plugin-upload-mask-closable-contract="angular-mask-closable-false"');
    expect(source).toContain('data-plugin-upload-width-contract="angular-width-30-percent"');
    expect(source).toContain('data-plugin-upload-field-layout-contract="angular-label-8-control-14"');
    expect(source).toContain('data-plugin-upload-field-layout-owner="route-form-field-grid"');
    expect(source).toContain('data-plugin-upload-field-layout="angular-label-8-control-14"');
    expect(source).toContain('data-plugin-upload-label-span="8"');
    expect(source).toContain('data-plugin-upload-control-span="14"');
    expect(source).toContain('sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)]');
    expect(source).toContain('data-plugin-upload-status-control-contract="angular-nz-switch"');
    expect(source).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(source).toContain('data-plugin-upload-file-remove-contract="angular-nz-remove-clears-jar"');
    expect(source).toContain('data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"');
    expect(source).toContain('data-plugin-upload-modal-owner="angular-nz-modal"');
    expect(source).toContain('data-plugin-upload-feedback-contract="angular-new-notify"');
    expect(source).toContain('data-plugin-upload-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-plugin-upload-failure-contract="angular-new-fail-notification"');
    expect(source).toContain('data-plugin-upload-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain("const isUploadFailure = actionKind === 'upload' && Boolean(actionError);");
    expect(source).toContain("const isParamFailure = actionKind === 'params' && Boolean(actionError);");
    expect(source).toContain("? t('common.notify.edit-fail')");
    expect(source).toContain('const actionFeedbackMeta = isUploadFailure || isParamFailure || isEnableFailure || isDeleteFailure ? actionMeta ?? actionError ?? undefined : undefined;');
    expect(source).toContain('data-plugin-upload-feedback-title={');
    expect(source).toContain('data-plugin-upload-feedback-detail={');
    expect(source).toContain('HzFileInput');
    expect(source).toContain('data-plugin-upload-open="angular-upload-modal"');
    expect(source).toContain('data-plugin-upload-file-input="angular-jar-before-upload"');
    expect(source).toContain('data-plugin-upload-name-payload="angular-raw-name-no-trim"');
    expect(source).toContain('data-plugin-upload-file-list="angular-before-upload-single-replace"');
    expect(source).toContain('data-plugin-upload-cancel-pending="angular-cancel-allowed-during-ok-loading"');
    expect(source).toContain('event.target.files?.[0]');
    expect(source).toContain("pluginJarInputRef.current.value = '';");
    expect(source).toContain('data-plugin-upload-file-remove="angular-nz-remove-clears-jar"');
    expect(source).toContain("jarFileName: ''");
    expect(source).toContain('data-plugin-upload-save="angular-form-data"');
    expect(source).toContain('open={Boolean((isUploadDialogOpen ?? Boolean(draftPlugin)) && draftPlugin)}');
    expect(source).toContain('data-plugin-upload-dialog="angular-cancel-preserves-form"');
    expect(source).toContain('data-plugin-upload-mask-closable');
    expect(source).toContain('data-plugin-upload-width');
    expect(source).toContain('max-w-[min(92vw,30rem)] lg:max-w-[30vw]');
    expect(source).toContain("data-plugin-upload-ok-loading={isUploadPending ? 'true' : 'false'}");
    expect(source).toContain('data-plugin-upload-ok-loading-owner="angular-nz-ok-loading"');
    expect(source).toContain('data-plugin-param-edit-contract="angular-params-define-modal"');
    expect(source).toContain('data-plugin-param-action-visibility-contract="angular-paramcount-zero-only"');
    expect(source).toContain('data-plugin-param-action-visibility-owner="plugin-view-model"');
    expect(source).toContain('data-plugin-param-mask-closable-contract="angular-mask-closable-false"');
    expect(source).toContain('data-plugin-param-modal-owner="angular-nz-modal"');
    expect(source).toContain('data-plugin-param-mask-closable');
    expect(source).toContain('data-plugin-param-save-contract="angular-params-post"');
    expect(source).toContain('data-plugin-param-payload-contract="angular-object-values-payload"');
    expect(source).toContain('data-plugin-param-save-lifecycle-contract="angular-close-success-keep-open-fail"');
    expect(source).toContain('data-plugin-param-save-lifecycle-owner="route-state-contract"');
    expect(source).toContain('data-plugin-param-save-loading-contract="angular-no-ok-loading"');
    expect(source).toContain('data-plugin-param-save-loading-owner="angular-modal-ok-contract"');
    expect(source).toContain('data-plugin-param-save-loading="angular-no-ok-loading"');
    expect(source).toContain("data-plugin-param-save-pending={isParamPending ? 'true' : 'false'}");
    expect(source).toContain('data-plugin-param-payload="angular-object-values-payload"');
    expect(source).toContain('data-plugin-param-save-lifecycle="angular-close-success-keep-open-fail"');
    expect(source).toContain('data-plugin-param-feedback-contract="angular-edit-notify"');
    expect(source).toContain('data-plugin-param-failure-contract="angular-edit-fail-notification"');
    expect(source).toContain('data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain("data-plugin-param-failure={isParamFailure ? 'angular-edit-fail-notification' : undefined}");
    expect(source).toContain("data-plugin-param-feedback-title={");
    expect(source).toContain("data-plugin-param-feedback-detail={isParamFailure ? 'backend-message' : undefined}");
    expect(source).toContain('data-plugin-param-pending-editable-contract="angular-controls-remain-enabled"');
    expect(source).toContain('data-plugin-param-pending-editable-owner="angular-param-modal"');
    expect(source).toContain("data-plugin-param-pending-editable={isParamPending ? 'angular-controls-remain-enabled' : 'idle'}");
    expect(source).not.toContain('disabled={isParamPending}');
    expect(source).toContain('data-plugin-param-width-contract="angular-default-modal-width"');
    expect(source).toContain('data-plugin-param-width-owner="angular-nz-modal"');
    expect(source).toContain('maxWidthClassName="max-w-[min(92vw,520px)]"');
    expect(source).toContain("'data-plugin-param-width': 'angular-default-modal-width'");
    expect(source).toContain("'data-plugin-param-width-owner': 'angular-nz-modal'");
    expect(source).not.toContain('maxWidthClassName="max-w-3xl"');
    expect(source).toContain('HzRadioButtonGroup');
    expect(source).toContain('data-plugin-param-radio-contract="angular-nz-radio-group"');
    expect(source).toContain('data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"');
    expect(source).toContain("define.type === 'radio' && (define.options ?? []).length > 0");
    expect(source).toContain('data-plugin-param-radio="angular-nz-radio-group"');
    expect(source).toContain('data-plugin-param-radio-field={define.field}');
    expect(source).toContain('data-plugin-param-textarea-contract="angular-textarea-rows-8"');
    expect(source).toContain('data-plugin-param-textarea-owner="hertzbeat-ui-textarea"');
    expect(source).toContain('function getPluginParamTextareaRows(define: ParamDefine): 4 | 8');
    expect(source).toContain("return define.type === 'json' || define.type === 'textarea' ? 8 : 4;");
    expect(source).toContain('rows={getPluginParamTextareaRows(define)}');
    expect(source).toContain("data-plugin-param-textarea={define.type === 'textarea' ? 'angular-textarea-rows-8' : undefined}");
    expect(source).toContain("data-plugin-param-textarea-rows={define.type === 'textarea' ? '8' : undefined}");
    expect(source).toContain('data-plugin-param-field-layout-contract="angular-label-7-control-8"');
    expect(source).toContain('data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(source).toContain('data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(source).toContain("t('setting.plugins.action.params-aria', actionLabelParams)");
    expect(source).toContain("t('setting.plugins.action.delete-aria', actionLabelParams)");
    expect(source).toContain('data-plugin-param-edit-open={String(original.id)}');
    expect(source).toContain('data-plugin-row-actions="angular-row-actions-contextual"');
    expect(source).toContain('data-plugin-row-actions-owner="cold-icon-actions"');
    expect(source).toContain('data-plugin-row-action-owner="row-contextual-icon-button"');
    expect(source).toContain('data-plugin-row-action-label={row.name}');
    expect(source).toContain('const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null)');
    expect(source).toContain('const rowActionMenuId = String(original.id);');
    expect(source).toContain('const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId;');
    expect(source).toContain('data-plugin-row-delete-menu={rowActionMenuId}');
    expect(source).toContain('data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-plugin-row-delete-menu-layer="overlay-visible-above-panel"');
    expect(source).toContain("data-plugin-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}");
    expect(source).toContain('aria-expanded={isRowActionMenuOpen}');
    expect(source).toContain('setOpenRowActionMenuId(current => (current === rowActionMenuId ? null : rowActionMenuId))');
    expect(source).toContain('data-plugin-row-delete-menu-trigger={rowActionMenuId}');
    expect(source).toContain('hidden={!isRowActionMenuOpen}');
    expect(source).toContain('data-plugin-row-delete-menu-panel={rowActionMenuId}');
    expect(source).toContain('data-plugin-row-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(source).toContain('data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain("data-plugin-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}");
    expect(source).toContain('setOpenRowActionMenuId(null);');
    expect(source).not.toContain('<details');
    expect(source).not.toContain('</details>');
    expect(source).toContain('data-plugin-param-dialog="angular-params-define-modal"');
    expect(source).toContain('data-plugin-param-form="angular-dynamic-form-field"');
    expect(source).toContain('data-plugin-param-field-layout="angular-label-7-control-8"');
    expect(source).toContain('data-plugin-param-label-span="7"');
    expect(source).toContain('data-plugin-param-control-span="8"');
    expect(source).toContain('data-plugin-param-save="angular-params-post"');
    expect(source).toContain('HzMonitorEditorFieldGrid');
    expect(source).toContain('HzTextarea');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('pageSizeOptions = [8, 15, 25]');
    expect(source).toContain('data-plugin-pagination="cold-dense-pagination"');
    expect(source).toContain('data-plugin-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('data-plugin-pagination-contract="angular-search-pagination"');
    expect(source).toContain('data-plugin-query-param-order-contract="angular-page-index-size-search"');
    expect(source).toContain('data-plugin-query-param-order-owner="plugin-query-state"');
    expect(source).toContain("t('setting.plugins.pagination.summary'");
    expect(source).toContain("t('setting.plugins.pagination.page-size')");
    expect(source).toContain("t('setting.plugins.pagination.page')");
    expect(source).toContain('data-plugin-pagination-page-jump-owner');
    expect(source).toContain('data-plugin-pagination-page-size-owner');
    expect(source).toContain('data-plugin-delete-feedback={');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('data-plugin-toolbar-delete-menu="angular-toolbar-ellipsis-delete"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-contract="angular-toolbar-ellipsis-delete"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-layer="overlay-visible-above-panel"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-open={isToolbarActionMenuOpen ?');
    expect(source).toContain('setToolbarActionMenuOpen(open => !open)');
    expect(source).toContain('data-plugin-toolbar-delete-menu-trigger="angular-toolbar-ellipsis-delete"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-panel="angular-toolbar-ellipsis-delete"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-clearance-panel="floating-overlay-no-panel-crop"');
    expect(source).toContain('data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-plugin-row-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(source).toContain('data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('pluginActionMenuRootClassName');
    expect(source).toContain('pluginActionMenuPanelBaseClassName');
    expect(source).toContain('data-plugin-action-menu-clipping="none"');
    expect(source).toContain("style={{ overflow: 'visible' }}");
    expect(source).toContain('z-[9999] inline-block overflow-visible');
    expect(source).toContain('mt-2 z-[9999] min-w-[132px]');
    expect(source).toContain('data-plugin-delete-selected="angular-batch-delete-entry"');
    expect(source).toContain('data-plugin-delete-selected-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-plugin-delete-one={String(original.id)}');
    expect(source).toContain('data-plugin-delete-one-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('data-plugin-manage-toolbar="cold-table-toolbar"');
    expect(source).toContain('data-plugin-manage-search-owner="shared-search-row"');
    expect(source).toContain('data-plugin-search-submit-contract="angular-enter-and-clear"');
    expect(source).toContain('data-plugin-search-clear-contract="angular-cleared-load"');
    expect(source).toContain('data-plugin-search-clear-owner="shared-search-row"');
    expect(source).toContain('onClear={onSearchClear}');
    expect(source).toContain('data-plugin-manage-table-shell="cold-dense-table"');
    expect(source).toContain('data-plugin-table-stable-height="viewport-fill-on-empty-or-short"');
    expect(source).toContain('data-plugin-table-fill-stage="viewport-fill-on-empty-or-short"');
    expect(source).toContain('data-plugin-manage-table="cold-plugin-table"');
    expect(source).toContain('data-plugin-table-columns="angular-five-column-edit-actions"');
    expect(source).toContain('colSpan={5}');
    expect(source).not.toContain("t('setting.plugins.table.params')");
    expect(source).toContain('data-plugin-manage-empty-state="cold-table-empty"');
    expect(source).not.toContain('data-plugin-summary-rail');
    expect(source).not.toContain('coldPluginVisual.search.row');
    expect(source).not.toContain('coldPluginVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldPluginVisual.layout.heroGrid');
    expect(source).not.toContain('coldPluginVisual.layout.railGrid');
    expect(source).not.toContain('coldPluginVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('AlertSurfaceTable');
    expect(source).not.toContain('data-plugin-manage-route="angular-plugin-table"');
    expect(source).not.toContain('data-plugin-manage-panel="angular-table-panel"');
    expect(source).not.toContain('data-plugin-manage-toolbar="angular-table-toolbar"');
    expect(source).not.toContain('data-plugin-manage-table-shell="angular-table"');
    expect(source).not.toContain('data-plugin-manage-empty-state="angular-table-empty"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('WorkbenchTableFrame');
    expect(source).not.toContain('WorkbenchValuePill');
    expect(source).not.toContain('buildPluginFacts');
    expect(source).not.toContain('setting.plugins.subtitle');
    expect(source).not.toContain('rounded-[12px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('text-white/78');
    expect(source).not.toContain('text-white/72');
    expect(source).not.toContain('text-white/86');
    expect(source).not.toContain('text-white/42');
    expect(source).not.toContain('text-[#e7dfd1]');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('overflow-x-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');
    expect(source).not.toContain('className="inline-flex min-h-7 items-center rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 text-[12px] text-[var(--ops-text-primary)]"');
  });

  it('uses cold checkboxes for table selection and the shared switch for draft enable state', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 11,
                name: 'smtp',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }],
                paramCount: 2
              },
              {
                id: 12,
                name: 'slack',
                enableStatus: false,
                items: [{ type: 'POST_COLLECT' }],
                paramCount: 0
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[11]}
        draftPlugin={{
          name: 'smtp',
          jarFileName: 'smtp.jar',
          enableStatus: true
        }}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    const source = readFileSync(resolve(process.cwd(), 'components/pages/plugin-manage-surface.tsx'), 'utf8');

    expect(source).toContain("from '../ui/checkbox'");
    expect(source).toContain('HzSwitch');
    expect(source).toContain('data-plugin-select-all="cold-checkbox"');
    expect(source).toContain('data-plugin-row-select={String(original.id)}');
    expect(source).toContain('data-plugin-upload-status-control="angular-nz-switch"');
    expect(source).not.toContain('className="h-3.5 w-3.5 accent-[#4e74f8]"');
    expect(html).toContain('data-plugin-select-all="cold-checkbox"');
    expect(html).toContain('data-plugin-row-select="11"');
    expect(html).toContain('data-plugin-row-select="12"');
    expect(html).toContain('data-plugin-upload-status-control="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-hz-ui="switch"');
    expect(html.match(/data-cold-checkbox-owner="cold-checkbox"/g)?.length ?? 0).toBe(3);
    expect(html.match(/data-cold-checkbox-control="native-hidden"/g)?.length ?? 0).toBe(3);
    expect(html.match(/data-cold-checkbox-box="indicator"/g)?.length ?? 0).toBe(3);
    expect(html).toContain('data-hz-switch-owner="hertzbeat-ui-switch"');
  });

  it('renders Angular plugin delete warning, confirmation, feedback, and page-clamp contracts through shared UI', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 21,
                name: 'webhook',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }],
                paramCount: 0
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        actionError="请先选择要删除的监控"
        actionTone="warning"
        actionKind="delete"
        deleteTarget={{
          ids: [21],
          label: 'webhook',
          mode: 'single'
        }}
        isDeletePending
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-delete-warning-contract="angular-no-select-warning"');
    expect(html).toContain('data-plugin-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-plugin-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-plugin-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-plugin-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-delete-query-contract="angular-repeated-ids-query"');
    expect(html).toContain('data-plugin-delete-query-owner="route-mutation-contract"');
    expect(html).toContain('data-plugin-delete-page-clamp-contract="angular-update-page-index"');
    expect(html).toContain('data-plugin-query-param-order-contract="angular-page-index-size-search"');
    expect(html).toContain('data-plugin-query-param-order-owner="plugin-query-state"');
    expect(html).toContain('data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"');
    expect(html).toContain('data-plugin-table-stable-height-owner="route-layout-contract"');
    expect(html).toContain('data-plugin-delete-feedback="angular-no-select-warning"');
    expect(html).toContain('data-plugin-delete-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-delete-confirm="angular-modal-confirm"');
    expect(html).toContain('data-plugin-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-plugin-delete-confirm-submit="angular-modal-confirm"');
    expect(html).toContain('data-plugin-delete-confirm-target="webhook"');
    expect(html).toContain('请先选择要删除的监控');
    expect(html).toContain('请确认是否删除!');
  });

  it('renders Angular plugin upload required validation, jar file input, and save feedback contracts', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={{
          name: '',
          jarFileName: '',
          jarFile: null,
          enableStatus: true
        }}
        actionMessage="Add Success!"
        actionKind="upload"
        uploadValidation={{ name: true, jarFile: true }}
        isUploadPending
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

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
    expect(html).toContain('data-plugin-upload-feedback-contract="angular-new-notify"');
    expect(html).toContain('data-plugin-upload-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-upload-failure-contract="angular-new-fail-notification"');
    expect(html).toContain('data-plugin-upload-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-upload-field-layout-contract="angular-label-8-control-14"');
    expect(html).toContain('data-plugin-upload-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-plugin-upload-field="name"');
    expect(html).toContain('data-plugin-upload-field="jarFile"');
    expect(html).toContain('data-plugin-upload-cancel-pending="angular-cancel-allowed-during-ok-loading"');
    expect(html).toContain('data-plugin-upload-field="enableStatus"');
    expect(html).toContain('data-plugin-upload-field-layout="angular-label-8-control-14"');
    expect(html).toContain('data-plugin-upload-label-span="8"');
    expect(html).toContain('data-plugin-upload-control-span="14"');
    expect(html).toContain('data-plugin-upload-feedback="angular-new-notify"');
    expect(html).toContain('data-plugin-upload-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-upload-name-input="angular-required"');
    expect(html).toContain('data-plugin-upload-name-payload="angular-raw-name-no-trim"');
    expect(html).toContain('data-plugin-upload-file-input="angular-jar-before-upload"');
    expect(html).toContain('data-plugin-upload-file-input-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-plugin-upload-file-list="angular-before-upload-single-replace"');
    expect(html).toContain('data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-plugin-upload-file-remove-contract="angular-nz-remove-clears-jar"');
    expect(html).toContain('data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-plugin-upload-file-remove="angular-nz-remove-clears-jar"');
    expect(html).toContain('data-plugin-upload-file-remove-state="empty"');
    expect(html).toContain('data-plugin-upload-file-trigger="angular-jar-before-upload"');
    expect(html).toContain('data-plugin-upload-file-name="angular-jar-before-upload"');
    expect(html).toContain('data-plugin-upload-status-field="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control="angular-nz-switch"');
    expect(html).toContain('data-plugin-upload-status-control-owner="hertzbeat-ui-switch"');
    expect(html).toContain('data-plugin-upload-dialog="angular-cancel-preserves-form"');
    expect(html).toContain('data-plugin-upload-invalid-submit="angular-mark-dirty-keep-open"');
    expect(html).toContain('data-plugin-upload-invalid-submit-owner="route-validation-contract"');
    expect(html).toContain('data-plugin-upload-save="angular-form-data"');
    expect(html).toContain('data-plugin-upload-save-lifecycle="angular-close-success-keep-open-fail"');
    expect(html).toContain('data-plugin-upload-save-lifecycle-owner="route-state-contract"');
    expect(html).toContain('data-plugin-upload-ok-loading="true"');
    expect(html).toContain('data-plugin-upload-ok-loading-owner="angular-nz-ok-loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-plugin-upload-validation="name-required"');
    expect(html).toContain('data-plugin-upload-validation="jar-required"');
    expect(html).toContain('Add Success!');
    expect(html).toContain('请填充必填项!');
  });

  it('renders Angular plugin upload failure title with backend detail', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        actionError="backend rejected duplicate plugin"
        actionKind="upload"
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-upload-feedback="angular-new-fail"');
    expect(html).toContain('data-plugin-upload-feedback-title="common.notify.new-fail"');
    expect(html).toContain('data-plugin-upload-feedback-detail="backend-message"');
    expect(html).toContain('新增失败!');
    expect(html).toContain('backend rejected duplicate plugin');
  });

  it('renders Angular plugin delete failure title with backend detail', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        actionError="删除失败!"
        actionMeta="backend refused plugin delete"
        actionKind="delete"
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-delete-feedback="angular-delete-fail"');
    expect(html).toContain('data-plugin-delete-failure="angular-delete-fail-notification"');
    expect(html).toContain('data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-plugin-delete-feedback-detail="backend-message"');
    expect(html).toContain('删除失败!');
    expect(html).toContain('backend refused plugin delete');
  });

  it('renders Angular plugin enable failure title with backend detail', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        actionError="修改失败!"
        actionMeta="backend refused plugin toggle"
        actionKind="enable"
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-enable-feedback="angular-edit-fail"');
    expect(html).toContain('data-plugin-enable-failure="angular-edit-fail-notification"');
    expect(html).toContain('data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-enable-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-plugin-enable-feedback-detail="backend-message"');
    expect(html).toContain('修改失败!');
    expect(html).toContain('backend refused plugin toggle');
  });

  it('renders Angular plugin parameter failure title with backend detail', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [],
            totalElements: 0,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        actionError="backend rejected plugin params"
        actionKind="params"
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-param-feedback="angular-edit-fail"');
    expect(html).toContain('data-plugin-param-failure="angular-edit-fail-notification"');
    expect(html).toContain('data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-param-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-plugin-param-feedback-detail="backend-message"');
    expect(html).toContain('修改失败!');
    expect(html).toContain('backend rejected plugin params');
  });

  it('renders Angular plugin parameter define modal and save feedback contracts', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 31,
                name: 'webhook',
                enableStatus: true,
                items: [{ type: 'POST_ALERT' }],
                paramCount: 2
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        paramDraft={{
          plugin: { id: 31, name: 'webhook', enableStatus: true } as any,
          paramDefines: [
            { field: 'endpoint', type: 'text', name: '端点', required: true },
            { field: 'authType', type: 'radio', name: '认证类型', options: [{ label: 'Basic', value: 'basic' }, { label: 'Bearer', value: 'bearer' }] },
            { field: 'script', type: 'textarea', name: '脚本' },
            { field: 'payload', type: 'json', name: 'JSON' },
            { field: 'headers', type: 'key-value', name: '请求头' },
            { field: 'labels', type: 'labels', name: '标签' },
            { field: 'selector', type: 'label-selector', name: '标签选择器' },
            { field: 'metrics', type: 'metrics-field', name: '指标字段' },
            { field: 'recipients', type: 'array', name: '收件人' }
          ],
          params: {
            endpoint: { pluginMetadataId: 31, type: 1, field: 'endpoint', paramValue: 'https://hooks.example' },
            authType: { pluginMetadataId: 31, type: 2, field: 'authType', paramValue: 'basic' },
            script: { pluginMetadataId: 31, type: 2, field: 'script', paramValue: 'line one\nline two' },
            payload: { pluginMetadataId: 31, type: 3, field: 'payload', paramValue: '{"ok":true}' },
            headers: { pluginMetadataId: 31, type: 2, field: 'headers', paramValue: '{"Authorization":"Bearer token"}' },
            labels: { pluginMetadataId: 31, type: 2, field: 'labels', paramValue: { env: 'prod' } },
            selector: { pluginMetadataId: 31, type: 2, field: 'selector', paramValue: { service: 'checkout', severity: 'critical' } },
            metrics: { pluginMetadataId: 31, type: 2, field: 'metrics', paramValue: [{ field: 'usage', unit: '%', type: 'number' }] },
            recipients: { pluginMetadataId: 31, type: 2, field: 'recipients', paramValue: 'alpha,beta' }
          }
        }}
        actionMessage="Edit Success!"
        actionKind="params"
        isParamPending
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onParamChange={() => {}}
        onCloseParamDialog={() => {}}
        onSaveParamDialog={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-param-edit-contract="angular-params-define-modal"');
    expect(html).toContain('data-plugin-param-action-visibility-contract="angular-paramcount-zero-only"');
    expect(html).toContain('data-plugin-param-action-visibility-owner="plugin-view-model"');
    expect(html).toContain('data-plugin-param-save-contract="angular-params-post"');
    expect(html).toContain('data-plugin-param-payload-contract="angular-object-values-payload"');
    expect(html).toContain('data-plugin-param-save-lifecycle-contract="angular-close-success-keep-open-fail"');
    expect(html).toContain('data-plugin-param-save-lifecycle-owner="route-state-contract"');
    expect(html).toContain('data-plugin-param-save-loading-contract="angular-no-ok-loading"');
    expect(html).toContain('data-plugin-param-save-loading="angular-no-ok-loading"');
    expect(html).toContain('data-plugin-param-save-loading-owner="angular-modal-ok-contract"');
    expect(html).toContain('data-plugin-param-save-pending="true"');
    expect(html).toContain('data-plugin-param-payload="angular-object-values-payload"');
    expect(html).toContain('data-plugin-param-save-lifecycle="angular-close-success-keep-open-fail"');
    expect(html).toContain('data-plugin-param-feedback-contract="angular-edit-notify"');
    expect(html).toContain('data-plugin-param-pending-editable-contract="angular-controls-remain-enabled"');
    expect(html).toContain('data-plugin-param-pending-editable="angular-controls-remain-enabled"');
    expect(html).toContain('data-plugin-param-pending-editable-owner="angular-param-modal"');
    expect(html).toContain('data-plugin-param-empty-contract="angular-empty-params-modal"');
    expect(html).toContain('data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-param-width-contract="angular-default-modal-width"');
    expect(html).toContain('data-plugin-param-width="angular-default-modal-width"');
    expect(html).toContain('data-plugin-param-width-owner="angular-nz-modal"');
    expect(html).toContain('max-w-[min(92vw,520px)]');
    expect(html).not.toContain('max-w-3xl');
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
    expect(html).toContain('data-plugin-param-feedback="angular-edit-notify"');
    expect(html).toContain('data-plugin-param-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-plugin-param-edit-open="31"');
    expect(html).toContain('data-plugin-param-dialog="angular-params-define-modal"');
    expect(html).toContain('data-plugin-param-dialog-plugin="webhook"');
    expect(html).toContain('data-plugin-param-form="angular-dynamic-form-field"');
    expect(html).toContain('data-plugin-param-field-layout="angular-label-7-control-8"');
    expect(html).toContain('data-hz-ui="monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-param-field="endpoint"');
    expect(html).toContain('data-plugin-param-label-span="7"');
    expect(html).toContain('data-plugin-param-control-span="8"');
    expect(html).toContain('data-plugin-param-field-type="text"');
    expect(html).toContain('data-plugin-param-field-required="true"');
    expect(html).toContain('data-plugin-param-input="endpoint"');
    expect(html).toContain('data-plugin-param-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-plugin-param-multi-func-input="angular-app-multi-func-input"');
    expect(html).toContain('data-plugin-param-multi-func-type="text"');
    expect(html).toContain('data-plugin-param-multi-func-clear="angular-allow-clear"');
    expect(html).toContain('data-plugin-param-multi-func-clear-field="endpoint"');
    expect(html).toContain('data-plugin-param-multi-func-clear-owner="hertzbeat-ui-input-affordance"');
    expect(html).toContain('data-plugin-param-field="authType"');
    expect(html).toContain('data-plugin-param-field-type="radio"');
    expect(html).toContain('data-plugin-param-radio="angular-nz-radio-group"');
    expect(html).toContain('data-plugin-param-radio-field="authType"');
    expect(html).toContain('data-hz-ui="radio-button-group"');
    expect(html).toContain('data-hz-radio-button-option="basic"');
    expect(html).toContain('data-hz-radio-button-option="bearer"');
    expect(html).toContain('data-hz-radio-button-checked="true"');
    expect(html).toContain('data-plugin-param-field="script"');
    expect(html).toContain('data-plugin-param-field-type="textarea"');
    expect(html).toContain('data-plugin-param-textarea="angular-textarea-rows-8"');
    expect(html).toContain('data-plugin-param-textarea-rows="8"');
    expect(html).toContain('rows="8"');
    expect(html).toContain('data-plugin-param-field="payload"');
    expect(html).toContain('data-plugin-param-input-owner="hertzbeat-ui-textarea"');
    expect(html).toContain('data-plugin-param-field="headers"');
    expect(html).toContain('data-plugin-param-field-type="key-value"');
    expect(html).toContain('data-plugin-param-configurable-field="angular-app-configurable-field"');
    expect(html).toContain('data-plugin-param-key-value-editor="headers"');
    expect(html).toContain('data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-hz-ui="key-value-editor"');
    expect(html).toContain('data-hz-key-value-input="key"');
    expect(html).toContain('data-hz-key-value-input="value"');
    expect(html).toContain('data-plugin-param-key-value-input="key"');
    expect(html).toContain('data-plugin-param-key-value-input="value"');
    expect(html).toContain('data-plugin-param-field="labels"');
    expect(html).toContain('data-plugin-param-field-type="labels"');
    expect(html).toContain('data-plugin-param-labels-editor="labels"');
    expect(html).toContain('data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"');
    expect(html).toContain('data-plugin-param-labels-input="key"');
    expect(html).toContain('data-plugin-param-labels-input="value"');
    expect(html).toContain('data-plugin-param-field="selector"');
    expect(html).toContain('data-plugin-param-field-type="label-selector"');
    expect(html).toContain('data-plugin-param-label-selector="angular-app-label-selector"');
    expect(html).toContain('data-plugin-param-label-selector-field="selector"');
    expect(html).toContain('data-plugin-param-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-owner="cold-label-selector"');
    expect(html).toContain('data-cold-label-selector-record-row="service:checkout"');
    expect(html).toContain('data-cold-label-selector-record-row="severity:critical"');
    expect(html).toContain('data-cold-label-selector-key-input="searchable-key"');
    expect(html).toContain('data-cold-label-selector-value-input="searchable-value"');
    expect(html).toContain('data-cold-label-selector-value="hidden"');
    expect(html).toContain('data-plugin-param-field="metrics"');
    expect(html).toContain('data-plugin-param-field-type="metrics-field"');
    expect(html).toContain('data-plugin-param-metrics-field-editor="metrics"');
    expect(html).toContain('data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"');
    expect(html).toContain('data-hz-ui="configurable-field-editor"');
    expect(html).toContain('data-hz-configurable-field-input="field"');
    expect(html).toContain('data-hz-configurable-field-input="unit"');
    expect(html).toContain('data-hz-configurable-field-input="type"');
    expect(html).toContain('data-plugin-param-metrics-field-input="field"');
    expect(html).toContain('data-plugin-param-metrics-field-input="unit"');
    expect(html).toContain('data-plugin-param-metrics-field-input="type"');
    expect(html).toContain('data-plugin-param-field="recipients"');
    expect(html).toContain('data-plugin-param-field-type="array"');
    expect(html).toContain('data-plugin-param-input="recipients"');
    expect(html).toContain('data-plugin-param-array="angular-app-multi-func-input"');
    expect(html).toContain('data-plugin-param-array-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-plugin-param-multi-func-type="array"');
    expect(html).toContain('data-plugin-param-multi-func-clear-field="recipients"');
    expect(html).toContain('data-plugin-param-save="angular-params-post"');
    expect(html).toContain('data-plugin-param-cancel-loading="angular-no-ok-loading"');
    expect(html).not.toContain('name="selector" disabled');
    expect(html).toContain('Edit Success!');
    expect(html).toContain('https://hooks.example');
    expect(html).toContain('{&quot;ok&quot;:true}');
    expect(html).toContain('Authorization');
    expect(html).toContain('Bearer token');
    expect(html).toContain('env');
    expect(html).toContain('prod');
    expect(html).toContain('usage');
    expect(html).toContain('number');
    expect(html).toContain('alpha,beta');
  });

  it('keeps the Angular plugin params modal open with an empty field set', async () => {
    const { PluginManageSurface } = await import('./plugin-manage-surface');
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.no-data': '暂无数据',
        'plugin.edit': '编辑插件'
      }
    });

    const html = renderToStaticMarkup(
      <PluginManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        selectedIds={[]}
        draftPlugin={null}
        paramDraft={{
          plugin: { id: 42, name: 'empty-param-plugin', enableStatus: true } as any,
          paramDefines: [],
          params: {}
        }}
        deleteTarget={null}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onDeleteSelected={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onSelectedIdsChange={() => {}}
        onEditParams={() => {}}
        onParamChange={() => {}}
        onCloseParamDialog={() => {}}
        onSaveParamDialog={() => {}}
        onToggleEnabled={() => {}}
        onDeleteOne={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-plugin-param-empty-contract="angular-empty-params-modal"');
    expect(html).toContain('data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('data-plugin-param-dialog="angular-params-define-modal"');
    expect(html).toContain('data-plugin-param-dialog-plugin="empty-param-plugin"');
    expect(html).toContain('data-plugin-param-form="angular-dynamic-form-field"');
    expect(html).toContain('data-plugin-param-empty="angular-empty-params-modal"');
    expect(html).toContain('data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"');
    expect(html).toContain('暂无数据');
    expect(html).not.toContain('data-plugin-param-field=');
  });
});
