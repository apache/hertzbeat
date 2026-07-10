'use client';

import React from 'react';
import { Eye, EyeOff, FileText, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { HzButton, HzButtonLink, HzConfirmDialog, HzYamlWorkspace, type HzTemplateCategory } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { HzCodeEditor } from '../ui/hz-code-editor';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { buildTemplateMenuView } from '../../lib/setting-define/view-model';
import type { SettingDefinePageData } from '../../lib/setting-define/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type SettingDefineSurfaceProps = {
  t: Translator;
  data: SettingDefinePageData;
  search: string;
  selectedApp: string | null;
  editorValue: string;
  originalYaml: string;
  yamlLabel: string;
  monitorHref?: string;
  isEditing: boolean;
  menuLoading?: boolean;
  editorLoading?: boolean;
  savePending?: boolean;
  message?: string | null;
  messageMeta?: string | null;
  messageContract?: string | null;
  loadError?: string | null;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSelectApp: (app: string) => void;
  onNew: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onToggleTemplateVisibility: (app: string, hide: boolean) => void;
  onEditorValueChange: (value: string) => void;
};

type TemplateVisibilityConfirm = {
  app: string;
  label: string;
  hidden: boolean;
  nextHide: boolean;
};

const coldDefineVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#f8fafc]';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

