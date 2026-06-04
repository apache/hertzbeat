'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Network } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';
import { HzCodeEditor, type HzCodeEditorLanguage } from '@/components/ui/hz-code-editor';
import { WorkbenchInsetPanel } from '@/components/workbench/primitives';
import { ToolbarField, ToolbarNativeSelect } from '@/components/workbench/toolbar';
import { RowList, WorkbenchPage } from '@/components/workbench/workbench-page';
import { Button } from '@/components/ui/button';
import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { updateDefinitionPayload } from '@/lib/entity-definition/controller';
import { createDefinitionBundle, parseDefinitionBundle } from '@/lib/entity-import/controller';
import {
  buildActivityRows,
  buildImportPreviewRows,
  buildImportQueueGroups,
  buildTemplateRows,
  type ImportPreviewRow
} from '@/lib/entity-import/view-model';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import type { EntityDefinitionActivity, EntityDefinitionFormat, EntityDefinitionWorkspaceTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';

type EntityDefinitionWorkspaceSurfaceProps = {
  mode: 'import' | 'definition';
  activities: EntityDefinitionActivity[];
  templates: EntityDefinitionWorkspaceTemplate[];
  entityId?: string;
  initialContent?: string;
  initialFormat?: EntityDefinitionFormat;
  initialMessage?: string | null;
};

type PreviewScope = 'all' | 'ready' | 'attention' | 'telemetry';

function resolveDefinitionEditorLanguage(format: EntityDefinitionFormat): HzCodeEditorLanguage {
  switch (format) {
    case 'json':
      return 'json';
    case 'curl':
      return 'shell';
    case 'yaml':
    default:
      return 'yaml';
  }
}

function attributionStateLabel(state: string, t: (key: string) => string) {
  if (state === 'ready') {
    return t('entities.definition.workspace.attribution-state.ready');
  }
  if (state === 'missing') {
    return t('entities.definition.workspace.attribution-state.missing');
  }
  return t('entities.definition.workspace.attribution-state.unknown');
}

function attributionStateClassName(state: string) {
  if (state === 'ready') {
    return 'border-[#24533a] bg-[#101914] text-[#a8efc0]';
  }
  if (state === 'missing') {
    return 'border-[#5b2c32] bg-[#211114] text-[#f0a7af]';
  }
  return 'border-[#514223] bg-[#211a0d] text-[#f1c96b]';
}

export function EntityDefinitionWorkspaceSurface({
  mode,
  activities,
  templates,
  entityId,
  initialContent = '',
  initialFormat = 'yaml',
  initialMessage = null
}: EntityDefinitionWorkspaceSurfaceProps) {
  const { t } = useI18n();
  const emptyValue = t('common.none');
  const initialDraftContent = mode === 'import' && initialContent.trim() === '' ? getImportStarterDraft(initialFormat) : initialContent;
  const [content, setContent] = useState(initialDraftContent);
  const [format, setFormat] = useState<EntityDefinitionFormat>(initialFormat);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(initialMessage ? 'error' : null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [previewScope, setPreviewScope] = useState<PreviewScope>('all');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [definitionReloadVersion, setDefinitionReloadVersion] = useState(0);

  const queueGroups = buildImportQueueGroups(previewRows, t);
  const visiblePreviewRows = previewScope === 'all' ? previewRows : previewRows.filter(row => matchesPreviewScope(row, previewScope));

  async function refreshDefinitionDraft(nextFormat: EntityDefinitionFormat) {
    if (mode !== 'definition' || entityId == null) {
      return;
    }
    try {
      const nextDefinition = await apiMessageGet<string>(`/entities/${entityId}/definition?format=${nextFormat}`);
      setContent(nextDefinition);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? localizeEntityDefinitionMessage(error.message, t)
          : t('entities.definition.message.load-failed')
      );
      setMessageTone('error');
    }
  }

  function clearPreviewState() {
    setPreviewRows([]);
    setPreviewScope('all');
  }

  function resetStatus() {
    setMessage(null);
    setMessageTone(null);
  }

  async function previewDefinitions() {
    const nextContent = content.trim();
    if (nextContent === '') {
      clearPreviewState();
      setMessage(t('entity.definition.import.empty-preview'));
      setMessageTone('error');
      return;
    }

    setParsing(true);
    resetStatus();
    clearPreviewState();

    try {
      const rows = buildImportPreviewRows(await parseDefinitionBundle(apiMessagePost, nextContent, format), t);
      setPreviewRows(rows);
      setPreviewScope('all');
      setMessage(
        rows.length === 1
          ? t('entity.definition.import.activity.preview-one')
          : t('entity.definition.import.activity.preview-many', { count: rows.length })
      );
      setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? localizeEntityDefinitionMessage(error.message, t) : t('entity.definition.import.parse-failed'));
      setMessageTone('error');
    } finally {
      setParsing(false);
    }
  }

  async function submitDefinitions() {
    const nextContent = content.trim();
    if (nextContent === '') {
      setMessage(
        mode === 'definition'
          ? t('entity.definition.import.empty-save')
          : t('entity.definition.import.empty-import')
      );
      setMessageTone('error');
      return;
    }

    if (previewRows.length === 0) {
      await previewDefinitions();
      return;
    }

    if (mode === 'definition') {
      if (previewRows.length > 1) {
        setPreviewScope('all');
        setMessage(t('entity.definition.workspace.single-required'));
        setMessageTone('error');
        return;
      }

      if (entityId == null) {
        setMessage(t('entities.definition.message.update-missing-entity'));
        setMessageTone('error');
        return;
      }

      setSubmitting(true);
      resetStatus();

      try {
        await apiMessagePut<void>(`/entities/${entityId}/definition`, updateDefinitionPayload(nextContent, format));
        setMessage(t('entities.definition.message.updated'));
        setMessageTone('success');
      } catch (error) {
        setMessage(error instanceof Error ? localizeEntityDefinitionMessage(error.message, t) : t('entities.definition.message.update-failed'));
        setMessageTone('error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (previewRows.some(row => row.gaps.length > 0)) {
      setPreviewScope('attention');
      setMessage(t('entity.definition.import.blocked'));
      setMessageTone('error');
      return;
    }

    setSubmitting(true);
    resetStatus();

    try {
      const entityIds = await createDefinitionBundle(apiMessagePost, nextContent, format);
      setMessage(
        entityIds.length > 1
          ? t('entity.definition.import.success-bundle', { count: entityIds.length })
          : t('entity.definition.import.success-single')
      );
      setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? localizeEntityDefinitionMessage(error.message, t) : t('entity.definition.import.create-failed'));
      setMessageTone('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFormatChange(nextFormat: EntityDefinitionFormat) {
    const shouldReplaceImportStarter = mode === 'import' && (content.trim() === '' || content === getImportStarterDraft(format));
    setFormat(nextFormat);
    clearPreviewState();
    resetStatus();
    if (mode === 'definition') {
      setDefinitionReloadVersion(current => current + 1);
      await refreshDefinitionDraft(nextFormat);
      return;
    }
    setDefinitionReloadVersion(current => current + 1);
    if (shouldReplaceImportStarter) {
      setContent(getImportStarterDraft(nextFormat));
    }
  }

  function handleDraftChange(nextValue: string) {
    setContent(nextValue);
    clearPreviewState();
    resetStatus();
  }

  const clearDraftCopy = t('entity.definition.action.clear-draft');
  const previewDefinitionsCopy = t('entity.definition.action.preview');
  const submitDefinitionsCopy =
    mode === 'definition'
      ? t('entity.definition.action.save')
      : t('entity.definition.action.import');

  function renderActionControls() {
    return (
      <>
      <Button
        size="sm"
        variant="default"
        onClick={() => {
          setContent('');
          clearPreviewState();
          resetStatus();
        }}
        disabled={content.trim() === '' && previewRows.length === 0}
      >
        {clearDraftCopy}
      </Button>
      <Button size="sm" variant="default" onClick={() => void previewDefinitions()} disabled={parsing || submitting}>
        {parsing ? t('common.loading') : previewDefinitionsCopy}
      </Button>
      <Button size="sm" variant="primary" onClick={() => void submitDefinitions()} disabled={parsing || submitting}>
        {submitting ? t('common.saving') : submitDefinitionsCopy}
      </Button>
      </>
    );
  }

  function renderAttributionPreview() {
    if (visiblePreviewRows.length === 0) {
      return null;
    }

    return (
      <div
        data-entity-import-attribution-preview="definition-attribution-check"
        className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"
      >
        <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.attribution-check')}</div>
        <div className="grid gap-2">
          {visiblePreviewRows.map(row => (
            <div key={row.key} className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] font-semibold text-[#dbe4f0]">{row.title}</div>
                <span
                  data-entity-import-attribution-state={row.attributionState}
                  className={cn('rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold', attributionStateClassName(row.attributionState))}
                >
                  {row.attributionLabel}
                </span>
              </div>
              <div className="grid gap-1">
                {row.attributionRows.map(attribute => (
                  <div
                    key={attribute.key}
                    data-entity-import-attribution-row={attribute.key}
                    data-entity-import-attribution-state={attribute.state}
                    className="grid grid-cols-[minmax(82px,0.7fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-semibold text-[#dbe4f0]">{attribute.title}</span>
                    <span className="min-w-0 truncate text-[#98a2b3]">{attribute.copy}</span>
                    <span className={cn('rounded-[3px] border px-1.5 py-0.5 font-semibold', attributionStateClassName(attribute.state))}>
                      {attributionStateLabel(attribute.state, t)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'import') {
    const visual = hzOpsCatalogVisual;
    const importSubtitle = t('entities.import.workspace.subtitle');
    const importFormatHelp = t('entities.import.workspace.format-help');
    const readyCount = previewRows.filter(row => row.gaps.length === 0).length;
    const attentionCount = previewRows.filter(row => row.gaps.length > 0).length;
    const telemetryGapCount = previewRows.filter(row => row.gapKeys.includes('telemetry')).length;
    const metricCards = [
      { label: t('entities.definition.workspace.metric.ready'), value: String(readyCount), icon: FileText },
      { label: t('entities.definition.workspace.metric.attention'), value: String(attentionCount), icon: AlertTriangle },
      { label: t('entities.definition.workspace.metric.telemetry-gaps'), value: String(telemetryGapCount), icon: Network }
    ];

    return (
      <div
        data-entity-definition-workspace={mode}
        data-entity-definition-style-baseline="hertzbeat-ui-matte"
        data-entity-definition-visual-contract={visual.contract}
        data-entity-definition-layout="full-width-workbench"
        data-entity-definition-header-spacing="hertzbeat-ui-padded"
        data-definition-reload-version={definitionReloadVersion}
        className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-6 pb-6 pt-4 text-[#dbe4f0]"
      >
        <WorkbenchPage
          kicker={t('entities.definition.workspace.kicker')}
          title={t('entities.import.workspace.title')}
          subtitle={importSubtitle}
          tone="operator"
          facts={[]}
          main={
            <section
              data-entity-definition-editor-shell="otlp-hertzbeat-ui-import-workbench"
              data-entity-definition-shell-spacing="hertzbeat-ui-tight"
              data-entity-definition-shell-height="hertzbeat-ui-content"
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
            >
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <section data-entity-definition-editor-column="true" className="grid auto-rows-min content-start gap-3">
                  <div
                    data-entity-definition-import-action-row="hertzbeat-ui-inline-actions"
                    className="flex flex-wrap items-end justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
                  >
                    <ToolbarField label={t('entity.definition.format.label')} className="w-[144px] min-w-[144px] flex-none">
                      <ToolbarNativeSelect
                        data-entity-definition-format-select="hertzbeat-ui-compact-select"
                        value={format}
                        onChange={event => void handleFormatChange(event.target.value as EntityDefinitionFormat)}
                      >
                        <option value="yaml">{t('entity.definition.format.option.yaml')}</option>
                        <option value="json">{t('entity.definition.format.option.json')}</option>
                        <option value="curl">{t('entity.definition.format.option.curl')}</option>
                      </ToolbarNativeSelect>
                    </ToolbarField>
                    <div className="flex flex-wrap items-center justify-end gap-2">{renderActionControls()}</div>
                  </div>

                  <p className="text-[12px] leading-5 text-[#98a2b3]">
                    {importFormatHelp}
                  </p>

                  <HzCodeEditor
                    data-entity-definition-starter-draft={content === getImportStarterDraft(format) ? `hertzbeat-ui-${format}` : undefined}
                    data-entity-definition-code-editor="import"
                    data-entity-definition-editor-format={format}
                    data-entity-definition-editor-width="hertzbeat-ui-fluid"
                    className="min-h-[520px]"
                    value={content}
                    language={resolveDefinitionEditorLanguage(format)}
                    minHeight="520px"
                    onChange={handleDraftChange}
                    placeholder={resolveImportPlaceholder(t, format)}
                    spellCheck={false}
                  />

                  {message ? (
                    <div
                      className={cn(
                        'rounded-[3px] border px-3 py-2 text-xs',
                        messageTone === 'success'
                          ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
                          : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                      )}
                    >
                      {message}
                    </div>
                  ) : null}
                </section>

                <section
                  data-entity-definition-context-panel="hertzbeat-ui-context-panel"
                  data-entity-definition-context-density="minimal-import"
                  className="grid gap-3 self-start rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"
                >
                  <div data-entity-definition-metric-strip="hertzbeat-ui-inline-counts" className="grid gap-2">
                    {metricCards.map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#dbe4f0]">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[#98a2b3]" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="text-[16px] font-semibold tabular-nums text-[#f5f7fb]">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {previewRows.length > 0 ? (
                    <section className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                      <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.current-definition')}</div>
                      <div className="grid gap-2">
                        {queueGroups.map(group => (
                          <WorkbenchInsetPanel
                            as="button"
                            key={group.key}
                            type="button"
                            density="flush"
                            tone={previewScope === group.scope ? 'raised' : 'panel'}
                            className={cn('rounded-[3px] text-left', previewScope === group.scope && 'border-[#4e74f8]')}
                            onClick={() => setPreviewScope(group.scope)}
                          >
                            <div className="text-[10px] tracking-[0.18em] text-[#8d95a5]">{group.rows.length}</div>
                            <div className="mt-1 text-[12px] font-semibold text-[#f5f7fb]">{group.title}</div>
                          </WorkbenchInsetPanel>
                        ))}
                      </div>
                      <RowList
                        rows={visiblePreviewRows.map(row => ({
                          title: row.title,
                          copy: row.subtitle ?? row.validationLabel,
                          meta: row.kindLabel
                        }))}
                      />
                      {renderAttributionPreview()}
                    </section>
                  ) : null}
                </section>
              </div>
            </section>
          }
        />
      </div>
    );
  }

  if (mode === 'definition') {
    const visual = hzOpsCatalogVisual;
    const definitionSubtitle = t('entities.definition.workspace.subtitle');
    const definitionFormatHelp = t('entities.definition.workspace.format-help');
    const definitionErrorState = messageTone === 'error' && message != null && content.trim() === '';
    const definitionPlaceholder = resolveImportPlaceholder(t, format);
    const readyCount = previewRows.filter(row => row.gaps.length === 0).length;
    const attentionCount = previewRows.filter(row => row.gaps.length > 0).length;
    const telemetryGapCount = previewRows.filter(row => row.gapKeys.includes('telemetry')).length;
    const visibleMessage = message == null ? null : localizeEntityDefinitionMessage(message, t);
    const metricCards = [
      { label: t('entities.definition.workspace.metric.ready'), value: String(readyCount), icon: FileText },
      { label: t('entities.definition.workspace.metric.attention'), value: String(attentionCount), icon: AlertTriangle },
      { label: t('entities.definition.workspace.metric.telemetry-gaps'), value: String(telemetryGapCount), icon: Network }
    ];

    return (
      <div
        data-entity-definition-workspace={mode}
        data-entity-definition-style-baseline="hertzbeat-ui-matte"
        data-entity-definition-visual-contract={visual.contract}
        data-entity-definition-layout="full-width-workbench"
        data-definition-reload-version={definitionReloadVersion}
        className="-mx-4 -mb-3 -mt-4 bg-[#0b0c0e] text-[#dbe4f0] sm:-mx-6"
      >
        <WorkbenchPage
          kicker={t('entities.definition.workspace.kicker')}
          title={t('entities.definition.workspace.title')}
          subtitle={definitionSubtitle}
          tone="operator"
          facts={[]}
          main={
            <section
              data-entity-definition-editor-shell="otlp-hertzbeat-ui-definition-workbench"
              data-entity-definition-shell-spacing="hertzbeat-ui-tight"
              data-entity-definition-shell-height="hertzbeat-ui-content"
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
            >
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <section data-entity-definition-editor-column="true" className="grid auto-rows-min content-start gap-3">
                  <div
                    data-entity-definition-action-row="hertzbeat-ui-inline-actions"
                    className="flex flex-wrap items-end justify-between gap-3 rounded-[4px] border border-[#2b3039] bg-[#101217] px-3 py-3"
                  >
                    <ToolbarField label={t('entity.definition.format.label')} className="w-[144px] min-w-[144px] flex-none">
                      <ToolbarNativeSelect
                        data-entity-definition-format-select="hertzbeat-ui-compact-select"
                        value={format}
                        onChange={event => void handleFormatChange(event.target.value as EntityDefinitionFormat)}
                      >
                        <option value="yaml">{t('entity.definition.format.option.yaml')}</option>
                        <option value="json">{t('entity.definition.format.option.json')}</option>
                        <option value="curl">{t('entity.definition.format.option.curl')}</option>
                      </ToolbarNativeSelect>
                    </ToolbarField>
                    <div className="flex flex-wrap items-center justify-end gap-2">{renderActionControls()}</div>
                  </div>

                  <p className="text-[12px] leading-5 text-[#98a2b3]">
                    {definitionSubtitle} {definitionFormatHelp}
                  </p>

                  <HzCodeEditor
                    data-entity-definition-code-editor="definition"
                    data-entity-definition-editor-format={format}
                    data-entity-definition-editor-width="hertzbeat-ui-fluid"
                    className="min-h-[520px]"
                    value={content}
                    language={resolveDefinitionEditorLanguage(format)}
                    minHeight="520px"
                    onChange={handleDraftChange}
                    placeholder={definitionPlaceholder}
                    spellCheck={false}
                  />
                </section>

                <section
                  data-entity-definition-context-panel="hertzbeat-ui-context-panel"
                  data-entity-definition-template-panel="true"
                  data-entity-definition-error-state={definitionErrorState ? 'hertzbeat-ui-reference' : undefined}
                  data-entity-definition-error-placement={definitionErrorState ? 'hertzbeat-ui-context-panel' : undefined}
                  className="grid gap-3 self-start rounded-[4px] border border-[#2b3039] bg-[#101217] p-3"
                >
                  <div data-entity-definition-metric-strip="hertzbeat-ui-inline-counts" className="grid gap-2">
                    {metricCards.map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[3px] border border-[#2b3039] bg-[#0b0c0e] px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#dbe4f0]">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[#98a2b3]" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="text-[16px] font-semibold tabular-nums text-[#f5f7fb]">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {visibleMessage ? (
                    <div
                      data-entity-definition-load-error={messageTone === 'error' ? 'hertzbeat-ui-inline' : undefined}
                      className={cn(
                        'rounded-[3px] border px-3 py-2 text-xs leading-5',
                        messageTone === 'success'
                          ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
                          : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                      )}
                    >
                      {visibleMessage}
                    </div>
                  ) : null}

                  <section className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                    <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.template-title')}</div>
                    {definitionErrorState ? (
                      <p className="text-[12px] leading-5 text-[#98a2b3]">{t('entities.definition.workspace.template-error-help')}</p>
                    ) : (
                      <RowList
                        rows={
                          templates.length > 0
                            ? buildTemplateRows(templates, t)
                            : [
                                {
                                  title: t('entities.definition.workspace.template-empty-title'),
                                  copy: t('entities.definition.workspace.template-empty-copy'),
                                  meta: emptyValue
                                }
                              ]
                        }
                      />
                    )}
                  </section>

                  <section data-entity-definition-batch-panel="true" className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.batch-title')}</div>
                        <p className="mt-1 text-[12px] leading-5 text-[#98a2b3]">{t('entities.definition.workspace.batch-copy')}</p>
                      </div>
                      <span className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1 text-[11px] font-semibold text-[#d8e4ff]">
                        {t('entities.definition.workspace.batch-expand')}
                      </span>
                    </div>
                  </section>

                  {definitionErrorState ? null : (
                    <>
                      {previewRows.length > 0 ? (
                        <section className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                          <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.current-definition')}</div>
                          <div className="grid gap-2">
                            {queueGroups.map(group => (
                              <WorkbenchInsetPanel
                                as="button"
                                key={group.key}
                                type="button"
                                density="flush"
                                tone={previewScope === group.scope ? 'raised' : 'panel'}
                                className={cn('rounded-[3px] text-left', previewScope === group.scope && 'border-[#4e74f8]')}
                                onClick={() => setPreviewScope(group.scope)}
                              >
                                <div className="text-[10px] tracking-[0.18em] text-[#8d95a5]">{group.rows.length}</div>
                                <div className="mt-1 text-[12px] font-semibold text-[#f5f7fb]">{group.title}</div>
                              </WorkbenchInsetPanel>
                            ))}
                          </div>
                          <RowList
                            rows={visiblePreviewRows.map(row => ({
                              title: row.title,
                              copy: row.subtitle ?? row.validationLabel,
                              meta: row.kindLabel
                            }))}
                          />
                          {renderAttributionPreview()}
                        </section>
                      ) : null}

                      <section data-entity-definition-activity-panel="true" className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                        <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.activity-title')}</div>
                        <RowList
                          rows={
                            activities.length > 0
                              ? buildActivityRows(activities, t)
                              : [
                                  {
                                    title: t('entities.definition.workspace.activity-empty-title'),
                                    copy: t('entities.definition.workspace.activity-empty-copy'),
                                    meta: emptyValue
                                  }
                                ]
                          }
                        />
                      </section>
                    </>
                  )}

                  <section data-entity-definition-entry-panel="true" className="grid gap-2 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-3">
                    <div className="text-[12px] font-semibold text-[#f5f7fb]">{t('entities.definition.workspace.entry-title')}</div>
                    <div className="grid gap-2 text-[12px] text-[#dbe4f0]">
                      <Link className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2" href={entityId != null ? `/entities/${entityId}` : '/entities'}>
                        {t('entities.definition.workspace.entry-view-entity')}
                      </Link>
                      <Link className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2" href="/entities">
                        {t('entities.definition.workspace.entry-back-to-form')}
                      </Link>
                    </div>
                  </section>
                </section>
              </div>
            </section>
          }
        />
      </div>
    );
  }

  return null;
}

function localizeEntityDefinitionMessage(
  message: string,
  t: (key: string, params?: Record<string, string>) => string
) {
  const normalized = message.trim();
  if (normalized === '') {
    return t('entities.definition.message.process-failed');
  }
  switch (normalized) {
    case 'Entity not exist.':
    case 'Entity not exist':
      return t('entities.definition.message.entity-not-exist');
    case 'Failed to load entity definition.':
    case 'Definition parsing failed.':
      return t('entities.definition.message.process-failed');
    case 'Entity definition save failed.':
      return t('entities.definition.message.update-failed');
    default:
      return t('entities.definition.message.backend-fallback', { message: normalized });
  }
}

function resolveImportPlaceholder(
  t: (key: string) => string,
  format: EntityDefinitionFormat
) {
  switch (format) {
    case 'json':
      return t('entity.definition.import.placeholder.json');
    case 'curl':
      return t('entity.definition.import.placeholder.curl');
    case 'yaml':
    default:
      return t('entity.definition.import.placeholder.yaml');
  }
}

export function getImportStarterDraft(format: EntityDefinitionFormat = 'yaml') {
  if (format === 'json') {
    return `[
  {
    "apiVersion": "hertzbeat/v1",
    "kind": "system",
    "metadata": {
      "name": "commerce-platform",
      "namespace": "commerce",
      "owner": "platform-team"
    },
    "spec": {
      "source": "manual",
      "environment": "prod",
      "lifecycle": "production",
      "tier": "tier1"
    }
  },
  {
    "apiVersion": "hertzbeat/v1",
    "kind": "service",
    "metadata": {
      "name": "checkout",
      "namespace": "commerce",
      "owner": "platform-team"
    },
    "spec": {
      "source": "manual",
      "environment": "prod",
      "tier": "tier1",
      "system": "commerce-platform",
      "dependsOn": [
        { "datastore": "commerce/orders" }
      ]
    }
  }
]`;
  }

  if (format === 'curl') {
    return `curl -X POST http://localhost:1157/api/entities/import \\
  -H 'Content-Type: application/json' \\
  -d '{"format":"yaml","content":"apiVersion: hertzbeat/v1\\nkind: service\\nmetadata:\\n  name: checkout\\n  namespace: commerce\\n  owner: platform-team\\nspec:\\n  source: manual\\n  environment: prod\\n  system: commerce-platform"}'`;
  }

  return `apiVersion: hertzbeat/v1
kind: system
metadata:
  name: commerce-platform
  namespace: commerce
  owner: platform-team
spec:
  source: manual
  environment: prod
  lifecycle: production
  tier: tier1
---
apiVersion: hertzbeat/v1
kind: service
metadata:
  name: checkout
  namespace: commerce
  owner: platform-team
spec:
  source: manual
  environment: prod
  tier: tier1
  system: commerce-platform
  dependsOn:
    - datastore:commerce/orders`;
}

function matchesPreviewScope(row: ImportPreviewRow, scope: Exclude<PreviewScope, 'all'>) {
  switch (scope) {
    case 'ready':
      return row.gaps.length === 0;
    case 'attention':
      return row.gaps.length > 0;
    case 'telemetry':
      return row.gapKeys.includes('telemetry');
  }
}
