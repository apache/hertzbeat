'use client';

import React from 'react';
import Link from 'next/link';
import { CircleHelp, Copy, Inbox, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SearchRow } from '../ui/search-row';
import { HzActionGroup, HzConfirmDialog, HzIconButton, HzInlineFeedback, HzLabelTag } from '@hertzbeat/ui';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { buildLabelDisplayName, renderAngularLabelColor } from '../../lib/label-manage/view-model';
import type { LabelManagePageData } from '../../lib/label-manage/controller';
import type { Label } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type LabelManageSurfaceProps = {
  t: Translator;
  data: LabelManagePageData;
  search: string;
  draftLabel: Label | null;
  isManageModalAdd: boolean;
  isNameValidationVisible?: boolean;
  deleteTarget: Label | null;
  isLoadPending?: boolean;
  isDeletePending?: boolean;
  isSavePending?: boolean;
  actionMessage?: string | null;
  actionError?: string | null;
  actionMeta?: string | null;
  loadError?: string | null;
  formatTime: (value?: number | string | null) => string;
  buildMonitorHandoffHref?: (labelText: string) => string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSearchClear: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onCopy: (label: Label) => void;
  onEdit: (label: Label) => void;
  onDeleteRequest: (label: Label) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onDraftChange: (patch: Partial<Label>) => void;
  onCloseDialog: () => void;
  onSaveDialog: (visibleDraft?: Label) => void;
};

const coldLabelVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldDialogInputClassName =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.16)]';

const coldDialogFieldClassName =
  'grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(96px,7fr)_minmax(0,12fr)] sm:items-start';

const coldDialogLabelClassName = 'pt-2 leading-4 sm:text-right';

function LabelInlineHelp({
  id,
  label,
  copy,
  scope
}: {
  id: string;
  label: string;
  copy: string;
  scope: 'action' | 'field';
}) {
  const tooltipId = `label-${scope}-help-${id}`;
  const rootData =
    scope === 'action'
      ? { 'data-label-action-help': id }
      : { 'data-label-dialog-field-help': id };
  const tooltipData =
    scope === 'action'
      ? { 'data-label-action-help-tooltip': id }
      : { 'data-label-dialog-field-help-tooltip': id };

  return (
    <span {...rootData} className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        onMouseDown={event => {
          event.stopPropagation();
        }}
        onClick={event => {
          event.stopPropagation();
        }}
        data-label-inline-help-button="icon-after-label"
        data-label-inline-help-focus-contract="click-focuses-tooltip"
        data-label-inline-help-visual="circle-help-icon"
        data-label-inline-help-icon="lucide-circle-help"
        className="inline-flex h-4 w-4 items-center justify-center bg-transparent text-[#d8e4ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={12} strokeWidth={2} aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        {...tooltipData}
        className="pointer-events-none absolute left-0 top-6 z-50 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left text-[11px] leading-4 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
      >
        {copy}
      </span>
    </span>
  );
}

function LabelFieldTitle({
  id,
  children,
  helpLabel,
  help,
  legacyMode,
  requirement,
  requirementLabel,
  inputMode,
  inputModeLabel,
  required
}: {
  id: string;
  children: React.ReactNode;
  helpLabel: string;
  help: string;
  legacyMode: string;
  requirement: 'required' | 'optional';
  requirementLabel: string;
  inputMode: 'manual' | 'generated';
  inputModeLabel: string;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span>{children}</span>
      <LabelInlineHelp id={id} label={helpLabel} copy={help} scope="field" />
      <span
        data-label-dialog-field-meta="requirement-and-input-mode"
        data-label-dialog-field-mode={legacyMode}
        data-label-dialog-field-requirement={requirement}
        className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#8f99ab]"
      >
        {requirementLabel}
      </span>
      <span
        data-label-dialog-field-meta="requirement-and-input-mode"
        data-label-dialog-field-input-mode={inputMode}
        className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#8f99ab]"
      >
        {inputModeLabel}
      </span>
      {required ? <span className="text-[#f97316]">*</span> : null}
    </span>
  );
}

