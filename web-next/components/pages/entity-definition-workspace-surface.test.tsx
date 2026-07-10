// @vitest-environment jsdom
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { getImportStarterDraft } from './entity-definition-workspace-surface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn()
});
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn()
});

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {}
    })
  })
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzConfirmDialog: ({
    open,
    title,
    kicker,
    children,
    cancelLabel,
    confirmLabel,
    cancelButtonProps,
    confirmButtonProps,
    ...props
  }: any) =>
    open ? (
      <section data-hz-ui="confirm-dialog" {...props}>
        <div>{kicker}</div>
        <h2>{title}</h2>
        <div>{children}</div>
        <button {...cancelButtonProps}>{cancelLabel}</button>
        <button {...confirmButtonProps}>{confirmLabel}</button>
      </section>
    ) : null
}));

vi.mock('@/components/ui/hz-code-editor', () => ({
  HzCodeEditor: ({ value, language, onChange: _onChange, ...props }: any) => (
    <div
      data-entity-definition-code-editor={props['data-entity-definition-code-editor']}
      data-entity-definition-editor-format={props['data-entity-definition-editor-format']}
      data-entity-definition-editor-width={props['data-entity-definition-editor-width']}
      data-entity-definition-starter-draft={props['data-entity-definition-starter-draft']}
      data-hz-code-editor="codemirror"
      data-hz-code-editor-language={language}
    >
      {value}
      {props.placeholder}
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  EditorRow: ({ value, placeholder, ...props }: any) => <textarea value={value} placeholder={placeholder} {...props} />,
  RailSection: ({ title, children }: any) => (
    <section data-rail-section="true">
      <h3>{title}</h3>
      {children}
    </section>
  ),
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  ),
  TemplateRow: ({ children }: any) => <button type="button">{children}</button>,
  WorkbenchInsetPanel: ({ as: Component = 'div', children, ...props }: any) => (
    <Component data-workbench-inset-panel="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchStack: ({ children }: any) => <div data-workbench-stack="true">{children}</div>
}));

vi.mock('@/components/workbench/toolbar', () => ({
  ToolbarField: ({ label, children, ...props }: any) => (
    <label {...props}>
      <span>{label}</span>
      {children}
    </label>
  ),
  ToolbarNativeSelect: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  ToolbarRow: ({ children }: any) => <div data-toolbar-row="true">{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  MetricGrid: ({ items }: any) => <div data-metric-grid="true">{items.map((item: any) => `${item.label}:${item.value}`).join('|')}</div>,
  RowList: ({ rows }: any) => (
    <div data-row-list="true">
      {rows.map((row: any) => [row.title, row.copy, row.meta].filter(Boolean).join(' ')).join('|')}
    </div>
  ),
  WorkbenchPage: ({ kicker, kickerVariant, title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true" data-workbench-kicker-variant={kickerVariant ?? 'badge'}>
      {kicker ? <div data-workbench-kicker="true" data-observability-kicker={kickerVariant}>{kicker}</div> : null}
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <main>{main}</main>
      <aside>{side}</aside>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/entity-definition/controller', () => ({
  parseEntityDefinition: vi.fn(),
  updateDefinitionPayload: vi.fn((content: string, format: string) => ({ content, format }))
}));

vi.mock('@/lib/entity-import/controller', () => ({
  createDefinitionBundle: vi.fn(),
  parseDefinitionBundle: vi.fn()
}));

vi.mock('@/lib/entity-import/view-model', () => ({
  buildActivityRows: (items: any[]) => items.map(item => ({ title: item.summary, copy: item.detail || '-', meta: item.status })),
  buildImportMetrics: ({ format, templateCount, activityCount }: any) => [
    { label: 'Import Format', value: String(format).toUpperCase() },
    { label: 'Custom template', value: String(templateCount) },
    { label: 'Recent activity', value: String(activityCount) }
  ],
  buildImportPreviewRows: (items: any[]) =>
    items.map((item, index) => ({
      key: `preview-${index}`,
      title: item.entity?.name ?? `Entity ${index}`,
      subtitle: item.entity?.namespace ?? 'ready',
      validationLabel: 'ready',
      kindLabel: item.entity?.type ?? 'service',
      gaps: item.gaps ?? [],
      gapKeys: item.gapKeys ?? [],
      attributionRows: []
    })),
  buildImportPreviewViewport: (rows: any[]) => ({
    visibleRows: rows.slice(0, 100),
    totalCount: rows.length,
    overflowCount: Math.max(0, rows.length - Math.min(rows.length, 100))
  }),
  buildImportQueueGroups: (rows: any[]) => {
    const readyRows = rows.filter(row => row.gaps.length === 0);
    const attentionRows = rows.filter(row => row.gaps.length > 0);
    return [
      readyRows.length > 0
        ? {
            key: 'ready',
            title: 'ready',
            summary: 'ready summary',
            actionLabel: 'ready action',
            scope: 'ready',
            rows: readyRows
          }
        : null,
      attentionRows.length > 0
        ? {
            key: 'attention',
            title: 'attention',
            summary: 'attention summary',
            actionLabel: 'attention action',
            scope: 'attention',
            rows: attentionRows
          }
        : null
    ].filter(Boolean);
  },
  buildImportSummaryFacts: () => [],
  formatImportPreviewRowCopy: (row: any) => row.subtitle ?? row.validationLabel,
  buildTemplateRows: (items: any[]) =>
    items.map(item => ({
      key: String(item.id),
      title: item.name,
      copy: item.summary || '-',
      meta: `${item.format} · ${item.source || '-'}`
    }))
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

describe('EntityDefinitionWorkspaceSurface', () => {
  const t = createTranslatorMock({
    locale: 'zh-CN',
    overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {}
  });
  const han = (...codes: number[]) => String.fromCodePoint(...codes);

  it('moves definition queue selectors and preview cards onto shared inset workbench panels', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('WorkbenchInsetPanel');
    expect(source).toContain('data-entity-import-attribution-preview="definition-attribution-check"');
    expect(source).toContain('const importResultsRef = useRef<HTMLElement>(null);');
    expect(source).toContain('type ImportedEntityResult = {');
    expect(source).toContain('const [importedEntityResults, setImportedEntityResults] = useState<ImportedEntityResult[]>([]);');
    expect(source).toContain('setImportedEntityResults([]);');
    expect(source).toContain('setImportedEntityResults(entityIds.map((id, index) => ({');
    expect(source).toContain("title: previewRows[index]?.title ?? t('entity.definition.import.result-unknown-entity')");
    expect(source).toContain('function revealImportResults()');
    expect(source).toContain("importResultsRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });");
    expect(source).toContain('window.scrollTo({ top: window.scrollY, left: 0 });');
    expect(source).toContain('importResultsRef.current?.focus({ preventScroll: true });');
    expect(source).toContain('data-entity-definition-results-focus-target="import-preview"');
    expect(source).toContain('data-entity-import-result-links="created-entities"');
    expect(source).toContain("t('entity.definition.import.result-title')");
    expect(source).toContain('{createdEntity.title}');
    expect(source).toContain("t('entity.definition.import.result-view-entity', { id: String(createdEntity.id) })");
    expect(source).toContain('href={buildEntityImportResultHref(createdEntity.id, routeContext)}');
    expect(source).toContain("setMessage(t('entity.definition.import.blocked'))");
    expect(source).toContain('const entityIds = await createDefinitionBundle(apiMessagePost, nextContent, format);');
    expect(source).toContain('tabIndex={-1}');
    expect(source).toContain('data-entity-definition-inline-feedback={messageTone ===');
    expect(source).toContain("role={messageTone === 'error' ? 'alert' : 'status'}");
    expect(source).toContain('data-entity-import-attribution-preview-scroll="bounded-large-batch"');
    expect(source).toContain('data-entity-import-result-links-scroll="bounded-large-batch"');
    expect(source).toContain('data-entity-import-preview-rows-scroll="bounded-large-batch"');
    expect(source).toContain('max-h-[520px] gap-2 overflow-y-auto');
    expect(source).toContain('max-h-[360px] gap-2 overflow-y-auto');
    expect(source).toContain('max-h-[360px] overflow-y-auto pr-1');
    expect(source).toContain('const previewViewport = buildImportPreviewViewport(scopedPreviewRows);');
    expect(source).toContain('data-entity-import-preview-overflow="bounded-visible-row-limit"');
    expect(source).toContain("t('entity.definition.import.preview-overflow'");
    expect(source).toContain('aria-label={`${group.actionLabel}: ${group.summary}`}');
    expect(source).toContain('{group.summary}</p>');
    expect(source).toContain('{group.actionLabel}');
    expect(source).toContain('data-entity-import-attribution-row={attribute.key}');
    expect(source).toContain('data-entity-import-attribution-state={attribute.state}');
    expect(source).toContain("t('entities.definition.workspace.attribution-check')");
    expect(source).toContain("t('entities.definition.workspace.attribution-state.ready')");
    expect(source).toContain("t('entities.definition.workspace.attribution-state.missing')");
    expect(source).toContain("t('entities.definition.workspace.attribution-state.unknown')");
    expect(source).not.toContain(`>${t('entities.definition.workspace.attribution-check')}<`);
    expect(source).not.toContain(`return '${t('entities.definition.workspace.attribution-state.ready')}'`);
    expect(source).not.toContain(`return '${t('entities.definition.workspace.attribution-state.missing')}'`);
    expect(source).not.toContain(`return '${t('entities.definition.workspace.attribution-state.unknown')}'`);
    expect(source).toContain('row.attributionLabel');
    expect(source).toContain('row.attributionRows.map');
    expect(source).toContain("t('entities.definition.workspace.metric.ready')");
    expect(source).toContain("t('entities.definition.workspace.metric.attention')");
    expect(source).toContain("t('entities.definition.workspace.metric.telemetry-gaps')");
    expect(source).toContain("t('entities.definition.workspace.metric.ready-update')");
    expect(source).toContain("t('entities.definition.workspace.metric.review-update')");
    expect(source).toContain("t('entities.definition.workspace.metric.telemetry-gaps-update')");
    expect(source).toContain("t('entities.definition.workspace.current-definition')");
    expect(source).toContain("t('entities.definition.workspace.template-title')");
    expect(source).toContain("t('entities.definition.workspace.template-error-help')");
    expect(source).toContain("t('entities.definition.workspace.template-empty-title')");
    expect(source).toContain("t('entities.definition.workspace.template-empty-copy')");
    expect(source).toContain("t('entities.definition.workspace.batch-title')");
    expect(source).toContain("t('entities.definition.workspace.batch-copy')");
    expect(source).toContain("t('entities.definition.workspace.batch-expand')");
    expect(source).toContain("t('entities.definition.workspace.activity-title')");
    expect(source).toContain("t('entities.definition.workspace.activity-empty-title')");
    expect(source).toContain("t('entities.definition.workspace.activity-empty-copy')");
    expect(source).toContain("t('entities.definition.workspace.entry-title')");
    expect(source).toContain("t('entities.definition.workspace.entry-view-entity')");
    expect(source).toContain("'entities.definition.workspace.entry-back-to-form'");
    expect(source).toContain("'entities.definition.workspace.entry-back-to-entity'");
    expect(source).toContain("'entities.definition.workspace.entry-back-to-source'");
    expect(source).toContain("t('entities.definition.message.load-failed')");
    expect(source).toContain("t('entities.definition.message.entity-not-exist')");
    expect(source).toContain("t('entities.definition.message.process-failed')");
    expect(source).toContain("t('entities.definition.message.update-missing-entity')");
    expect(source).toContain("t('entities.definition.message.update-failed')");
    expect(source).toContain("t('entities.definition.message.updated')");
    expect(source).toContain("t('entity.definition.import.empty-preview')");
    expect(source).toContain("t('entity.definition.import.empty-save')");
    expect(source).toContain("t('entity.definition.import.empty-import')");
    expect(source).toContain("t('entity.definition.import.no-definitions')");
    expect(source).toContain("t('entity.definition.import.activity.preview-one')");
    expect(source).toContain("t('entity.definition.import.activity.preview-many', { count: rows.length })");
    expect(source).toContain("t('entity.definition.import.parse-failed')");
    expect(source).toContain("t('entity.definition.import.parse-failed-detail'");
    expect(source).toContain("t('entity.definition.import.parse-failed-recovery')");
    expect(source).toContain("t('entity.definition.workspace.single-required')");
    expect(source).toContain("t('entity.definition.import.blocked')");
    expect(source).toContain("t('entity.definition.import.success-bundle', { count: entityIds.length })");
    expect(source).toContain("t('entity.definition.import.success-single')");
    expect(source).toContain("t('entity.definition.import.result-title')");
    expect(source).toContain("t('entity.definition.import.result-view-entity'");
    expect(source).toContain("t('entity.definition.import.result-unknown-entity')");
    expect(source).toContain("t('entity.definition.import.create-failed')");
    expect(source).toContain("t('entity.definition.import.placeholder.yaml')");
    expect(source).toContain("t('entity.definition.import.placeholder.json')");
    expect(source).toContain("t('entity.definition.import.placeholder.curl')");
    expect(source).toContain('localizeEntityDefinitionMessage(error.message, t)');
    expect(source).toContain('setMessage(localizeEntityImportParseFailure(error, t));');
    expect(source).not.toContain("setMessage(error instanceof Error ? localizeEntityDefinitionMessage(error.message, t) : t('entity.definition.import.parse-failed'))");
    expect(source).not.toContain(`label: '${t('entities.definition.workspace.metric.ready')}'`);
    expect(source).not.toContain(`label: '${t('entities.definition.workspace.metric.attention')}'`);
    expect(source).not.toContain(`label: '${t('entities.definition.workspace.metric.telemetry-gaps')}'`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.current-definition')}<`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.template-title')}<`);
    expect(source).not.toContain(t('entities.definition.workspace.template-error-help'));
    expect(source).not.toContain(`title: '${t('entities.definition.workspace.template-empty-title')}'`);
    expect(source).not.toContain(`copy: '${t('entities.definition.workspace.template-empty-copy')}'`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.batch-title')}<`);
    expect(source).not.toContain(t('entities.definition.workspace.batch-copy'));
    expect(source).not.toContain(`>${t('entities.definition.workspace.batch-expand')}<`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.activity-title')}<`);
    expect(source).not.toContain(`title: '${t('entities.definition.workspace.activity-empty-title')}'`);
    expect(source).not.toContain(`copy: '${t('entities.definition.workspace.activity-empty-copy')}'`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.entry-title')}<`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.entry-view-entity')}<`);
    expect(source).not.toContain(`>${t('entities.definition.workspace.entry-back-to-form')}<`);
    expect(source).not.toContain(t('entities.definition.message.load-failed'));
    expect(source).not.toContain(t('entity.definition.import.empty-preview'));
    expect(source).not.toContain(t('entity.definition.import.no-definitions'));
    expect(source).not.toContain(t('entity.definition.import.activity.preview-one'));
    expect(source).not.toContain(t('entity.definition.import.parse-failed'));
    expect(source).not.toContain(t('entity.definition.import.empty-save'));
    expect(source).not.toContain(t('entity.definition.import.empty-import'));
    expect(source).not.toContain(t('entity.definition.workspace.single-required'));
    expect(source).not.toContain(t('entities.definition.message.update-missing-entity'));
    expect(source).not.toContain(t('entities.definition.message.updated'));
    expect(source).not.toContain(t('entities.definition.message.update-failed'));
    expect(source).not.toContain(t('entity.definition.import.blocked'));
    expect(source).not.toContain(t('entity.definition.import.success-single'));
    expect(source).not.toContain(t('entity.definition.import.result-title'));
    expect(source).not.toContain(t('entity.definition.import.result-unknown-entity'));
    expect(source).not.toContain(t('entity.definition.import.create-failed'));
    expect(source).not.toContain(t('entities.definition.message.entity-not-exist'));
    expect(source).not.toContain(t('entities.definition.message.process-failed'));
    expect(source).not.toContain(t('entity.definition.import.placeholder.yaml'));
    expect(source).not.toContain(t('entity.definition.import.placeholder.json'));
    expect(source).not.toContain(t('entity.definition.import.placeholder.curl'));
    expect(source).not.toContain('rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3.5 text-left text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text-primary)]');
    expect(source).not.toContain('rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3.5');
  });

  it('uses localized empty metadata for entity definition empty template and activity rows', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain("const emptyValue = t('common.none');");
    expect(source).toContain("t('entities.definition.workspace.template-empty-title')");
    expect(source).toContain("t('entities.definition.workspace.activity-empty-title')");
    expect(source).toContain('meta: emptyValue');
    expect(source).not.toContain("meta: '-'");
  });

  it('guards entity definition entry navigation when the draft has unsaved edits', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('const [committedContent, setCommittedContent] = useState(initialDraftContent);');
    expect(source).toContain('const [pendingDefinitionNavigationHref, setPendingDefinitionNavigationHref] = useState<string | null>(null);');
    expect(source).toContain("const hasDefinitionUnsavedChanges = mode === 'definition'");
    expect(source).toContain('content !== committedContent');
    expect(source).toContain('actions?: React.ReactNode;');
    expect(source).toContain('data-entity-definition-frame-actions="first-viewport-safe-exits"');
    expect(source).toContain('data-entity-definition-first-viewport-entry-actions="true"');
    expect(source).toContain('data-entity-definition-first-viewport-action="view-entity"');
    expect(source).toContain('data-entity-definition-first-viewport-action="return-source"');
    expect(source).toContain('actions={definitionHeaderActions}');
    expect(source).toContain('id="entry-view-entity-top"');
    expect(source).toContain('id="entry-back-to-form-top"');
    expect(source).toContain('function requestDefinitionNavigation');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('setPendingDefinitionNavigationHref(href);');
    expect(source).toContain('function confirmDefinitionNavigation()');
    expect(source).toContain('window.location.assign(href);');
    expect(source).toContain('data-entity-definition-unsaved-navigation-guard={hasDefinitionUnsavedChanges ?');
    expect(source).toContain('data-entity-definition-unsaved-navigation-target={viewEntityHref}');
    expect(source).toContain('data-entity-definition-unsaved-navigation-target={backToFormHref}');
    expect(source).toContain('onClick={event => requestDefinitionNavigation(event, viewEntityHref)}');
    expect(source).toContain('onClick={event => requestDefinitionNavigation(event, backToFormHref)}');
    expect(source).toContain('data-entity-definition-unsaved-navigation="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-entity-definition-unsaved-navigation-state={pendingDefinitionNavigationHref ?');
    expect(source).toContain("title={t('entities.definition.unsaved-navigation.title')}");
    expect(source).toContain("kicker={t('entities.definition.unsaved-navigation.kicker')}");
    expect(source).toContain("cancelLabel={t('entities.definition.unsaved-navigation.keep-editing')}");
    expect(source).toContain("confirmLabel={t('entities.definition.unsaved-navigation.discard')}");
    expect(source).toContain("t('entities.definition.unsaved-navigation.copy')");
    expect(source).toContain('setCommittedContent(nextDefinition);');
    expect(source).toContain('setContent(nextContent);');
    expect(source).toContain('setCommittedContent(nextContent);');
  });

  it('guards clear draft behind an explicit confirmation before dropping the local editor draft', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('const [clearDraftDialogOpen, setClearDraftDialogOpen] = useState(false);');
    expect(source).toContain('function confirmClearDraft()');
    expect(source).toContain('setClearDraftDialogOpen(false);');
    expect(source).toContain("setMessage(t('entity.definition.action.clear-draft.cleared'))");
    expect(source).toContain('type="button"\n          size="sm"\n          variant="default"\n          onClick={() => setClearDraftDialogOpen(true)}');
    expect(source).toContain('onClick={() => void previewDefinitions()}');
    expect(source).toContain('data-entity-definition-command-action="preview"');
    expect(source).toContain('type="button"\n          size="sm"\n          variant="primary"\n          onClick={() => void submitDefinitions()}');
    expect(source).toContain('data-entity-definition-clear-draft-trigger="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-entity-definition-clear-draft="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-entity-definition-clear-draft-state={clearDraftDialogOpen ?');
    expect(source).toContain("title={t('entity.definition.action.clear-draft.confirm-title')}");
    expect(source).toContain("kicker={t('entity.definition.action.clear-draft.confirm-kicker')}");
    expect(source).toContain("cancelLabel={t('entity.definition.action.clear-draft.keep-editing')}");
    expect(source).toContain("confirmLabel={t('entity.definition.action.clear-draft.confirm')}");
    expect(source).toContain('data-entity-definition-clear-draft-confirm');
    expect(source).toContain("t('entity.definition.action.clear-draft.confirm-copy')");
    expect(source).not.toContain("onClick={() => {\n              setContent('');");
  });

  it('clears stale ready import preview rows after submit errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('function resetImportPreviewAfterSubmitError()');
    expect(source).toContain('resetImportPreviewAfterSubmitError();');
    expect(source).toContain('const entityIds = await createDefinitionBundle(apiMessagePost, nextContent, format);');
    expect(source).toContain('setPreviewRows([]);');
    expect(source).toContain('setImportedEntityResults([]);');
    expect(source).toContain("setPreviewScope('all');");
  });

  it('previews definition edits through the current entity parse endpoint instead of bundle import parsing', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain("mode === 'definition' && entityId != null");
    expect(source).toContain('[await parseEntityDefinition(apiMessagePost, entityId, nextContent, format)]');
    expect(source).toContain('await parseDefinitionBundle(apiMessagePost, nextContent, format)');
  });

  it('keeps definition preview copy in save language instead of import language', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const { parseEntityDefinition } = await import('@/lib/entity-definition/controller');
    const container = document.createElement('div');
    let root: Root | null = null;
    document.body.appendChild(container);
    vi.mocked(parseEntityDefinition).mockResolvedValueOnce({
      entity: {
        type: 'service',
        name: 'checkout-api'
      },
      identities: [
        {
          identityKey: 'service.name',
          identityValue: 'checkout-api',
          identityType: 'derived',
          priority: 90,
          primary: true
        }
      ],
      gaps: [
        t('entity.field.owner'),
        t('entity.field.system'),
        t('entity.field.runbook')
      ],
      gapKeys: ['owner', 'system', 'runbook']
    } as any);

    try {
      root = createRoot(container);
      await act(async () => {
        root?.render(
          <EntityDefinitionWorkspaceSurface
            mode="definition"
            entityId="42"
            initialContent="kind: service"
            templates={[]}
            activities={[]}
          />
        );
        await Promise.resolve();
      });

      const previewButton = container.querySelector<HTMLButtonElement>('[data-entity-definition-command-action="preview"]');
      expect(previewButton).not.toBeNull();

      await act(async () => {
        previewButton?.click();
        await Promise.resolve();
      });

      expect(container.textContent).toContain(t('entity.definition.update.queue.attention.title'));
      expect(container.textContent).toContain(t('entity.definition.update.queue.attention.copy'));
      expect(container.textContent).toContain(t('entity.definition.update.queue.attention.action'));
      expect(container.textContent).toContain(t('entity.definition.update.validation.needs-attention-fields', {
        fields: [
          t('entity.field.owner'),
          t('entity.field.system'),
          t('entity.field.runbook')
        ].join(' · ')
      }));
      expect(container.textContent).not.toContain(t('entity.definition.import.queue.attention.copy'));
      expect(container.textContent).not.toContain(t('entity.definition.import.validation.needs-attention-fields', {
        fields: [
          t('entity.field.owner'),
          t('entity.field.system'),
          t('entity.field.runbook')
        ].join(' · ')
      }));
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      container.remove();
    }
  });

  it('renders entity definition format select labels from runtime messages', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent="kind: service"
        templates={[]}
        activities={[]}
      />
    );

    expect(source).toContain("t('entity.definition.format.option.yaml')");
    expect(source).toContain("t('entity.definition.format.option.json')");
    expect(source).toContain("t('entity.definition.format.option.curl')");
    expect(source).not.toContain('<option value="yaml">YAML</option>');
    expect(source).not.toContain('<option value="json">JSON</option>');
    expect(source).not.toContain('<option value="curl">cURL</option>');
    expect(html).toContain(t('entity.definition.format.option.yaml'));
    expect(html).toContain(t('entity.definition.format.option.json'));
    expect(html).toContain(t('entity.definition.format.option.curl'));
  });

  it('localizes unknown backend feedback while preserving the raw server message', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent=""
        initialMessage="Backend parser saw custom-field drift."
        templates={[]}
        activities={[]}
      />
    );

    expect(source).toContain("t('entities.definition.message.backend-fallback', { message: normalized })");
    expect(source).not.toContain('default:\\n      return message;');
    expect(html).toContain('data-entity-definition-load-error="hertzbeat-ui-inline-first-viewport"');
    expect(html).toContain(
      t('entities.definition.message.backend-fallback', { message: 'Backend parser saw custom-field drift.' })
    );
    expect(html).toContain(t('entities.definition.workspace.template-error-help'));
  });

  it('localizes monitor binding conflicts before import writes fail late', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent=""
        initialMessage="Monitor already bound to another entity: 501."
        templates={[]}
        activities={[]}
      />
    );

    expect(source).toContain("normalized.startsWith('Monitor already bound to another entity: ')");
    expect(html).toContain(t('entities.definition.message.monitor-already-bound', { monitorId: '501' }));
    expect(html).not.toContain('Backend reported: Monitor already bound to another entity: 501.');
  });

  it('renders a single live feedback region in the definition workspace', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent=""
        initialMessage="Backend parser saw custom-field drift."
        templates={[]}
        activities={[]}
      />
    );

    expect(html.match(/data-entity-definition-inline-feedback=/g)).toHaveLength(1);
    expect(html.match(/role="alert"/g)).toHaveLength(1);
    expect(html).toContain('data-entity-definition-load-error="hertzbeat-ui-inline-first-viewport"');
    expect(html).not.toContain('data-entity-definition-load-error="hertzbeat-ui-inline"');
  });

  it('does not wrap successful definition feedback as a backend fallback message', async () => {
    const {
      resolveEntityDefinitionDuplicateRecoveryHref,
      resolveVisibleEntityDefinitionMessage
    } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('resolveVisibleEntityDefinitionMessage(message, messageTone, t)');
    expect(source).toContain('resolveEntityDefinitionDuplicateRecoveryHref(');
    expect(source).toContain('data-entity-definition-duplicate-recovery-link="true"');
    expect(source).toContain('function isLocalizedEntityDefinitionFeedback(');
    expect(resolveVisibleEntityDefinitionMessage(t('entities.definition.message.updated'), 'success', t)).toBe(
      t('entities.definition.message.updated')
    );
    expect(resolveVisibleEntityDefinitionMessage(t('entity.definition.import.empty-save'), 'error', t)).toBe(
      t('entity.definition.import.empty-save')
    );
    expect(resolveVisibleEntityDefinitionMessage(t('entity.definition.import.empty-preview'), 'error', t)).toBe(
      t('entity.definition.import.empty-preview')
    );
    expect(resolveVisibleEntityDefinitionMessage(t('entity.definition.import.no-definitions'), 'error', t)).toBe(
      t('entity.definition.import.no-definitions')
    );
    expect(resolveVisibleEntityDefinitionMessage(t('entities.definition.message.entity-not-exist'), 'error', t)).toBe(
      t('entities.definition.message.entity-not-exist')
    );
    expect(resolveVisibleEntityDefinitionMessage('Backend parser saw custom-field drift.', 'error', t)).toBe(
      t('entities.definition.message.backend-fallback', { message: 'Backend parser saw custom-field drift.' })
    );
    expect(resolveVisibleEntityDefinitionMessage('Entity already exists: service product-design/checkout.', 'error', t)).toBe(
      t('entities.definition.message.entity-already-exists', { reference: 'service product-design/checkout' })
    );
    expect(
      resolveVisibleEntityDefinitionMessage(
        'Entity already exists in definition bundle: service product-design/checkout.',
        'error',
        t
      )
    ).toBe(
      t('entities.definition.message.entity-duplicate-in-bundle', { reference: 'service product-design/checkout' })
    );
    expect(source).toContain("normalized.startsWith('Entity already exists: ')");
    expect(source).toContain("normalized.startsWith('Entity already exists in definition bundle: ')");
    expect(
      resolveVisibleEntityDefinitionMessage(
        'Entity primary identity already exists: service.name=checkout-api.',
        'error',
        t
      )
    ).toBe(
      t('entities.definition.message.entity-primary-identity-exists', { identity: 'service.name=checkout-api' })
    );
    expect(source).toContain("normalized.startsWith('Entity primary identity already exists: ')");
    expect(resolveEntityDefinitionDuplicateRecoveryHref(
      'Entity primary identity already exists: service.name=checkout-api.',
      'error'
    )).toBe('/entities?search=checkout-api&source=entity-definition-duplicate-recovery');
    expect(resolveEntityDefinitionDuplicateRecoveryHref(
      'Entity already exists: service product-design/checkout.',
      'error'
    )).toBe('/entities?search=checkout&source=entity-definition-duplicate-recovery');
    expect(resolveEntityDefinitionDuplicateRecoveryHref(
      'Entity already exists in definition bundle: service product-design/checkout.',
      'error'
    )).toBeNull();
  });

  it('keeps backend outage feedback separate from definition parsing errors', async () => {
    const { localizeEntityImportParseFailure, resolveVisibleEntityDefinitionMessage } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain("t('entities.definition.message.backend-unavailable')");
    expect(resolveVisibleEntityDefinitionMessage(
      'Backend service unavailable. Please retry after the backend service is restored.',
      'error',
      t
    )).toBe(t('entities.definition.message.backend-unavailable'));
    expect(localizeEntityImportParseFailure(
      new Error('Backend service unavailable. Please retry after the backend service is restored.'),
      t
    )).toBe(t('entities.definition.message.backend-unavailable'));
    expect(localizeEntityImportParseFailure(new Error('API request failed: 503'), t)).toBe(
      t('entities.definition.message.backend-unavailable')
    );
  });

  it('keeps raw parser internals out of entity import parse failures while preserving the safe location', async () => {
    const { localizeEntityImportParseFailure } = await import('./entity-definition-workspace-surface');
    const parserError = new Error(
      "while parsing a flow sequence in 'reader', line 4, column 9: name: [broken ^ expected ',' or ']'"
    );

    const message = localizeEntityImportParseFailure(parserError, t);

    expect(message).toBe(
      t('entity.definition.import.parse-failed-detail', {
        message: `${t('entity.definition.import.parse-failed-location', {
          line: '4',
          column: '9'
        })} ${t('entity.definition.import.parse-failed-recovery')}`
      })
    );
    expect(message).not.toContain('while parsing');
    expect(message).not.toContain('reader');
    expect(message).not.toContain("expected ',' or ']'");
  });

  it('preserves duplicate identity feedback during import preview failures', async () => {
    const { localizeEntityImportParseFailure } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    expect(source).toContain('function isEntityDefinitionBackendFeedback(message: string)');
    expect(localizeEntityImportParseFailure(
      new Error('Entity primary identity already exists: service.name=checkout-api.'),
      t
    )).toBe(
      t('entities.definition.message.entity-primary-identity-exists', { identity: 'service.name=checkout-api' })
    );
  });

  it('keeps unsupported definition kind feedback concrete during import preview failures', async () => {
    const { localizeEntityImportParseFailure } = await import('./entity-definition-workspace-surface');

    expect(localizeEntityImportParseFailure(
      new Error('Unsupported entity definition kind: cache.'),
      t
    )).toBe(t('entities.definition.message.unsupported-definition-kind', { kind: 'cache' }));
    expect(localizeEntityImportParseFailure(
      new Error('Unsupported entity definition entity type: lambda_function.'),
      t
    )).toBe(t('entities.definition.message.unsupported-definition-kind', { kind: 'lambda_function' }));
  });

  it('keeps missing entity definition routes visibly blocked from saving', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent=""
        initialMessage="Entity not exist."
        templates={[]}
        activities={[]}
      />
    );

    expect(source).toContain("useState(mode === 'definition' && initialMessage != null)");
    expect(source).toContain("'entity-not-exist'");
    expect(source).toContain("'preview-required'");
    expect(source).toContain("'attention-required'");
    expect(source).toContain("data-entity-definition-load-error={messageTone === 'error' ? 'hertzbeat-ui-inline-first-viewport' : undefined}");
    expect(html).toContain('data-entity-definition-save-disabled-reason="entity-not-exist"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-entity-definition-load-error="hertzbeat-ui-inline-first-viewport"');
    expect(html).toContain(t('entities.definition.message.entity-not-exist'));
  });

  it('renders the shared edit-definition workspace with the cold full-width workbench contract', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="42"
        initialContent="kind: service"
        templates={[{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service', summary: 'shared service template', source: 'workspace' } as any]}
        activities={[{ id: 1, summary: 'definition updated', detail: 'saved from yaml', status: 'success', format: 'yaml', activityType: 'update' } as any]}
      />
    );

    expect(html).toContain('data-entity-definition-workspace="definition"');
    expect(html).toContain('data-entity-definition-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-definition-layout="full-width-workbench"');
    expect(html).toContain('data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"');
    expect(html).toContain('data-entity-definition-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-definition-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('data-entity-definition-editor-shell="otlp-hertzbeat-ui-definition-workbench"');
    expect(html).toContain('data-entity-definition-shell-spacing="hertzbeat-ui-tight"');
    expect(html).toContain('data-entity-definition-shell-height="hertzbeat-ui-content"');
    expect(html).toContain('data-entity-definition-action-row="hertzbeat-ui-inline-actions"');
    expect(html).toContain('data-entity-definition-action-group="wrap-within-row"');
    expect(html).toContain('min-w-0 flex-1 flex-wrap');
    expect(html).toContain('data-entity-definition-action-help-style="icon-after-action"');
    expect(html).toContain('data-entity-definition-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-definition-action-help-icon="lucide-circle-help"');
    expect((html.match(/data-entity-definition-action-help-style="icon-after-action"/g) || []).length).toBe(6);
    expect((html.match(/data-entity-definition-action-help-visual="circle-help-icon"/g) || []).length).toBe(6);
    expect((html.match(/data-entity-definition-action-help-icon="lucide-circle-help"/g) || []).length).toBe(6);
    ['format', 'action-row', 'entry-view-entity', 'entry-back-to-form', 'entry-view-entity-top', 'entry-back-to-form-top'].forEach(actionId => {
      expect(html).toContain(`data-entity-definition-action-help="${actionId}"`);
      expect(html).toContain(`data-entity-definition-action-help-tooltip="${actionId}"`);
    });
    ['format', 'entry-view-entity', 'entry-back-to-form', 'entry-view-entity-top', 'entry-back-to-form-top'].forEach(actionId => {
      expect(html).toContain(`data-entity-definition-action-help-item="${actionId}"`);
    });
    ['clear-draft', 'preview', 'save'].forEach(actionId => {
      expect(html).not.toContain(`data-entity-definition-action-help="${actionId}"`);
      expect(html).not.toContain(`data-entity-definition-action-help-item="${actionId}"`);
      expect(html).not.toContain(`data-entity-definition-action-help-tooltip="${actionId}"`);
    });
    expect(html).toContain('data-entity-definition-action-row-help-contract="single-header-help"');
    expect(html).toContain('data-entity-definition-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).toContain('data-entity-definition-editor-column="true"');
    expect(html).toContain('data-entity-definition-format-select="hertzbeat-ui-compact-select"');
    expect(html).toContain('data-entity-definition-code-editor="definition"');
    expect(html).toContain('data-entity-definition-editor-width="hertzbeat-ui-fluid"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="yaml"');
    expect(html).toContain('data-entity-definition-context-panel="hertzbeat-ui-context-panel"');
    expect(html).toContain('data-entity-definition-metric-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('auto-rows-min');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain(t('entities.definition.workspace.kicker'));
    expect(html).toContain(t('entities.definition.workspace.title'));
    expect(html).toContain(t('entities.definition.workspace.subtitle'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.save'));
    expect(html).toContain(t('entity.definition.action.row.definition-help'));
    expect(html).toContain('YAML');
    expect(html).toContain('JSON');
    expect(html).toContain('cURL');
    expect(html).toContain(t('entities.definition.workspace.batch-title'));
    expect(html).toContain(t('entities.definition.workspace.template-title'));
    expect(html).toContain(t('entities.definition.workspace.activity-title'));
    expect(html).toContain(t('entities.definition.workspace.metric.ready-update'));
    expect(html).toContain(t('entities.definition.workspace.metric.review-update'));
    expect(html).toContain(t('entities.definition.workspace.metric.telemetry-gaps-update'));
    expect(html).not.toContain(t('entities.definition.workspace.metric.ready'));
    expect(html).toContain(t('entities.definition.workspace.entry-view-entity'));
    expect(html).toContain(t('entities.definition.workspace.entry-view-entity.help'));
    expect(html).toContain(t('entities.definition.workspace.entry-back-to-form'));
    expect(html).toContain(t('entities.definition.workspace.entry-back-to-form.help'));
    expect(html).toContain('kind: service');
    expect(html).not.toContain('data-entity-definition-workspace-offset="angular-sidebar-flush"');
    expect(html).not.toContain('data-entity-definition-workspace-stretch="angular-right-edge"');
    expect(html).not.toContain('data-entity-definition-editor-shell="angular-three-column"');
    expect(html).not.toContain('data-entity-definition-grid="angular-right-rail"');
    expect(html).not.toContain('data-entity-definition-left-rail="true"');
    expect(html).not.toContain('data-entity-definition-format-select="angular-compact"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(source).toContain('data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"');
    expect(source).toContain('data-entity-definition-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-entity-definition-header-nesting-contract="flat-page-introduction"');
    expect(source).not.toContain('WorkbenchPage');
  });

  it('preserves inherited investigation context on definition workspace entry links', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="42"
        initialContent="kind: service"
        templates={[]}
        activities={[]}
        routeContext={{
          source: 'user-validation',
          returnTo: '/entities?search=Definition User Validation&pageSize=15&source=user-validation',
          timeRange: 'last-45m',
          monitorId: '632051474676992',
          environment: 'prod',
          entityName: 'Definition User Validation'
        }}
      />
    );

    expect(html).toContain('href="/entities/42?timeRange=last-45m');
    expect(html).toContain('href="/entities?search=Definition%20User%20Validation&amp;pageSize=15&amp;source=user-validation"');
    expect(html).toContain('entityName=Definition+User+Validation');
    expect(html).toContain('returnTo=%2Fentities%3Fsearch%3DDefinition%2BUser%2BValidation%26pageSize%3D15%26source%3Duser-validation');
    expect(html).toContain('environment=prod');
    expect(html).toContain('monitorId=632051474676992');
    expect(html).toContain('source=user-validation');
  });

  it('keeps imported entity result links anchored to import context for novice readback', async () => {
    const { buildEntityImportResultHref } = await import('./entity-definition-workspace-surface');

    expect(buildEntityImportResultHref(42)).toBe('/entities/42?returnTo=%2Fentities%2Fimport&created=1&source=entity-import');
    expect(
      buildEntityImportResultHref(42, {
        source: 'product-design-1686',
        returnTo: '/entities?search=imported&pageSize=50',
        timeRange: 'last-45m',
        monitorId: '632051474676992'
      })
    ).toBe(
      '/entities/42?timeRange=last-45m&returnTo=%2Fentities%3Fsearch%3Dimported%26pageSize%3D50&monitorId=632051474676992&source=product-design-1686&created=1'
    );
  });

  it('labels the return entry by the actual inherited target', async () => {
    const {
      EntityDefinitionWorkspaceSurface,
      resolveEntityDefinitionReturnDestination
    } = await import('./entity-definition-workspace-surface');

    expect(resolveEntityDefinitionReturnDestination('/entities', '42')).toBe('list');
    expect(resolveEntityDefinitionReturnDestination('/entities/42?source=user-validation', '42')).toBe('entity');
    expect(resolveEntityDefinitionReturnDestination('/trace/manage?traceId=abc', '42')).toBe('source');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="42"
        initialContent="kind: service"
        templates={[]}
        activities={[]}
        routeContext={{
          source: 'user-validation',
          returnTo: '/entities/42?source=user-validation'
        }}
      />
    );

    expect(html).toContain('href="/entities/42?source=user-validation"');
    expect(html).toContain(t('entities.definition.workspace.entry-back-to-entity'));
    expect(html).toContain(t('entities.definition.workspace.entry-back-to-entity.help'));
    expect(html).not.toContain(`>${t('entities.definition.workspace.entry-back-to-form')}<`);
  });

  it('falls back to the entity list context when the inherited definition return target is unsafe', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="42"
        initialContent="kind: service"
        templates={[]}
        activities={[]}
        routeContext={{
          source: 'user-validation',
          returnTo: '//evil.example/steal-session',
          timeRange: 'last-45m'
        }}
      />
    );

    expect(html).toContain('href="/entities?timeRange=last-45m&amp;returnTo=%2F%2Fevil.example%2Fsteal-session&amp;source=user-validation"');
    expect(html).not.toContain('href="//evil.example/steal-session"');
  });

  it('renders definition mode as a cold full-width editor shell without the old rail geometry', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent="kind: service"
        templates={[]}
        activities={[]}
      />
    );

    expect(html).toContain('data-entity-definition-editor-shell="otlp-hertzbeat-ui-definition-workbench"');
    expect(html).toContain('data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"');
    expect(html).toContain('data-entity-definition-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-definition-shell-spacing="hertzbeat-ui-tight"');
    expect(html).toContain('data-entity-definition-shell-height="hertzbeat-ui-content"');
    expect(html).toContain('data-entity-definition-editor-column="true"');
    expect(html).toContain('data-entity-definition-template-panel="true"');
    expect(html).toContain('data-entity-definition-batch-panel="true"');
    expect(html).toContain('data-entity-definition-format-select="hertzbeat-ui-compact-select"');
    expect(html).toContain('data-entity-definition-code-editor="definition"');
    expect(html).toContain('data-entity-definition-editor-width="hertzbeat-ui-fluid"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-entity-definition-context-panel="hertzbeat-ui-context-panel"');
    expect(html).toContain('auto-rows-min');
    expect(html).not.toContain('lg:grid-cols-[190px_minmax(0,1fr)_460px]');
    expect(html).not.toContain('data-entity-definition-left-rail-density="angular-compact-icons"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).toContain(t('entity.definition.format.label'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.save'));
    expect(html).toContain('kind: service');
  });

  it('renders recoverable definition load errors once in the cold editor instead of synthesizing YAML', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="definition"
        entityId="1"
        initialContent=""
        initialMessage="Entity not exist."
        templates={[{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service', summary: 'shared service template', source: 'workspace' } as any]}
        activities={[{ id: 1, summary: 'definition updated', detail: 'saved from yaml', status: 'success', format: 'yaml', activityType: 'update' } as any]}
      />
    );

    expect(html).toContain('data-entity-definition-load-error="hertzbeat-ui-inline-first-viewport"');
    expect(html.match(/data-entity-definition-inline-feedback=/g)).toHaveLength(1);
    expect(html).toContain('data-entity-definition-error-state="hertzbeat-ui-reference"');
    expect(html).toContain('data-entity-definition-error-placement="hertzbeat-ui-context-panel"');
    expect(html).not.toContain('lg:pt-[91px]');
    expect(html).toContain(t('entities.definition.message.entity-not-exist'));
    expect(html).toContain(t('entity.definition.import.placeholder.yaml'));
    expect(html).not.toContain('apiVersion: hertzbeat.apache.org/v1');
    expect(html).not.toContain(`1 ${han(0x4e2a, 0x6a21, 0x677f, 0x53ef, 0x7528)}`);
    expect(html).not.toContain(t('entities.definition.workspace.activity-title'));
    expect(html).not.toContain('Entity not exist.');
  });

  it('renders import mode as a cold full-width definition workbench instead of the old three-column shell', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-definition-workspace-surface.tsx'), 'utf8');

    const html = renderToStaticMarkup(
      <EntityDefinitionWorkspaceSurface
        mode="import"
        templates={[{ id: '1', name: 'base-template', format: 'yaml', content: 'kind: service', summary: 'shared service template', source: 'workspace' } as any]}
        activities={[{ id: 1, summary: 'bundle previewed', detail: 'saved from yaml', status: 'success', format: 'yaml', activityType: 'preview' } as any]}
      />
    );

    expect(html).toContain('data-entity-definition-workspace="import"');
    expect(html).toContain('data-entity-definition-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-definition-layout="full-width-workbench"');
    expect(html).toContain('min-h-[calc(100vh-64px)] min-w-0 overflow-x-hidden');
    expect(html).toContain('data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"');
    expect(html).toContain('data-entity-definition-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-definition-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('data-entity-definition-header-spacing="hertzbeat-ui-padded"');
    expect(html).toContain('data-entity-definition-editor-shell="otlp-hertzbeat-ui-import-workbench"');
    expect(html).toContain('data-entity-definition-shell-spacing="hertzbeat-ui-tight"');
    expect(html).toContain('data-entity-definition-shell-height="hertzbeat-ui-content"');
    expect(html).toContain('grid min-w-0 items-start gap-4');
    expect(html).toContain('grid min-w-0 auto-rows-min content-start gap-3');
    expect(html).toContain('data-entity-definition-import-action-row="hertzbeat-ui-inline-actions"');
    expect(html).toContain('data-entity-definition-import-action-row-nesting-contract="flat-inside-import-workbench"');
    expect(html).toContain('data-entity-definition-import-action-row-responsive="format-first-mobile"');
    expect(html).toContain('data-entity-definition-action-group="wrap-within-row"');
    expect(html).toContain('data-entity-definition-action-group-responsive="full-width-buttons-mobile"');
    expect(html).toContain('flex w-full min-w-0 flex-col items-stretch');
    expect(html).toContain('sm:w-auto sm:flex-1 sm:flex-row');
    expect((html.match(/data-entity-definition-action-help-style="icon-after-action"/g) || []).length).toBe(2);
    expect((html.match(/data-entity-definition-action-help-visual="circle-help-icon"/g) || []).length).toBe(2);
    expect((html.match(/data-entity-definition-action-help-icon="lucide-circle-help"/g) || []).length).toBe(2);
    ['format', 'action-row'].forEach(actionId => {
      expect(html).toContain(`data-entity-definition-action-help="${actionId}"`);
      expect(html).toContain(`data-entity-definition-action-help-tooltip="${actionId}"`);
    });
    expect(html).toContain('data-entity-definition-action-help-item="format"');
    ['clear-draft', 'preview', 'import'].forEach(actionId => {
      expect(html).not.toContain(`data-entity-definition-action-help="${actionId}"`);
      expect(html).not.toContain(`data-entity-definition-action-help-item="${actionId}"`);
      expect(html).not.toContain(`data-entity-definition-action-help-tooltip="${actionId}"`);
    });
    expect(html).toContain('data-entity-definition-action-row-help-contract="single-header-help"');
    expect(html).toContain('data-entity-definition-format-select="hertzbeat-ui-compact-select"');
    expect(html).toContain('data-entity-definition-command-action="change-format"');
    expect(html).toContain('data-entity-import-command-action="change-format"');
    expect(html).toContain('data-entity-definition-command-action="clear-draft"');
    expect(html).toContain('data-entity-import-command-action="clear-draft"');
    expect(html).toContain('data-entity-definition-command-action="preview"');
    expect(html).toContain('data-entity-import-command-action="preview"');
    expect(html).toContain('data-entity-definition-command-action="import"');
    expect(html).toContain('data-entity-import-command-action="import"');
    expect(html).toContain('data-entity-definition-starter-draft="hertzbeat-ui-yaml"');
    expect(html).toContain('data-entity-definition-code-editor="import"');
    expect(html).toContain('data-entity-definition-editor-format="yaml"');
    expect(html).toContain('data-entity-definition-editor-width="hertzbeat-ui-fluid"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="yaml"');
    expect(html).toContain('data-entity-definition-context-panel="hertzbeat-ui-context-panel"');
    expect(html).toContain('data-entity-definition-context-density="minimal-import"');
    expect(html).toContain('data-entity-definition-context-panel-nesting-contract="flat-inside-import-workbench"');
    expect(html).toContain('data-entity-definition-metric-strip="hertzbeat-ui-inline-counts"');
    expect((html.match(/data-entity-definition-metric-item="flat-import-count"/g) || []).length).toBe(3);
    expect(html).toContain('auto-rows-min');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain(t('entity.definition.format.label'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.import'));
    expect(html).toContain(t('entity.definition.action.row.import-help'));
    expect(html).toContain('data-entity-definition-clear-draft="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-entity-definition-clear-draft-state="closed"');
    expect(html).toContain(t('entity.definition.import.preview-required-hint'));
    expect(html).toContain('data-entity-definition-import-preview-required="true"');
    expect(html).toContain('data-entity-definition-save-disabled-reason="preview-required"');
    expect(html).toContain('aria-describedby="entity-definition-import-preview-required"');
    expect(source).toContain('const importBlockedByPreviewGaps = mode ===');
    expect(source).toContain("data-entity-definition-import-attention-required=\"true\"");
    expect(source).toContain("t('entity.definition.import.attention-required-hint')");
    expect(source).toContain("'attention-required'");
    expect(html).toContain('apiVersion: hertzbeat/v1');
    expect(html).toContain('kind: service');
    expect(html).toContain('telemetry:');
    expect(html).toContain('key: service.name');
    expect(html).toContain('runbook: https://runbooks.example.com/checkout');
    expect(html).not.toContain('base-template');
    expect(html).not.toContain('bundle previewed');
    expect(html).not.toContain(t('entities.definition.workspace.batch-title'));
    expect(html).not.toContain(t('entities.definition.workspace.activity-title'));
    expect(html).not.toContain(t('entity.definition.import.summary.attention'));
    expect(html).not.toContain('data-entity-definition-workspace-offset="angular-sidebar-flush"');
    expect(html).not.toContain('data-entity-definition-workspace-stretch="angular-right-edge"');
    expect(html).not.toContain('class="-mx-4 -mb-3 -mt-4');
    expect(html).not.toContain('data-entity-definition-editor-shell="angular-three-column"');
    expect(html).not.toContain('data-entity-definition-shell-spacing="angular-flush"');
    expect(html).not.toContain('data-entity-definition-shell-height="angular-viewport"');
    expect(html).not.toContain('data-observability-kicker="plain"');
    expect(html).not.toContain('data-entity-definition-left-rail="true"');
    expect(html).not.toContain('data-entity-definition-left-rail-density="angular-compact-icons"');
    expect(html).not.toContain('data-entity-definition-right-panel-density="angular-sparse"');
    expect(html).not.toContain('data-entity-definition-right-panel-placement="angular-lower-collapsed"');
    expect(html).not.toContain('data-entity-definition-starter-draft="angular-yaml"');
    expect(html).not.toContain('data-entity-definition-editor-width="angular-narrow"');
    expect(html).not.toContain('data-entity-definition-format-select="angular-compact"');
    expect(html).not.toContain('data-entity-definition-import-action-bar="angular-shell-top-right"');
    expect(html).not.toContain('absolute right-3.5 top-3.5 z-10');
    expect(html).not.toContain('Import Format');
    expect(html).not.toContain('Clear draft');
    expect(html).not.toContain('Preview Definitions');
    expect(html).not.toContain('Import Entities');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(source).toContain('setContent(getImportStarterDraft(nextFormat))');
    expect(source).toContain('data-entity-import-command-action="open-created-entity"');
    expect(source).toContain('data-entity-import-command-action={`filter-preview-${group.scope}`}');
    expect(source).toContain('data-entity-definition-workspace-frame="hertzbeat-ui-unframed-workspace"');
    expect(source).toContain('data-entity-definition-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-entity-definition-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain("from '@/components/ui/hz-code-editor'");
    expect(source).toContain('CircleHelp');
    expect(source).toContain('data-entity-definition-action-help-style="icon-after-action"');
    expect(source).toContain('data-entity-definition-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-definition-action-help-icon="lucide-circle-help"');
    expect(source).not.toContain('data-entity-definition-action-help-style="literal-question-after-action"');
    expect(source).not.toContain('data-entity-definition-action-help-visual="borderless-question"');
    expect(source).not.toContain('<span aria-hidden="true">?</span>');
    expect(source).not.toContain('EditorRow');
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
    expect(source).not.toContain('WorkbenchPage');
  });

  it('keeps large import previews bounded after parsing while preserving overflow feedback', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const { parseDefinitionBundle } = await import('@/lib/entity-import/controller');
    const container = document.createElement('div');
    let root: Root | null = null;
    document.body.appendChild(container);
    vi.mocked(parseDefinitionBundle).mockResolvedValueOnce(
      Array.from({ length: 250 }, (_, index) => ({
        entity: {
          type: 'service',
          name: `entity-${index}`,
          namespace: 'commerce'
        }
      }))
    );

    try {
      root = createRoot(container);
      await act(async () => {
        root?.render(
          <EntityDefinitionWorkspaceSurface
            mode="import"
            initialContent="kind: service"
            templates={[]}
            activities={[]}
          />
        );
        await Promise.resolve();
      });

      const previewButton = container.querySelector<HTMLButtonElement>('[data-entity-import-command-action="preview"]');
      expect(previewButton).not.toBeNull();

      await act(async () => {
        previewButton?.click();
        await Promise.resolve();
      });

      const previewRows = container.querySelector('[data-entity-import-preview-rows-scroll="bounded-large-batch"]');
      expect(previewRows?.textContent).toContain('entity-0');
      expect(previewRows?.textContent).toContain('entity-99');
      expect(previewRows?.textContent).not.toContain('entity-100');
      expect(container.querySelector('[data-entity-import-preview-overflow="bounded-visible-row-limit"]')?.textContent).toContain(
        t('entity.definition.import.preview-overflow', { count: 150, limit: 100 })
      );
      expect(container.textContent).toContain(t('entity.definition.import.activity.preview-many', { count: 250 }));
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      container.remove();
    }
  });

  it('keeps large import result links bounded after creating a big entity batch', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');
    const { createDefinitionBundle, parseDefinitionBundle } = await import('@/lib/entity-import/controller');
    const container = document.createElement('div');
    let root: Root | null = null;
    document.body.appendChild(container);
    vi.mocked(parseDefinitionBundle).mockResolvedValueOnce(
      Array.from({ length: 250 }, (_, index) => ({
        entity: {
          type: 'service',
          name: `entity-${index}`,
          namespace: 'commerce'
        }
      }))
    );
    vi.mocked(createDefinitionBundle).mockResolvedValueOnce(Array.from({ length: 250 }, (_, index) => 700000 + index));

    try {
      root = createRoot(container);
      await act(async () => {
        root?.render(
          <EntityDefinitionWorkspaceSurface
            mode="import"
            initialContent="kind: service"
            templates={[]}
            activities={[]}
          />
        );
        await Promise.resolve();
      });

      const previewButton = container.querySelector<HTMLButtonElement>('[data-entity-import-command-action="preview"]');
      expect(previewButton).not.toBeNull();

      await act(async () => {
        previewButton?.click();
        await Promise.resolve();
      });

      const importButton = container.querySelector<HTMLButtonElement>('[data-entity-import-command-action="import"]');
      expect(importButton).not.toBeNull();
      expect(importButton?.disabled).toBe(false);

      await act(async () => {
        importButton?.click();
        await Promise.resolve();
      });

      const resultLinks = container.querySelector('[data-entity-import-result-links="created-entities"]');
      expect(resultLinks?.getAttribute('data-entity-import-result-links-total')).toBe('250');
      expect(resultLinks?.getAttribute('data-entity-import-result-links-rendered')).toBe('100');
      expect(resultLinks?.getAttribute('data-entity-import-result-links-limit')).toBe('100');
      expect(resultLinks?.getAttribute('data-entity-import-result-links-overflow')).toBe('bounded-created-links');
      expect(resultLinks?.getAttribute('class')).toContain('bg-[#101217]');
      expect(resultLinks?.getAttribute('class')).not.toContain('bg-[#101914]');
      expect(container.querySelectorAll('[data-entity-import-command-action="open-created-entity"]')).toHaveLength(100);
      expect(resultLinks?.textContent).toContain(t('entity.definition.import.result-view-entity', { id: '700000' }));
      expect(resultLinks?.textContent).toContain(t('entity.definition.import.result-view-entity', { id: '700099' }));
      expect(resultLinks?.textContent).not.toContain(t('entity.definition.import.result-view-entity', { id: '700100' }));
      expect(container.querySelector('[data-entity-import-result-links-overflow-message="bounded-created-links"]')?.textContent).toContain(
        t('entity.definition.import.result-overflow', { count: 150, limit: 100 })
      );
      expect(container.textContent).toContain(t('entity.definition.import.success-bundle', { count: 250 }));
    } finally {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
      }
      container.remove();
    }
  });

  it('keeps the import starter draft in sync with the selected format', () => {
    const yaml = getImportStarterDraft('yaml');
    const json = getImportStarterDraft('json');
    const curl = getImportStarterDraft('curl');

    expect(yaml).toContain('apiVersion: hertzbeat/v1');
    expect(yaml).toContain('kind: service');
    expect(yaml).toContain('runbook: https://runbooks.example.com/checkout');
    expect(yaml).toContain('implementedBy:');
    expect(yaml).toContain('telemetry:');
    expect(yaml).toContain('identities:');
    expect(yaml).toContain('key: service.name');
    expect(yaml).toContain('primary: true');
    expect(json).toContain('"apiVersion": "hertzbeat/v1"');
    expect(json).toContain('"kind": "service"');
    expect(json).toContain('"runbook": "https://runbooks.example.com/checkout"');
    expect(json).toContain('"implementedBy"');
    expect(json).toContain('"telemetry"');
    expect(json).toContain('"identities"');
    expect(json).toContain('"key": "service.name"');
    expect(curl).toContain('curl -X POST');
    expect(curl).toContain('"format":"yaml"');
    expect(curl).toContain('telemetry:');
    expect(curl).toContain('service.name');
    expect(json).not.toContain('apiVersion: hertzbeat/v1');
    expect(curl).not.toContain('"kind": "system"');
  });
});
