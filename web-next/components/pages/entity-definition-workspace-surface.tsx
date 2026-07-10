'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CircleHelp, FileText, Network } from 'lucide-react';
import { HzConfirmDialog } from '@hertzbeat/ui';
import { useI18n } from '@/components/providers/i18n-provider';
import { HzCodeEditor, type HzCodeEditorLanguage } from '@/components/ui/hz-code-editor';
import { WorkbenchInsetPanel } from '@/components/workbench/primitives';
import { ToolbarNativeSelect } from '@/components/workbench/toolbar';
import { RowList } from '@/components/workbench/workbench-page';
import { Button } from '@/components/ui/button';
import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/lib/api-client';
import { parseEntityDefinition, updateDefinitionPayload } from '@/lib/entity-definition/controller';
import { createDefinitionBundle, parseDefinitionBundle } from '@/lib/entity-import/controller';
import {
  buildActivityRows,
  buildImportPreviewViewport,
  buildImportPreviewRows,
  buildImportQueueGroups,
  buildTemplateRows,
  formatImportPreviewRowCopy,
  type ImportQueueGroup,
  type ImportPreviewRow
} from '@/lib/entity-import/view-model';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { appendSignalRouteContext, type SignalRouteContext } from '@/lib/signal-route-context';
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
  initialMessageTone?: 'success' | 'error';
  routeContext?: SignalRouteContext;
};

type PreviewScope = 'all' | 'ready' | 'attention' | 'telemetry';

type EntityDefinitionWorkspaceMode = EntityDefinitionWorkspaceSurfaceProps['mode'];
type EntityDefinitionTranslator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type ImportedEntityResult = {
  id: number;
  title: string;
  subtitle?: string;
};

const ENTITY_IMPORT_RESULT_LINK_LIMIT = 100;

function resolveDefinitionModeQueueGroups(
  groups: ImportQueueGroup[],
  mode: EntityDefinitionWorkspaceMode,
  t: EntityDefinitionTranslator
) {
  if (mode !== 'definition') {
    return groups;
  }

  return groups.map(group => {
    if (group.key === 'ready') {
      return {
        ...group,
        title: t('entity.definition.update.queue.ready.title'),
        summary: t('entity.definition.update.queue.ready.copy'),
        actionLabel: t('entity.definition.update.queue.ready.action')
      };
    }
    if (group.key === 'attention') {
      return {
        ...group,
        title: t('entity.definition.update.queue.attention.title'),
        summary: t('entity.definition.update.queue.attention.copy'),
        actionLabel: t('entity.definition.update.queue.attention.action')
      };
    }
    if (group.key === 'telemetry') {
      return {
        ...group,
        title: t('entity.definition.update.queue.telemetry.title'),
        summary: t('entity.definition.update.queue.telemetry.copy'),
        actionLabel: t('entity.definition.update.queue.telemetry.action')
      };
    }
    return group;
  });
}

function formatDefinitionPreviewRowCopy(
  row: ImportPreviewRow,
  mode: EntityDefinitionWorkspaceMode,
  t: EntityDefinitionTranslator
) {
  if (mode !== 'definition') {
    return formatImportPreviewRowCopy(row, t);
  }

  const gapSummary = row.gaps.length > 0
    ? t('entity.definition.update.validation.needs-attention-fields', { fields: row.gaps.join(' · ') })
    : t('entity.definition.update.validation.ready');
  return row.subtitle ? `${row.subtitle} · ${gapSummary}` : gapSummary;
}

function EntityDefinitionActionHelp({
  id,
  label,
  children
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      data-entity-definition-action-help={id}
      data-entity-definition-action-help-style="icon-after-action"
      className="group relative inline-flex flex-none items-center"
    >
      <button
        type="button"
        aria-label={label}
        data-entity-definition-action-help-trigger="hertzbeat-ui-action-help"
        data-entity-definition-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-entity-definition-action-help-icon="lucide-circle-help" />
      </button>
      <span
        role="tooltip"
        data-entity-definition-action-help-tooltip={id}
        className="pointer-events-none absolute right-0 top-6 z-20 hidden w-[260px] rounded-[4px] border border-[#2b3039] bg-[#11151c] px-3 py-2 text-left text-[11px] leading-5 text-[#dbe4f0] shadow-[0_16px_42px_rgba(0,0,0,0.45)] group-hover:block group-focus-within:block"
      >
        {children}
      </span>
    </span>
  );
}

function EntityDefinitionActionWithHelp({
  id,
  helpLabel,
  help,
  children
}: {
  id: string;
  helpLabel: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" data-entity-definition-action-help-item={id}>
      {children}
      <EntityDefinitionActionHelp id={id} label={helpLabel}>
        {help}
      </EntityDefinitionActionHelp>
    </span>
  );
}

function EntityDefinitionDuplicateRecoveryLink({
  href,
  label
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return null;
  }
  return (
    <Link
      href={href}
      data-entity-definition-duplicate-recovery-link="true"
      className="inline-flex w-fit items-center rounded-[3px] border border-[#31405c] bg-[#182238] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8e4ff] hover:border-[#4e74f8] hover:bg-[#202a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
    >
      {label}
    </Link>
  );
}

function EntityDefinitionFormatField({
  label,
  helpLabel,
  help,
  children,
  className
}: {
  label: string;
  helpLabel: string;
  help: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-[170px] flex-1 flex-col gap-1', className)} data-entity-definition-action-help-item="format">
      <div className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
        <span>{label}</span>
        <EntityDefinitionActionHelp id="format" label={helpLabel}>
          {help}
        </EntityDefinitionActionHelp>
      </div>
      {children}
    </div>
  );
}

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