export function LabelManageSurface({
  t,
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
  buildMonitorHandoffHref,
  onSearchChange,
  onSearch,
  onSearchClear,
  onRefresh,
  onNew,
  onCopy,
  onEdit,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
  onDraftChange,
  onCloseDialog,
  onSaveDialog
}: LabelManageSurfaceProps) {
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const valueInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionInputRef = React.useRef<HTMLInputElement>(null);
  const labels = data.list.content ?? [];
  const dialogTitle = isManageModalAdd ? t('label.new') : t('label.edit');
  const displayName = draftLabel ? buildLabelDisplayName(draftLabel) : '';
  const previewDisplayName = displayName || t('common.none');
  const draftName = draftLabel?.name;
  const isDraftNameMissing = Boolean(draftLabel) && (draftName == undefined || draftName.trim().length === 0);
  const isLabelPreviewVisible = Boolean(draftLabel) && !isDraftNameMissing;
  const shouldShowNameValidation = isDraftNameMissing && Boolean(isNameValidationVisible);
  const isLabelListLoading = Boolean(isLoadPending || isDeletePending);
  const isDeleteFailureFeedback = actionError === t('common.notify.delete-fail');
  const saveFailureKey =
    actionError === t('common.notify.new-fail')
      ? 'common.notify.new-fail'
      : actionError === t('common.notify.edit-fail')
        ? 'common.notify.edit-fail'
        : undefined;
  const emptyTitle = t('setting.labels.empty.title');
  const emptyCopy = t('setting.labels.empty.copy');
  const handleSaveDialog = () => {
    if (!draftLabel) {
      onSaveDialog();
      return;
    }
    onSaveDialog({
      ...draftLabel,
      name: nameInputRef.current?.value ?? draftLabel.name,
      tagValue: valueInputRef.current?.value ?? draftLabel.tagValue,
      description: descriptionInputRef.current?.value ?? draftLabel.description
    });
  };

  return (
    <>
      <div
        data-label-manage-surface="otlp-hertzbeat-ui-label-console"
        data-label-manage-style-baseline={coldLabelVisual.canvasName}
        className={coldLabelVisual.canvas.root}
        style={coldLabelVisual.canvas.backgroundStyle}
      >
        <section className={coldLabelVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div
                data-label-header="hertzbeat-ui-compact-header"
                data-label-header-nesting-contract="flat-page-introduction"
                className="p-0"
              >
                <div className="max-w-[820px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.advanced.labels')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('setting.labels.copy')}
                  </p>
                  <div data-label-command-row="standard-equal-buttons" className={coldLabelVisual.button.row}>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldButtonClassName}
                        onClick={onRefresh}
                        data-label-command-action="refresh"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.refresh')}
                      </Button>
                      <LabelInlineHelp id="refresh" label={t('setting.labels.action.refresh.help-label')} copy={t('setting.labels.action.refresh.help')} scope="action" />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldPrimaryButtonClassName}
                        onClick={onNew}
                        data-label-command-action="new"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.button.new')}
                      </Button>
                      <LabelInlineHelp id="new" label={t('setting.labels.action.new.help-label')} copy={t('setting.labels.action.new.help')} scope="action" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              data-label-admin-layout="full-width-admin-list"
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
              data-label-delete-confirm-close-contract="angular-close-before-delete-result"
              data-label-delete-confirm-close-owner="route-state-contract"
              data-label-delete-feedback-contract="angular-delete-notify"
              data-label-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
              data-label-delete-failure-contract="angular-delete-fail-notification"
              data-label-delete-failure-owner="hertzbeat-ui-inline-feedback"
              data-label-delete-query-contract="angular-repeated-ids-query"
              data-label-delete-query-owner="route-mutation-contract"
              data-label-list-loading-contract="hertzbeat-ui-flat-list-loading"
              data-label-list-loading-owner="label-route-controller"
              data-label-list-loading={isLabelListLoading ? 'true' : 'false'}
              data-label-save-loading-contract="angular-nz-ok-loading"
              data-label-save-loading-contract-owner="angular-nz-ok-loading"
              data-label-save-trim-contract="angular-trim-before-save"
              data-label-save-trim-owner="label-manage-controller"
              data-label-optional-save-payload-contract="angular-preserve-undefined-optional-fields"
              data-label-optional-save-payload-owner="label-manage-controller"
              data-label-type-save-payload-contract="angular-preserve-implicit-type"
              data-label-type-save-payload-owner="label-manage-controller"
              data-label-display-format-contract="angular-format-label-name-raw-tag-value"
              data-label-display-format-owner="label-view-model"
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
              data-label-dialog-preview-frame-contract="angular-inline-tag-no-extra-frame"
              data-label-dialog-preview-frame-owner="route-form-field-grid"
              data-label-dialog-preview-chrome-contract="angular-tag-only-no-extra-frame"
              data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"
              data-label-edit-reference-contract="isolated-edit-draft"
              data-label-edit-reference-owner="route-form-state"
              data-label-name-validation-contract="angular-required-before-submit"
              data-label-name-validation-trigger-contract="angular-ok-marks-dirty"
              data-label-name-validation-trigger-owner="route-form-contract"
              data-label-name-validation-trim-contract="local-trim-required-before-submit"
              data-label-name-validation-trim-owner="route-form-contract"
              data-label-query-contract="angular-load-all-labels"
              data-label-query-owner="label-query-state"
              data-label-query-param-order-contract="angular-page-index-size-type-search"
              data-label-query-param-order-owner="label-query-state"
              data-label-list-contract="hertzbeat-ui-flat-list"
              data-label-list-owner="hertzbeat-ui-label-tag"
              data-label-monitor-handoff-contract="angular-routerlink-monitors-labels"
              data-label-monitor-handoff-owner="next-monitor-query-link"
              className="space-y-5"
            >
              <section className="min-w-0">
                <SearchRow
                  data-label-toolbar="hertzbeat-ui-table-toolbar"
                  data-label-search-owner="shared-search-row"
                  data-label-search-submit="angular-enter-and-clear"
                  data-label-search-submit-owner="hertzbeat-ui-search-row"
                  value={search}
                  placeholder={t('label.search')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  inputWidthClassName="w-[360px]"
                  onValueChange={onSearchChange}
                  onSearch={onSearch}
                  onClear={onSearchClear}
                />

                {actionMessage || actionError ? (
                  <HzInlineFeedback
                    tone={actionError ? 'warning' : 'success'}
                    title={actionError || actionMessage}
                    meta={actionMeta ?? undefined}
                    variant="embedded"
                    data-label-action-feedback={actionError ? 'angular-action-error' : 'angular-action-success'}
                    data-label-action-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-label-save-feedback={actionError ? 'angular-save-error' : 'angular-save-success'}
                    data-label-save-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-label-save-failure={saveFailureKey ? 'angular-save-fail' : undefined}
                    data-label-save-failure-owner={saveFailureKey ? 'hertzbeat-ui-inline-feedback' : undefined}
                    data-label-save-feedback-title={saveFailureKey}
                    data-label-save-feedback-detail={saveFailureKey && actionMeta ? 'backend-message' : undefined}
                    data-label-delete-feedback={
                      isDeleteFailureFeedback
                        ? 'angular-delete-fail'
                        : actionMessage === t('common.notify.delete-success')
                          ? 'angular-delete-notify'
                          : undefined
                    }
                    data-label-delete-feedback-owner={isDeleteFailureFeedback ? 'hertzbeat-ui-inline-feedback' : undefined}
                    data-label-delete-feedback-title={isDeleteFailureFeedback ? 'common.notify.delete-fail' : undefined}
                    data-label-delete-feedback-detail={isDeleteFailureFeedback && actionMeta ? 'backend-message' : undefined}
                  />
                ) : null}

                <div
                  data-label-list="hertzbeat-ui-flat-list"
                  data-label-list-owner="hertzbeat-ui-label-tag"
                  data-label-list-column-contract="single-column-flat-row"
                  data-label-list-loading={isLabelListLoading ? 'true' : 'false'}
                  data-label-list-loading-owner="label-route-controller"
                  aria-busy={isLabelListLoading ? 'true' : 'false'}
                  className="grid min-w-0 divide-y divide-[#252b34] border-y border-[#252b34]"
                >
                  {labels.length > 0 ? labels.map(label => {
                    const labelText = buildLabelDisplayName(label);
                    const description = label.description ? label.description : '';
                    const actionLabelParams = { name: labelText };
                    const copyLabel = t('setting.labels.action.copy-aria', actionLabelParams);
                    const editLabel = t('setting.labels.action.edit-aria', actionLabelParams);
                    const deleteLabel = t('setting.labels.action.delete-aria', actionLabelParams);
                    const copyHelpId = `row-copy-${label.id}`;
                    const editHelpId = `row-edit-${label.id}`;
                    const deleteHelpId = `row-delete-${label.id}`;

                    return (
                      <article
                        key={label.id}
                        data-label-row={label.id}
                        data-label-row-shell="hertzbeat-ui-flat-row"
                        data-label-row-density="compact-list"
                        className="grid min-h-[64px] min-w-0 grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_auto] items-center gap-3 bg-transparent px-2 py-3 transition hover:bg-[#101217]"
                      >
                        <div data-label-row-content="hertzbeat-ui-label-content" className="min-w-0">
                          <Link
                            href={buildMonitorHandoffHref?.(labelText) || `/monitors?labels=${encodeURIComponent(labelText)}`}
                            title={labelText}
                            className="inline-flex max-w-full"
                            data-label-monitor-handoff="angular-routerlink-monitors-labels"
                            data-label-monitor-handoff-query={labelText}
                            data-label-monitor-handoff-owner="next-monitor-query-link"
                          >
                            <HzLabelTag
                              colorToken={renderAngularLabelColor(label.name || '')}
                              className="hover:border-[#4e74f8]"
                              data-label-color-token={renderAngularLabelColor(label.name || '')}
                              data-label-color-owner="hertzbeat-ui-label-tag"
                            >
                              <span
                                className="truncate"
                                tabIndex={-1}
                                data-label-copy-source={labelText}
                                data-label-copy-source-fallback="select-on-copy-fail"
                              >
                                {labelText}
                              </span>
                            </HzLabelTag>
                          </Link>
                          {description ? (
                            <div
                              data-label-row-description="angular-description"
                              data-label-row-description-display="angular-truthy-description-raw"
                              data-label-row-description-display-owner="label-manage-surface"
                              className="mt-1 line-clamp-1 text-[12px] leading-[17px] text-[#8f99ab]"
                              title={description}
                            >
                              {description}
                            </div>
                          ) : null}
                        </div>
                        <div data-label-row-action-shell="hertzbeat-ui-inline-row-actions" className="justify-self-end">
                          <HzActionGroup
                            density="compact-icons"
                            layout="center"
                            data-label-row-actions="hertzbeat-ui-inline-actions"
                            data-label-row-actions-owner="hertzbeat-ui-action-group"
                          >
                            <span className="inline-flex items-center gap-1">
                              <HzIconButton
                                label={copyLabel}
                                intent="ghost"
                                onClick={() => onCopy(label)}
                                data-label-row-action="copy"
                                data-label-command-action="row-copy"
                                data-label-row-action-owner="row-contextual-icon-button"
                                data-label-row-action-label={labelText}
                              >
                                <Copy size={13} />
                              </HzIconButton>
                              <LabelInlineHelp
                                id={copyHelpId}
                                label={t('setting.labels.action.copy.help-label', actionLabelParams)}
                                copy={t('setting.labels.action.copy.help', actionLabelParams)}
                                scope="action"
                              />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <HzIconButton
                                label={editLabel}
                                intent="ghost"
                                onClick={() => onEdit(label)}
                                data-label-row-action="edit"
                                data-label-command-action="row-edit"
                                data-label-row-action-owner="row-contextual-icon-button"
                                data-label-row-action-label={labelText}
                              >
                                <Pencil size={13} />
                              </HzIconButton>
                              <LabelInlineHelp
                                id={editHelpId}
                                label={t('setting.labels.action.edit.help-label', actionLabelParams)}
                                copy={t('setting.labels.action.edit.help', actionLabelParams)}
                                scope="action"
                              />
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <HzIconButton
                                label={deleteLabel}
                                intent="ghost"
                                onClick={() => onDeleteRequest(label)}
                                data-label-row-action="delete"
                                data-label-command-action="row-delete"
                                data-label-row-action-owner="row-contextual-icon-button"
                                data-label-row-action-label={labelText}
                              >
                                <Trash2 size={13} />
                              </HzIconButton>
                              <LabelInlineHelp
                                id={deleteHelpId}
                                label={t('setting.labels.action.delete.help-label', actionLabelParams)}
                                copy={t('setting.labels.action.delete.help', actionLabelParams)}
                                scope="action"
                              />
                            </span>
                          </HzActionGroup>
                        </div>
                      </article>
                    );
                  }) : (
                    <div data-label-empty-state="hertzbeat-ui-flat-empty" className="col-span-full min-h-[180px] bg-transparent px-3 text-center text-[#a9b0bb]">
                      <div className="flex h-full flex-col items-center justify-center gap-2.5">
                        <span
                          data-label-empty-icon="hertzbeat-ui-empty-box"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                        >
                          <Inbox className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="text-[13px] font-semibold text-[#eef2f7]">{emptyTitle}</div>
                        <div className="text-[12px] leading-5 text-[#8f99ab]">{emptyCopy}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <OverlayDialog
        open={Boolean(draftLabel)}
        title={dialogTitle}
        onClose={onCloseDialog}
        maskClosable={false}
        maxWidthClassName="max-w-[min(92vw,30rem)] lg:max-w-[30vw]"
        overlayProps={{
          'data-label-dialog-mask-closable': 'false',
          'data-label-dialog-mask-closable-owner': 'angular-nz-modal',
          'data-label-dialog-width': 'angular-width-30-percent',
          'data-label-dialog-width-owner': 'angular-nz-modal',
          'data-label-dialog-field-layout': 'angular-label-7-control-12',
          'data-label-dialog-field-layout-owner': 'route-form-field-grid',
          'data-label-dialog-preview-visibility': isLabelPreviewVisible ? 'visible' : 'hidden',
          'data-label-dialog-preview-visibility-owner': 'route-form-state'
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex items-center gap-1">
              <Button
                size="sm"
                variant="default"
                className={coldButtonClassName}
                onClick={onCloseDialog}
                data-label-command-action="dialog-cancel"
              >
                {t('common.button.cancel')}
              </Button>
              <LabelInlineHelp id="dialog-cancel" label={t('setting.labels.action.dialog-cancel.help-label')} copy={t('setting.labels.action.dialog-cancel.help')} scope="action" />
            </span>
            <span className="inline-flex items-center gap-1">
              <Button
                size="sm"
                variant="default"
                className={coldPrimaryButtonClassName}
                onClick={handleSaveDialog}
                disabled={Boolean(isSavePending)}
                aria-busy={isSavePending ? 'true' : 'false'}
                data-label-save-submit="angular-required-before-submit"
                data-label-command-action="dialog-save"
                data-label-name-validation-trigger="angular-ok-marks-dirty"
                data-label-name-validation-trigger-owner="route-form-contract"
                data-label-save-submit-state={shouldShowNameValidation ? 'dirty-invalid' : 'pristine'}
                data-label-save-trim="angular-trim-before-save"
                data-label-save-trim-owner="label-manage-controller"
                data-label-save-ok-loading={isSavePending ? 'true' : 'false'}
                data-label-save-ok-loading-owner="angular-nz-ok-loading"
              >
                {t('common.button.save')}
              </Button>
              <LabelInlineHelp id="dialog-save" label={t('setting.labels.action.dialog-save.help-label')} copy={t('setting.labels.action.dialog-save.help')} scope="action" />
            </span>
          </div>
        }
      >
        {draftLabel ? (
          <div className="grid gap-3" data-label-dialog-field-layout="angular-label-7-control-12" data-label-dialog-field-layout-owner="route-form-field-grid">
            <div
              className={coldDialogFieldClassName}
              data-label-dialog-field="name"
              data-label-dialog-field-layout-row="angular-label-7-control-12"
            >
              <label htmlFor="label-name" className={coldDialogLabelClassName} data-label-dialog-label-span="7">
                <LabelFieldTitle
                  id="name"
                  helpLabel={t('setting.labels.field.name.help-label')}
                  help={t('setting.labels.field.name.help')}
                  legacyMode="required"
                  requirement="required"
                  requirementLabel={t('settings.form.field.requirement.required')}
                  inputMode="manual"
                  inputModeLabel={t('settings.form.field.input-mode.manual')}
                  required
                >
                  {t('label.name')}
                </LabelFieldTitle>
              </label>
              <div className="min-w-0" data-label-dialog-control-span="12">
                <Input
                  ref={nameInputRef}
                  id="label-name"
                  className={coldDialogInputClassName}
                  value={draftLabel.name || ''}
                  onChange={event => onDraftChange({ name: event.target.value })}
                  data-label-dialog-name-input="angular-required-name"
                  data-label-dialog-name-state={shouldShowNameValidation ? 'dirty-invalid' : 'pristine'}
                />
                {shouldShowNameValidation ? (
                  <span className="mt-1 block text-[11px] font-medium text-[#fca5a5]" data-label-dialog-name-validation="validation.required">
                    {t('validation.required')}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={coldDialogFieldClassName}
              data-label-dialog-field="value"
              data-label-dialog-field-layout-row="angular-label-7-control-12"
            >
              <label htmlFor="label-value" className={coldDialogLabelClassName} data-label-dialog-label-span="7">
                <LabelFieldTitle
                  id="value"
                  helpLabel={t('setting.labels.field.value.help-label')}
                  help={t('setting.labels.field.value.help')}
                  legacyMode="optional"
                  requirement="optional"
                  requirementLabel={t('settings.form.field.requirement.optional')}
                  inputMode="manual"
                  inputModeLabel={t('settings.form.field.input-mode.manual')}
                >
                  {t('label.value')}
                </LabelFieldTitle>
              </label>
              <div className="min-w-0" data-label-dialog-control-span="12">
                <Input
                  ref={valueInputRef}
                  id="label-value"
                  className={coldDialogInputClassName}
                  value={draftLabel.tagValue || ''}
                  onChange={event => onDraftChange({ tagValue: event.target.value })}
                />
              </div>
            </div>
            <div
              className={coldDialogFieldClassName}
              data-label-dialog-field="description"
              data-label-dialog-field-layout-row="angular-label-7-control-12"
            >
              <label htmlFor="label-description" className={coldDialogLabelClassName} data-label-dialog-label-span="7">
                <LabelFieldTitle
                  id="description"
                  helpLabel={t('setting.labels.field.description.help-label')}
                  help={t('setting.labels.field.description.help')}
                  legacyMode="optional"
                  requirement="optional"
                  requirementLabel={t('settings.form.field.requirement.optional')}
                  inputMode="manual"
                  inputModeLabel={t('settings.form.field.input-mode.manual')}
                >
                  {t('label.description')}
                </LabelFieldTitle>
              </label>
              <div className="min-w-0" data-label-dialog-control-span="12">
                <Input
                  ref={descriptionInputRef}
                  id="label-description"
                  className={coldDialogInputClassName}
                  value={draftLabel.description || ''}
                  onChange={event => onDraftChange({ description: event.target.value })}
                />
              </div>
            </div>
            {isLabelPreviewVisible ? (
              <div
                data-label-dialog-preview="hertzbeat-ui-preview"
                data-label-dialog-preview-visibility="visible"
                data-label-dialog-preview-visibility-owner="route-form-state"
                data-label-dialog-preview-frame="angular-inline-tag-no-extra-frame"
                data-label-dialog-preview-frame-owner="route-form-field-grid"
                data-label-dialog-field="display"
                data-label-dialog-field-layout-row="angular-label-7-control-12"
                className={coldDialogFieldClassName}
              >
                <div className={coldDialogLabelClassName} data-label-dialog-label-span="7">
                  <LabelFieldTitle
                    id="display"
                    helpLabel={t('setting.labels.field.display.help-label')}
                    help={t('setting.labels.field.display.help')}
                    legacyMode="generated"
                    requirement="optional"
                    requirementLabel={t('settings.form.field.requirement.optional')}
                    inputMode="generated"
                    inputModeLabel={t('settings.form.field.input-mode.generated')}
                  >
                    {t('label.display')}
                  </LabelFieldTitle>
                </div>
                <HzLabelTag
                  colorToken={renderAngularLabelColor(draftLabel.name || '')}
                  className="max-w-full align-middle"
                  data-label-dialog-preview-color="angular-render-label-color"
                  data-label-dialog-preview-chrome="angular-nz-tag-inline"
                  data-label-dialog-preview-chrome-mode="angular-tag-only-no-extra-frame"
                  data-label-dialog-preview-chrome-owner="hertzbeat-ui-label-tag"
                  data-label-color-owner="hertzbeat-ui-label-tag"
                  data-label-dialog-control-span="12"
                >
                  <span className="truncate">{previewDisplayName}</span>
                </HzLabelTag>
              </div>
            ) : (
              <div hidden data-label-dialog-preview-visibility="hidden" data-label-dialog-preview-visibility-owner="route-form-state" />
            )}
          </div>
        ) : null}
      </OverlayDialog>
      <div
        hidden
        data-label-delete-confirm-state={deleteTarget ? 'open' : 'closed'}
        data-label-delete-confirm-state-owner="hertzbeat-ui-confirm-dialog"
        data-label-delete-confirm-pending={isDeletePending ? 'true' : 'false'}
        data-label-delete-confirm-state-target={deleteTarget ? buildLabelDisplayName(deleteTarget) : ''}
      />
      <HzConfirmDialog
        open={Boolean(deleteTarget)}
        tone="critical"
        kicker={t('menu.advanced.labels')}
        title={t('common.confirm.delete')}
        cancelLabel={t('common.button.cancel')}
        confirmLabel={t('setting.labels.delete-action')}
        confirmDisabled={Boolean(isDeletePending)}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        bodyRhythm="stack"
        data-label-delete-confirm="angular-modal-confirm"
        data-label-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-label-delete-confirm-state={deleteTarget ? 'open' : 'closed'}
        cancelButtonProps={{
          'data-label-command-action': 'delete-cancel'
        } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']}
        confirmButtonProps={{
          'data-label-command-action': 'delete-confirm',
          'data-label-delete-confirm-submit': 'angular-modal-confirm',
          'data-label-delete-confirm-close': 'angular-close-before-delete-result',
          'data-label-delete-confirm-close-owner': 'route-state-contract'
        } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
      >
        <div data-label-delete-confirm-target={deleteTarget ? buildLabelDisplayName(deleteTarget) : ''}>
          {deleteTarget ? buildLabelDisplayName(deleteTarget) : t('common.none')}
        </div>
        <div
          data-label-delete-guidance="monitor-handoff-risk"
          className="rounded-[4px] border border-[#553d1f] bg-[#241711] px-3 py-2 text-[12px] leading-5 text-[#fed7aa]"
        >
          {t('setting.labels.delete.guidance')}
        </div>
      </HzConfirmDialog>
    </>
  );
}
