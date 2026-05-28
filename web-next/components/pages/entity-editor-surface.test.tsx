import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.button.cancel': '取消',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.saving': '保存中',
        'common.remove': '移除',
        'common.item': '项目',
        'common.save-success': '保存成功',
        'common.save-failed': '保存失败',
        'entities.editor.json.invalid': '{{label}} 第 {{index}} 项不是合法 JSON',
        'entities.editor.message.create-success': '已创建实体 #{{id}}',
        'entities.editor.submit.create': '创建实体',
        'entities.editor.stage.basic.label': '基本信息',
        'entities.editor.stage.basic.description': '先确认类型、名称和核心元数据。',
        'entities.editor.stage.ownership.label': '归属与处置',
        'entities.editor.stage.ownership.description': '补齐负责人、联系人和处置入口。',
        'entities.editor.stage.signals.label': '证据关联',
        'entities.editor.stage.signals.description': '绑定监控、身份标识和遥测证据。',
        'entities.editor.stage.relations.label': '关系与扩展',
        'entities.editor.stage.relations.description': '记录上下游关系、标签和扩展字段。',
        'entities.editor.route-tab.detail': '实体详情',
        'entities.editor.route-tab.monitor': '监控中心',
        'entities.editor.route-tab.logs': '日志管理与统计',
        'entities.editor.route-tab.traces': '链路',
        'entities.editor.shell.kicker': '实体',
        'entities.editor.shell.title.new': '新建实体',
        'entities.editor.shell.title.edit': '编辑实体',
        'entities.editor.shell.copy.new': '先在页面中建立实体记录，再逐步补齐证据、负责人和依赖关系。',
        'entities.editor.shell.copy.edit': '先在页面中建立实体记录，再逐步补充证据、负责人和依赖关系。',
        'entities.editor.shell.freshness.new': '0% 最近更新',
        'entities.editor.shell.freshness.edit': '75% 最近更新',
        'entities.editor.shell.all-entities': '全部实体',
        'entities.editor.shell.definition-workspace': '定义工作区',
        'entities.editor.shell.entity-label': '实体',
        'entities.editor.shell.preview.show': '显示快照',
        'entities.editor.shell.preview.hide': '隐藏快照',
        'entities.editor.shell.definition-version': '定义版本 · HertzBeat v1 / OTel 资源规范',
        'entities.editor.shell.name-label': '名称',
        'entities.editor.shell.name-placeholder': '实体唯一名称',
        'entities.editor.shell.type-label': '类型',
        'entities.editor.shell.entry-source-label': '录入来源',
        'entities.editor.shell.stage-label': '编辑阶段',
        'entities.editor.shell.preview-rail.title': '实体元数据',
        'entities.editor.shell.preview-rail.copy': '查看或粘贴定义，应用到表单。',
        'entities.editor.shell.definition-content.title': '定义内容',
        'entities.editor.shell.definition-content.copy': '查看或粘贴定义，应用到表单。',
        'entities.editor.mode.editor': '表单',
        'entities.editor.type.system.label': '系统',
        'entities.editor.type.system.description': '业务域或产品线',
        'entities.editor.type.service.label': '服务',
        'entities.editor.type.service.description': '对外提供业务能力的应用或接口',
        'entities.editor.type.host.label': '主机',
        'entities.editor.type.host.description': '承载服务的运行节点',
        'entities.editor.type.database.label': '数据库',
        'entities.editor.type.database.description': '数据持久化实例',
        'entities.editor.type.queue.label': '队列',
        'entities.editor.type.queue.description': '异步消息通道',
        'entities.editor.type.middleware.label': '中间件',
        'entities.editor.type.middleware.description': '共享基础组件',
        'entities.editor.type.api.label': 'API',
        'entities.editor.type.api.description': '接口或网关资源',
        'entities.editor.type.endpoint.label': '端点',
        'entities.editor.type.endpoint.description': '可观测访问入口',
        'entities.editor.type.device.label': '设备',
        'entities.editor.type.device.description': '网络或边缘设备',
        'entities.editor.type.k8s-workload.label': 'K8s 工作负载',
        'entities.editor.type.k8s-workload.description': 'K8s 原生工作负载',
        'entities.editor.entry-source.manual': '页面录入',
        'entities.editor.entry-source.telemetry': '遥测发现',
        'entities.editor.entry-source.definition': '定义优先',
        'entities.editor.telemetry-handoff.title': '遥测发现',
        'entities.editor.telemetry-handoff.copy': '先通过监控和 OTel 资源字段识别实体，再补充基础信息。',
        'entities.editor.telemetry-handoff.monitor-count': '{{count}} 个监控绑定',
        'entities.editor.telemetry-handoff.identity-count': '{{count}} 个身份标识',
        'entities.editor.telemetry-handoff.attribution-check': '归因检查',
        'entities.editor.field.display-name': '显示名称',
        'entities.editor.field.namespace': '命名空间',
        'entities.editor.field.environment': '环境',
        'entities.editor.field.subtype': '子类型',
        'entities.editor.field.owner': '负责人',
        'entities.editor.field.system': '所属系统',
        'entities.editor.field.source': '来源',
        'entities.editor.field.description': '描述',
        'entities.editor.field.description-placeholder': '例如负责交易结算和支付编排。',
        'entities.editor.field.runbook': '运行手册',
        'entities.editor.placeholder.display-name': '例如 Checkout API',
        'entities.editor.placeholder.namespace': '例如 commerce',
        'entities.editor.placeholder.environment': '例如 prod',
        'entities.editor.placeholder.subtype': '例如 http',
        'entities.editor.placeholder.owner': '例如 payments-team',
        'entities.editor.placeholder.system': '例如 website',
        'entities.editor.placeholder.source': 'manual',
        'entities.editor.contact.title': '联系人',
        'entities.editor.contact.add': '新增联系人',
        'entities.editor.contact.name-placeholder': '联系人',
        'entities.editor.contact.type-placeholder': '类型',
        'entities.editor.contact.value-placeholder': '联系方式',
        'entities.editor.contact.contact-placeholder': '联系字段',
        'entities.editor.link.title': '链接',
        'entities.editor.link.add': '新增链接',
        'entities.editor.link.name-placeholder': '链接名称',
        'entities.editor.link.type-placeholder': '类型',
        'entities.editor.link.provider-placeholder': '提供方',
        'entities.editor.link.url-placeholder': '链接地址',
        'entities.editor.collection.identities': '身份标识',
        'entities.editor.collection.identities.add': '新增身份标识',
        'entities.editor.collection.monitor-binds': '监控绑定',
        'entities.editor.collection.monitor-binds.add': '新增监控绑定',
        'entities.editor.collection.relations': '关系',
        'entities.editor.collection.relations.add': '新增关系',
        'entities.editor.relation.component-of': '上级组件',
        'entities.editor.relation.components': '下级组件',
        'entities.editor.relation.implemented-by': '实现服务',
        'entities.editor.relation.languages': '开发语言',
        'entities.editor.relation.component-of-placeholder': 'payment-platform, commerce',
        'entities.editor.relation.components-placeholder': 'checkout-ui, order-router',
        'entities.editor.relation.implemented-by-placeholder': 'checkout-api, order-worker',
        'entities.editor.relation.languages-placeholder': 'java, typescript',
        'entities.editor.relation.labels': '标签',
        'entities.editor.relation.label-key': '标签键',
        'entities.editor.relation.label-value': '标签值',
        'entities.editor.relation.label-add': '新增标签',
        'entities.editor.definition.aria.yaml': 'YAML 定义快照',
        'entities.editor.definition.aria.json': 'JSON 定义快照'
      }
    })
  })
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'btn'
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-cold-textarea-owner="cold-textarea" {...props} />
}));

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, language, minHeight, readOnly, onChange: _onChange, ...props }: any) => (
    <div
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-min-height={minHeight}
      data-cold-code-editor-readonly={readOnly ? 'true' : undefined}
      data-entity-editor-json-code-editor={props['data-entity-editor-json-code-editor']}
      data-entity-editor-definition-code-editor={props['data-entity-editor-definition-code-editor']}
      data-entity-editor-definition-preview={props['data-entity-editor-definition-preview']}
    >
      {props.name ? <input type="hidden" name={props.name} value={value} /> : null}
      {value}
    </div>
  )
}));

