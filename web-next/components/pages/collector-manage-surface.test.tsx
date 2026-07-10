import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { CollectorManageSurface } from './collector-manage-surface';

describe('collector manage surface', () => {
  it('renders the cold-matte collector toolbar and dense table shell', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{
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
              },
              {
                collector: {
                  name: 'edge-b',
                  ip: '10.0.0.2',
                  status: 1,
                  mode: 'private',
                  version: '1.1.0',
                  gmtUpdate: '2026-04-09T10:00:00Z'
                },
                pinMonitorNum: 1,
                dispatchMonitorNum: 3
              }
            ],
            totalElements: 18,
            pageIndex: 1,
            pageSize: 8
          }
        }}
        search="edge"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-manage-surface="otlp-hertzbeat-ui-collector-console"');
    expect(html).toContain('data-collector-manage-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-collector-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-collector-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-collector-command-row="standard-equal-buttons"');
    expect(html).toContain('data-collector-health-evidence="cluster-status"');
    expect(html).toContain('data-collector-health-tone="warning"');
    expect(html).toContain('data-collector-health-freshness="last-seen"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-collector-delete-warning-contract="angular-no-select-warning"');
    expect(html).toContain('data-collector-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-delete-api-contract="angular-repeated-collectors-query"');
    expect(html).toContain('data-collector-delete-page-clamp-contract="angular-update-page-index"');
    expect(html).toContain('data-collector-delete-page-clamp-owner="route-state-contract"');
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
    expect(html).toContain('data-collector-deploy-modal-contract="angular-generate-identity-modal"');
    expect(html).toContain('data-collector-deploy-api-contract="angular-post-generate-identity"');
    expect(html).toContain('data-collector-deploy-failure-contract="angular-apply-fail-notification"');
    expect(html).toContain('data-collector-deploy-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-collector-deploy-validation-trim-contract="hertzbeat-required-after-trim"');
    expect(html).toContain('data-collector-deploy-validation-trim-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-mask-contract="angular-mask-closable-false"');
    expect(html).toContain('data-collector-deploy-width-contract="angular-width-45-percent"');
    expect(html).toContain('data-collector-deploy-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-collector-deploy-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-collector-deploy-command-contract="angular-docker-package-shells"');
    expect(html).toContain('data-collector-deploy-command-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-collector-deploy-package-link-contract="angular-github-releases-link"');
    expect(html).toContain('data-collector-deploy-copy-contract="angular-copy-identity"');
    expect(html).toContain('data-collector-deploy-copy-feedback-contract="angular-copy-success-duration-800"');
    expect(html).toContain('data-collector-deploy-result-close-contract="angular-danger-close-after-identity"');
    expect(html).toContain('data-collector-deploy-result-close-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-collector-deploy-close-reset-contract="angular-close-clears-name"');
    expect(html).toContain('data-collector-deploy-close-reset-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-close-pending-result-contract="angular-close-ignores-late-generate"');
    expect(html).toContain('data-collector-deploy-close-pending-result-owner="collector-route-controller"');
    expect(html).toContain('data-collector-pagination="hertzbeat-ui-dense-pagination"');
    expect(html).toContain('data-collector-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-collector-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-collector-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-collector-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-collector-deploy-open="angular-deploy-modal"');
    expect(html).toContain('data-collector-command-action="refresh"');
    expect(html).toContain('data-collector-command-action="deploy-open"');
    expect(html).toContain('data-collector-command-action="selected-online"');
    expect(html).toContain('data-collector-command-action="selected-offline"');
    expect(html).toContain('data-collector-command-action="selected-delete"');
    expect(html).toContain('data-collector-online-selected="angular-batch-online-entry"');
    expect(html).toContain('data-collector-offline-selected="angular-batch-offline-entry"');
    expect(html).toContain('data-collector-delete-selected="angular-batch-delete-entry"');
    expect(html).toContain('data-collector-action-help="refresh"');
    expect(html).toContain('data-collector-action-help="deploy"');
    expect(html).toContain('data-collector-action-help="online"');
    expect(html).toContain('data-collector-action-help="offline"');
    expect(html).toContain('data-collector-action-help="delete"');
    expect(html).toContain('data-collector-action-help-style="icon-after-action"');
    expect(html).toContain('data-collector-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-collector-action-help-icon="lucide-circle-help"');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('data-collector-action-help-tooltip="refresh"');
    expect(html).toContain('data-collector-action-help-tooltip="delete"');
    expect(html).toContain(t('collector.action.refresh.help'));
    expect(html).toContain(t('collector.action.deploy.help'));
    expect(html).toContain(t('collector.action.online.help'));
    expect(html).toContain(t('collector.action.offline.help'));
    expect(html).toContain(t('collector.action.delete.help'));
    expect(html).toContain('data-collector-toolbar="hertzbeat-ui-table-toolbar"');
    expect(html).toContain('data-collector-search-owner="shared-search-row"');
    expect(html).toContain('data-collector-search-submit-contract="angular-enter-and-clear"');
    expect(html).toContain('data-collector-search-clear-contract="angular-cleared-load"');
    expect(html).toContain('data-collector-search-clear-owner="shared-search-row"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-hz-search-action="submit"');
    expect(html).toContain('data-hz-search-action="clear"');
    expect(html).toContain('data-collector-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-collector-table-loading="false"');
    expect(html).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(html).toContain('data-collector-table-loading-owner="angular-nz-table-loading"');
    expect(html).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-collector-table-loading-source="idle"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('data-collector-manage-table="hertzbeat-ui-collector-table"');
    expect(html).toContain('data-collector-select-all="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-collector-row-select="edge-a"');
    expect(html).toContain('data-collector-row-select="edge-b"');
    expect(html).toContain('data-collector-row-health="collector-status"');
    expect(html).toContain('data-collector-row-actions="hertzbeat-ui-icon-actions"');
    expect(html).toContain('data-collector-row-delete-menu="edge-a"');
    expect(html).toContain('data-collector-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-collector-row-delete-menu-layer="overlay-visible-above-panel"');
    expect(html).toContain('data-collector-row-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-collector-row-delete-menu-open="false"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-collector-row-delete-menu-trigger="edge-a"');
    expect(html).toContain('data-collector-row-delete-menu-panel="edge-a"');
    expect(html).toContain('data-collector-row-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(html).toContain('data-collector-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-collector-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-collector-row-delete-menu-panel-open="false"');
    expect(html).toContain('data-collector-delete-one="edge-a"');
    expect(html).toContain('data-collector-command-action="row-offline"');
    expect(html).toContain('data-collector-command-action="row-online"');
    expect(html).toContain('data-collector-command-action="row-more"');
    expect(html).toContain('data-collector-command-action="row-delete"');
    expect(html).toContain('data-collector-delete-one-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-collector-offline-one="edge-a"');
    expect(html).toContain('data-collector-online-one="edge-b"');
    expect(html).toContain('data-collector-row-action-help="row-online"');
    expect(html).toContain('data-collector-row-action-help="row-offline"');
    expect(html).toContain('data-collector-row-action-help="row-delete"');
    expect(html).toContain('data-collector-row-action-help-tooltip="row-online"');
    expect(html).toContain('data-collector-row-action-help-tooltip="row-offline"');
    expect(html).toContain('data-collector-row-action-help-tooltip="row-delete"');
    expect(html).toContain(t('collector.action.row-online.help'));
    expect(html).toContain(t('collector.action.row-offline.help'));
    expect(html).toContain(t('collector.action.row-delete.help'));
    expect(html).toContain('data-collector-status-tone="success"');
    expect(html).toContain('data-collector-status-tone="danger"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-collector-summary-rail=');
    expect(html).toContain(t('common.refresh'));
    expect(html).toContain(t('collector.deploy'));
    expect(html).toContain(t('collector.online'));
    expect(html).toContain(t('collector.offline'));
    expect(html).toContain(t('collector.delete'));
    expect(html).toContain(t('collector.health.cluster.copy', { online: 1, total: 2 }));
    expect(html).toContain(t('collector.health.cluster.meta', { tasks: 11, offline: 1 }));
    expect(html).toContain(t('collector.health.cluster.freshness', { time: '2026-04-10 18:00:00' }));
    expect(html).toContain(t('collector.pagination.summary', { page: 2, totalPages: 3, from: 9, to: 10, total: 18 }));
    expect(html).toContain(t('collector.pagination.page-size'));
    expect(html).toContain(t('collector.pagination.page'));
    expect(html).toContain(t('common.search'));
    expect(html).toContain(t('menu.advanced.collector'));
    expect(html).toContain(t('collector.name'));
    expect(html).toContain(t('collector.status'));
    expect(html).toContain(t('collector.mode'));
    expect(html).toContain(t('collector.task'));
    expect(html).toContain(t('collector.pinned'));
    expect(html).toContain(t('collector.dispatched'));
    expect(html).toContain(t('collector.ip'));
    expect(html).toContain(t('collector.version'));
    expect(html).toContain(t('collector.start-time'));
    expect(html).toContain('edge-a');
    expect(html).toContain('10.0.0.1');
    expect(html).toContain('1.0.0');
    expect(html).toContain('7');
    expect(html).toContain('2');
    expect(html).toContain('5');
    expect(html).toContain('2026-04-10 18:00:00');
  });

  it('uses the shared cold visual owner instead of Workbench table primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/collector-manage-surface.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-collector-manage-surface="otlp-hertzbeat-ui-collector-console"');
    expect(source).toContain('data-collector-manage-style-baseline={coldCollectorVisual.canvasName}');
    expect(source).toContain('data-collector-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('className={coldCollectorVisual.panel.hero}');
    expect(source).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-collector-delete-warning-contract="angular-no-select-warning"');
    expect(source).toContain('data-collector-delete-confirm-contract="angular-modal-confirm"');
    expect(source).toContain('data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-collector-delete-feedback-contract="angular-delete-notify"');
    expect(source).toContain('data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-collector-delete-api-contract="angular-repeated-collectors-query"');
    expect(source).toContain('data-collector-delete-page-clamp-contract="angular-update-page-index"');
    expect(source).toContain('data-collector-delete-page-clamp-owner="route-state-contract"');
    expect(source).toContain('data-collector-selection-reset-contract="angular-load-clears-selection"');
    expect(source).toContain('data-collector-selection-reset-owner="route-state-contract"');
    expect(source).toContain('data-collector-search-submit-contract="angular-enter-and-clear"');
    expect(source).toContain('data-collector-search-clear-contract="angular-cleared-load"');
    expect(source).toContain('data-collector-search-clear-owner="shared-search-row"');
    expect(source).toContain('data-collector-operate-warning-contract="angular-no-select-online-offline"');
    expect(source).toContain('data-collector-operate-confirm-contract="angular-modal-confirm"');
    expect(source).toContain('data-collector-operate-feedback-contract="angular-operate-notify"');
    expect(source).toContain('data-collector-operate-api-contract="angular-put-repeated-collectors-query"');
    expect(source).toContain('data-collector-mutation-loading-contract="angular-nz-table-loading"');
    expect(source).toContain('data-collector-load-failure-contract="angular-console-only-shell"');
    expect(source).toContain('data-collector-load-failure-owner="collector-route-controller"');
    expect(source).toContain("data-collector-load-failure={loadError ? 'angular-console-only-shell' : 'none'}");
    expect(source).toContain('meta={actionMeta ?? undefined}');
    expect(source).toContain('data-collector-delete-feedback-title');
    expect(source).toContain('data-collector-delete-feedback-detail');
    expect(source).toContain('data-collector-operate-feedback-title');
    expect(source).toContain('data-collector-operate-feedback-detail');
    expect(source).toContain('const mutationPending = Boolean(isDeletePending)');
    expect(source).toContain('const tableLoading = Boolean(isLoadPending || mutationPending)');
    expect(source).toContain('data-collector-deploy-modal-contract="angular-generate-identity-modal"');
    expect(source).toContain('data-collector-deploy-api-contract="angular-post-generate-identity"');
    expect(source).toContain('data-collector-deploy-failure-contract="angular-apply-fail-notification"');
    expect(source).toContain('data-collector-deploy-validation-contract="angular-submit-marks-required"');
    expect(source).toContain('data-collector-deploy-validation-trim-contract="hertzbeat-required-after-trim"');
    expect(source).toContain('data-collector-deploy-validation-trim-owner="collector-route-controller"');
    expect(source).toContain('data-collector-deploy-command-contract="angular-docker-package-shells"');
    expect(source).toContain('data-collector-deploy-command-owner="hertzbeat-ui-code-editor"');
    expect(source).toContain('data-collector-deploy-package-link-contract="angular-github-releases-link"');
    expect(source).toContain('data-collector-deploy-package-link="angular-github-releases-link"');
    expect(source).toContain('href="https://github.com/apache/hertzbeat/releases"');
    expect(source).toContain('target="_blank"');
    expect(source).toContain("title={t('common.notify.apply-fail')}");
    expect(source).toContain('meta={deployError}');
    expect(source).toContain('data-collector-deploy-feedback="angular-apply-fail-notification"');
    expect(source).toContain('data-collector-deploy-feedback-title="common.notify.apply-fail"');
    expect(source).toContain('data-collector-deploy-feedback-detail="backend-message"');
    expect(source).toContain('data-collector-deploy-copy-contract="angular-copy-identity"');
    expect(source).toContain('data-collector-deploy-copy-feedback-contract="angular-copy-success-duration-800"');
    expect(source).toContain('data-collector-deploy-copy-feedback-duration-ms="3000"');
    expect(source).toContain('localDeployCopyMessage');
    expect(source).toContain('handleDeployCopy(resolvedDeployIdentity)');
    expect(source).toContain('data-collector-deploy-dialog="angular-generate-identity-modal"');
    expect(source).toContain('data-collector-deploy-mask-contract="angular-mask-closable-false"');
    expect(source).toContain('data-collector-deploy-mask-closable="angular-mask-closable-false"');
    expect(source).toContain('data-collector-deploy-mask-closable-owner="angular-nz-modal"');
    expect(source).toContain('data-collector-deploy-width-contract="angular-width-45-percent"');
    expect(source).toContain('data-collector-deploy-width="angular-width-45-percent"');
    expect(source).toContain('data-collector-deploy-width-owner="angular-nz-modal"');
    expect(source).toContain('md:w-[45vw] md:max-w-[45vw]');
    expect(source).toContain('data-collector-deploy-field-layout-contract="angular-label-7-control-12"');
    expect(source).toContain('data-collector-deploy-field-layout-owner="route-form-field-grid"');
    expect(source).toContain('data-collector-deploy-field="name"');
    expect(source).toContain('data-collector-deploy-field-layout="angular-label-7-control-12"');
    expect(source).toContain('data-collector-deploy-field-help="name"');
    expect(source).toContain('data-collector-deploy-field-requirement="required"');
    expect(source).toContain('data-collector-deploy-field-input-mode="manual"');
    expect(source).toContain('data-collector-deploy-label-span="7"');
    expect(source).toContain('data-collector-deploy-control-span="12"');
    expect(source).toContain('md:grid-cols-[7fr_12fr]');
    expect(source).toContain('data-collector-deploy-name-input="angular-required-name"');
    expect(source).toContain('data-collector-deploy-name-validation-trim="hertzbeat-required-after-trim"');
    expect(source).toContain('data-collector-deploy-name-validation-trim-owner="collector-route-controller"');
    expect(source).toContain("data-collector-deploy-name-lock={resolvedDeployIdentity ? 'angular-disable-after-identity' : 'editable-before-identity'}");
    expect(source).toContain('data-collector-deploy-name-lock-owner="angular-ngmodel-input"');
    expect(source).toContain("data-collector-deploy-name-disabled={resolvedDeployIdentity ? 'true' : 'false'}");
    expect(source).toContain('data-collector-deploy-name-validation-state');
    expect(source).toContain('data-collector-deploy-name-validation-contract="angular-submit-marks-required"');
    expect(source).toContain('data-collector-deploy-loading-contract="angular-nz-ok-loading"');
    expect(source).toContain('data-collector-deploy-generate="angular-generate-identity"');
    expect(source).toContain('data-collector-command-action="deploy-generate"');
    expect(source).toContain('data-collector-deploy-generate-validation="angular-click-before-required"');
    expect(source).toContain("data-collector-deploy-ok-loading={isDeployPending ? 'true' : 'false'}");
    expect(source).toContain('data-collector-deploy-ok-loading-owner="angular-nz-ok-loading"');
    expect(source).toContain('disabled={Boolean(isDeployPending || resolvedDeployIdentity)}');
    expect(source).toContain('data-collector-deploy-result-close-contract="angular-danger-close-after-identity"');
    expect(source).toContain('data-collector-deploy-result-close-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-collector-deploy-close-reset-contract="angular-close-clears-name"');
    expect(source).toContain('data-collector-deploy-close-reset="angular-close-clears-name"');
    expect(source).toContain('data-collector-deploy-close-reset-owner="collector-route-controller"');
    expect(source).toContain('data-collector-deploy-result-close-reset="angular-close-clears-name"');
    expect(source).toContain('data-collector-deploy-result-close-reset-owner="collector-route-controller"');
    expect(source).toContain('data-collector-deploy-docker-shell="angular-docker-shell"');
    expect(source).toContain('data-collector-deploy-package-shell="angular-package-shell"');
    expect(source).toContain('data-collector-online-selected="angular-batch-online-entry"');
    expect(source).toContain('data-collector-command-action="refresh"');
    expect(source).toContain('data-collector-command-action="deploy-open"');
    expect(source).toContain('data-collector-command-action="selected-online"');
    expect(source).toContain('data-collector-command-action="selected-offline"');
    expect(source).toContain('data-collector-command-action="selected-delete"');
    expect(source).toContain('data-collector-command-action="row-online"');
    expect(source).toContain('data-collector-command-action="row-offline"');
    expect(source).toContain('data-collector-command-action="row-more"');
    expect(source).toContain('data-collector-command-action="row-delete"');
    expect(source).toContain("'data-collector-command-action': targetAction === 'online'");
    expect(source).toContain("'data-collector-command-action': 'confirm-cancel'");
    expect(source).toContain('data-collector-command-action="deploy-cancel"');
    expect(source).toContain('data-collector-command-action="deploy-copy-identity"');
    expect(source).toContain('data-collector-command-action="deploy-result-close"');
    expect(source).toContain('data-collector-offline-selected="angular-batch-offline-entry"');
    expect(source).toContain('data-collector-delete-selected="angular-batch-delete-entry"');
    expect(source).toContain('CircleHelp');
    expect(source).toContain('data-collector-action-help-style="icon-after-action"');
    expect(source).toContain('data-collector-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-collector-action-help-icon="lucide-circle-help"');
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('pageSizeOptions = [8, 15, 25]');
    expect(source).toContain('data-collector-pagination="hertzbeat-ui-dense-pagination"');
    expect(source).toContain('data-collector-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('data-collector-pagination-contract="angular-search-pagination"');
    expect(source).toContain('data-collector-pagination-page-size-owner');
    expect(source).toContain('data-collector-pagination-page-jump-owner');
    expect(source).toContain("t('collector.pagination.summary'");
    expect(source).toContain("t('collector.pagination.page-size')");
    expect(source).toContain("t('collector.pagination.page')");
    expect(source).toContain('data-collector-select-all="hertzbeat-ui-checkbox"');
    expect(source).toContain('data-collector-select-all-contract="angular-header-includes-disabled-default"');
    expect(source).toContain('data-collector-selectable-names={collectorNames.join');
    expect(source).toContain('data-collector-immutable-names={immutableCollectorNames.join');
    expect(source).toContain('event.target.checked ? collectorNames : []');
    expect(source).toContain('data-collector-row-select={row.name}');
    expect(source).toContain("row.canMutate ? 'angular-selectable' : 'angular-disabled-visual-only'");
    expect(source).toContain('checked={row.canMutate && resolvedSelectedCollectors.includes(row.name)}');
    expect(source).toContain('data-collector-online-one={row.name}');
    expect(source).toContain('data-collector-offline-one={row.name}');
    expect(source).toContain('const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null)');
    expect(source).toContain('const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId');
    expect(source).toContain('data-collector-row-delete-menu={rowActionMenuId}');
    expect(source).toContain('data-collector-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(source).toContain('data-collector-row-delete-menu-layer="overlay-visible-above-panel"');
    expect(source).toContain('data-collector-row-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(source).toContain("data-collector-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}");
    expect(source).toContain('aria-expanded={isRowActionMenuOpen}');
    expect(source).toContain('data-collector-row-delete-menu-trigger={rowActionMenuId}');
    expect(source).toContain('data-collector-row-delete-menu-panel={rowActionMenuId}');
    expect(source).toContain('data-collector-row-delete-menu-layer-panel="overlay-visible-above-panel"');
    expect(source).toContain('data-collector-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"');
    expect(source).toContain('data-collector-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain("data-collector-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}");
    expect(source).not.toContain('<details');
    expect(source).not.toContain('</details>');
    expect(source).toContain('collectorActionMenuRootClassName');
    expect(source).toContain('collectorActionMenuPanelBaseClassName');
    expect(source).toContain('data-collector-delete-one={row.name}');
    expect(source).toContain('data-collector-delete-one-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('data-collector-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-collector-health-evidence="cluster-status"');
    expect(source).toContain('data-collector-health-freshness="last-seen"');
    expect(source).toContain('data-collector-row-health="collector-status"');
    expect(source).toContain('data-collector-table-shell="hertzbeat-ui-dense-table"');
    expect(source).toContain("data-collector-table-loading={tableLoading ? 'true' : 'false'}");
    expect(source).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(source).toContain('data-collector-table-loading-owner="angular-nz-table-loading"');
    expect(source).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(source).toContain("data-collector-table-loading-source={tableLoading ? 'route-load-or-mutation' : 'idle'}");
    expect(source).toContain('data-collector-manage-table="hertzbeat-ui-collector-table"');
    expect(source).not.toContain('data-collector-summary-rail');
    expect(source).not.toContain('coldCollectorVisual.search.row');
    expect(source).not.toContain('coldCollectorVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldCollectorVisual.layout.heroGrid');
    expect(source).not.toContain('coldCollectorVisual.layout.railGrid');
    expect(source).not.toContain('coldCollectorVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('WorkbenchTableFrame');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('rounded-[12px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('bg-white/[0.03]');
    expect(source).not.toContain('text-white/78');
    expect(source).not.toContain('text-white/42');
    expect(source).not.toContain('border-white/6');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('overflow-x-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)]');

    expect(source).toContain('border-[#2b3039]');
    expect(source).toContain('bg-[#101217]');
    expect(source).toContain('text-[#eef2f7]');
    expect(source).toContain('text-[#a9b0bb]');
    expect(source).toContain('text-[#858d9a]');
  });

  it('keeps the table busy while route reloads run like Angular loadCollectorsTable', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
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
        isLoadPending
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-table-loading="true"');
    expect(html).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(html).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-collector-table-loading-source="route-load-or-mutation"');
    expect(html).toContain('aria-busy="true"');
  });

  it('keeps the collector shell mounted after list load failure without rendering backend text', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
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
        loadError="backend refused collector load"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-manage-surface="otlp-hertzbeat-ui-collector-console"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-collector-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-collector-load-failure-owner="collector-route-controller"');
    expect(html).toContain('data-collector-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-collector-table-shell="hertzbeat-ui-dense-table"');
    expect(html).not.toContain('backend refused collector load');
  });

  it('renders Angular collector delete warning, confirmation, and feedback contracts', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{
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
        }}
        search=""
        selectedCollectors={['edge-a']}
        actionError={t('collector.notify.no-select-delete')}
        actionTone="warning"
        deleteTarget={{
          collectors: ['edge-a'],
          label: 'edge-a',
          mode: 'single'
        }}
        isDeletePending
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onSelectedCollectorsChange={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-delete-warning-contract="angular-no-select-warning"');
    expect(html).toContain('data-collector-delete-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-delete-api-contract="angular-repeated-collectors-query"');
    expect(html).toContain('data-collector-delete-page-clamp-contract="angular-update-page-index"');
    expect(html).toContain('data-collector-delete-page-clamp-owner="route-state-contract"');
    expect(html).toContain('data-collector-delete-selected="angular-batch-delete-entry"');
    expect(html).toContain('data-collector-delete-feedback="angular-no-select-warning"');
    expect(html).toContain('data-collector-delete-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-delete-confirm="angular-modal-confirm"');
    expect(html).toContain('data-collector-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-delete-confirm-submit="angular-modal-confirm"');
    expect(html).toContain('data-collector-command-action="delete-confirm"');
    expect(html).toContain('data-collector-command-action="confirm-cancel"');
    expect(html).toContain('data-collector-table-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-collector-delete-confirm-target="edge-a"');
    expect(html).toContain('data-collector-row-select="edge-a"');
    expect(html).toContain('data-collector-row-delete-menu-contract="angular-ellipsis-dropdown-delete"');
    expect(html).toContain('data-collector-row-delete-menu-layer="overlay-visible-above-panel"');
    expect(html).toContain('data-collector-row-delete-menu-clearance="floating-overlay-no-panel-crop"');
    expect(html).toContain('data-collector-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-collector-row-delete-menu-panel-open="false"');
    expect(html).toContain('data-collector-delete-one="edge-a"');
    expect(html).toContain(t('collector.notify.no-select-delete'));
    expect(html).toContain(t('common.confirm.delete'));
  });

  it('renders Angular collector delete and operate failure titles with backend detail metadata', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const deleteFailureHtml = renderToStaticMarkup(
      <CollectorManageSurface
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
        actionError={t('common.notify.delete-fail')}
        actionMeta="backend delete refused"
        actionTone="critical"
        actionFeedbackContract="angular-delete-fail"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(deleteFailureHtml).toContain('data-collector-delete-feedback="angular-delete-fail"');
    expect(deleteFailureHtml).toContain('data-collector-delete-feedback-title="common.notify.delete-fail"');
    expect(deleteFailureHtml).toContain('data-collector-delete-feedback-detail="backend-message"');
    expect(deleteFailureHtml).toContain(t('common.notify.delete-fail'));
    expect(deleteFailureHtml).toContain('backend delete refused');

    const operateFailureHtml = renderToStaticMarkup(
      <CollectorManageSurface
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
        actionError={t('common.notify.operate-fail')}
        actionMeta="backend operate refused"
        actionTone="critical"
        actionFeedbackContract="angular-operate-fail"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(operateFailureHtml).toContain('data-collector-operate-feedback="angular-operate-fail"');
    expect(operateFailureHtml).toContain('data-collector-operate-feedback-title="common.notify.operate-fail"');
    expect(operateFailureHtml).toContain('data-collector-operate-feedback-detail="backend-message"');
    expect(operateFailureHtml).toContain(t('common.notify.operate-fail'));
    expect(operateFailureHtml).toContain('backend operate refused');
  });

  it('renders Angular collector online/offline warning, confirmation, and feedback contracts', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{
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
        }}
        search=""
        selectedCollectors={['edge-a']}
        actionError={t('collector.notify.no-select-offline')}
        actionTone="warning"
        actionFeedbackContract="angular-no-select-offline"
        deleteTarget={{
          action: 'offline',
          collectors: ['edge-a'],
          label: 'edge-a',
          mode: 'single'
        }}
        isDeletePending
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onSelectedCollectorsChange={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-operate-warning-contract="angular-no-select-online-offline"');
    expect(html).toContain('data-collector-operate-confirm-contract="angular-modal-confirm"');
    expect(html).toContain('data-collector-operate-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-operate-feedback-contract="angular-operate-notify"');
    expect(html).toContain('data-collector-operate-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-operate-api-contract="angular-put-repeated-collectors-query"');
    expect(html).toContain('data-collector-action-feedback-contract="angular-no-select-offline"');
    expect(html).toContain('data-collector-operate-feedback="angular-no-select-offline"');
    expect(html).toContain('data-collector-operate-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-operate-confirm="angular-modal-confirm"');
    expect(html).toContain('data-collector-operate-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-collector-operate-confirm-submit="angular-modal-confirm"');
    expect(html).toContain('data-collector-command-action="offline-confirm"');
    expect(html).toContain('data-collector-command-action="confirm-cancel"');
    expect(html).toContain('data-collector-table-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-collector-delete-confirm-target="edge-a"');
    expect(html).toContain('data-collector-offline-one="edge-a"');
    expect(html).toContain(t('collector.notify.no-select-offline'));
    expect(html).toContain(t('collector.confirm.offline'));
  });

  it('keeps the Angular header select-all batch payload while the default row stays visually disabled', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                collector: {
                  name: 'main-default-collector',
                  ip: '127.0.0.1',
                  status: 0,
                  mode: 'public',
                  version: '2.0.0',
                  gmtUpdate: '2026-04-10T10:00:00Z'
                },
                pinMonitorNum: 5,
                dispatchMonitorNum: 8
              },
              {
                collector: {
                  name: 'edge-a',
                  ip: '10.0.0.1',
                  status: 1,
                  mode: 'private',
                  version: '1.0.0',
                  gmtUpdate: '2026-04-09T10:00:00Z'
                },
                pinMonitorNum: 2,
                dispatchMonitorNum: 5
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        selectedCollectors={['edge-a']}
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onSelectedCollectorsChange={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-select-all-contract="angular-header-includes-disabled-default"');
    expect(html).toContain('data-collector-selectable-names="main-default-collector,edge-a"');
    expect(html).toContain('data-collector-immutable-names="main-default-collector"');
    expect(html).toContain('data-collector-row-select="main-default-collector"');
    expect(html).toContain('data-collector-row-select-contract="angular-disabled-visual-only"');
    expect(html).toContain('data-collector-row-select="edge-a"');
    expect(html).toContain('data-collector-row-select-contract="angular-selectable"');
  });

  it('distinguishes filtered-empty collector search from a plain empty list', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search="edge-missing"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-empty-title="filtered"');
    expect(html).toContain('data-collector-empty-copy="filtered"');
    expect(html).toContain(t('collector.empty.filtered.title'));
    expect(html).toContain(t('collector.empty.filtered.copy'));
  });

  it('renders Angular collector deploy identity modal and code editor contracts', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        deployOpen
        deployName="edge-a"
        deployIdentity="identity-123"
        deployHost="10.0.0.10"
        deployDockerShell="$ docker run -d -e IDENTITY=identity-123"
        deployPackageShell="identity: identity-123\nmanager-host: 10.0.0.10"
        deployCopyMessage={t('common.notify.copy-success')}
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onDeployNameChange={() => {}}
        onDeployGenerate={() => {}}
        onDeployClose={() => {}}
        onDeployCopy={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-deploy-dialog="angular-generate-identity-modal"');
    expect(html).toContain('data-collector-deploy-guidance="identity-risk"');
    expect(html).toContain('data-collector-deploy-field-help="name"');
    expect(html).toContain('data-collector-action-help="deploy-name"');
    expect(html).toContain('data-collector-action-help-style="icon-after-action"');
    expect(html).toContain('data-collector-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-collector-action-help-icon="lucide-circle-help"');
    expect(html).toContain('data-collector-action-help-tooltip="deploy-name"');
    expect(html).toContain('data-collector-deploy-field-requirement="required"');
    expect(html).toContain('data-collector-deploy-field-input-mode="manual"');
    expect(html).toContain('data-collector-deploy-mask-closable="angular-mask-closable-false"');
    expect(html).toContain('data-collector-deploy-mask-closable-owner="angular-nz-modal"');
    expect(html).toContain('data-collector-deploy-width="angular-width-45-percent"');
    expect(html).toContain('data-collector-deploy-width-owner="angular-nz-modal"');
    expect(html).toContain('data-collector-deploy-field="name"');
    expect(html).toContain('data-collector-deploy-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-collector-deploy-label-span="7"');
    expect(html).toContain('data-collector-deploy-control-span="12"');
    expect(html).toContain('data-collector-deploy-name-input="angular-required-name"');
    expect(html).toContain('data-collector-deploy-name-lock="angular-disable-after-identity"');
    expect(html).toContain('data-collector-deploy-name-lock-owner="angular-ngmodel-input"');
    expect(html).toContain('data-collector-deploy-name-disabled="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-collector-deploy-result="angular-identity-shells"');
    expect(html).toContain('data-collector-deploy-copy-identity="angular-copy-identity"');
    expect(html).toContain('data-collector-command-action="deploy-copy-identity"');
    expect(html).toContain('data-collector-deploy-copy-feedback="angular-copy-success"');
    expect(html).toContain('data-collector-deploy-result-close-contract="angular-danger-close-after-identity"');
    expect(html).toContain('data-collector-command-action="deploy-result-close"');
    expect(html).toContain('data-collector-deploy-copy-feedback-duration-ms="3000"');
    expect(html).toContain('data-collector-deploy-result-close-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-collector-deploy-close-reset="angular-close-clears-name"');
    expect(html).toContain('data-collector-deploy-close-reset-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-close-pending-result="angular-close-ignores-late-generate"');
    expect(html).toContain('data-collector-deploy-close-pending-result-owner="collector-route-controller"');
    expect(html).toContain('data-collector-deploy-result-close-reset="angular-close-clears-name"');
    expect(html).toContain('data-collector-deploy-result-close-reset-owner="collector-route-controller"');
    expect(html).toContain('data-hz-button-tier="solid-danger"');
    expect(html).toContain('data-collector-deploy-docker-shell="angular-docker-shell"');
    expect(html).toContain('data-collector-deploy-package-shell="angular-package-shell"');
    expect(html).toContain('data-collector-deploy-code-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-collector-deploy-package-link="angular-github-releases-link"');
    expect(html).toContain('data-collector-deploy-package-link-owner="angular-nz-modal"');
    expect(html).toContain('href="https://github.com/apache/hertzbeat/releases"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('identity-123');
    expect(html).toContain('10.0.0.10');
    expect(html).toContain(t('collector.deploy.guidance'));
    expect(html).toContain(t('collector.deploy.name.help'));
    expect(html).toContain(t('settings.form.field.requirement.required'));
    expect(html).toContain(t('settings.form.field.input-mode.manual'));
    expect(html).toContain(t('collector.deploy.docker'));
    expect(html).toContain(t('collector.deploy.package'));
  });

  it('keeps collector deploy required-name validation submit-triggered like Angular', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const pristineHtml = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        deployOpen
        deployName=""
        deployNameValidationVisible={false}
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onDeployNameChange={() => {}}
        onDeployGenerate={() => {}}
        onDeployClose={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );
    const dirtyHtml = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        deployOpen
        deployName=""
        deployNameValidationVisible
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onDeployNameChange={() => {}}
        onDeployGenerate={() => {}}
        onDeployClose={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(pristineHtml).toContain('data-collector-deploy-validation-contract="angular-submit-marks-required"');
    expect(pristineHtml).toContain('data-collector-deploy-validation-trim-contract="hertzbeat-required-after-trim"');
    expect(pristineHtml).toContain('data-collector-deploy-name-validation-state="pristine"');
    expect(pristineHtml).toContain('data-collector-deploy-name-validation-trim="hertzbeat-required-after-trim"');
    expect(pristineHtml).toContain('data-collector-deploy-name-lock="editable-before-identity"');
    expect(pristineHtml).toContain('data-collector-deploy-name-disabled="false"');
    expect(pristineHtml).toContain('data-collector-deploy-generate-validation="angular-click-before-required"');
    expect(pristineHtml).not.toContain('data-collector-deploy-name-validation="validation.required"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation-state="dirty-invalid"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation="validation.required"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation-contract="angular-submit-marks-required"');
    expect(dirtyHtml).toContain(t('validation.required').trim());
  });

  it('keeps collector deploy OK loading visible while identity generation is pending', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        deployOpen
        deployName="edge-a"
        isDeployPending
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onDeployNameChange={() => {}}
        onDeployGenerate={() => {}}
        onDeployClose={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-deploy-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-collector-deploy-ok-loading="true"');
    expect(html).toContain('data-collector-deploy-ok-loading-owner="angular-nz-ok-loading"');
    expect(html).toContain('data-collector-command-action="deploy-generate"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain(t('common.loading'));
  });

  it('keeps collector deploy generate failures as Angular apply-fail notifications', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <CollectorManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        deployOpen
        deployName="edge-a"
        deployError="collector already exists"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onDeploy={() => {}}
        onGoOnline={() => {}}
        onGoOffline={() => {}}
        onDelete={() => {}}
        onDeployNameChange={() => {}}
        onDeployGenerate={() => {}}
        onDeployClose={() => {}}
        onRowGoOnline={() => {}}
        onRowGoOffline={() => {}}
        onRowDelete={() => {}}
      />
    );

    expect(html).toContain('data-collector-deploy-failure-contract="angular-apply-fail-notification"');
    expect(html).toContain('data-collector-deploy-feedback="angular-apply-fail-notification"');
    expect(html).toContain('data-collector-deploy-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-collector-deploy-feedback-title="common.notify.apply-fail"');
    expect(html).toContain('data-collector-deploy-feedback-detail="backend-message"');
    expect(html).toContain('collector already exists');
  });
});
