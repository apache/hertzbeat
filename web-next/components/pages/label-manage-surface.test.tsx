import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { LabelManageSurface } from './label-manage-surface';

describe('label manage surface', () => {
  it('renders the OTLP cold-matte label console, Angular card grid, and authoring dialog shell', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.clear': '清除',
        'common.copy.button': '复制',
        'common.button.edit': '编辑',
        'common.button.delete': '删除选中项',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.none': '无标签预览',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.edit': '编辑标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 1,
                name: 'team',
                tagValue: 'ops',
                description: 'ops team',
                type: 1,
                gmtUpdate: '2026-04-10T10:00:00Z'
              },
              {
                id: 2,
                name: 'source',
                tagValue: 'system',
                description: '',
                type: 2,
                gmtUpdate: '2026-04-09T10:00:00Z'
              },
              {
                id: 3,
                name: 'legacy',
                tagValue: 'custom',
                description: 'unknown type',
                type: 99,
                gmtUpdate: '2026-04-08T10:00:00Z'
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search="team"
        draftLabel={{
          id: 0,
          name: 'team',
          tagValue: 'ops',
          description: 'ops team',
          type: 1
        }}
        isManageModalAdd
        deleteTarget={null}
        isDeletePending={false}
        isSavePending
        actionMessage="新增成功"
        formatTime={() => '2026-04-10 18:00:00'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-manage-surface="otlp-cold-label-console"');
    expect(html).toContain('data-label-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-label-header="cold-compact-header"');
    expect(html).toContain('data-label-command-row="standard-equal-buttons"');
    expect(html).toContain('data-label-admin-layout="full-width-admin-list"');
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
    expect(html).toContain('data-label-delete-confirm-state-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-label-delete-confirm-pending="false"');
    expect(html).toContain('data-label-delete-feedback-contract="angular-delete-notify"');
    expect(html).toContain('data-label-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-delete-failure-contract="angular-delete-fail-notification"');
    expect(html).toContain('data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-delete-query-contract="angular-repeated-ids-query"');
    expect(html).toContain('data-label-delete-query-owner="route-mutation-contract"');
    expect(html).toContain('data-label-card-loading-contract="angular-table-loading"');
    expect(html).toContain('data-label-card-loading-owner="label-route-controller"');
    expect(html).toContain('data-label-card-loading="false"');
    expect(html).toContain('data-label-save-loading-contract="angular-nz-ok-loading"');
    expect(html).toContain('data-label-save-loading-contract-owner="angular-nz-ok-loading"');
    expect(html).toContain('data-label-dialog-mask-closable-contract="angular-mask-closable-false"');
    expect(html).toContain('data-label-dialog-mask-closable-owner="angular-nz-modal"');
    expect(html).toContain('data-label-dialog-width-contract="angular-width-30-percent"');
    expect(html).toContain('data-label-dialog-width-owner="angular-nz-modal"');
    expect(html).toContain('data-label-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-label-dialog-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-label-dialog-preview-visibility-contract="angular-name-defined-preview"');
    expect(html).toContain('data-label-dialog-preview-visibility-owner="route-form-state"');
    expect(html).toContain('data-label-dialog-preview-frame-contract="angular-inline-tag-no-extra-frame"');
    expect(html).toContain('data-label-dialog-preview-frame-owner="route-form-field-grid"');
    expect(html).toContain('data-label-dialog-preview-chrome-contract="angular-tag-only-no-extra-frame"');
    expect(html).toContain('data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-label-edit-reference-contract="angular-edit-direct-reference"');
    expect(html).toContain('data-label-edit-reference-owner="route-form-state"');
    expect(html).toContain('data-label-name-validation-contract="angular-required-before-submit"');
    expect(html).toContain('data-label-name-validation-trigger-contract="angular-ok-marks-dirty"');
    expect(html).toContain('data-label-name-validation-trigger-owner="route-form-contract"');
    expect(html).toContain('data-label-name-validation-raw-contract="angular-required-before-trim"');
    expect(html).toContain('data-label-name-validation-raw-owner="route-form-contract"');
    expect(html).toContain('data-label-query-contract="angular-load-all-labels"');
    expect(html).toContain('data-label-query-owner="label-query-state"');
    expect(html).toContain('data-label-query-param-order-contract="angular-page-index-size-type-search"');
    expect(html).toContain('data-label-query-param-order-owner="label-query-state"');
    expect(html).toContain('data-label-card-grid-contract="angular-card-grid"');
    expect(html).toContain('data-label-card-grid-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('data-label-monitor-handoff-contract="angular-routerlink-monitors-labels"');
    expect(html).toContain('data-label-monitor-handoff-owner="next-monitor-query-link"');
    expect(html).toContain('data-hz-ui="label-tag"');
    expect(html).toContain('data-hz-label-tag-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-hz-label-color-token="geekblue"');
    expect(html).toContain('data-label-color-token="geekblue"');
    expect(html).toContain('data-label-color-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-label-dialog-preview-color="angular-render-label-color"');
    expect(html).toContain('data-label-dialog-preview-chrome="angular-nz-tag-inline"');
    expect(html).toContain('data-label-dialog-preview-chrome-mode="angular-tag-only-no-extra-frame"');
    expect(html).toContain('data-overlay-dialog-mask-closable="false"');
    expect(html).toContain('data-label-dialog-mask-closable="false"');
    expect(html).toContain('data-label-dialog-width="angular-width-30-percent"');
    expect(html).toContain('data-label-dialog-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-label-dialog-field-layout-owner="route-form-field-grid"');
    expect(html).toContain('data-label-dialog-field-layout-row="angular-label-7-control-12"');
    expect(html).toContain('data-label-dialog-label-span="7"');
    expect(html).toContain('data-label-dialog-control-span="12"');
    expect(html).toContain('sm:grid-cols-[minmax(96px,7fr)_minmax(0,12fr)]');
    expect(html).toContain('lg:max-w-[30vw]');
    expect(html).toContain('data-label-save-ok-loading="true"');
    expect(html).toContain('data-label-save-ok-loading-owner="angular-nz-ok-loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-label-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-label-search-owner="shared-search-row"');
    expect(html).toContain('data-label-search-submit="angular-enter-and-clear"');
    expect(html).toContain('data-label-search-submit-owner="cold-search-row"');
    expect(html).toContain('data-label-action-feedback="angular-action-success"');
    expect(html).toContain('data-label-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-save-feedback="angular-save-success"');
    expect(html).toContain('data-label-save-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-save-trim-contract="angular-trim-before-save"');
    expect(html).toContain('data-label-save-trim-owner="label-manage-controller"');
    expect(html).toContain('data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"');
    expect(html).toContain('data-label-optional-save-payload-owner="label-manage-controller"');
    expect(html).toContain('data-label-type-save-payload-contract="angular-preserve-implicit-type"');
    expect(html).toContain('data-label-type-save-payload-owner="label-manage-controller"');
    expect(html).toContain('data-label-display-format-contract="angular-format-label-name-raw-tag-value"');
    expect(html).toContain('data-label-display-format-owner="label-view-model"');
    expect(html).toContain('data-label-description-display-contract="angular-truthy-description-raw"');
    expect(html).toContain('data-label-description-display-owner="label-manage-surface"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('data-hz-feedback-tone="success"');
    expect(html).toContain('新增成功');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-cold-search-action="clear"');
    expect(html).toContain('data-label-card-grid="angular-card-grid"');
    expect(html).toContain('data-label-card-grid-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-label-card-column-contract="nz-xs-12-sm-8-md-6-lg-4"');
    expect(html).toContain('data-label-row="1"');
    expect(html).toContain('data-label-card-shell="angular-card"');
    expect(html).toContain('data-label-card-size="small"');
    expect(html).toContain('data-label-card-content="angular-label-content"');
    expect(html).toContain('data-label-card-description="angular-description"');
    expect(html).toContain('data-label-card-description-display="angular-truthy-description-raw"');
    expect(html).toContain('data-label-card-description-display-owner="label-manage-surface"');
    expect(html).toContain('data-label-card-actions="angular-card-actions"');
    expect(html).toContain('data-label-monitor-handoff="angular-routerlink-monitors-labels"');
    expect(html).toContain('data-label-monitor-handoff-query="team:ops"');
    expect(html).toContain('data-label-monitor-handoff-owner="next-monitor-query-link"');
    expect(html).toContain('data-label-row-actions="angular-card-actions-contextual"');
    expect(html).toContain('data-label-row-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-label-row-action="copy"');
    expect(html).toContain('data-label-row-action="edit"');
    expect(html).toContain('data-label-row-action="delete"');
    expect(html).toContain('data-label-row-action-owner="row-contextual-icon-button"');
    expect(html).toContain('data-label-row-action-label="team:ops"');
    expect(html).not.toContain('data-label-summary-rail=');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('标签管理');
    expect(html).toContain('新增');
    expect(html).toContain('搜索标签');
    expect(html).toContain('搜索');
    expect(html).toContain('aria-label="复制标签 team:ops"');
    expect(html).toContain('aria-label="编辑标签 team:ops"');
    expect(html).toContain('aria-label="删除标签 team:ops"');
    expect(html).toContain('href="/monitors?labels=team%3Aops"');
    expect(html).toContain('team:ops');
    expect(html).toContain('source:system');
    expect(html).toContain('ops team');
    expect(html).not.toContain('用户标签');
    expect(html).toContain('data-overlay-dialog="true"');
    expect(html).toContain('新增标签');
    expect(html).toContain('标签名');
    expect(html).toContain('标签值');
    expect(html).toContain('标签描述');
    expect(html).toContain('效果');
    expect(html).toContain('取消');
    expect(html).toContain('保存');
    expect(html).not.toContain('data-label-table="cold-label-table"');
    expect(html).not.toContain('setting.labels.subtitle');
  }, 30000);

  it('renders a cold card empty state with Chinese fallback copy when no labels exist', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.clear': '清除',
        'label.search': '搜索标签'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-empty-state="cold-card-empty"');
    expect(html).toContain('data-label-empty-icon="cold-empty-box"');
    expect(html).toContain('暂无标签');
    expect(html).toContain('请先新增标签。');
    expect(html).not.toContain('setting.labels.empty.title');
    expect(html).not.toContain('setting.labels.empty.copy');
  });

  it('keeps Angular formatLabelName raw tag value spacing for display, copy, and monitor handoff', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 9,
                name: 'team',
                tagValue: ' ops ',
                description: '',
                type: 1
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-display-format-contract="angular-format-label-name-raw-tag-value"');
    expect(html).toContain('data-label-monitor-handoff-query="team: ops "');
    expect(html).toContain('data-label-row-action-label="team: ops "');
    expect(html).toContain('href="/monitors?labels=team%3A%20ops%20"');
    expect(html).toContain('team: ops ');
    expect(html).not.toContain('team:ops');
  });

  it('renders whitespace-only descriptions because Angular only checks description truthiness', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{
          list: {
            content: [
              {
                id: 10,
                name: 'team',
                tagValue: 'ops',
                description: '   ',
                type: 1
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        }}
        search=""
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-description-display-contract="angular-truthy-description-raw"');
    expect(html).toContain('data-label-description-display-owner="label-manage-surface"');
    expect(html).toContain('data-label-card-description="angular-description"');
    expect(html).toContain('data-label-card-description-display="angular-truthy-description-raw"');
    expect(html).toContain('data-label-card-description-display-owner="label-manage-surface"');
    expect(html).toContain('title="   "');
  });

  it('keeps the new-label dialog preview hidden until the Angular name-defined path runs', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.none': '无标签预览',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.edit': '编辑标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={{
          id: 0,
          name: undefined as unknown as string,
          tagValue: undefined,
          description: undefined,
          type: 1
        }}
        isManageModalAdd
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-dialog-preview-visibility="hidden"');
    expect(html).toContain('data-label-dialog-preview-visibility-owner="route-form-state"');
    expect(html).not.toContain('data-label-dialog-preview="cold-preview"');
    expect(html).toContain('data-label-dialog-name-input="angular-required-name"');
    expect(html).toContain('data-label-dialog-name-state="pristine"');
    expect(html).toContain('data-label-save-submit-state="pristine"');
    expect(html).not.toContain('data-label-dialog-name-validation="validation.required"');
    expect(html).toContain('data-label-save-submit="angular-required-before-submit"');
    expect(html).toContain('data-label-name-validation-trigger="angular-ok-marks-dirty"');
    expect(html).toContain('data-label-name-validation-trigger-owner="route-form-contract"');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('data-label-save-trim="angular-trim-before-save"');
    expect(html).toContain('data-label-save-trim-owner="label-manage-controller"');
    expect(html).toContain('data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"');
    expect(html).toContain('data-label-optional-save-payload-owner="label-manage-controller"');
    expect(html).toContain('data-label-type-save-payload-contract="angular-preserve-implicit-type"');
    expect(html).toContain('data-label-type-save-payload-owner="label-manage-controller"');
    expect(html).not.toContain('无标签预览');
  });

  it('shows the Angular display preview row once the label name is defined', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.none': '无标签预览',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.edit': '编辑标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        draftLabel={{ id: 0, name: 'team', tagValue: '', description: '', type: 1 }}
        isManageModalAdd
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-dialog-preview="cold-preview"');
    expect(html).toContain('data-label-dialog-preview-visibility="visible"');
    expect(html).toContain('data-label-dialog-preview-frame="angular-inline-tag-no-extra-frame"');
    expect(html).toContain('data-label-dialog-preview-frame-owner="route-form-field-grid"');
    expect(html).toContain('data-label-dialog-preview-chrome="angular-nz-tag-inline"');
    expect(html).toContain('data-label-dialog-preview-chrome-mode="angular-tag-only-no-extra-frame"');
    expect(html).toContain('data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"');
    expect(html).toContain('data-label-dialog-field="display"');
    expect(html).toContain('data-label-dialog-label-span="7"');
    expect(html).toContain('data-label-dialog-control-span="12"');
    expect(html).not.toContain('data-label-dialog-preview=&quot;cold-preview&quot; data-label-dialog-preview-visibility=&quot;visible&quot; data-label-dialog-preview-visibility-owner=&quot;route-form-state&quot; data-label-dialog-field=&quot;display&quot; data-label-dialog-field-layout-row=&quot;angular-label-7-control-12&quot; class=&quot;grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(96px,7fr)_minmax(0,12fr)] sm:items-start rounded-[4px] border');
    expect(html).toContain('team');
  });

  it('marks the missing label name dirty only after the Angular OK-submit validation path runs', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.none': '无标签预览',
        'validation.required': '必填项',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        draftLabel={{ id: 0, name: '', tagValue: '', description: '', type: 1 }}
        isManageModalAdd
        isNameValidationVisible
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-dialog-name-state="dirty-invalid"');
    expect(html).toContain('data-label-save-submit-state="dirty-invalid"');
    expect(html).toContain('data-label-dialog-name-validation="validation.required"');
    expect(html).toContain('必填项');
    expect(html).not.toContain('disabled=""');
  });

  it('does not mark a whitespace-only label name invalid before Angular trim-before-save runs', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.none': '无标签预览',
        'validation.required': '必填项',
        'label.search': '搜索标签',
        'label.new': '新增标签',
        'label.name': '标签名',
        'label.value': '标签值',
        'label.description': '标签描述',
        'label.display': '效果',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
        t={t}
        data={{ list: { content: [], totalElements: 0, pageIndex: 0, pageSize: 8 } }}
        search=""
        draftLabel={{ id: 0, name: '   ', tagValue: undefined, description: undefined, type: 1 } as any}
        isManageModalAdd
        isNameValidationVisible
        deleteTarget={null}
        isDeletePending={false}
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-name-validation-raw-contract="angular-required-before-trim"');
    expect(html).toContain('data-label-name-validation-raw-owner="route-form-contract"');
    expect(html).toContain('data-label-dialog-name-state="pristine"');
    expect(html).toContain('data-label-save-submit-state="pristine"');
    expect(html).not.toContain('data-label-dialog-name-validation="validation.required"');
    expect(html).not.toContain('必填项');
  });

  it('renders the shared Angular-style delete confirmation dialog when a label is targeted', () => {
    const t = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.advanced.labels': '标签管理',
        'common.confirm.delete': '请确认是否删除!',
        'common.button.cancel': '取消',
        'common.button.ok': '确定',
        'common.refresh': '刷新',
        'common.button.new': '新增',
        'common.search': '搜索',
        'label.search': '搜索标签',
        'setting.labels.empty.title': '暂无标签',
        'setting.labels.empty.copy': '请先新增标签。'
      }
    });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={{
          id: 7,
          name: 'team',
          tagValue: 'ops',
          description: '',
          type: 1
        }}
        isDeletePending
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-hz-ui="confirm-dialog"');
    expect(html).toContain('data-hz-confirm-tone="critical"');
    expect(html).toContain('data-label-delete-confirm="angular-modal-confirm"');
    expect(html).toContain('data-label-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-label-delete-confirm-state="open"');
    expect(html).toContain('data-label-delete-confirm-pending="true"');
    expect(html).toContain('data-label-delete-confirm-state-target="team:ops"');
    expect(html).toContain('data-label-delete-confirm-submit="angular-modal-confirm"');
    expect(html).toContain('data-label-delete-confirm-close="angular-close-before-delete-result"');
    expect(html).toContain('data-label-delete-confirm-close-owner="route-state-contract"');
    expect(html).toContain('data-label-delete-confirm-target="team:ops"');
    expect(html).toContain('请确认是否删除!');
    expect(html).toContain('确定');
  });

  it('renders Angular label delete failure title with backend detail', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        actionError="删除失败!"
        actionMeta="backend refused label delete"
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-delete-feedback="angular-delete-fail"');
    expect(html).toContain('data-label-delete-feedback-title="common.notify.delete-fail"');
    expect(html).toContain('data-label-delete-feedback-detail="backend-message"');
    expect(html).toContain('删除失败!');
    expect(html).toContain('backend refused label delete');
  });

  it('renders Angular label save failure title with backend detail', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        actionError="修改失败!"
        actionMeta="backend refused label edit"
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-save-failure="angular-save-fail"');
    expect(html).toContain('data-label-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-label-save-feedback-title="common.notify.edit-fail"');
    expect(html).toContain('data-label-save-feedback-detail="backend-message"');
    expect(html).toContain('修改失败!');
    expect(html).toContain('backend refused label edit');
  });

  it('keeps the Angular label shell visible without action feedback on load failure', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    const html = renderToStaticMarkup(
      <LabelManageSurface
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
        draftLabel={null}
        isManageModalAdd={false}
        deleteTarget={null}
        loadError="backend refused label load"
        formatTime={() => '-'}
        onSearchChange={() => {}}
        onSearch={() => {}}
        onSearchClear={() => {}}
        onRefresh={() => {}}
        onNew={() => {}}
        onCopy={() => {}}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
        onDeleteCancel={() => {}}
        onDeleteConfirm={() => {}}
        onDraftChange={() => {}}
        onCloseDialog={() => {}}
        onSaveDialog={() => {}}
      />
    );

    expect(html).toContain('data-label-load-failure="angular-console-only-shell"');
    expect(html).toContain('data-label-load-failure-owner="label-route-controller"');
    expect(html).toContain('data-label-card-loading="false"');
    expect(html).not.toContain('backend refused label load');
    expect(html).not.toContain('data-label-action-feedback="angular-action-error"');
  });

  it('keeps the labels page on the cold visual owner instead of WorkbenchPage or alert primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/label-manage-surface.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzLabelTag');
    expect(source).toContain('renderAngularLabelColor');
    expect(source).toContain('data-label-color-token');
    expect(source).toContain('data-label-color-owner="hertzbeat-ui-label-tag"');
    expect(source).toContain('data-label-dialog-preview-color="angular-render-label-color"');
    expect(source).toContain('maskClosable={false}');
    expect(source).toContain('data-label-dialog-mask-closable');
    expect(source).toContain('data-label-dialog-width');
    expect(source).toContain('data-label-dialog-field-layout');
    expect(source).toContain('lg:max-w-[30vw]');
    expect(source).toContain('data-label-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-label-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("data-label-delete-confirm-state={deleteTarget ? 'open' : 'closed'}");
    expect(source).toContain('data-label-delete-confirm-state-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("data-label-delete-confirm-pending={isDeletePending ? 'true' : 'false'}");
    expect(source).toContain('data-label-delete-confirm-submit');
    expect(source).toContain('data-label-delete-confirm-close-contract="angular-close-before-delete-result"');
    expect(source).toContain('data-label-delete-confirm-close-owner="route-state-contract"');
    expect(source).toContain("'data-label-delete-confirm-close': 'angular-close-before-delete-result'");
    expect(source).toContain('data-label-delete-confirm-target');
    expect(source).toContain("data-label-action-feedback={actionError ? 'angular-action-error' : 'angular-action-success'}");
    expect(source).toContain('data-label-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain("data-label-save-feedback={actionError ? 'angular-save-error' : 'angular-save-success'}");
    expect(source).toContain('data-label-save-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-label-manage-surface="otlp-cold-label-console"');
    expect(source).toContain('data-label-manage-style-baseline={coldLabelVisual.canvasName}');
    expect(source).toContain('data-label-header="cold-compact-header"');
    expect(source).toContain('data-label-command-row="standard-equal-buttons"');
    expect(source).toContain('data-label-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-label-save-feedback-contract="angular-new-edit-notify"');
    expect(source).toContain('data-label-save-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"');
    expect(source).toContain('data-label-optional-save-payload-owner="label-manage-controller"');
    expect(source).toContain('data-label-type-save-payload-contract="angular-preserve-implicit-type"');
    expect(source).toContain('data-label-type-save-payload-owner="label-manage-controller"');
    expect(source).toContain('data-label-display-format-contract="angular-format-label-name-raw-tag-value"');
    expect(source).toContain('data-label-display-format-owner="label-view-model"');
    expect(source).toContain('data-label-description-display-contract="angular-truthy-description-raw"');
    expect(source).toContain('data-label-description-display-owner="label-manage-surface"');
    expect(source).toContain('data-label-save-failure-contract="angular-new-edit-fail-notification"');
    expect(source).toContain('data-label-save-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-label-load-failure-contract="angular-console-only-shell"');
    expect(source).toContain('data-label-load-failure-owner="label-route-controller"');
    expect(source).toContain("data-label-load-failure={loadError ? 'angular-console-only-shell' : 'none'}");
    expect(source).toContain("actionError === t('common.notify.new-fail')");
    expect(source).toContain("actionError === t('common.notify.edit-fail')");
    expect(source).toContain("data-label-save-failure={saveFailureKey ? 'angular-save-fail' : undefined}");
    expect(source).toContain('data-label-save-feedback-title={saveFailureKey}');
    expect(source).toContain("data-label-save-feedback-detail={saveFailureKey && actionMeta ? 'backend-message' : undefined}");
    expect(source).toContain('data-label-copy-feedback-contract="angular-copy-notify"');
    expect(source).toContain('data-label-copy-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-label-delete-confirm-contract="angular-modal-confirm"');
    expect(source).toContain('data-label-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-label-delete-confirm-state-contract="angular-modal-confirm-state"');
    expect(source).toContain('data-label-delete-confirm-state-contract-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-label-delete-confirm-close-contract="angular-close-before-delete-result"');
    expect(source).toContain('data-label-delete-confirm-close-owner="route-state-contract"');
    expect(source).toContain('data-label-delete-feedback-contract="angular-delete-notify"');
    expect(source).toContain('data-label-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-label-delete-failure-contract="angular-delete-fail-notification"');
    expect(source).toContain('data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-label-delete-feedback-title={isDeleteFailureFeedback ?');
    expect(source).toContain("data-label-delete-feedback-detail={isDeleteFailureFeedback && actionMeta ? 'backend-message' : undefined}");
    expect(source).toContain('data-label-delete-query-contract="angular-repeated-ids-query"');
    expect(source).toContain('data-label-delete-query-owner="route-mutation-contract"');
    expect(source).toContain('data-label-card-loading-contract="angular-table-loading"');
    expect(source).toContain('data-label-card-loading-owner="label-route-controller"');
    expect(source).toContain("data-label-card-loading={isCardGridLoading ? 'true' : 'false'}");
    expect(source).toContain("aria-busy={isCardGridLoading ? 'true' : 'false'}");
    expect(source).toContain('data-label-save-loading-contract="angular-nz-ok-loading"');
    expect(source).toContain('data-label-save-loading-contract-owner="angular-nz-ok-loading"');
    expect(source).toContain('data-label-dialog-mask-closable-contract="angular-mask-closable-false"');
    expect(source).toContain('data-label-dialog-width-contract="angular-width-30-percent"');
    expect(source).toContain('data-label-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(source).toContain('data-label-dialog-field-layout-owner="route-form-field-grid"');
    expect(source).toContain('data-label-dialog-preview-visibility-contract="angular-name-defined-preview"');
    expect(source).toContain('data-label-dialog-preview-visibility-owner="route-form-state"');
    expect(source).toContain('data-label-dialog-preview-frame-contract="angular-inline-tag-no-extra-frame"');
    expect(source).toContain('data-label-dialog-preview-frame-owner="route-form-field-grid"');
    expect(source).toContain('data-label-dialog-preview-chrome-contract="angular-tag-only-no-extra-frame"');
    expect(source).toContain('data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"');
    expect(source).toContain('data-label-edit-reference-contract="angular-edit-direct-reference"');
    expect(source).toContain('data-label-edit-reference-owner="route-form-state"');
    expect(source).toContain('data-label-name-validation-contract="angular-required-before-submit"');
    expect(source).toContain('data-label-name-validation-trigger-contract="angular-ok-marks-dirty"');
    expect(source).toContain('data-label-name-validation-trigger-owner="route-form-contract"');
    expect(source).toContain('data-label-name-validation-raw-contract="angular-required-before-trim"');
    expect(source).toContain('data-label-name-validation-raw-owner="route-form-contract"');
    expect(source).toContain('data-label-query-contract="angular-load-all-labels"');
    expect(source).toContain('data-label-query-owner="label-query-state"');
    expect(source).toContain('data-label-query-param-order-contract="angular-page-index-size-type-search"');
    expect(source).toContain('data-label-query-param-order-owner="label-query-state"');
    expect(source).toContain('data-label-card-grid-contract="angular-card-grid"');
    expect(source).toContain('data-label-card-grid-owner="hertzbeat-ui-label-tag"');
    expect(source).toContain('data-label-monitor-handoff-contract="angular-routerlink-monitors-labels"');
    expect(source).toContain('data-label-monitor-handoff-owner="next-monitor-query-link"');
    expect(source).toContain('data-label-dialog-name-input="angular-required-name"');
    expect(source).toContain('data-label-dialog-field-layout-row="angular-label-7-control-12"');
    expect(source).toContain('data-label-dialog-label-span="7"');
    expect(source).toContain('data-label-dialog-control-span="12"');
    expect(source).toContain('sm:grid-cols-[minmax(96px,7fr)_minmax(0,12fr)]');
    expect(source).toContain('isLabelPreviewVisible');
    expect(source).toContain("draftLabel?.name !== undefined");
    expect(source).toContain('data-label-dialog-preview-frame="angular-inline-tag-no-extra-frame"');
    expect(source).toContain('data-label-dialog-preview-chrome="angular-nz-tag-inline"');
    expect(source).toContain('data-label-dialog-preview-chrome-mode="angular-tag-only-no-extra-frame"');
    expect(source).toContain('className={coldDialogFieldClassName}');
    expect(source).not.toContain('className={`${coldDialogFieldClassName} rounded-[4px] border border-[#2b3039] bg-[#101217] p-3`}');
    expect(source).toContain('data-label-dialog-name-state');
    expect(source).toContain('data-label-dialog-name-validation="validation.required"');
    expect(source).toContain('data-label-save-submit="angular-required-before-submit"');
    expect(source).toContain('data-label-name-validation-trigger="angular-ok-marks-dirty"');
    expect(source).toContain('data-label-save-submit-state');
    expect(source).toContain('disabled={Boolean(isSavePending)}');
    expect(source).toContain("data-label-save-ok-loading={isSavePending ? 'true' : 'false'}");
    expect(source).toContain('data-label-save-ok-loading-owner="angular-nz-ok-loading"');
    expect(source).toContain('data-label-toolbar="cold-table-toolbar"');
    expect(source).toContain('data-label-search-owner="shared-search-row"');
    expect(source).toContain('data-label-search-submit="angular-enter-and-clear"');
    expect(source).toContain('data-label-search-submit-owner="cold-search-row"');
    expect(source).toContain("clearLabel={t('common.clear')}");
    expect(source).toContain('onClear={onSearchClear}');
    expect(source).toContain('data-label-card-grid="angular-card-grid"');
    expect(source).toContain('data-label-card-column-contract="nz-xs-12-sm-8-md-6-lg-4"');
    expect(source).toContain('data-label-card-shell="angular-card"');
    expect(source).toContain('data-label-card-size="small"');
    expect(source).toContain('data-label-card-content="angular-label-content"');
    expect(source).toContain('data-label-card-description="angular-description"');
    expect(source).toContain('data-label-card-description-display="angular-truthy-description-raw"');
    expect(source).toContain('data-label-card-description-display-owner="label-manage-surface"');
    expect(source).toContain('data-label-card-actions="angular-card-actions"');
    expect(source).toContain('data-label-monitor-handoff="angular-routerlink-monitors-labels"');
    expect(source).toContain('data-label-monitor-handoff-query={labelText}');
    expect(source).toContain('data-label-monitor-handoff-owner="next-monitor-query-link"');
    expect(source).toContain("t('setting.labels.action.copy-aria', actionLabelParams)");
    expect(source).toContain("t('setting.labels.action.edit-aria', actionLabelParams)");
    expect(source).toContain("t('setting.labels.action.delete-aria', actionLabelParams)");
    expect(source).toContain('data-label-row-actions="angular-card-actions-contextual"');
    expect(source).toContain('data-label-row-actions-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-label-row-action-owner="row-contextual-icon-button"');
    expect(source).toContain('data-label-row-action-label={labelText}');
    expect(source).toContain('data-label-empty-state="cold-card-empty"');
    expect(source).not.toContain('data-label-summary-rail');
    expect(source).not.toContain('coldLabelVisual.search.row');
    expect(source).not.toContain('coldLabelVisual.search.input');
    expect(source).not.toContain('data-cold-search-input-shell');
    expect(source).not.toContain('coldLabelVisual.layout.heroGrid');
    expect(source).not.toContain('coldLabelVisual.layout.railGrid');
    expect(source).not.toContain('coldLabelVisual.signal.band');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain("from './alert-surface-primitives'");
    expect(source).not.toContain('AlertSurfacePanel');
    expect(source).not.toContain('data-label-table="cold-label-table"');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ToolbarField');
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarRow');
    expect(source).not.toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('buildLabelFacts');
    expect(source).not.toContain('setting.labels.subtitle');
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('border-white/8');
    expect(source).not.toContain('border-white/10');
    expect(source).not.toContain('bg-white/[0.02]');
    expect(source).not.toContain('bg-white/[0.04]');
    expect(source).not.toContain('bg-black/20');
    expect(source).not.toContain('text-white/72');
    expect(source).not.toContain('text-white/86');
    expect(source).not.toContain('text-white/62');
    expect(source).not.toContain('text-white/30');
    expect(source).not.toContain('text-[#f3eee6]');
    expect(source).not.toContain('flex min-h-[180px] flex-col rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3.5');
  });
});
