import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { getImportStarterDraft } from './entity-definition-workspace-surface';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'entities.definition.workspace.kicker': '实体定义',
        'entities.definition.workspace.title': '编辑实体定义',
        'entities.definition.workspace.subtitle': '直接编辑当前定义。保存后会同步更新基础信息、遥测绑定和依赖。',
        'entities.definition.workspace.format-help': '支持 YAML、JSON 和 cURL 请求内容，保存前可先预览解析结果。',
        'entities.definition.workspace.attribution-check': '归因检查',
        'entities.definition.workspace.attribution-state.ready': '已就绪',
        'entities.definition.workspace.attribution-state.missing': '需补齐',
        'entities.definition.workspace.attribution-state.unknown': '待确认',
        'entities.definition.workspace.metric.ready': '可直接导入',
        'entities.definition.workspace.metric.attention': '待完善',
        'entities.definition.workspace.metric.telemetry-gaps': '缺少遥测绑定',
        'entities.definition.workspace.current-definition': '当前定义',
        'entities.definition.workspace.template-title': '自定义模板',
        'entities.definition.workspace.template-error-help': '定义加载失败后可先确认实体是否存在，再继续编辑。',
        'entities.definition.workspace.template-empty-title': '暂无模板',
        'entities.definition.workspace.template-empty-copy': '可复用模板会显示在这里。',
        'entities.definition.workspace.batch-title': '模板与批量编辑',
        'entities.definition.workspace.batch-copy': '查看模板、草稿来源和可选操作。',
        'entities.definition.workspace.batch-expand': '展开',
        'entities.definition.workspace.activity-title': '最近活动',
        'entities.definition.workspace.activity-empty-title': '暂无最近活动',
        'entities.definition.workspace.activity-empty-copy': '预览和导入活动会显示在这里。',
        'entities.definition.workspace.entry-title': '入口',
        'entities.definition.workspace.entry-view-entity': '查看实体',
        'entities.definition.workspace.entry-back-to-form': '回到表单',
        'entities.definition.message.load-failed': '加载实体定义失败。',
        'entities.definition.message.entity-not-exist': '实体不存在。',
        'entities.definition.message.process-failed': '实体定义处理失败。',
        'entities.definition.message.update-missing-entity': '无法确认要更新的实体定义。',
        'entities.definition.message.update-failed': '实体定义保存失败。',
        'entities.definition.message.updated': '实体定义已更新。',
        'entities.definition.message.backend-fallback': '后端返回：{{message}}',
        'entity.definition.import.empty-preview': '请先粘贴定义，再预览。',
        'entity.definition.import.empty-save': '请先粘贴或加载定义，再保存。',
        'entity.definition.import.empty-import': '请先粘贴定义，再导入。',
        'entity.definition.import.activity.preview-one': '已预览 1 个定义。',
        'entity.definition.import.activity.preview-many': '已预览 {{count}} 个定义。',
        'entity.definition.import.parse-failed': '定义解析失败。',
        'entity.definition.workspace.single-required': '编辑已有实体时一次只能保存一个定义文档。',
        'entity.definition.import.blocked': '部分定义仍需处理，请检查后再导入。',
        'entity.definition.import.success-bundle': '已导入 {{count}} 个实体。',
        'entity.definition.import.success-single': '实体定义已导入。',
        'entity.definition.import.create-failed': '实体导入失败。',
        'entity.definition.import.placeholder.yaml': '粘贴 YAML 实体定义，编辑器会解析基础信息、遥测绑定和依赖关系。',
        'entity.definition.import.placeholder.json': '粘贴 JSON 实体定义，编辑器会解析基础信息、遥测绑定和依赖关系。',
        'entity.definition.import.placeholder.curl': '粘贴从预览或自动化流程生成的 cURL 请求。',
        'entity.definition.format.label': '导入格式',
        'entity.definition.format.option.yaml': 'YAML 格式',
        'entity.definition.format.option.json': 'JSON 格式',
        'entity.definition.format.option.curl': 'cURL 格式',
        'entity.definition.action.clear-draft': '清空草稿',
        'entity.definition.action.preview': '预览定义',
        'entity.definition.action.save': '保存定义',
        'entity.definition.action.import': '导入实体',
        'entities.import.workspace.title': '导入实体定义',
        'entities.import.workspace.subtitle': '从 YAML、JSON 或 cURL 请求内容导入一个或多个实体定义，先预览再写入目录。',
        'entities.import.workspace.format-help': '支持 YAML、JSON 和从预览或自动化流程生成的 cURL。导入前会先解析实体基础信息、遥测绑定和依赖关系。'
      }
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
    expect(source).not.toContain('>归因检查<');
    expect(source).not.toContain("return '已就绪'");
    expect(source).not.toContain("return '需补齐'");
    expect(source).not.toContain("return '待确认'");
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
    expect(source).not.toContain("label: '可直接导入'");
    expect(source).not.toContain("label: '待完善'");
    expect(source).not.toContain("label: '缺少遥测绑定'");
    expect(source).not.toContain('>当前定义<');
    expect(source).not.toContain('>自定义模板<');
    expect(source).not.toContain('定义加载失败后可先确认实体是否存在，再继续编辑。');
    expect(source).not.toContain("title: '暂无模板'");
    expect(source).not.toContain("copy: '可复用模板会显示在这里。'");
    expect(source).not.toContain('>模板与批量编辑<');
    expect(source).not.toContain('查看模板、草稿来源和可选操作。');
    expect(source).not.toContain('>展开<');
    expect(source).not.toContain('>最近活动<');
    expect(source).not.toContain("title: '暂无最近活动'");
    expect(source).not.toContain("copy: '预览和导入活动会显示在这里。'");
    expect(source).not.toContain('>入口<');
    expect(source).not.toContain('>查看实体<');
    expect(source).not.toContain('>回到表单<');
    expect(source).not.toContain('加载实体定义失败。');
    expect(source).not.toContain('请先粘贴定义，再预览。');
    expect(source).not.toContain('已预览 1 个定义。');
    expect(source).not.toContain('定义解析失败。');
    expect(source).not.toContain('请先粘贴或加载定义，再保存。');
    expect(source).not.toContain('请先粘贴定义，再导入。');
    expect(source).not.toContain('编辑已有实体时一次只能保存一个定义文档。');
    expect(source).not.toContain('无法确认要更新的实体定义。');
    expect(source).not.toContain('实体定义已更新。');
    expect(source).not.toContain('实体定义保存失败。');
    expect(source).not.toContain('部分定义仍需处理，请检查后再导入。');
    expect(source).not.toContain('实体定义已导入。');
    expect(source).not.toContain('实体导入失败。');
    expect(source).not.toContain('实体不存在。');
    expect(source).not.toContain('实体定义处理失败。');
    expect(source).not.toContain('粘贴 YAML 实体定义，编辑器会解析基础信息、遥测绑定和依赖关系。');
    expect(source).not.toContain('粘贴 JSON 实体定义，编辑器会解析基础信息、遥测绑定和依赖关系。');
    expect(source).not.toContain('粘贴从预览或自动化流程生成的 cURL 请求。');
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
    expect(html).toContain('YAML 格式');
    expect(html).toContain('JSON 格式');
    expect(html).toContain('cURL 格式');
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
    expect(html).toContain('后端返回：Backend parser saw custom-field drift.');
    expect(html).toContain('定义加载失败后可先确认实体是否存在，再继续编辑。');
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
    expect(html).toContain('实体定义');
    expect(html).toContain('编辑实体定义');
    expect(html).toContain('直接编辑当前定义。保存后会同步更新基础信息、遥测绑定和依赖。');
    expect(html).toContain('清空草稿');
    expect(html).toContain('预览定义');
    expect(html).toContain('保存定义');
    expect(html).toContain('YAML');
    expect(html).toContain('JSON');
    expect(html).toContain('cURL');
    expect(html).toContain('模板与批量编辑');
    expect(html).toContain('自定义模板');
    expect(html).toContain('最近活动');
    expect(html).toContain('可直接导入');
    expect(html).toContain('待完善');
    expect(html).toContain('缺少遥测绑定');
    expect(html).toContain('查看实体');
    expect(html).toContain('回到表单');
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
    expect(html).toContain('导入格式');
    expect(html).toContain('清空草稿');
    expect(html).toContain('预览定义');
    expect(html).toContain('保存定义');
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
    expect(html).toContain('实体不存在。');
    expect(html).toContain('粘贴 YAML 实体定义，编辑器会解析基础信息、遥测绑定和依赖关系。');
    expect(html).not.toContain('apiVersion: hertzbeat.apache.org/v1');
    expect(html).not.toContain('1 个模板可用');
    expect(html).not.toContain('最近活动');
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
    expect(html).toContain('导入格式');
    expect(html).toContain('清空草稿');
    expect(html).toContain('预览定义');
    expect(html).toContain('导入实体');
    expect(html).toContain('apiVersion: hertzbeat/v1');
    expect(html).toContain('kind: system');
    expect(html).not.toContain('base-template');
    expect(html).not.toContain('bundle previewed');
    expect(html).not.toContain('模板与批量编辑');
    expect(html).not.toContain('最近活动');
    expect(html).not.toContain('待补充');
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