function buildEntityDefinitionContextHref(path: string, routeContext?: SignalRouteContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, routeContext ?? {});
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function EntityDefinitionWorkspaceFrame({
  kicker,
  title,
  subtitle,
  actions,
  children
}: {
  kicker: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"
      data-entity-definition-header="hertzbeat-ui-compact-header"
      data-entity-definition-header-nesting-contract="flat-page-introduction"
      className="grid min-w-0 gap-4"
    >
      <header className="flex flex-col gap-3 p-0 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d95a5]">{kicker}</div>
          <h1 className="mt-2 text-[24px] font-semibold leading-8 text-[#f5f7fb]">{title}</h1>
          <p className="mt-2 max-w-4xl text-[12px] leading-5 text-[#98a2b3]">{subtitle}</p>
        </div>
        {actions ? (
          <div
            data-entity-definition-frame-actions="first-viewport-safe-exits"
            className="flex shrink-0 flex-wrap items-center gap-2"
          >
            {actions}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function buildEntityImportResultHref(entityId: string | number, routeContext?: SignalRouteContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, routeContext ?? {});
  if (!params.has('returnTo')) {
    params.set('returnTo', '/entities/import');
  }
  params.set('created', '1');
  if (!params.has('source')) {
    params.set('source', 'entity-import');
  }
  return `/entities/${encodeURIComponent(String(entityId))}?${params.toString()}`;
}

function resolveEntityDefinitionReturnHref(routeContext?: SignalRouteContext) {
  const normalized = routeContext?.returnTo?.trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return buildEntityDefinitionContextHref('/entities', routeContext);
  }

  try {
    const parsed = new URL(normalized, 'https://hertzbeat.local');
    if (parsed.origin !== 'https://hertzbeat.local') {
      return buildEntityDefinitionContextHref('/entities', routeContext);
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return buildEntityDefinitionContextHref('/entities', routeContext);
  }
}

export function resolveEntityDefinitionReturnDestination(href: string, entityId?: string) {
  try {
    const parsed = new URL(href, 'https://hertzbeat.local');
    if (parsed.pathname === '/entities') {
      return 'list';
    }
    if (entityId && parsed.pathname === `/entities/${encodeURIComponent(entityId)}`) {
      return 'entity';
    }
  } catch {
    return 'source';
  }
  return 'source';
}

function resolveEntityDefinitionReturnCopyKeys(destination: ReturnType<typeof resolveEntityDefinitionReturnDestination>) {
  if (destination === 'entity') {
    return {
      label: 'entities.definition.workspace.entry-back-to-entity',
      helpLabel: 'entities.definition.workspace.entry-back-to-entity.help-label',
      help: 'entities.definition.workspace.entry-back-to-entity.help'
    };
  }
  if (destination === 'list') {
    return {
      label: 'entities.definition.workspace.entry-back-to-form',
      helpLabel: 'entities.definition.workspace.entry-back-to-form.help-label',
      help: 'entities.definition.workspace.entry-back-to-form.help'
    };
  }
  return {
    label: 'entities.definition.workspace.entry-back-to-source',
    helpLabel: 'entities.definition.workspace.entry-back-to-source.help-label',
    help: 'entities.definition.workspace.entry-back-to-source.help'
  };
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
    return 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]';
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
  initialMessage = null,
  initialMessageTone = 'error',
  routeContext
}: EntityDefinitionWorkspaceSurfaceProps) {
  const { t } = useI18n();
  const emptyValue = t('common.none');
  const initialDraftContent = mode === 'import' && initialContent.trim() === '' ? getImportStarterDraft(initialFormat) : initialContent;
  const [content, setContent] = useState(initialDraftContent);
  const [committedContent, setCommittedContent] = useState(initialDraftContent);
  const [format, setFormat] = useState<EntityDefinitionFormat>(initialFormat);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(initialMessage ? initialMessageTone : null);
  const [duplicateRecoveryHref, setDuplicateRecoveryHref] = useState<string | null>(
    resolveEntityDefinitionDuplicateRecoveryHref(initialMessage, initialMessage ? 'error' : null)
  );
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importedEntityResults, setImportedEntityResults] = useState<ImportedEntityResult[]>([]);
  const [previewScope, setPreviewScope] = useState<PreviewScope>('all');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [definitionReloadVersion, setDefinitionReloadVersion] = useState(0);
  const [definitionUpdateBlocked, setDefinitionUpdateBlocked] = useState(mode === 'definition' && initialMessage != null);
  const [pendingDefinitionNavigationHref, setPendingDefinitionNavigationHref] = useState<string | null>(null);
  const [clearDraftDialogOpen, setClearDraftDialogOpen] = useState(false);
  const importResultsRef = useRef<HTMLElement>(null);

  const queueGroups = resolveDefinitionModeQueueGroups(buildImportQueueGroups(previewRows, t), mode, t);
  const scopedPreviewRows = previewScope === 'all' ? previewRows : previewRows.filter(row => matchesPreviewScope(row, previewScope));
  const previewViewport = buildImportPreviewViewport(scopedPreviewRows);
  const visiblePreviewRows = previewViewport.visibleRows;
  const previewOverflowCount = previewViewport.overflowCount;
  const visibleImportedEntityResults = importedEntityResults.slice(0, ENTITY_IMPORT_RESULT_LINK_LIMIT);
  const importedEntityResultOverflowCount = Math.max(0, importedEntityResults.length - visibleImportedEntityResults.length);
  const viewEntityHref = buildEntityDefinitionContextHref(entityId != null ? `/entities/${entityId}` : '/entities', routeContext);
  const backToFormHref = resolveEntityDefinitionReturnHref(routeContext);
  const backToFormCopyKeys = resolveEntityDefinitionReturnCopyKeys(
    resolveEntityDefinitionReturnDestination(backToFormHref, entityId)
  );

  async function refreshDefinitionDraft(nextFormat: EntityDefinitionFormat) {
    if (mode !== 'definition' || entityId == null) {
      return;
    }
    try {
      const nextDefinition = await apiMessageGet<string>(`/entities/${entityId}/definition?format=${nextFormat}`);
      setContent(nextDefinition);
      setCommittedContent(nextDefinition);
      setDefinitionUpdateBlocked(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? localizeEntityDefinitionMessage(error.message, t)
          : t('entities.definition.message.load-failed')
      );
      setMessageTone('error');
      setDefinitionUpdateBlocked(true);
    }
  }

  function clearPreviewState() {
    setPreviewRows([]);
    setImportedEntityResults([]);
    setPreviewScope('all');
  }

  function resetImportPreviewAfterSubmitError() {
    setPreviewRows([]);
    setImportedEntityResults([]);
    setPreviewScope('all');
  }

  function resetStatus() {
    setMessage(null);
    setMessageTone(null);
    setDuplicateRecoveryHref(null);
  }

  function revealImportResults() {
    if (mode !== 'import' || typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      importResultsRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      window.scrollTo({ top: window.scrollY, left: 0 });
      importResultsRef.current?.focus({ preventScroll: true });
    });
  }

  async function previewDefinitions() {
    const nextContent = content.trim();
    if (nextContent === '') {
      clearPreviewState();
      setDuplicateRecoveryHref(null);
      setMessage(t('entity.definition.import.empty-preview'));
      setMessageTone('error');
      return;
    }

    setParsing(true);
    resetStatus();
    clearPreviewState();

    try {
      const parsedDefinitions =
        mode === 'definition' && entityId != null
          ? [await parseEntityDefinition(apiMessagePost, entityId, nextContent, format)]
          : await parseDefinitionBundle(apiMessagePost, nextContent, format);
      const rows = buildImportPreviewRows(parsedDefinitions, t);
      if (rows.length === 0) {
        clearPreviewState();
        setMessage(t('entity.definition.import.no-definitions'));
        setMessageTone('error');
        revealImportResults();
        return;
      }
      setPreviewRows(rows);
      setPreviewScope('all');
      setMessage(
        rows.length === 1
          ? t('entity.definition.import.activity.preview-one')
          : t('entity.definition.import.activity.preview-many', { count: rows.length })
      );
      setMessageTone('success');
      revealImportResults();
    } catch (error) {
      setDuplicateRecoveryHref(
        error instanceof Error
          ? resolveEntityDefinitionDuplicateRecoveryHref(error.message, 'error')
          : null
      );
      setMessage(localizeEntityImportParseFailure(error, t));
      setMessageTone('error');
    } finally {
      setParsing(false);
    }
  }

  async function submitDefinitions() {
    const nextContent = content.trim();
    if (nextContent === '') {
      setDuplicateRecoveryHref(null);
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
      if (definitionUpdateBlocked) {
        setMessage(t('entities.definition.message.entity-not-exist'));
        setMessageTone('error');
        return;
      }

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
        setContent(nextContent);
        setCommittedContent(nextContent);
        setMessage(t('entities.definition.message.updated'));
        setMessageTone('success');
      } catch (error) {
        setDuplicateRecoveryHref(
          error instanceof Error
            ? resolveEntityDefinitionDuplicateRecoveryHref(error.message, 'error')
            : null
        );
        setMessage(error instanceof Error ? localizeEntityDefinitionMessage(error.message, t) : t('entities.definition.message.update-failed'));
        setMessageTone('error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (previewRows.some(row => row.gaps.length > 0)) {
      setPreviewScope('attention');
      setImportedEntityResults([]);
      setMessage(t('entity.definition.import.blocked'));
      setMessageTone('error');
      revealImportResults();
      return;
    }

    setSubmitting(true);
    resetStatus();
    setImportedEntityResults([]);

    try {
      const entityIds = await createDefinitionBundle(apiMessagePost, nextContent, format);
      setDuplicateRecoveryHref(null);
      setImportedEntityResults(entityIds.map((id, index) => ({
        id,
        title: previewRows[index]?.title ?? t('entity.definition.import.result-unknown-entity'),
        subtitle: previewRows[index]?.subtitle
      })));
      setMessage(
        entityIds.length > 1
          ? t('entity.definition.import.success-bundle', { count: entityIds.length })
          : t('entity.definition.import.success-single')
      );
      setMessageTone('success');
      revealImportResults();
    } catch (error) {
      resetImportPreviewAfterSubmitError();
      setDuplicateRecoveryHref(
        error instanceof Error
          ? resolveEntityDefinitionDuplicateRecoveryHref(error.message, 'error')
          : null
      );
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

  const hasDefinitionUnsavedChanges = mode === 'definition' && !definitionUpdateBlocked && content !== committedContent;

  function requestDefinitionNavigation(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!hasDefinitionUnsavedChanges) {
      return;
    }

    event.preventDefault();
    setPendingDefinitionNavigationHref(href);
  }

  function confirmDefinitionNavigation() {
    const href = pendingDefinitionNavigationHref;
    setPendingDefinitionNavigationHref(null);
    if (!href || typeof window === 'undefined') {
      return;
    }
    window.location.assign(href);
  }

  function confirmClearDraft() {
    setClearDraftDialogOpen(false);
    setContent('');
    clearPreviewState();
    setDuplicateRecoveryHref(null);
    setMessage(t('entity.definition.action.clear-draft.cleared'));
    setMessageTone('success');
  }

  const clearDraftCopy = t('entity.definition.action.clear-draft');
  const previewDefinitionsCopy = t('entity.definition.action.preview');
  const submitDefinitionsCopy =
    mode === 'definition'
      ? t('entity.definition.action.save')
      : t('entity.definition.action.import');
  const actionRowHelpCopy =
    mode === 'definition'
      ? t('entity.definition.action.row.definition-help')
      : t('entity.definition.action.row.import-help');
  const importRequiresPreview = mode === 'import' && previewRows.length === 0;
  const importBlockedByPreviewGaps = mode === 'import' && previewRows.some(row => row.gaps.length > 0);
  const importSubmitBlocked = importRequiresPreview || importBlockedByPreviewGaps;
  const importSubmitBlockedHintId = importRequiresPreview
    ? 'entity-definition-import-preview-required'
    : importBlockedByPreviewGaps
      ? 'entity-definition-import-attention-required'
      : undefined;

  function renderActionControls() {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => setClearDraftDialogOpen(true)}
          disabled={content.trim() === '' && previewRows.length === 0}
          data-entity-definition-command-action="clear-draft"
          data-entity-import-command-action={mode === 'import' ? 'clear-draft' : undefined}
          data-entity-definition-clear-draft-trigger="hertzbeat-ui-confirm-dialog"
        >
          {clearDraftCopy}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => void previewDefinitions()}
          disabled={parsing || submitting}
          data-entity-definition-command-action="preview"
          data-entity-import-command-action={mode === 'import' ? 'preview' : undefined}
        >
          {parsing ? t('common.loading') : previewDefinitionsCopy}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => void submitDefinitions()}
          disabled={parsing || submitting || definitionUpdateBlocked || importSubmitBlocked}
          aria-describedby={importSubmitBlockedHintId}
          data-entity-definition-command-action={mode === 'definition' ? 'save' : 'import'}
          data-entity-import-command-action={mode === 'import' ? 'import' : undefined}
          data-entity-definition-save-disabled-reason={
            definitionUpdateBlocked
              ? 'entity-not-exist'
              : importRequiresPreview
                ? 'preview-required'
                : importBlockedByPreviewGaps
                  ? 'attention-required'
                  : undefined
          }
        >
          {submitting ? t('common.saving') : submitDefinitionsCopy}
        </Button>
        <span data-entity-definition-action-row-help-contract="single-header-help" className="inline-flex h-8 items-center">
          <EntityDefinitionActionHelp id="action-row" label={t('entity.definition.action.row.help-label')}>
            {actionRowHelpCopy}
          </EntityDefinitionActionHelp>
        </span>
      </>
    );
  }

  function renderClearDraftDialog() {
    return (
      <div
        data-entity-definition-clear-draft="hertzbeat-ui-confirm-dialog"
        data-entity-definition-clear-draft-state={clearDraftDialogOpen ? 'open' : 'closed'}
      >
        <HzConfirmDialog
          open={clearDraftDialogOpen}
          tone="warning"
          title={t('entity.definition.action.clear-draft.confirm-title')}
          kicker={t('entity.definition.action.clear-draft.confirm-kicker')}
          cancelLabel={t('entity.definition.action.clear-draft.keep-editing')}
          confirmLabel={t('entity.definition.action.clear-draft.confirm')}
          onClose={() => setClearDraftDialogOpen(false)}
          onConfirm={confirmClearDraft}
          data-entity-definition-clear-draft-dialog="hertzbeat-ui-confirm-dialog"
          cancelButtonProps={
            {
              type: 'button',
              'data-entity-definition-clear-draft-keep-editing': 'true'
            } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
          }
          confirmButtonProps={
            {
              type: 'button',
              'data-entity-definition-clear-draft-confirm': 'true'
            } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
          }
        >
          <p data-entity-definition-clear-draft-copy="true">
            {t('entity.definition.action.clear-draft.confirm-copy')}
          </p>
        </HzConfirmDialog>
      </div>
    );
  }

  function renderAttributionPreview() {
    if (visiblePreviewRows.length === 0) {
      return null;
    }

    return (
      <div
        data-entity-import-attribution-preview="definition-attribution-check"
        data-entity-import-attribution-preview-scroll="bounded-large-batch"
        className="grid max-h-[520px] gap-2 overflow-y-auto rounded-[4px] border border-[#2b3039] bg-[#101217] p-3 pr-2"
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
        className="min-h-[calc(100vh-64px)] min-w-0 overflow-x-hidden bg-[#0b0c0e] px-6 pb-6 pt-4 text-[#dbe4f0]"
      >
        <EntityDefinitionWorkspaceFrame
          kicker={t('entities.definition.workspace.kicker')}
          title={t('entities.import.workspace.title')}
          subtitle={importSubtitle}
        >
            <section
              data-entity-definition-editor-shell="otlp-hertzbeat-ui-import-workbench"
              data-entity-definition-shell-spacing="hertzbeat-ui-tight"
              data-entity-definition-shell-height="hertzbeat-ui-content"
              className="rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
            >
              <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <section data-entity-definition-editor-column="true" className="grid min-w-0 auto-rows-min content-start gap-3">
                  <div
                    data-entity-definition-import-action-row="hertzbeat-ui-inline-actions"
                    data-entity-definition-import-action-row-nesting-contract="flat-inside-import-workbench"
                    data-entity-definition-import-action-row-responsive="format-first-mobile"
                    className="grid gap-3 border-0 bg-transparent p-0 sm:flex sm:flex-wrap sm:items-end sm:justify-between"
                  >
                    <EntityDefinitionFormatField
                      label={t('entity.definition.format.label')}
                      helpLabel={t('entity.definition.format.help-label')}
                      help={importFormatHelp}
                      className="w-full min-w-0 sm:w-[144px] sm:min-w-[144px] sm:flex-none"
                    >
                      <ToolbarNativeSelect
                        data-entity-definition-format-select="hertzbeat-ui-compact-select"
                        data-entity-definition-command-action="change-format"
                        data-entity-import-command-action="change-format"
                        value={format}
                        onChange={event => void handleFormatChange(event.target.value as EntityDefinitionFormat)}
                      >
                        <option value="yaml">{t('entity.definition.format.option.yaml')}</option>
                        <option value="json">{t('entity.definition.format.option.json')}</option>
                        <option value="curl">{t('entity.definition.format.option.curl')}</option>
                      </ToolbarNativeSelect>
                    </EntityDefinitionFormatField>
                    <div
                      data-entity-definition-action-group="wrap-within-row"
                      data-entity-definition-action-group-responsive="full-width-buttons-mobile"
                      className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
                    >
                      {renderActionControls()}
                    </div>
                  </div>

                  <p className="text-[12px] leading-5 text-[#98a2b3]">
                    {importFormatHelp}
                  </p>
                  {importRequiresPreview ? (
                    <p
                      id="entity-definition-import-preview-required"
                      data-entity-definition-import-preview-required="true"
                      className="text-[11px] leading-5 text-[#a8b0bf]"
                    >
                      {t('entity.definition.import.preview-required-hint')}
                    </p>
                  ) : null}
                  {importBlockedByPreviewGaps ? (
                    <p
                      id="entity-definition-import-attention-required"
                      data-entity-definition-import-attention-required="true"
                      className="text-[11px] leading-5 text-[#f1c96b]"
                    >
                      {t('entity.definition.import.attention-required-hint')}
                    </p>
                  ) : null}

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
                      role={messageTone === 'error' ? 'alert' : 'status'}
                      data-entity-definition-inline-feedback={messageTone === 'error' ? 'error' : 'success'}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-[3px] border px-3 py-2 text-xs',
                        messageTone === 'success'
                          ? 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]'
                          : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                      )}
                    >
                      <span>{message}</span>
                      <EntityDefinitionDuplicateRecoveryLink
                        href={duplicateRecoveryHref}
                        label={t('entities.definition.message.duplicate-recovery.open-existing')}
                      />
                    </div>
                  ) : null}
                </section>

                <section
                  ref={importResultsRef}
                  data-entity-definition-context-panel="hertzbeat-ui-context-panel"
                  data-entity-definition-context-density="minimal-import"
                  data-entity-definition-context-panel-nesting-contract="flat-inside-import-workbench"
                  data-entity-definition-results-focus-target="import-preview"
                  tabIndex={-1}
                  className="grid min-w-0 gap-3 self-start border-0 bg-transparent p-0"
                >
                  <div data-entity-definition-metric-strip="hertzbeat-ui-inline-counts" className="grid gap-2">
                    {metricCards.map(item => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          data-entity-definition-metric-item="flat-import-count"
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border-0 bg-transparent px-0 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#dbe4f0]">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[#98a2b3]" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="text-[16px] font-semibold tabular-nums text-[#f5f7fb]">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {importedEntityResults.length > 0 ? (
                    <section
                      data-entity-import-result-links="created-entities"
                      data-entity-import-result-links-total={importedEntityResults.length}
                      data-entity-import-result-links-rendered={visibleImportedEntityResults.length}
                      data-entity-import-result-links-limit={ENTITY_IMPORT_RESULT_LINK_LIMIT}
                      data-entity-import-result-links-overflow={importedEntityResultOverflowCount > 0 ? 'bounded-created-links' : 'none'}
                      className="grid gap-2 rounded-[4px] border border-[#2f4a3b] bg-[#101217] p-3"
                    >
                      <div className="text-[12px] font-semibold text-[#dbe4f0]">{t('entity.definition.import.result-title')}</div>
                      <div
                        data-entity-import-result-links-scroll="bounded-large-batch"
                        className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 text-[12px] text-[#dbe4f0]"
                      >
                        {visibleImportedEntityResults.map(createdEntity => (
                          <Link
                            key={createdEntity.id}
                            className="grid min-w-0 gap-0.5 rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2.5 py-2 text-[#dbe4f0] hover:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                            href={buildEntityImportResultHref(createdEntity.id, routeContext)}
                            data-entity-import-command-action="open-created-entity"
                          >
                            <span className="truncate text-[12px] font-semibold">{createdEntity.title}</span>
                            <span className="truncate text-[11px] text-[#9fd8b5]">
                              {t('entity.definition.import.result-view-entity', { id: String(createdEntity.id) })}
                              {createdEntity.subtitle ? ` · ${createdEntity.subtitle}` : ''}
                            </span>
                          </Link>
                        ))}
                        {importedEntityResultOverflowCount > 0 ? (
                          <p
                            data-entity-import-result-links-overflow-message="bounded-created-links"
                            className="rounded-[3px] border border-[#2f4a3b] bg-[#101217] px-2.5 py-2 text-[11px] leading-5 text-[#9fd8b5]"
                          >
                            {t('entity.definition.import.result-overflow', {
                              count: importedEntityResultOverflowCount,
                              limit: visibleImportedEntityResults.length
                            })}
                          </p>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

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
                            aria-label={`${group.actionLabel}: ${group.summary}`}
                            onClick={() => setPreviewScope(group.scope)}
                            data-entity-import-command-action={`filter-preview-${group.scope}`}
                          >
                            <div className="text-[10px] tracking-[0.18em] text-[#8d95a5]">{group.rows.length}</div>
                            <div className="mt-1 text-[12px] font-semibold text-[#f5f7fb]">{group.title}</div>
                            <p className="mt-1 text-[11px] leading-4 text-[#98a2b3]">{group.summary}</p>
                            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b8c4d8]">
                              {group.actionLabel}
                            </div>
                          </WorkbenchInsetPanel>
                        ))}
                      </div>
                      {previewOverflowCount > 0 ? (
                        <p
                          data-entity-import-preview-overflow="bounded-visible-row-limit"
                          data-entity-import-preview-overflow-placement="above-scroll"
                          className="rounded-[3px] border border-[#31405c] bg-[#101217] px-2.5 py-2 text-[11px] leading-5 text-[#b8c4d8]"
                        >
                          {t('entity.definition.import.preview-overflow', {
                            count: previewOverflowCount,
                            limit: previewViewport.visibleRows.length
                          })}
                        </p>
                      ) : null}
                      <div
                        data-entity-import-preview-rows-scroll="bounded-large-batch"
                        className="max-h-[360px] overflow-y-auto pr-1"
                      >
                        <RowList
                            rows={visiblePreviewRows.map(row => ({
                              title: row.title,
                              copy: formatImportPreviewRowCopy(row, t),
                              meta: row.kindLabel
                            }))}
                        />
                      </div>
                      {renderAttributionPreview()}
                    </section>
                  ) : null}
                </section>
              </div>
            </section>
        </EntityDefinitionWorkspaceFrame>
        {renderClearDraftDialog()}
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
    const visibleMessage = resolveVisibleEntityDefinitionMessage(message, messageTone, t);
    const metricCards = [
      { label: t('entities.definition.workspace.metric.ready-update'), value: String(readyCount), icon: FileText },
      { label: t('entities.definition.workspace.metric.review-update'), value: String(attentionCount), icon: AlertTriangle },
      { label: t('entities.definition.workspace.metric.telemetry-gaps-update'), value: String(telemetryGapCount), icon: Network }
    ];
    const definitionHeaderActions = (
      <div
        data-entity-definition-first-viewport-entry-actions="true"
        className="flex flex-wrap items-center gap-2 text-[12px]"
      >
        <EntityDefinitionActionWithHelp
          id="entry-view-entity-top"
          helpLabel={t('entities.definition.workspace.entry-view-entity.help-label')}
          help={t('entities.definition.workspace.entry-view-entity.help')}
        >
          <Link
            className="min-w-0 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2 font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#182238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
            href={viewEntityHref}
            data-entity-definition-first-viewport-action="view-entity"
            data-entity-definition-unsaved-navigation-guard={hasDefinitionUnsavedChanges ? 'dirty' : 'clean'}
            data-entity-definition-unsaved-navigation-target={viewEntityHref}
            onClick={event => requestDefinitionNavigation(event, viewEntityHref)}
          >
            {t('entities.definition.workspace.entry-view-entity')}
          </Link>
        </EntityDefinitionActionWithHelp>
        <EntityDefinitionActionWithHelp
          id="entry-back-to-form-top"
          helpLabel={t(backToFormCopyKeys.helpLabel)}
          help={t(backToFormCopyKeys.help)}
        >
          <Link
            className="min-w-0 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2 font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#182238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
            href={backToFormHref}
            data-entity-definition-first-viewport-action="return-source"
            data-entity-definition-unsaved-navigation-guard={hasDefinitionUnsavedChanges ? 'dirty' : 'clean'}
            data-entity-definition-unsaved-navigation-target={backToFormHref}
            onClick={event => requestDefinitionNavigation(event, backToFormHref)}
          >
            {t(backToFormCopyKeys.label)}
          </Link>
        </EntityDefinitionActionWithHelp>
      </div>
    );

    return (
      <div
        data-entity-definition-workspace={mode}
        data-entity-definition-style-baseline="hertzbeat-ui-matte"
        data-entity-definition-visual-contract={visual.contract}
        data-entity-definition-layout="full-width-workbench"
        data-definition-reload-version={definitionReloadVersion}
        className="-mx-4 -mb-3 -mt-4 bg-[#0b0c0e] text-[#dbe4f0] sm:-mx-6"
      >
        <EntityDefinitionWorkspaceFrame
          kicker={t('entities.definition.workspace.kicker')}
          title={t('entities.definition.workspace.title')}
          subtitle={definitionSubtitle}
          actions={definitionHeaderActions}
        >
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
                    <EntityDefinitionFormatField
                      label={t('entity.definition.format.label')}
                      helpLabel={t('entity.definition.format.help-label')}
                      help={definitionFormatHelp}
                      className="w-[144px] min-w-[144px] flex-none"
                    >
                      <ToolbarNativeSelect
                        data-entity-definition-format-select="hertzbeat-ui-compact-select"
                        value={format}
                        onChange={event => void handleFormatChange(event.target.value as EntityDefinitionFormat)}
                      >
                        <option value="yaml">{t('entity.definition.format.option.yaml')}</option>
                        <option value="json">{t('entity.definition.format.option.json')}</option>
                        <option value="curl">{t('entity.definition.format.option.curl')}</option>
                      </ToolbarNativeSelect>
                    </EntityDefinitionFormatField>
                    <div
                      data-entity-definition-action-group="wrap-within-row"
                      className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 sm:justify-end"
                    >
                      {renderActionControls()}
                    </div>
                  </div>

                  <p className="text-[12px] leading-5 text-[#98a2b3]">
                    {definitionSubtitle} {definitionFormatHelp}
                  </p>

                  {visibleMessage ? (
                    <div
                      role={messageTone === 'error' ? 'alert' : 'status'}
                      data-entity-definition-inline-feedback={messageTone === 'error' ? 'error' : 'success'}
                      data-entity-definition-load-error={messageTone === 'error' ? 'hertzbeat-ui-inline-first-viewport' : undefined}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-[3px] border px-3 py-2 text-xs leading-5',
                        messageTone === 'success'
                          ? 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]'
                          : 'border-rose-300/25 bg-rose-300/10 text-rose-100'
                      )}
                    >
                      <span>{visibleMessage}</span>
                      <EntityDefinitionDuplicateRecoveryLink
                        href={duplicateRecoveryHref}
                        label={t('entities.definition.message.duplicate-recovery.open-existing')}
                      />
                    </div>
                  ) : null}

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
                                aria-label={`${group.actionLabel}: ${group.summary}`}
                                onClick={() => setPreviewScope(group.scope)}
                              >
                                <div className="text-[10px] tracking-[0.18em] text-[#8d95a5]">{group.rows.length}</div>
                                <div className="mt-1 text-[12px] font-semibold text-[#f5f7fb]">{group.title}</div>
                                <p className="mt-1 text-[11px] leading-4 text-[#98a2b3]">{group.summary}</p>
                                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b8c4d8]">
                                  {group.actionLabel}
                                </div>
                              </WorkbenchInsetPanel>
                            ))}
                          </div>
                          {previewOverflowCount > 0 ? (
                            <p
                              data-entity-import-preview-overflow="bounded-visible-row-limit"
                              data-entity-import-preview-overflow-placement="above-scroll"
                              className="rounded-[3px] border border-[#31405c] bg-[#101217] px-2.5 py-2 text-[11px] leading-5 text-[#b8c4d8]"
                            >
                              {t('entity.definition.import.preview-overflow', {
                                count: previewOverflowCount,
                                limit: previewViewport.visibleRows.length
                              })}
                            </p>
                          ) : null}
                          <div
                            data-entity-import-preview-rows-scroll="bounded-large-batch"
                            className="max-h-[360px] overflow-y-auto pr-1"
                          >
                            <RowList
                            rows={visiblePreviewRows.map(row => ({
                              title: row.title,
                              copy: formatDefinitionPreviewRowCopy(row, mode, t),
                              meta: row.kindLabel
                            }))}
                            />
                          </div>
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
                      <EntityDefinitionActionWithHelp
                        id="entry-view-entity"
                        helpLabel={t('entities.definition.workspace.entry-view-entity.help-label')}
                        help={t('entities.definition.workspace.entry-view-entity.help')}
                      >
                        <Link
                          className="min-w-0 flex-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2"
                          href={viewEntityHref}
                          data-entity-definition-unsaved-navigation-guard={hasDefinitionUnsavedChanges ? 'dirty' : 'clean'}
                          data-entity-definition-unsaved-navigation-target={viewEntityHref}
                          onClick={event => requestDefinitionNavigation(event, viewEntityHref)}
                        >
                          {t('entities.definition.workspace.entry-view-entity')}
                        </Link>
                      </EntityDefinitionActionWithHelp>
                      <EntityDefinitionActionWithHelp
                        id="entry-back-to-form"
                        helpLabel={t(backToFormCopyKeys.helpLabel)}
                        help={t(backToFormCopyKeys.help)}
                      >
                        <Link
                          className="min-w-0 flex-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 py-2"
                          href={backToFormHref}
                          data-entity-definition-unsaved-navigation-guard={hasDefinitionUnsavedChanges ? 'dirty' : 'clean'}
                          data-entity-definition-unsaved-navigation-target={backToFormHref}
                          onClick={event => requestDefinitionNavigation(event, backToFormHref)}
                        >
                          {t(backToFormCopyKeys.label)}
                        </Link>
                      </EntityDefinitionActionWithHelp>
                    </div>
                  </section>
                </section>
              </div>
            </section>
        </EntityDefinitionWorkspaceFrame>
        <div
          data-entity-definition-unsaved-navigation="hertzbeat-ui-confirm-dialog"
          data-entity-definition-unsaved-navigation-state={pendingDefinitionNavigationHref ? 'open' : 'closed'}
        >
          <HzConfirmDialog
            open={pendingDefinitionNavigationHref != null}
            tone="warning"
            title={t('entities.definition.unsaved-navigation.title')}
            kicker={t('entities.definition.unsaved-navigation.kicker')}
            cancelLabel={t('entities.definition.unsaved-navigation.keep-editing')}
            confirmLabel={t('entities.definition.unsaved-navigation.discard')}
            onClose={() => setPendingDefinitionNavigationHref(null)}
            onConfirm={confirmDefinitionNavigation}
            data-entity-definition-unsaved-navigation-dialog="hertzbeat-ui-confirm-dialog"
            cancelButtonProps={
              {
                type: 'button',
                'data-entity-definition-unsaved-navigation-keep-editing': 'true'
              } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
            }
            confirmButtonProps={
              {
                type: 'button',
                'data-entity-definition-unsaved-navigation-confirm': 'true'
              } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
            }
          >
            <p data-entity-definition-unsaved-navigation-copy="true">
              {t('entities.definition.unsaved-navigation.copy')}
            </p>
          </HzConfirmDialog>
        </div>
        {renderClearDraftDialog()}
      </div>
    );
  }

  return null;
}

