import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { getImportStarterDraft } from './entity-definition-workspace-surface';

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

vi.mock('@/components/ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, language, onChange: _onChange, ...props }: any) => (
    <div
      data-entity-definition-code-editor={props['data-entity-definition-code-editor']}
      data-entity-definition-editor-format={props['data-entity-definition-editor-format']}
      data-entity-definition-editor-width={props['data-entity-definition-editor-width']}
      data-entity-definition-starter-draft={props['data-entity-definition-starter-draft']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
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
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
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
  buildImportPreviewRows: () => [],
  buildImportQueueGroups: () => [],
  buildImportSummaryFacts: () => [],
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
    expect(source).toContain("t('entities.definition.workspace.entry-back-to-form')");
    expect(source).toContain("t('entities.definition.message.load-failed')");
    expect(source).toContain("t('entities.definition.message.entity-not-exist')");
    expect(source).toContain("t('entities.definition.message.process-failed')");
    expect(source).toContain("t('entities.definition.message.update-missing-entity')");
    expect(source).toContain("t('entities.definition.message.update-failed')");
    expect(source).toContain("t('entities.definition.message.updated')");
    expect(source).toContain("t('entity.definition.import.empty-preview')");
    expect(source).toContain("t('entity.definition.import.empty-save')");
    expect(source).toContain("t('entity.definition.import.empty-import')");
    expect(source).toContain("t('entity.definition.import.activity.preview-one')");
    expect(source).toContain("t('entity.definition.import.activity.preview-many', { count: rows.length })");
    expect(source).toContain("t('entity.definition.import.parse-failed')");
    expect(source).toContain("t('entity.definition.workspace.single-required')");
    expect(source).toContain("t('entity.definition.import.blocked')");
    expect(source).toContain("t('entity.definition.import.success-bundle', { count: entityIds.length })");
    expect(source).toContain("t('entity.definition.import.success-single')");
    expect(source).toContain("t('entity.definition.import.create-failed')");
    expect(source).toContain("t('entity.definition.import.placeholder.yaml')");
    expect(source).toContain("t('entity.definition.import.placeholder.json')");
    expect(source).toContain("t('entity.definition.import.placeholder.curl')");
    expect(source).toContain('localizeEntityDefinitionMessage(error.message, t)');
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
    expect(html).toContain('data-entity-definition-load-error="cold-inline"');
    expect(html).toContain(
      t('entities.definition.message.backend-fallback', { message: 'Backend parser saw custom-field drift.' })
    );
    expect(html).toContain(t('entities.definition.workspace.template-error-help'));
  });

  it('renders the shared edit-definition workspace with the cold full-width workbench contract', async () => {
    const { EntityDefinitionWorkspaceSurface } = await import('./entity-definition-workspace-surface');

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
    expect(html).toContain('data-entity-definition-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-definition-layout="full-width-workbench"');
    expect(html).toContain('data-entity-definition-editor-shell="otlp-cold-definition-workbench"');
    expect(html).toContain('data-entity-definition-shell-spacing="cold-tight"');
    expect(html).toContain('data-entity-definition-shell-height="cold-content"');
    expect(html).toContain('data-entity-definition-action-row="cold-inline-actions"');
    expect(html).toContain('data-entity-definition-editor-column="true"');
    expect(html).toContain('data-entity-definition-format-select="cold-compact-select"');
    expect(html).toContain('data-entity-definition-code-editor="definition"');
    expect(html).toContain('data-entity-definition-editor-width="cold-fluid"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="yaml"');
    expect(html).toContain('data-entity-definition-context-panel="cold-context-panel"');
    expect(html).toContain('data-entity-definition-metric-strip="cold-inline-counts"');
    expect(html).toContain('auto-rows-min');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain(t('entities.definition.workspace.kicker'));
    expect(html).toContain(t('entities.definition.workspace.title'));
    expect(html).toContain(t('entities.definition.workspace.subtitle'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.save'));
    expect(html).toContain('YAML');
    expect(html).toContain('JSON');
    expect(html).toContain('cURL');
    expect(html).toContain(t('entities.definition.workspace.batch-title'));
    expect(html).toContain(t('entities.definition.workspace.template-title'));
    expect(html).toContain(t('entities.definition.workspace.activity-title'));
    expect(html).toContain(t('entities.definition.workspace.metric.ready'));
    expect(html).toContain(t('entities.definition.workspace.metric.attention'));
    expect(html).toContain(t('entities.definition.workspace.metric.telemetry-gaps'));
    expect(html).toContain(t('entities.definition.workspace.entry-view-entity'));
    expect(html).toContain(t('entities.definition.workspace.entry-back-to-form'));
    expect(html).toContain('kind: service');
    expect(html).not.toContain('data-entity-definition-workspace-offset="angular-sidebar-flush"');
    expect(html).not.toContain('data-entity-definition-workspace-stretch="angular-right-edge"');
    expect(html).not.toContain('data-entity-definition-editor-shell="angular-three-column"');
    expect(html).not.toContain('data-entity-definition-grid="angular-right-rail"');
    expect(html).not.toContain('data-entity-definition-left-rail="true"');
    expect(html).not.toContain('data-entity-definition-format-select="angular-compact"');
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

    expect(html).toContain('data-entity-definition-editor-shell="otlp-cold-definition-workbench"');
    expect(html).toContain('data-entity-definition-shell-spacing="cold-tight"');
    expect(html).toContain('data-entity-definition-shell-height="cold-content"');
    expect(html).toContain('data-entity-definition-editor-column="true"');
    expect(html).toContain('data-entity-definition-template-panel="true"');
    expect(html).toContain('data-entity-definition-batch-panel="true"');
    expect(html).toContain('data-entity-definition-format-select="cold-compact-select"');
    expect(html).toContain('data-entity-definition-code-editor="definition"');
    expect(html).toContain('data-entity-definition-editor-width="cold-fluid"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-entity-definition-context-panel="cold-context-panel"');
    expect(html).toContain('auto-rows-min');
    expect(html).not.toContain('lg:grid-cols-[190px_minmax(0,1fr)_460px]');
    expect(html).not.toContain('data-entity-definition-left-rail-density="angular-compact-icons"');
    expect(html).toContain(t('entity.definition.format.label'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.save'));
    expect(html).toContain('kind: service');
  });

  it('renders recoverable definition load errors in the cold editor context panel instead of synthesizing YAML', async () => {
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

    expect(html).toContain('data-entity-definition-load-error="cold-inline"');
    expect(html).toContain('data-entity-definition-error-state="cold-reference"');
    expect(html).toContain('data-entity-definition-error-placement="cold-context-panel"');
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
    expect(html).toContain('data-entity-definition-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-definition-layout="full-width-workbench"');
    expect(html).toContain('data-entity-definition-header-spacing="cold-padded"');
    expect(html).toContain('data-entity-definition-editor-shell="otlp-cold-import-workbench"');
    expect(html).toContain('data-entity-definition-shell-spacing="cold-tight"');
    expect(html).toContain('data-entity-definition-shell-height="cold-content"');
    expect(html).toContain('data-entity-definition-import-action-row="cold-inline-actions"');
    expect(html).toContain('data-entity-definition-format-select="cold-compact-select"');
    expect(html).toContain('data-entity-definition-starter-draft="cold-yaml"');
    expect(html).toContain('data-entity-definition-code-editor="import"');
    expect(html).toContain('data-entity-definition-editor-format="yaml"');
    expect(html).toContain('data-entity-definition-editor-width="cold-fluid"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="yaml"');
    expect(html).toContain('data-entity-definition-context-panel="cold-context-panel"');
    expect(html).toContain('data-entity-definition-context-density="minimal-import"');
    expect(html).toContain('data-entity-definition-metric-strip="cold-inline-counts"');
    expect(html).toContain('auto-rows-min');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain(t('entity.definition.format.label'));
    expect(html).toContain(t('entity.definition.action.clear-draft'));
    expect(html).toContain(t('entity.definition.action.preview'));
    expect(html).toContain(t('entity.definition.action.import'));
    expect(html).toContain('apiVersion: hertzbeat/v1');
    expect(html).toContain('kind: system');
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
    expect(source).toContain('setContent(getImportStarterDraft(nextFormat))');
    expect(source).toContain("from '@/components/ui/cold-code-editor'");
    expect(source).not.toContain('EditorRow');
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
  });

  it('keeps the import starter draft in sync with the selected format', () => {
    const yaml = getImportStarterDraft('yaml');
    const json = getImportStarterDraft('json');
    const curl = getImportStarterDraft('curl');

    expect(yaml).toContain('apiVersion: hertzbeat/v1');
    expect(yaml).toContain('kind: system');
    expect(json).toContain('"apiVersion": "hertzbeat/v1"');
    expect(json).toContain('"kind": "system"');
    expect(curl).toContain('curl -X POST');
    expect(curl).toContain('"format":"yaml"');
    expect(json).not.toContain('apiVersion: hertzbeat/v1');
    expect(curl).not.toContain('"kind": "system"');
  });
});