export function SettingDefineSurface({
  t,
  data,
  search,
  selectedApp,
  editorValue,
  originalYaml,
  yamlLabel,
  monitorHref,
  isEditing,
  menuLoading = false,
  editorLoading = false,
  savePending = false,
  message,
  messageMeta = null,
  messageContract = null,
  loadError = null,
  onSearchChange,
  onSearch,
  onSelectApp,
  onNew,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onToggleTemplateVisibility,
  onEditorValueChange
}: SettingDefineSurfaceProps) {
  const defineTitle = t('setting.define.title');
  const selectedLabel = selectedApp ? data.appLabels[selectedApp] || selectedApp : t('setting.define.new-template');
  const deleteActionTarget = selectedApp || selectedLabel;
  const menuGroups = buildTemplateMenuView(data.menuGroups, '', t);
  const visibleMenuGroups = buildTemplateMenuView(data.menuGroups, search, t);
  const hasTemplateItems = data.menuGroups.some(group => group.items.length > 0);
  const isSearchMiss = hasTemplateItems && search.trim().length > 0 && visibleMenuGroups.length === 0;
  const hasSelectedApp = Boolean(selectedApp);
  const editorTitle = hasSelectedApp ? (yamlLabel || selectedLabel) : selectedLabel;
  const showExistingTemplateDiff = hasSelectedApp && isEditing;
  const hasYamlChanges = editorValue.trimEnd() !== originalYaml.trimEnd();
  const showSaveAction = !editorLoading && hasYamlChanges;
  const editorTheme = 'vs-dark';
  const applyFailure = messageContract === 'angular-apply-fail-notification';
  const deleteFailure = messageContract === 'angular-delete-fail-notification';
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false);
  const [saveGuardMessage, setSaveGuardMessage] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [visibilityConfirm, setVisibilityConfirm] = React.useState<TemplateVisibilityConfirm | null>(null);
  const emptyStateTitle = isSearchMiss ? t('setting.define.empty.search-title') : t('setting.define.empty.title');
  const templateCategories: HzTemplateCategory[] = menuGroups.map(group => ({
    id: group.key,
    label: group.label,
    items: group.rows.map(row => ({
      id: row.app,
      label: row.title,
      meta: row.app,
      status: null,
      action: (
        <HzButton
          size="sm"
          intent="ghost"
          aria-label={t(row.hidden ? 'setting.define.action.show-aria' : 'setting.define.action.hide-aria', { app: row.title })}
          title={t(row.hidden ? 'setting.define.action.show-aria' : 'setting.define.action.hide-aria', { app: row.title })}
          data-setting-define-template-visibility={row.app}
          data-setting-define-template-visibility-contract="angular-hide-true-or-undefined-contextual"
          data-setting-define-template-visibility-owner="hertzbeat-ui-button"
          data-setting-define-template-visibility-density="icon-only-list-action"
          data-setting-define-template-visibility-label={row.title}
          data-setting-define-template-visibility-action={row.hidden ? 'show' : 'hide'}
          data-setting-define-template-visibility-next-hide={String(!row.hidden)}
          className="h-7 w-7 min-w-0 px-0"
          onClick={event => {
            event.stopPropagation();
            setVisibilityConfirm({
              app: row.app,
              label: row.title,
              hidden: row.hidden,
              nextHide: !row.hidden
            });
          }}
        >
          {row.hidden ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="sr-only">{row.hidden ? t('setting.define.action.show') : t('setting.define.action.hide')}</span>
        </HzButton>
      )
    }))
  }));

  const handleRequestSave = () => {
    if (editorValue.trim() === '') {
      setSaveConfirmOpen(false);
      setSaveGuardMessage(t('define.save-apply.no-code'));
      return;
    }
    setSaveGuardMessage(null);
    setSaveConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    setSaveConfirmOpen(false);
    setSaveGuardMessage(null);
    onSave();
  };

  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false);
    onDelete();
  };

  const handleCancel = () => {
    setSaveGuardMessage(null);
    onCancel();
  };

  const handleConfirmVisibility = () => {
    if (!visibilityConfirm) return;
    const { app, nextHide } = visibilityConfirm;
    setVisibilityConfirm(null);
    onToggleTemplateVisibility(app, nextHide);
  };

  const workspaceActions = (
    <>
      <span
        data-setting-define-current-yaml="true"
        className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#a9b0bb]"
      >
        {yamlLabel}
      </span>
    </>
  );

  const showWorkspaceFeedback = savePending || !hasTemplateItems || isSearchMiss || Boolean(saveGuardMessage || message);
  const workspaceFeedback = showWorkspaceFeedback ? (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      {savePending ? (
        <span
          data-setting-define-save-pending-feedback="angular-save-loading"
          data-setting-define-save-pending-feedback-owner="hertzbeat-ui-workspace-feedback"
          className="text-[#9cc9aa]"
        >
          {t('setting.define.save.pending')}
        </span>
      ) : null}
      {!hasTemplateItems || isSearchMiss ? (
        <span data-setting-define-empty-state="hertzbeat-ui-list-empty" className="text-[#efd29b]">
          {emptyStateTitle}
        </span>
      ) : null}
      {saveGuardMessage || message ? (
        <span
          className="text-[#efd29b]"
          data-setting-define-action-feedback={messageContract || (saveGuardMessage ? 'angular-no-code-warning' : undefined)}
          data-setting-define-action-feedback-contract={messageContract || undefined}
          data-setting-define-action-feedback-owner={messageContract ? 'hertzbeat-ui-inline-feedback' : undefined}
          data-setting-define-action-feedback-title={messageContract ? (applyFailure ? 'common.notify.apply-fail' : 'common.notify.delete-fail') : undefined}
          data-setting-define-action-feedback-detail={messageContract && messageMeta ? 'backend-message' : undefined}
          data-setting-define-save-feedback={applyFailure ? 'angular-apply-fail-notification' : undefined}
          data-setting-define-save-feedback-title={applyFailure ? 'common.notify.apply-fail' : undefined}
          data-setting-define-save-feedback-detail={applyFailure && messageMeta ? 'backend-message' : undefined}
          data-setting-define-delete-feedback={deleteFailure ? 'angular-delete-fail-notification' : undefined}
          data-setting-define-delete-feedback-title={deleteFailure ? 'common.notify.delete-fail' : undefined}
          data-setting-define-delete-feedback-detail={deleteFailure && messageMeta ? 'backend-message' : undefined}
          data-setting-define-visibility-feedback={applyFailure ? 'angular-apply-fail-notification' : undefined}
          data-setting-define-visibility-feedback-title={applyFailure ? 'common.notify.apply-fail' : undefined}
          data-setting-define-visibility-feedback-detail={applyFailure && messageMeta ? 'backend-message' : undefined}
        >
          {saveGuardMessage || message}
          {message && messageMeta ? <span> · {messageMeta}</span> : null}
        </span>
      ) : null}
    </div>
  ) : null;

  const yamlEditor = showExistingTemplateDiff ? (
    <div data-setting-define-diff-shell="monitor-template-diff" className="grid gap-4 p-3 lg:grid-cols-2">
      <div data-setting-define-diff-original="true" className="min-w-0">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#858d9a]">
          {t('setting.define.diff.original')}
        </div>
        <HzCodeEditor
          key={`${selectedApp || 'new-template'}:original:${yamlLabel}`}
          data-setting-define-editor-field="hz-code-editor"
          data-setting-define-code-editor="monitor-template-yaml-original"
          data-setting-define-editor-theme={editorTheme}
          data-setting-define-editor-theme-owner="angular-nz-code-editor-theme"
          data-setting-define-editor-folding="true"
          data-setting-define-editor-automatic-layout="true"
          data-setting-define-editor-loading={editorLoading ? 'true' : 'false'}
          className="bg-[#0d1117]"
          value={originalYaml}
          language="yaml"
          theme={editorTheme}
          loading={editorLoading}
          loadingLabel={t('setting.define.loading')}
          minHeight="360px"
          ariaLabel={`${editorTitle} ${t('setting.define.diff.original')}`}
          readOnly
        />
      </div>
      <div data-setting-define-diff-current="true" className="min-w-0">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#858d9a]">
          {t('setting.define.diff.current')}
        </div>
        <HzCodeEditor
          key={`${selectedApp || 'new-template'}:current:${yamlLabel}`}
          data-hz-ui="yaml-editor"
          data-setting-define-editor-field="hz-code-editor"
          data-setting-define-code-editor="monitor-template-yaml"
          data-setting-define-editor-theme={editorTheme}
          data-setting-define-editor-theme-owner="angular-nz-code-editor-theme"
          data-setting-define-editor-folding="true"
          data-setting-define-editor-automatic-layout="true"
          data-setting-define-editor-loading={editorLoading ? 'true' : 'false'}
          className="bg-[#0d1117]"
          value={editorValue}
          language="yaml"
          theme={editorTheme}
          loading={editorLoading}
          loadingLabel={t('setting.define.loading')}
          minHeight="360px"
          ariaLabel={editorTitle}
          onChange={value => {
            setSaveGuardMessage(null);
            onEditorValueChange(value);
          }}
          readOnly={!isEditing}
        />
      </div>
    </div>
  ) : (
    <div className="p-3">
      <HzCodeEditor
        key={`${selectedApp || 'new-template'}:${yamlLabel}`}
        data-hz-ui="yaml-editor"
        data-setting-define-editor-field="hz-code-editor"
        data-setting-define-code-editor="monitor-template-yaml"
        data-setting-define-editor-theme={editorTheme}
        data-setting-define-editor-theme-owner="angular-nz-code-editor-theme"
        data-setting-define-editor-folding="true"
        data-setting-define-editor-automatic-layout="true"
        data-setting-define-editor-loading={editorLoading ? 'true' : 'false'}
        className="bg-[#0d1117]"
        value={editorValue}
        language="yaml"
        theme={editorTheme}
        loading={editorLoading}
        loadingLabel={t('setting.define.loading')}
        minHeight="520px"
        ariaLabel={editorTitle}
        onChange={value => {
          setSaveGuardMessage(null);
          onEditorValueChange(value);
        }}
        readOnly={!isEditing}
      />
    </div>
  );

  return (
    <div
      data-setting-define-surface="otlp-hertzbeat-ui-define-console"
      data-setting-define-style-baseline={coldDefineVisual.canvasName}
      data-setting-define-route-state="angular-current-app-url-retained"
      data-setting-define-theme-contract="dark-ops-fixed-yaml-workbench"
      data-setting-define-theme-owner="setting-define-surface"
      data-setting-define-theme-mode="dark-ops"
      data-setting-define-theme-switch-contract="removed-redundant-local-toggle"
      data-setting-define-theme-switch-owner="setting-define-surface"
      data-setting-define-theme-switch-state={editorTheme}
      data-setting-define-menu-filter-contract="angular-monitor-select-list-label-only"
      data-setting-define-menu-filter-owner="hertzbeat-ui-template-picker"
      data-setting-define-menu-filtered-contract="angular-hide-prometheus-system"
      data-setting-define-menu-filtered-owner="setting-define-controller"
      data-setting-define-menu-loading-contract="angular-monitor-select-list-loading"
      data-setting-define-menu-loading-owner="hertzbeat-ui-template-picker"
      data-setting-define-menu-loading={menuLoading ? 'true' : 'false'}
      data-setting-define-load-failure-contract="angular-console-only-shell"
      data-setting-define-load-failure-owner="setting-define-controller"
      data-setting-define-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
      data-setting-define-new-draft-contract="angular-locale-comment-five-newlines"
      data-setting-define-new-draft-owner="setting-define-controller"
      data-setting-define-new-draft-state={hasSelectedApp ? 'existing-template' : 'new-template'}
      data-setting-define-new-action-contract="angular-current-app-reset-url-retained"
      data-setting-define-new-action-owner="setting-define-controller"
      data-setting-define-new-action-state={hasSelectedApp ? 'available' : 'hidden'}
      data-setting-define-menu-select-contract="angular-router-navigate-app-query"
      data-setting-define-menu-select-owner="hertzbeat-ui-template-picker"
      data-setting-define-menu-select-query-contract="retain-context-while-updating-app"
      data-setting-define-menu-select-query-owner="setting-define-page-router"
      data-setting-define-confirm-closable-contract="angular-nz-closable-false"
      data-setting-define-confirm-ok-contract="angular-nz-ok-danger-primary"
      data-setting-define-delete-success-edit-state-contract="angular-preserve-is-editing"
      data-setting-define-save-visibility-contract="angular-code-diff-independent-of-editing"
      data-setting-define-save-reload-contract="angular-load-app-define-content-after-save"
      data-setting-define-save-reload-owner="setting-define-controller"
      data-setting-define-save-reload-scope={hasSelectedApp ? 'existing-template' : 'new-template-draft'}
      data-setting-define-startup-reload-contract="angular-startup-load-after-success"
      data-setting-define-startup-reload-owner="startup-service"
      data-setting-define-startup-reload-scope="save-delete-visibility-success"
      data-setting-define-startup-reload-failure-contract="angular-fire-and-forget"
      data-setting-define-startup-reload-failure-owner="startup-service"
      data-setting-define-template-visibility-loading-contract="angular-save-loading"
      data-setting-define-template-visibility-loading-owner="setting-define-controller"
      data-setting-define-template-visibility-loading={savePending ? 'true' : 'false'}
      data-setting-define-editor-option-contract="angular-yaml-vs-folding-automatic-layout"
      data-setting-define-editor-option-owner="hz-code-editor"
      data-setting-define-editor-loading-contract="angular-nz-code-editor-loading"
      data-setting-define-editor-loading-owner="hz-code-editor"
      data-setting-define-editor-loading={editorLoading ? 'true' : 'false'}
      data-setting-define-editor-loading-save-contract="angular-save-hidden-while-editor-loading"
      className={coldDefineVisual.canvas.root}
      style={coldDefineVisual.canvas.backgroundStyle}
    >
      <section className={coldDefineVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-3">
            <div
              data-setting-define-header="hertzbeat-ui-compact-toolbar"
              data-setting-define-header-density="reduced-invalid-summary"
              data-setting-define-header-nesting-contract="flat-page-toolbar"
              className="p-0"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h1 className="text-[20px] font-semibold leading-7 text-[#f5f7fb]">{defineTitle}</h1>
                <div data-setting-define-command-row="standard-equal-buttons" className="flex flex-wrap items-center gap-2">
                  {hasSelectedApp ? (
                    <Button
                      size="sm"
                      variant="default"
                      data-setting-define-new-action="angular-current-app-reset"
                      data-setting-define-new-action-contract="angular-current-app-reset-url-retained"
                      data-setting-define-new-action-owner="setting-define-controller"
                      data-setting-define-new-route-state="url-retained"
                      className={coldPrimaryButtonClassName}
                      onClick={onNew}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('setting.define.action.new')}
                    </Button>
                  ) : null}
                  {hasSelectedApp ? (
                    <HzButtonLink
                      data-setting-define-monitor-link={selectedApp || undefined}
                      data-setting-define-monitor-link-contract="angular-routerlink-monitors-app"
                      data-setting-define-monitor-link-owner="hertzbeat-ui-button-link"
                      data-setting-define-monitor-link-app={selectedApp || undefined}
                      href={monitorHref || `/monitors?app=${encodeURIComponent(selectedApp || '')}`}
                      className={`${coldButtonClassName} inline-flex items-center justify-center gap-2`}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {yamlLabel}
                    </HzButtonLink>
                  ) : null}
                  {hasSelectedApp && !isEditing ? (
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onEdit}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.edit')}
                    </Button>
                  ) : null}
                  {isEditing ? (
                    <Button
                      size="sm"
                      variant="default"
                      data-setting-define-cancel-action={hasSelectedApp ? 'existing-template-edit' : 'new-template-draft'}
                      data-setting-define-cancel-owner="setting-define-controller"
                      className={coldButtonClassName}
                      onClick={handleCancel}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.cancel')}
                    </Button>
                  ) : null}
                  {showSaveAction ? (
                    <Button
                      size="sm"
                      variant="default"
                      data-setting-define-save-action="request"
                      data-setting-define-save-pending={savePending ? 'true' : 'false'}
                      data-setting-define-save-loading-owner="angular-nz-loading"
                      aria-busy={savePending ? 'true' : undefined}
                      disabled={savePending}
                      className={coldPrimaryButtonClassName}
                      onClick={handleRequestSave}
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('setting.define.action.save-apply')}
                    </Button>
                  ) : null}
                  {hasSelectedApp ? (
                    <Button
                      size="sm"
                      variant="default"
                      data-setting-define-delete-action="angular-current-app-id"
                      data-setting-define-delete-action-owner="hertzbeat-ui-button"
                      data-setting-define-delete-action-label={deleteActionTarget}
                      aria-label={t('setting.define.action.delete', { app: deleteActionTarget })}
                      title={t('setting.define.action.delete', { app: deleteActionTarget })}
                      className={coldButtonClassName}
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('setting.define.action.delete', { app: deleteActionTarget })}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div data-setting-define-workspace="hertzbeat-ui-define-workspace">
            <div data-setting-define-editor-shell="shared-yaml-workspace">
              <HzYamlWorkspace
                categories={templateCategories}
                selectedId={selectedApp || undefined}
                onSelect={onSelectApp}
                search={search}
                onSearchChange={value => {
                  onSearchChange(value);
                  onSearch();
                }}
                code={editorValue}
                title={editorTitle}
                filename={yamlLabel}
                feedback={workspaceFeedback}
                actions={workspaceActions}
                templatePickerLoading={menuLoading}
                templatePickerLabels={{
                  defaultTitle: t('menu.advanced.define'),
                  itemCount: total => String(total),
                  showCounts: false,
                  searchPlaceholder: t('common.search'),
                  empty: emptyStateTitle
                }}
                editor={yamlEditor}
              />
            </div>
          </div>
        </div>
      </section>
      <div
        data-setting-define-save-confirm={saveConfirmOpen ? 'open' : 'closed'}
        data-setting-define-save-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-setting-define-save-confirm-closable="false"
        data-setting-define-save-confirm-ok-danger="true"
        data-setting-define-save-confirm-ok-type="primary"
      >
        <HzConfirmDialog
          open={saveConfirmOpen}
          tone="critical"
          kicker={t('setting.define.title')}
          title={t('define.save-apply.confirm')}
          confirmLabel={t('common.button.ok')}
          cancelLabel={t('common.button.cancel')}
          onClose={() => setSaveConfirmOpen(false)}
          onConfirm={handleConfirmSave}
          data-setting-define-save-confirm-dialog="angular-modal-confirm"
          data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"
          data-setting-define-confirm-title="angular-title-copy"
          data-setting-define-confirm-closable="false"
          data-setting-define-confirm-ok-danger="true"
          data-setting-define-confirm-ok-type="primary"
          confirmButtonProps={{
            'data-setting-define-save-confirm-submit': 'angular-modal-confirm',
            'data-setting-define-save-confirm-submit-danger': 'true',
            'data-setting-define-save-confirm-submit-type': 'primary'
          } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
        />
      </div>
      <div
        data-setting-define-delete-confirm={deleteConfirmOpen ? 'open' : 'closed'}
        data-setting-define-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-setting-define-delete-confirm-closable="false"
        data-setting-define-delete-confirm-ok-danger="true"
        data-setting-define-delete-confirm-ok-type="primary"
      >
        <HzConfirmDialog
          open={deleteConfirmOpen}
          tone="critical"
          kicker={t('setting.define.title')}
          title={t('define.delete.confirm', { app: selectedLabel })}
          confirmLabel={t('common.button.ok')}
          cancelLabel={t('common.button.cancel')}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          data-setting-define-delete-confirm-dialog="angular-modal-confirm"
          data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"
          data-setting-define-confirm-title="angular-title-copy"
          data-setting-define-confirm-closable="false"
          data-setting-define-confirm-ok-danger="true"
          data-setting-define-confirm-ok-type="primary"
          confirmButtonProps={{
            'data-setting-define-delete-confirm-submit': 'angular-modal-confirm',
            'data-setting-define-delete-confirm-submit-danger': 'true',
            'data-setting-define-delete-confirm-submit-type': 'primary'
          } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
        />
      </div>
      <div
        data-setting-define-template-visibility-confirm={visibilityConfirm ? 'open' : 'closed'}
        data-setting-define-template-visibility-confirm-contract="angular-popconfirm-before-config-update"
        data-setting-define-template-visibility-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-setting-define-template-visibility-app={visibilityConfirm?.app || undefined}
        data-setting-define-template-visibility-action={visibilityConfirm ? (visibilityConfirm.nextHide ? 'hide' : 'show') : undefined}
        data-setting-define-template-visibility-next-hide={visibilityConfirm ? String(visibilityConfirm.nextHide) : undefined}
      >
        <HzConfirmDialog
          open={Boolean(visibilityConfirm)}
          tone="info"
          kicker={t('setting.define.title')}
          title={
            visibilityConfirm
              ? `${visibilityConfirm.nextHide ? t('setting.define.action.hide') : t('setting.define.action.show')} ${visibilityConfirm.label}`
              : t('setting.define.title')
          }
          confirmLabel={t('common.button.ok')}
          cancelLabel={t('common.button.cancel')}
          onClose={() => setVisibilityConfirm(null)}
          onConfirm={handleConfirmVisibility}
          bodyRhythm="stack"
          data-setting-define-template-visibility-confirm-dialog="angular-popconfirm"
          data-setting-define-confirm-owner="hertzbeat-ui-confirm-dialog"
          confirmButtonProps={{
            'data-setting-define-template-visibility-confirm-submit': 'angular-popconfirm'
          } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
        >
          <p>{visibilityConfirm?.hidden ? t('define.hide-true.confirm') : t('define.hide-false.confirm')}</p>
        </HzConfirmDialog>
      </div>
    </div>
  );
}