vi.mock('@/components/workbench/primitives', () => ({
  RailSection: ({ title, copy, children }: any) => (
    <section data-rail-section="true">
      <h3>{title}</h3>
      <p>{copy}</p>
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
  WorkbenchInsetPanel: ({ as: Component = 'div', children, ...props }: any) => (
    <Component data-workbench-inset-panel="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchPillButton: ({ as: Component = 'button', children, active: _active, size: _size, ...props }: any) => (
    <Component data-workbench-pill-button="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchSelectableCard: ({ as: Component = 'button', children, active: _active, density: _density, ...props }: any) => (
    <Component data-workbench-selectable-card="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchStack: ({ children }: any) => <div data-workbench-stack="true">{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <div data-workbench-main="true">{main}</div>
      {side ? <aside data-workbench-side="true">{side}</aside> : null}
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('@/lib/entity-editor/collection-state', () => ({
  addJsonRow: (rows: string[]) => [...rows, '{}'],
  addObjectRow: (rows: any[]) => [...rows, {}],
  ensureJsonRows: (rows: string[]) => (rows.length > 0 ? rows : ['{}']),
  ensureObjectRows: (rows: any[]) => (rows.length > 0 ? rows : [{}]),
  removeJsonRow: (rows: string[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  removeObjectArrayItem: (rows: any[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  updateJsonRow: (rows: string[], index: number, value: string) => rows.map((row, currentIndex) => (currentIndex === index ? value : row)),
  updateObjectArrayItem: (rows: any[], index: number, value: Record<string, unknown>) =>
    rows.map((row, currentIndex) => (currentIndex === index ? { ...row, ...value } : row))
}));

vi.mock('@/lib/entity-editor/controller', () => ({
  buildEntityPayload: ({ draft }: any) => draft,
  saveEntityPayload: vi.fn(async (_mode: string, _payload: unknown, copy: any) => copy.saveSuccessMessage)
}));

vi.mock('@/lib/entity-editor/editor-state', () => ({
  appendCommaSeparatedValue: (value: string, nextValue: string) => (value ? `${value}, ${nextValue}` : nextValue),
  ensureKeyValueRows: (rows: Array<{ key: string; value: string }>) => (rows.length > 0 ? rows : [{ key: '', value: '' }]),
  removeRowAt: (rows: any[], index: number) => rows.filter((_, currentIndex) => currentIndex !== index),
  seedFirstLinkProvider: (rows: any[], provider: string) =>
    rows.length > 0 ? rows.map((row, index) => (index === 0 ? { ...row, provider } : row)) : [{ provider }],
  updateRowAt: (rows: any[], index: number, value: Record<string, unknown>) =>
    rows.map((row, currentIndex) => (currentIndex === index ? { ...row, ...value } : row))
}));

vi.mock('@/lib/entity-editor/initial-state', () => ({
  buildEntityEditorFormState: (initial: any) => ({
    labelRows: Object.entries(initial.entity.labels || {}).map(([key, value]) => ({ key, value })),
    tagsText: (initial.entity.tags || []).join(', '),
    componentOfText: (initial.entity.componentOf || []).join(', '),
    componentsText: (initial.entity.components || []).join(', '),
    implementedByText: (initial.entity.implementedBy || []).join(', '),
    languagesText: (initial.entity.languages || []).join(', '),
    identitiesItems: [],
    monitorBindItems: [],
    relationItems: []
  })
}));

vi.mock('@/lib/entity-editor/view-model', () => ({
  buildEntityEditorAttributionRows: () => [
    {
      key: 'identity',
      title: '身份标识',
      copy: '1 个身份标识',
      meta: 'service.name=checkout',
      state: 'ready'
    },
    {
      key: 'monitor-binding',
      title: '监控绑定',
      copy: '1 个监控绑定',
      meta: 'monitorId 42',
      state: 'ready'
    },
    {
      key: 'ownership',
      title: '负责人',
      copy: '缺少负责人',
      meta: '先补负责人或值班组',
      state: 'missing'
    },
    {
      key: 'system-environment',
      title: '系统与环境',
      copy: 'website · 缺少环境',
      meta: '用于告警收敛和拓扑',
      state: 'review'
    },
    {
      key: 'discovery-return',
      title: '发现回路',
      copy: '可回到遥测发现',
      meta: '/entities/discovery',
      state: 'review',
      href: '/entities/discovery'
    }
  ],
  buildEntityEditorCatalogRows: () => [
    { title: 'catalog', copy: 'platform', meta: 'count 1' }
  ],
  buildEntityEditorFacts: () => [],
  buildEntityEditorNextStepRows: () => [
    { title: 'definition', copy: 'Open definition', meta: '/entities/42/definition' }
  ],
  buildEntityEditorSuggestions: () => ({
    ownerSuggestions: ['platform'],
    systemSuggestions: ['commerce'],
    environmentSuggestions: ['prod'],
    lifecycleSuggestions: ['production'],
    tierSuggestions: ['tier-1'],
    languageSuggestions: ['java'],
    providerSuggestions: ['grafana']
  }),
  buildEntityEditorTitle: (mode: 'new' | 'edit', entityId?: string) => (mode === 'new' ? 'Create entity' : `Edit entity · ${entityId}`)
}));

vi.mock('@/lib/workspace-navigation', () => ({
  buildEntityEditorWorkspaceTabs: () => []
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

describe('EntityEditorSurface', () => {
  it('keeps only nested row editors on shared inset panels while the page shell stays cold-owned', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('WorkbenchPillButton');
    expect(source).not.toContain('WorkbenchSelectableCard');
    expect(source).not.toContain("const shellPanelClassName = 'grid gap-2.5 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3';");
    expect(source).not.toContain('data-entity-editor-toolbar="true" className="grid gap-3 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');
    expect(source).not.toContain('className="flex flex-wrap items-center justify-end gap-2 rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');
    expect(source).not.toContain("const editorModePillClassName =");
    expect(source).not.toContain("const editorStageCardClassName =");
  });

  it('uses the shared cold CodeMirror editor for JSON evidence rows and definition previews', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain("import { ColdCodeEditor } from '../ui/cold-code-editor';");
    expect(source).toContain('data-entity-editor-json-code-editor="object-row"');
    expect(source).toContain('data-entity-editor-definition-code-editor="preview"');
    expect(source).toContain('language="json"');
    expect(source).toContain("language={editorSurfaceMode === 'yaml' ? 'yaml' : 'json'}");
    expect(source).not.toContain("import { EditorRow } from '../observability/editor-rows';");
    expect(source).not.toContain('const editorTextAreaClassName =');
    expect(source).not.toContain('<EditorRow\n            className={editorTextAreaClassName}');
    expect(source).not.toContain('<EditorRow\n                  readOnly\n                  data-entity-editor-definition-preview={editorSurfaceMode}');
  });

  it('uses the shared cold textarea for descriptive prose instead of page-local textarea chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');

    expect(source).toContain("import { Textarea } from '@/components/ui/textarea';");
    expect(source).toContain('data-entity-editor-description-textarea="cold-textarea"');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('resize-y');
    expect(source).not.toContain('resize:');
  });

  it('renders the shared create shell with a real form, definition-mode pills, preview toggle, and footer actions', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: 'platform',
            system: 'commerce'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{
          owners: ['platform'],
          systems: ['commerce'],
          environments: ['prod'],
          lifecycles: ['production'],
          tiers: ['tier-1'],
          languages: ['java'],
          linkProviders: ['grafana']
        }}
      />
    );

    expect(html).toContain('<form');
    expect(html).toContain('data-entity-editor-shell="otlp-cold-entity-composer"');
    expect(html).toContain('data-entity-editor-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-editor-layout="full-width-workbench"');
    expect(html).toContain('data-entity-editor-header="cold-compact-header"');
    expect(html).toContain('data-entity-editor-header-rhythm="cold-compact"');
    expect(html).toContain('data-entity-editor-frame="cold-editor-frame"');
    expect(html).toContain('data-entity-editor-route-tabs="cold-segmented-tabs"');
    expect(html).toContain('data-entity-editor-summary-card="cold-editor-panel"');
    expect(html).toContain('data-entity-editor-type-strip="cold-catalog-grid"');
    expect(html).toContain('data-entity-editor-type-strip-layout="cold-compact-grid"');
    expect(html).toContain('data-entity-editor-type-card-density="cold-compact-card"');
    expect(html).toContain('data-entity-editor-entry-strip="cold-segmented-pills"');
    expect(html).toContain('data-entity-editor-stage-strip="cold-stage-grid"');
    expect(html).toContain('data-entity-editor-body-placement="cold-deferred-body"');
    expect(html).not.toContain('data-entity-editor-body="angular-single-stage"');
    expect(html).toContain('data-entity-editor-definition-tabs="cold-bottom-tabs"');
    expect(html).toContain('data-entity-editor-definition-footer="cold-definition-footer"');
    expect(html).not.toContain('data-entity-editor-page-header-offset="angular-sidebar-flush"');
    expect(html).not.toContain('data-entity-editor-frame="angular-flush"');
    expect(html).not.toContain('data-entity-editor-definition-footer-raise="angular-flush-tabs"');
    expect(html).not.toContain('data-workbench-side="true"');
    expect(html).toContain('表单');
    expect(html).toContain('YAML');
    expect(html).toContain('JSON');
    expect(html).toContain('隐藏快照');
    expect(html).toContain('data-entity-editor-preview-toggle-icon="cold"');
    expect(html).toContain('取消');
    expect(html).toContain('显示名称');
    expect(html).toContain('命名空间');
    expect(html).toContain('环境');
    expect(html).toContain('aria-label="显示名称"');
    expect(html).toContain('aria-label="名称"');
    expect(html).toContain('aria-label="来源"');
    expect(html).not.toContain('Cancel');
    expect(html).not.toContain('Namespace');
    expect(html).not.toContain('Environment');
    expect(html).not.toContain('Display Name');
    expect(html).not.toContain('aria-label="Name"');
    expect(html).not.toContain('aria-label="Source"');
    expect(html).toContain('创建实体');
    expect(html).toContain('系统');
    expect(html).toContain('服务');
    expect(html).toContain('data-entity-type-icon="service"');
    expect(html).toContain('data-entity-type-icon="database"');
    expect(html).toContain('<svg');
    expect(html).toContain('页面录入');
    expect(html).toContain('data-entity-entry-source-icon="manual"');
    expect(html).toContain('data-entity-entry-source-icon="telemetry"');
    expect(html).toContain('data-entity-entry-source-icon="definition"');
    expect(html).toContain('基本信息');
    expect(html).toContain('归属与处置');
    expect(html).toContain('证据关联');
    expect(html).toContain('关系与扩展');
    expect(html).toContain('data-entity-editor-footer="true"');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    expect(source).toContain("from 'lucide-react'");
    expect(source).toContain('data-entity-editor-shell="otlp-cold-entity-composer"');
    expect(source).toContain('data-entity-editor-style-baseline="hertzbeat-cold-matte"');
    expect(source).toContain('data-entity-editor-frame="cold-editor-frame"');
    expect(source).toContain('data-entity-editor-definition-footer="cold-definition-footer"');
    expect(source).toContain('data-entity-editor-type-card-density="cold-compact-card"');
    expect(source).not.toContain('useAngularVisual');
    expect(source).not.toContain('angular-');
    expect(source).not.toContain('angularTitle');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('WorkbenchPillButton');
    expect(source).not.toContain('WorkbenchSelectableCard');
    expect(source).not.toContain('WorkbenchStack');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('SectionBlock');
    expect(source).not.toContain('TextField');
    expect(source).not.toContain('SuggestionChips');
    expect(source).not.toContain('buildEntityEditorFacts');
    expect(source).not.toContain('buildEntityEditorCatalogRows');
    expect(source).not.toContain('buildEntityEditorNextStepRows');
    expect(source).not.toContain('buildEntityEditorTitle');
    expect(source).not.toContain('buildEntityEditorWorkspaceTabs');
    expect(source).not.toContain("'Workflow'");
    expect(source).not.toContain("'Basics'");
    expect(source).not.toContain('lightInputClassName');
    expect(source).not.toContain('nameInputClassName');
    expect(source).not.toContain('text-white');
    expect(source).not.toContain('bg-white');
    expect(source).not.toContain('rounded-[2px]');
    expect(source).not.toContain('border-t border-[#eef1f5] px-4 py-3');
    expect(source).not.toContain("index === 0 ? 'border-[#3f6df6] bg-[#16213a] text-white'");
    expect(source).not.toContain('flex min-h-[52px] items-start gap-2 rounded-[6px]');
    expect(source).not.toContain('rounded-[6px] bg-white p-[14px]');
    expect(source).not.toContain('card.label.slice(0, 1)');
    expect(source).not.toContain("renderField('Namespace'");
    expect(source).not.toContain("renderField('Environment'");
    expect(source).not.toContain("renderField('Runbook'");
    expect(source).not.toContain('<MultiValueField label="Component Of"');
    expect(source).not.toContain('<MultiValueField label="Components"');
    expect(source).not.toContain('<MultiValueField label="Implemented By"');
    expect(source).not.toContain('<MultiValueField label="Languages"');
    expect(source).not.toContain('<KeyValueEditor label="Labels"');
    expect(source).not.toContain('Provider"');
    expect(source).not.toContain('Telemetry Discovery</div>');
  }, 30000);

  it('renders the edit shell with the same composer structure, save semantics, and definition handoff', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'checkout-api',
            displayName: 'Checkout API',
            owner: 'platform',
            system: 'commerce'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }}
        mode="edit"
        entityId="42"
        catalogSuggestions={{ owners: ['platform'] }}
      />
    );

    expect(html).toContain('data-entity-editor-shell="otlp-cold-entity-composer"');
    expect(html).toContain('data-entity-editor-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-editor-layout="full-width-workbench"');
    expect(html).toContain('data-entity-editor-header="cold-compact-header"');
    expect(html).toContain('data-entity-editor-frame="cold-editor-frame"');
    expect(html).toContain('data-entity-editor-frame-spacing="cold-tight"');
    expect(html).toContain('data-entity-editor-summary-card="cold-editor-panel"');
    expect(html).toContain('data-entity-editor-type-strip="cold-catalog-grid"');
    expect(html).toContain('data-entity-editor-entry-strip="cold-segmented-pills"');
    expect(html).toContain('data-entity-editor-stage-strip="cold-stage-grid"');
    expect(html).toContain('data-entity-editor-edit-stage-posture="cold-complete-context"');
    expect(html).toContain('data-entity-editor-stage-status="relations-ready"');
    expect(html).toContain('data-entity-editor-body-placement="cold-deferred-body"');
    expect(html).toContain('data-entity-editor-definition-tabs="cold-bottom-tabs"');
    expect(html).toContain('data-entity-editor-definition-footer="cold-definition-footer"');
    expect(html).toContain('data-entity-editor-preview-rail-density="cold-inline-preview"');
    expect(html).toContain('data-entity-editor-definition-handoff="cold-hidden"');
    expect(html).toContain('data-entity-type-icon="service"');
    expect(html).toContain('data-entity-type-icon="database"');
    expect(html).toContain('编辑实体');
    expect(html).toContain('保存');
    expect(html).toContain('/entities/42/definition');
    expect(html).toContain('data-entity-editor-mode="editor"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-entity-editor-shell="angular-composer"');
    expect(html).not.toContain('data-entity-editor-frame="angular-flush"');
    expect(html).not.toContain('data-entity-editor-definition-tabs="angular-bottom"');

    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-editor-surface.tsx'), 'utf8');
    expect(source).toContain('data-entity-editor-edit-stage-posture');
    expect(source).toContain("'cold-complete-context'");
    expect(source).not.toContain("'angular-complete-context'");
  });

  it('renders telemetry handoff evidence when the draft is seeded from discovery', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'endpoint',
            name: 'example.com:443',
            displayName: 'codex-history-green-443',
            owner: '',
            system: 'website',
            source: 'otel_resource'
          },
          identities: [{ identityKey: 'endpoint.url', identityValue: 'example.com:443' }],
          monitorBinds: [{ monitorId: 42, bindType: 'suggested', source: 'otel_resource', status: 'active' }],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{
          owners: ['platform'],
          systems: ['commerce'],
          environments: ['prod']
        }}
      />
    );

    expect(html).toContain('data-entity-editor-telemetry-handoff="true"');
    expect(html).toContain('data-entity-editor-attribution-panel="telemetry-attribution-check"');
    expect(html).toContain('data-entity-editor-attribution-row="identity"');
    expect(html).toContain('data-entity-editor-attribution-state="ready"');
    expect(html).toContain('data-entity-editor-attribution-row="monitor-binding"');
    expect(html).toContain('data-entity-editor-attribution-row="ownership"');
    expect(html).toContain('data-entity-editor-attribution-state="missing"');
    expect(html).toContain('data-entity-editor-attribution-row="system-environment"');
    expect(html).toContain('data-entity-editor-attribution-state="review"');
    expect(html).toContain('data-entity-editor-attribution-row="discovery-return"');
    expect(html).toContain('遥测发现');
    expect(html).toContain('归因检查');
    expect(html).toContain('service.name=checkout');
    expect(html).toContain('monitorId 42');
    expect(html).toContain('先补负责人或值班组');
    expect(html).toContain('website · 缺少环境');
    expect(html).toContain('1 个监控绑定');
    expect(html).toContain('1 个身份标识');
    expect(html).toContain('/entities/discovery');
    expect(html).toContain('aria-label="名称"');
    expect(html).toContain('aria-label="显示名称"');
    expect(html).toContain('aria-label="来源"');
    expect(html).not.toContain('Telemetry Discovery');
    expect(html).not.toContain('bound monitor');
  });

  it('renders an OTLP candidate draft handoff with identity return context and no monitor requirement', async () => {
    const { EntityEditorSurface } = await import('./entity-editor-surface');

    const html = renderToStaticMarkup(
      <EntityEditorSurface
        initial={{
          entity: {
            type: 'service',
            name: 'billing-api',
            displayName: 'billing-api',
            namespace: 'commerce',
            environment: 'prod',
            owner: '',
            source: 'otel_resource',
            labels: {
              'hertzbeat.discovery.source': 'otlp-candidate'
            }
          },
          identities: [
            { identityType: 'otel_resource', identityKey: 'service.name', identityValue: 'billing', primaryIdentity: true },
            { identityType: 'otel_resource', identityKey: 'service.namespace', identityValue: 'commerce' },
            { identityType: 'otel_resource', identityKey: 'deployment.environment.name', identityValue: 'prod' }
          ],
          monitorBinds: [],
          relations: []
        }}
        mode="new"
        catalogSuggestions={{ owners: ['platform'], systems: ['commerce'], environments: ['prod'] }}
      />
    );

    expect(html).toContain('data-entity-editor-telemetry-handoff="true"');
    expect(html).toContain('data-entity-editor-telemetry-handoff-source="otlp-candidate"');
    expect(html).toContain('0 个监控绑定');
    expect(html).toContain('3 个身份标识');
    expect(html).toContain(
      'href="/entities/discovery?identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing-api&amp;serviceNamespace=commerce&amp;environment=prod"'
    );
    expect(html).toContain('aria-label="名称"');
    expect(html).toContain('value="billing-api"');
    expect(html).toContain('aria-label="命名空间"');
    expect(html).toContain('value="commerce"');
    expect(html).toContain('aria-label="环境"');
    expect(html).toContain('value="prod"');
    expect(html).not.toContain('已归属');
    expect(html).not.toContain('健康正常');
    expect(html).not.toContain('拓扑已确认');
  }, 30000);
});
