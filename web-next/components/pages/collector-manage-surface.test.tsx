import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { CollectorManageSurface } from './collector-manage-surface';

describe('collector manage surface', () => {
  it('renders the cold-matte collector toolbar and dense table shell', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.collector': '采集集群',
        'collector.deploy': '部署采集器',
        'collector.online': '上线采集器',
        'collector.offline': '下线采集器',
        'collector.delete': '删除采集器',
        'collector.name': '采集器名称',
        'collector.status': '运行状态',
        'collector.mode': '运行模式',
        'collector.task': '总任务数量',
        'collector.pinned': '固定任务',
        'collector.dispatched': '调度任务',
        'collector.ip': 'IP地址',
        'collector.version': '版本',
        'collector.start-time': '启动时间',
        'collector.mode.public': '公共集群模式',
        'collector.mode.private': '私有云边模式',
        'monitor.collector.status.online': '在线',
        'monitor.collector.status.offline': '离线',
        'common.refresh': '刷新',
        'common.search': '搜索',
        'common.edit': '操作',
        'common.total': 'Total',
        'common.current-page-count': 'Current page'
      }
    });

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

    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-collector-header="cold-compact-header"');
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
    expect(html).toContain('data-collector-deploy-validation-raw-contract="angular-required-before-trim"');
    expect(html).toContain('data-collector-deploy-validation-raw-owner="collector-route-controller"');
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
    expect(html).toContain('data-collector-pagination="cold-dense-pagination"');
    expect(html).toContain('data-collector-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-collector-pagination-contract="angular-search-pagination"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-collector-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-collector-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-collector-deploy-open="angular-deploy-modal"');
    expect(html).toContain('data-collector-online-selected="angular-batch-online-entry"');
    expect(html).toContain('data-collector-offline-selected="angular-batch-offline-entry"');
    expect(html).toContain('data-collector-delete-selected="angular-batch-delete-entry"');
    expect(html).toContain('data-collector-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-collector-search-owner="shared-search-row"');
    expect(html).toContain('data-collector-search-submit-contract="angular-enter-and-clear"');
    expect(html).toContain('data-collector-search-clear-contract="angular-cleared-load"');
    expect(html).toContain('data-collector-search-clear-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-action="clear"');
    expect(html).toContain('data-collector-table-shell="cold-dense-table"');
    expect(html).toContain('data-collector-table-loading="false"');
    expect(html).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(html).toContain('data-collector-table-loading-owner="angular-nz-table-loading"');
    expect(html).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(html).toContain('data-collector-table-loading-source="idle"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('data-collector-manage-table="cold-collector-table"');
    expect(html).toContain('data-collector-select-all="cold-checkbox"');
    expect(html).toContain('data-collector-row-select="edge-a"');
    expect(html).toContain('data-collector-row-select="edge-b"');
    expect(html).toContain('data-collector-row-health="collector-status"');
    expect(html).toContain('data-collector-row-actions="cold-icon-actions"');
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
    expect(html).toContain('data-collector-delete-one-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-collector-offline-one="edge-a"');
    expect(html).toContain('data-collector-online-one="edge-b"');
    expect(html).toContain('data-collector-status-tone="success"');
    expect(html).toContain('data-collector-status-tone="danger"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-collector-summary-rail=');
    expect(html).toContain('刷新');
    expect(html).toContain('部署采集器');
    expect(html).toContain('上线采集器');
    expect(html).toContain('下线采集器');
    expect(html).toContain('删除采集器');
    expect(html).toContain('采集器 1 / 2 在线');
    expect(html).toContain('任务 11 · 离线 1');
    expect(html).toContain('最近上报 2026-04-10 18:00:00');
    expect(html).toContain('第 2 / 3 页 · 9-10 / 18');
    expect(html).toContain('每页条数');
    expect(html).toContain('页码');
    expect(html).toContain('搜索');
    expect(html).toContain('采集集群');
    expect(html).toContain('采集器名称');
    expect(html).toContain('运行状态');
    expect(html).toContain('运行模式');
    expect(html).toContain('总任务数量');
    expect(html).toContain('固定任务');
    expect(html).toContain('调度任务');
    expect(html).toContain('IP地址');
    expect(html).toContain('版本');
    expect(html).toContain('启动时间');
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

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(source).toContain('data-collector-manage-style-baseline={coldCollectorVisual.canvasName}');
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
    expect(source).toContain('data-collector-deploy-validation-raw-contract="angular-required-before-trim"');
    expect(source).toContain('data-collector-deploy-validation-raw-owner="collector-route-controller"');
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
    expect(source).toContain('data-collector-deploy-copy-feedback-duration-ms="800"');
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
    expect(source).toContain('data-collector-deploy-label-span="7"');
    expect(source).toContain('data-collector-deploy-control-span="12"');
    expect(source).toContain('md:grid-cols-[7fr_12fr]');
    expect(source).toContain('data-collector-deploy-name-input="angular-required-name"');
    expect(source).toContain('data-collector-deploy-name-validation-raw="angular-required-before-trim"');
    expect(source).toContain('data-collector-deploy-name-validation-raw-owner="collector-route-controller"');
    expect(source).toContain("data-collector-deploy-name-lock={resolvedDeployIdentity ? 'angular-disable-after-identity' : 'editable-before-identity'}");
    expect(source).toContain('data-collector-deploy-name-lock-owner="angular-ngmodel-input"');
    expect(source).toContain("data-collector-deploy-name-disabled={resolvedDeployIdentity ? 'true' : 'false'}");
    expect(source).toContain('data-collector-deploy-name-validation-state');
    expect(source).toContain('data-collector-deploy-name-validation-contract="angular-submit-marks-required"');
    expect(source).toContain('data-collector-deploy-loading-contract="angular-nz-ok-loading"');
    expect(source).toContain('data-collector-deploy-generate="angular-generate-identity"');
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
    expect(source).toContain('data-collector-offline-selected="angular-batch-offline-entry"');
    expect(source).toContain('data-collector-delete-selected="angular-batch-delete-entry"');
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('pageSizeOptions = [8, 15, 25]');
    expect(source).toContain('data-collector-pagination="cold-dense-pagination"');
    expect(source).toContain('data-collector-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('data-collector-pagination-contract="angular-search-pagination"');
    expect(source).toContain('data-collector-pagination-page-size-owner');
    expect(source).toContain('data-collector-pagination-page-jump-owner');
    expect(source).toContain("t('collector.pagination.summary'");
    expect(source).toContain("t('collector.pagination.page-size')");
    expect(source).toContain("t('collector.pagination.page')");
    expect(source).toContain('data-collector-select-all="cold-checkbox"');
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
    expect(source).toContain('data-collector-table-shell="cold-dense-table"');
    expect(source).toContain("data-collector-table-loading={tableLoading ? 'true' : 'false'}");
    expect(source).toContain('data-collector-table-loading-contract="angular-load-collectors-table"');
    expect(source).toContain('data-collector-table-loading-owner="angular-nz-table-loading"');
    expect(source).toContain('data-collector-table-loading-scope="load-search-refresh-pagination-mutation"');
    expect(source).toContain("data-collector-table-loading-source={tableLoading ? 'route-load-or-mutation' : 'idle'}");
    expect(source).toContain('data-collector-manage-table="cold-collector-table"');
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

    expect(html).toContain('data-collector-manage-surface="otlp-cold-collector-console"');
    expect(html).toContain('data-collector-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-collector-load-failure-contract="angular-console-only-shell"');
    expect(html).toContain('data-collector-load-failure-owner="collector-route-controller"');
    expect(html).toContain('data-collector-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-collector-table-shell="cold-dense-table"');
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
        actionError="请先选择要删除的监控"
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
    expect(html).toContain('请先选择要删除的监控');
    expect(html).toContain('请确认是否删除!');
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
        actionError="删除失败!"
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
    expect(deleteFailureHtml).toContain('删除失败!');
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
        actionError="操作失败!"
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
    expect(operateFailureHtml).toContain('操作失败!');
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
        actionError="未选中任何待下线项!"
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
    expect(html).toContain('data-collector-table-loading="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-collector-delete-confirm-target="edge-a"');
    expect(html).toContain('data-collector-offline-one="edge-a"');
    expect(html).toContain('未选中任何待下线项!');
    expect(html).toContain('请确认是否下线此采集器!');
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
        deployCopyMessage="复制成功!"
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
    expect(html).toContain('data-collector-deploy-copy-feedback="angular-copy-success"');
    expect(html).toContain('data-collector-deploy-result-close-contract="angular-danger-close-after-identity"');
    expect(html).toContain('data-collector-deploy-copy-feedback-duration-ms="800"');
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
    expect(html).toContain('通过 Docker 方式部署');
    expect(html).toContain('通过安装包部署');
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
    expect(pristineHtml).toContain('data-collector-deploy-validation-raw-contract="angular-required-before-trim"');
    expect(pristineHtml).toContain('data-collector-deploy-name-validation-state="pristine"');
    expect(pristineHtml).toContain('data-collector-deploy-name-validation-raw="angular-required-before-trim"');
    expect(pristineHtml).toContain('data-collector-deploy-name-lock="editable-before-identity"');
    expect(pristineHtml).toContain('data-collector-deploy-name-disabled="false"');
    expect(pristineHtml).toContain('data-collector-deploy-generate-validation="angular-click-before-required"');
    expect(pristineHtml).not.toContain('data-collector-deploy-name-validation="validation.required"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation-state="dirty-invalid"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation="validation.required"');
    expect(dirtyHtml).toContain('data-collector-deploy-name-validation-contract="angular-submit-marks-required"');
    expect(dirtyHtml).toContain('请填充必填项!');
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
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('加载中');
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