export function resolveVisibleEntityDefinitionMessage(
  message: string | null,
  messageTone: 'success' | 'error' | null,
  t: (key: string, params?: Record<string, string>) => string
) {
  if (message == null) {
    return null;
  }
  return messageTone === 'error' ? localizeEntityDefinitionMessage(message, t) : message;
}

export function resolveEntityDefinitionDuplicateRecoveryHref(
  message: string | null,
  messageTone: 'success' | 'error' | null
) {
  if (messageTone !== 'error' || message == null) {
    return null;
  }
  const searchTerm = resolveEntityDefinitionDuplicateSearchTerm(message);
  if (searchTerm == null) {
    return null;
  }
  const params = new URLSearchParams({
    search: searchTerm,
    source: 'entity-definition-duplicate-recovery'
  });
  return `/entities?${params.toString()}`;
}

function resolveEntityDefinitionDuplicateSearchTerm(message: string) {
  const normalized = message.trim();
  if (normalized.startsWith('Entity primary identity already exists: ')) {
    const identity = normalized.replace('Entity primary identity already exists: ', '').replace(/\.$/, '').trim();
    const identityValue = identity.includes('=') ? identity.split('=').pop()?.trim() : identity;
    return identityValue || null;
  }
  if (normalized.startsWith('Entity already exists: ')) {
    const reference = normalized.replace('Entity already exists: ', '').replace(/\.$/, '').trim();
    if (reference.includes('/')) {
      return reference.split('/').pop()?.trim() || null;
    }
    const parts = reference.split(/\s+/).filter(Boolean);
    return parts.at(-1) ?? null;
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
  if (isLocalizedEntityDefinitionFeedback(normalized, t)) {
    return normalized;
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
      if (isBackendUnavailableMessage(normalized)) {
        return t('entities.definition.message.backend-unavailable');
      }
      if (normalized.startsWith('Entity already exists in definition bundle: ')) {
        return t('entities.definition.message.entity-duplicate-in-bundle', {
          reference: normalized.replace('Entity already exists in definition bundle: ', '').replace(/\.$/, '')
        });
      }
      if (normalized.startsWith('Entity already exists: ')) {
        return t('entities.definition.message.entity-already-exists', {
          reference: normalized.replace('Entity already exists: ', '').replace(/\.$/, '')
        });
      }
      if (normalized.startsWith('Entity primary identity already exists: ')) {
        return t('entities.definition.message.entity-primary-identity-exists', {
          identity: normalized.replace('Entity primary identity already exists: ', '').replace(/\.$/, '')
        });
      }
      if (normalized.startsWith('Monitor already bound to another entity: ')) {
        return t('entities.definition.message.monitor-already-bound', {
          monitorId: normalized.replace('Monitor already bound to another entity: ', '').replace(/\.$/, '')
        });
      }
      if (normalized.startsWith('Unsupported entity definition kind: ')) {
        return t('entities.definition.message.unsupported-definition-kind', {
          kind: normalized.replace('Unsupported entity definition kind: ', '').replace(/\.$/, '')
        });
      }
      if (normalized.startsWith('Unsupported entity definition entity type: ')) {
        return t('entities.definition.message.unsupported-definition-kind', {
          kind: normalized.replace('Unsupported entity definition entity type: ', '').replace(/\.$/, '')
        });
      }
      return t('entities.definition.message.backend-fallback', { message: normalized });
  }
}

function isLocalizedEntityDefinitionFeedback(
  message: string,
  t: (key: string, params?: Record<string, string>) => string
) {
  return [
    'entities.definition.message.entity-not-exist',
    'entities.definition.message.process-failed',
    'entities.definition.message.update-missing-entity',
    'entities.definition.message.update-failed',
    'entity.definition.import.empty-preview',
    'entity.definition.import.empty-save',
    'entity.definition.import.empty-import',
    'entity.definition.import.no-definitions',
    'entity.definition.workspace.single-required',
    'entity.definition.import.blocked'
  ].some(key => message === t(key));
}

function isBackendUnavailableMessage(message: string) {
  return message === 'Backend service unavailable. Please retry after the backend service is restored.'
    || message === 'API request failed: 503';
}

export function localizeEntityImportParseFailure(
  error: unknown,
  t: (key: string, params?: Record<string, string>) => string
) {
  if (!(error instanceof Error)) {
    return t('entity.definition.import.parse-failed');
  }
  const normalized = error.message.trim();
  if (isBackendUnavailableMessage(normalized)) {
    return localizeEntityDefinitionMessage(normalized, t);
  }
  if (isEntityDefinitionBackendFeedback(normalized)) {
    return localizeEntityDefinitionMessage(normalized, t);
  }
  const parseLocation = extractParseFailureLocation(normalized);
  const recoveryMessage = parseLocation == null
    ? t('entity.definition.import.parse-failed-recovery')
    : `${t('entity.definition.import.parse-failed-location', parseLocation)} ${t('entity.definition.import.parse-failed-recovery')}`;
  return t('entity.definition.import.parse-failed-detail', {
    message: recoveryMessage
  });
}

function isEntityDefinitionBackendFeedback(message: string) {
  return message === 'Entity not exist.'
    || message === 'Entity not exist'
    || message.startsWith('Entity already exists in definition bundle: ')
    || message.startsWith('Entity already exists: ')
    || message.startsWith('Entity primary identity already exists: ')
    || message.startsWith('Monitor already bound to another entity: ')
    || message.startsWith('Unsupported entity definition kind: ')
    || message.startsWith('Unsupported entity definition entity type: ');
}

function extractParseFailureLocation(message: string) {
  const match = message.match(/\bline\s+(\d+),\s+column\s+(\d+)/i);
  if (match == null) {
    return null;
  }
  return {
    line: match[1],
    column: match[2]
  };
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
      "runbook": "https://runbooks.example.com/checkout",
      "system": "commerce-platform",
      "implementedBy": [
        "platform-team"
      ],
      "telemetry": {
        "identities": [
          {
            "key": "service.name",
            "value": "checkout",
            "primary": true
          }
        ]
      },
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
  -d '{"format":"yaml","content":"apiVersion: hertzbeat/v1\\nkind: service\\nmetadata:\\n  name: checkout\\n  namespace: commerce\\n  owner: platform-team\\nspec:\\n  source: manual\\n  environment: prod\\n  system: commerce-platform\\n  runbook: https://runbooks.example.com/checkout\\n  implementedBy:\\n    - platform-team\\n  telemetry:\\n    identities:\\n      - key: service.name\\n        value: checkout\\n        primary: true"}'`;
  }

  return `apiVersion: hertzbeat/v1
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
  runbook: https://runbooks.example.com/checkout
  implementedBy:
    - platform-team
  telemetry:
    identities:
      - key: service.name
        value: checkout
        primary: true
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
