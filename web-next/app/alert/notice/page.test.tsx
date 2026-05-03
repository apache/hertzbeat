import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Link from 'next/link';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    receivers: {
      content: [
        {
          id: 7,
          name: 'Receiver page 0',
          email: 'ops@example.com',
          type: 1,
          gmtUpdate: 1712730000000
        }
      ],
      totalElements: 17,
      pageIndex: 0,
      pageSize: 8
    },
    receiverOptions: {
      content: [
        {
          id: 7,
          name: 'Receiver page 0',
          email: 'ops@example.com',
          type: 1,
          gmtUpdate: 1712730000000
        },
        {
          id: 99,
          name: 'Receiver outside current page',
          hookUrl: 'https://hooks.example',
          type: 2,
          gmtUpdate: 1712730000000
        }
      ],
      totalElements: 2,
      pageIndex: 0,
      pageSize: 1000
    },
    rules: {
      content: [
        {
          id: 5,
          name: 'Rule page 0',
          enable: true,
          receiverName: ['Receiver page'],
          templateName: 'WebhookTemplate',
          gmtUpdate: 1712730000000
        }
      ],
      totalElements: 17,
      pageIndex: 0,
      pageSize: 8
    },
    templates: {
      content: [
        {
          id: 9,
          name: 'WebhookTemplate',
          preset: true,
          content:
            '{"title":"<#if status??>${status!\\"UNKNOWN\\"}</#if>","summary":"&lt;h1&gt;Alert Summary&lt;/h1&gt; ### ${commonLabels.severity} > ${msg!\\"Disk full\\"}"}',
          gmtUpdate: 1712730000000
        },
        {
          id: 10,
          name: 'CustomTemplate',
          preset: false,
          content: 'Custom template body',
          gmtUpdate: 1712730000000
        }
      ],
      totalElements: 4,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const mockLoadAlertNoticeData = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'alert.notice.receivers.title': '接收人',
        'alert.notice.rules.title': '规则',
        'alert.notice.templates.title': '模板',
        'alert.notice.receiver.type': '通知方式',
        'alert.notice.lanes.receivers.title': '接收人',
        'alert.notice.lanes.rules.title': '规则',
        'alert.notice.lanes.templates.title': '模板'
      }
    }),
    locale: 'zh-CN'
  })
}));

vi.mock('../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    load,
    children
  }: {
    load: () => Promise<unknown>;
    children: (data: any) => React.ReactNode;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../components/observability', () => ({
  StageSection: ({ title, children }: any) => (
    <section data-stage-section={title}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}));

vi.mock('../../../components/observability/selectable-evidence-list', () => ({
  SelectableEvidenceList: ({ rows }: any) => (
    <div data-evidence-list="true">{rows.map((row: any) => `${row.title}||${row.copy}||${row.meta}`).join('|')}</div>
  )
}));

vi.mock('../../../components/workbench/workbench-page', () => ({
  WorkbenchPage: ({ kicker, title, subtitle, facts, actions, main, side, tone }: any) => (
    <div data-workbench-page="true" data-tone={tone}>
      <div>{kicker}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-actions="true">{actions}</div>
      <div data-facts="true">{facts.map((fact: any) => `${fact.label}:${fact.value}`).join('|')}</div>
      <div data-main="true">{main}</div>
      <div data-side="true">{side}</div>
    </div>
  ),
  RowList: ({ rows }: any) => (
    <div data-row-list="true">{rows.map((row: any) => `${row.title}||${row.copy}||${row.meta}`).join('|')}</div>
  )
}));

vi.mock('../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../../../components/ui/select', () => ({
  Select: ({ children, containerClassName: _containerClassName, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('../../../components/pages/alert-notice-receiver-fields', () => ({
  AlertNoticeReceiverFields: () => <div data-alert-notice-receiver-fields="true">receiver-fields</div>
}));

vi.mock('../../../components/pages/alert-notice-rule-fields', () => ({
  AlertNoticeRuleFields: () => <div data-alert-notice-rule-fields="true">rule-fields</div>
}));

vi.mock('../../../components/pages/alert-notice-template-fields', () => ({
  AlertNoticeTemplateFields: () => <div data-alert-notice-template-fields="true">template-fields</div>
}));

vi.mock('../../../components/pages/alert-notice-console-shell', () => ({
  AlertNoticeConsoleShell: ({ selectedTab, receiverContent, ruleContent, templateContent }: any) => (
    <div data-alert-notice-console="true" data-selected-tab={selectedTab}>
      <div data-alert-notice-workbench-panel="cold-tabbed-table-panel">
        <div data-alert-notice-tabs="cold-segmented-tabs">
          <div data-tab="receiver">receiver-tab</div>
          <div data-tab="rule">rule-tab</div>
          <div data-tab="template">template-tab</div>
        </div>
        <div data-alert-notice-console-panel="true">
          {selectedTab === 'receiver' ? receiverContent : null}
          {selectedTab === 'rule' ? ruleContent : null}
          {selectedTab === 'template' ? templateContent : null}
        </div>
      </div>
    </div>
  )
}));

vi.mock('../../../lib/alert-notice/controller', () => ({
  buildNoticeRuleDraft: () => ({
    name: '',
    receiverIdsText: '',
    templateId: '-1',
    enable: true,
    filterAll: true,
    labelsText: '',
    daysText: '1,2,3,4,5',
    periodStart: '09:00',
    periodEnd: '18:00'
  }),
  createNoticeReceiver: vi.fn(),
  createNoticeRule: vi.fn(),
  createNoticeTemplate: vi.fn(),
  deleteNoticeReceiver: vi.fn(),
  deleteNoticeRule: vi.fn(),
  deleteNoticeTemplate: vi.fn(),
  loadAlertNoticeData: mockLoadAlertNoticeData,
  loadNoticeReceiverDetail: vi.fn(),
  loadNoticeRuleDetail: vi.fn(),
  loadNoticeTemplateDetail: vi.fn(),
  sendNoticeReceiverTest: vi.fn(),
  updateNoticeReceiver: vi.fn(),
  updateNoticeRule: vi.fn(),
  updateNoticeTemplate: vi.fn(),
  buildNoticeReceiverDraft: () => ({
    name: '',
    type: '1',
    email: '',
    phone: '',
    hookUrl: '',
    hookAuthType: 'None',
    hookAuthToken: '',
    wechatId: '',
    accessToken: '',
    tgBotToken: '',
    tgUserId: '',
    tgMessageThreadId: '',
    larkReceiveType: '0',
    userId: '',
    chatId: '',
    slackWebHookUrl: '',
    corpId: '',
    agentId: '',
    appSecret: '',
    partyId: '',
    tagId: '',
    discordChannelId: '',
    discordBotToken: '',
    smnAk: '',
    smnSk: '',
    smnProjectId: '',
    smnRegion: '',
    smnTopicUrn: '',
    serverChanToken: '',
    gotifyToken: '',
    appId: ''
  }),
  buildNoticeTemplateDraft: () => ({ name: '', type: '1', preset: false, content: '' })
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('../../../lib/alert-label-options', () => ({
  DEFAULT_ALERT_LABEL_OPTIONS: {
    keys: ['alertname', 'severity', 'service'],
    valuesByKey: { severity: ['critical', 'warning'], service: ['checkout'] }
  },
  loadAlertLabelOptions: vi.fn(async () => ({
    keys: ['alertname', 'severity', 'service'],
    valuesByKey: { severity: ['critical', 'warning'], service: ['checkout'] }
  }))
}));

vi.mock('../../../lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

describe('alert notice page', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastLoad = null;
    mockLoadAlertNoticeData.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('renders the OTLP cold notice tab shell with the receiver console selected by default', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');
    const { default: AlertNoticePage } = await import('./page');
    const html = renderToStaticMarkup(<AlertNoticePage />);

    expect(html).toContain('消息通知');
    expect(html).not.toContain('工作区:alert/notice');
    expect(html).not.toContain('接收人:17');
    expect(html).not.toContain('规则:17');
    expect(html).not.toContain('模板:4');
    expect(html).toContain('data-alert-notice-console="true"');
    expect(html).toContain('data-selected-tab="receiver"');
    expect(html).toContain('data-tab="receiver"');
    expect(html).toContain('data-tab="rule"');
    expect(html).toContain('data-tab="template"');
    expect(html).toContain('data-alert-notice-surface="otlp-cold-notice-console"');
    expect(html).toContain('data-alert-notice-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-alert-notice-header="cold-compact-header"');
    expect(html).toContain('data-alert-notice-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-notice-inline-metrics="cold-inline-counts"');
    expect(html).toContain('data-alert-notice-command-bar="standard-equal-buttons"');
    expect(html).toContain('data-alert-notice-workbench-panel="cold-tabbed-table-panel"');
    expect(html).toContain('data-alert-notice-tabs="cold-segmented-tabs"');
    expect(html).toContain('data-alert-notice-receiver-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-notice-receiver-toolbar-layout="compact-inline-actions-query"');
    expect(html).toContain('data-alert-notice-receiver-search="shared-compact"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-notice-receiver-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-notice-receiver-row="7"');
    expect(html).toContain('新增接收对象');
    expect(html).toContain('接收对象名称');
    expect(html).toContain('接收对象');
    expect(html).toContain('通知方式');
    expect(html).toContain('配置');
    expect(html).toContain('更新时间');
    expect(html).toContain('操作');
    expect(html).toContain('Receiver page 0');
    expect(html).toContain('邮箱');
    expect(html).toContain('ops@example.com');
    expect(html).toContain('2026-04-10 18:00:00');
    expect(html).not.toContain('data-stage-section="接收人"');
    expect(html).not.toContain('data-evidence-list="true"');
    expect(html).not.toContain('Receiver page 0||ops@example.com||邮箱 · 更新时间 2026-04-10 18:00:00');
    expect(html).not.toContain('Rule page 0||已启用 · 发送到 Receiver page||WebhookTemplate · 更新时间 2026-04-10 18:00:00');
    expect(html).not.toContain('WebhookTemplate||');
    expect(html).not.toContain('当前接收对象:1');
    expect(html).not.toContain('管理告警发往哪些接收对象。');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-tone="operator"');
    expect(html).not.toContain('notice/receivers');
    expect(html).not.toContain('${status');
    expect(html).not.toContain('<#if');
    expect(html).not.toContain('&lt;h1&gt;');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-alert-notice-style-baseline={coldNoticeVisual.canvasName}');
    expect(source).toContain('className={coldNoticeVisual.canvas.root}');
    expect(source).toContain('style={coldNoticeVisual.canvas.backgroundStyle}');
    expect(source).toContain('<section className={coldNoticeVisual.layout.pageSection}>');
    expect(source).toContain('className={coldNoticeVisual.panel.hero}');
    expect(source).toContain('className={coldNoticeVisual.button.row}');
    expect(source).toContain('coldButtonClassName');
    expect(source).toContain('coldPrimaryButtonClassName');
    expect(source).toContain('coldCommandButtonClass');
    expect(source).toContain("from '../../../components/ui/search-row'");
    expect(source).toContain("from '../../../lib/alert-label-options'");
    expect(source).toContain('loadAlertLabelOptions(apiMessageGet)');
    expect(source).toContain('labelOptions={labelOptions}');
    expect(source).toContain('data-alert-notice-receiver-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-rule-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-template-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-receiver-search="shared-compact"');
    expect(source).toContain('data-alert-notice-rule-search="shared-compact"');
    expect(source).toContain('data-alert-notice-template-search="shared-compact"');
    expect(source).not.toContain('data-alert-notice-receiver-toolbar="cold-table-toolbar"');
    expect(source).not.toContain('data-alert-notice-rule-toolbar="cold-table-toolbar"');
    expect(source).not.toContain('data-alert-notice-template-toolbar="cold-table-toolbar"');
    expect(source).not.toContain('className="mb-0 ml-auto"');
    expect(source).not.toContain('className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2"');
    expect(source).not.toContain('data-testid="notice-receiver-search-input"');
    expect(source).not.toContain('data-testid="notice-receiver-search-button"');
    expect(source).not.toContain('className="min-h-screen bg-[#0b0c0e] px-6 py-5 text-[#f2f5f8]"');
    expect(source).not.toContain('className="rounded-[4px] border border-[#252b34] bg-[#0b0c0e] px-5 py-5"');
    expect(source).not.toContain('bg-[#14213a]');
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).not.toContain('className="grid gap-2"');
    expect(source).not.toContain("from '../../../components/workbench/workbench-page'");
    expect(source).not.toContain('angular-table-toolbar');
    expect(source).not.toContain('angular-table"');
    expect(source).not.toContain('angular-select');
    expect(source).not.toContain('angular-table-pagination');
    expect(source).not.toContain('angular-table-empty');
    expect(source).not.toContain('angular-empty-box');
    expect(source).not.toContain("from '../../../components/observability'");
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain('NoticeListToolbar');
    expect(source).not.toContain('buildNoticeFacts');
    expect(source).not.toContain("from '../../../components/workbench/primitives'");
  });

  it('keeps the rule tab on the OTLP cold table contract when the console switches tabs', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(source).toContain('data-alert-notice-rule-panel="true"');
    expect(source).toContain('data-alert-notice-rule-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-rule-toolbar-layout="compact-inline-actions-query"');
    expect(source).toContain('data-alert-notice-rule-table-shell="cold-dense-table"');
    expect(source).toContain('function NoticeTableSwitch');
    expect(source).toContain('role="switch"');
    expect(source).toContain('data-alert-notice-rule-table-switch={field}');
    expect(source).toContain('handleToggleRuleSwitch');
    expect(source).toContain("updateNoticeRule(apiMessagePut as any, buildNoticeRuleDraft({ ...rule, [field]: checked }));");
    expect(source).toContain('async function handleEditRule(rule = selectedRule)');
    expect(source).toContain('const ruleId = rule?.id;');
    expect(source).toContain('const detail = await loadNoticeRuleDetail(apiMessageGet, ruleId);');
    expect(source).toContain('setSelectedRuleId(ruleId);');
    expect(source).toContain('setRuleDraft(buildNoticeRuleDraft(detail));');
    expect(source).toContain('onClick={() => void handleEditRule(rule)}');
    expect(source).toContain('field="filter-all"');
    expect(source).toContain('field="enable"');
    expect(source).toContain("t('alert.notice.rule.name')");
    expect(source).toContain("t('alert.notice.receiver.people')");
    expect(source).toContain("t('alert.notice.template.name')");
    expect(source).toContain("t('alert.notice.rule.all')");
    expect(source).toContain("t('common.enable')");
    expect(source).not.toContain('accent-[var(--ops-primary)]');
    expect(source).not.toContain('<input type="checkbox"');
    expect(source).not.toContain('data-alert-notice-rule-table-checkbox');
    expect(source).not.toContain('setRuleDraft(buildNoticeRuleDraft(rule));');
    expect(source).not.toContain('buildNoticeRuleRows');
  });

  it('keeps the template tab on the OTLP cold table contract when the console switches tabs', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(source).toContain('data-alert-notice-template-panel="true"');
    expect(source).toContain('data-alert-notice-template-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-template-toolbar-layout="compact-inline-actions-query"');
    expect(source).toContain('data-alert-notice-template-preset-filter="cold-select"');
    expect(source).toContain('data-alert-notice-template-table-shell="cold-dense-table"');
    expect(source).toContain('data-alert-notice-pagination="cold-dense-pagination"');
    expect(source).toContain('testIdPrefix="notice-template"');
    expect(source).toContain('ChevronLeft');
    expect(source).toContain('ChevronRight');
    expect(source).toContain("t('alert.notice.template.name')");
    expect(source).toContain("t('alert.notice.template.type')");
    expect(source).toContain("t('alert.notice.template.preset')");
    expect(source).toContain("t('alert.notice.template.preset.true')");
    expect(source).toContain("t('alert.notice.template.preset.false')");
    expect(source).toContain("t('common.edit-time')");
    expect(source).toContain("t('common.edit')");
    expect(source).not.toContain('buildNoticeTemplateRows');
  });

  it('keeps all notice authoring flows in cold modal dialogs instead of inline cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(source).toContain("from '../../../components/workbench/overlay-dialog'");
    expect(source).toContain('<OverlayDialog');
    expect(source).toContain('data-alert-notice-receiver-editor-dialog="cold-modal-editor"');
    expect(source).toContain('data-alert-notice-rule-editor-dialog="cold-modal-editor"');
    expect(source).toContain('data-alert-notice-template-editor-dialog="cold-modal-editor"');
    expect(source).toContain('open={editingReceiver}');
    expect(source).toContain('open={editingRule}');
    expect(source).toContain('open={editingTemplate}');
    expect(source).toContain('maxWidthClassName="max-w-4xl"');
    expect(source).not.toContain('<AlertSurfacePanel data-alert-notice-receiver-editor="true" className="m-3">');
    expect(source).not.toContain('<AlertSurfacePanel data-alert-notice-rule-editor="true" className="m-3">');
    expect(source).not.toContain('<AlertSurfacePanel data-alert-notice-template-editor="true" className="m-3">');
  });

  it('wires notice policy and template modals to Angular-parity selectors and template viewing', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(source).toContain('const receiverOptionRows = data.receiverOptions?.content?.length ? data.receiverOptions.content : data.receivers.content;');
    expect(source).toContain('const receiverOptions = receiverOptionRows.map');
    expect(source).toContain('const templateOptions = [');
    expect(source).toContain('type: receiver.type');
    expect(source).toContain('.filter(template => template.id != null)');
    expect(source).toContain('type: template.type');
    expect(source).toContain('receiverOptions={receiverOptions}');
    expect(source).toContain('templateOptions={templateOptions}');
    expect(source).toContain('templateReadOnly');
    expect(source).toContain('handleViewTemplate');
    expect(source).toContain('const rowDraft = buildNoticeTemplateDraft(template);');
    expect(source).toContain('setTemplateDraft(rowDraft);');
    expect(source).toContain('loadNoticeTemplateDetail(apiMessageGet, template.id)');
    expect(source).toContain('data-alert-notice-template-view-trigger="cold-modal-viewer-trigger"');
    expect(source).toContain('data-alert-notice-template-viewer-dialog="cold-modal-viewer"');
    expect(source).toContain('readOnly={templateReadOnly}');
    expect(source).toContain('onClick={() => void handleViewTemplate(template)}');
    expect(source).toContain('onClick={() => void handleEditTemplate(template)}');
    expect(source).toContain("title={templateReadOnly ? t('alert.notice.template.content') : templateDraft.id ? t('alert.notice.template.edit') : t('alert.notice.template.new')}");
    expect(source).not.toContain("onClick={() => setSelectedTemplateId(template.id)} title={t('alert.notice.template.show')}");
    expect(source).not.toContain('async function handleViewTemplate(template: NoticeTemplate) {\n          if (!template.id) return;');
  });

  it('keeps notice editor validation feedback inside the active cold editor dialogs', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(source).toContain('data-alert-notice-receiver-validation="cold-validation-feedback"');
    expect(source).toContain('data-alert-notice-rule-validation="cold-validation-feedback"');
    expect(source).toContain('data-alert-notice-template-validation="cold-validation-feedback"');
    expect(source.match(/role="alert"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source).toContain('editingReceiver && receiverError');
    expect(source).toContain('editingRule && ruleError');
    expect(source).toContain('editingTemplate && templateError');
    expect(source).toContain('!editingReceiver && receiverError');
    expect(source).toContain('!editingRule && ruleError');
    expect(source).toContain('!editingTemplate && templateError');
  });

  it('loads alert notice data through the default receiver and rule query contract', async () => {
    const { default: AlertNoticePage } = await import('./page');
    renderToStaticMarkup(<AlertNoticePage />);

    await mockState.lastLoad?.();

    expect(mockLoadAlertNoticeData).toHaveBeenCalledWith(expect.anything(), {
      receivers: { search: '', pageIndex: 0, pageSize: 8 },
      rules: { search: '', pageIndex: 0, pageSize: 8 }
    });
  });

  it('opens notice policy context when routed from a three-signal alert investigation', async () => {
    mockState.searchParams = new URLSearchParams({
      signal: 'logs',
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      returnTo: '/log/manage?traceId=trace-123&returnLabel=Logs'
    });

    const { default: AlertNoticePage } = await import('./page');
    const html = renderToStaticMarkup(<AlertNoticePage />);
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');

    expect(html).toContain('data-selected-tab="rule"');
    expect(html).toContain('data-alert-notice-evidence-context="signal-route"');
    expect(html).toContain('data-alert-notice-evidence-signal="logs"');
    expect(html).toContain('data-alert-notice-prefill-labels="hertzbeat.signal:logs');
    expect(html).toContain('hertzbeat.entity.id:7');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(html).toContain('来自日志的通知策略上下文');
    expect(html).toContain('新建通知策略时会按当前实体、服务、环境和链路标签做匹配');
    expect(html).toContain('data-alert-notice-evidence-return="true"');
    expect(html).toContain('href="/log/manage?traceId=trace-123"');
    expect(source).toContain('useSearchParams');
    expect(source).toContain('readSignalRouteContext');
    expect(source).toContain('buildAlertNoticeEvidenceContext');
    expect(source).toContain('data-alert-notice-rule-editor-return="evidence-context"');
    expect(source).toContain('noticeEvidenceContext?.returnHref');
    expect(source).toContain('buildNoticeRuleDraft(null, noticeEvidenceContext?.ruleDraftPatch)');
  });

  it('keeps the receiver empty state close to the OTLP cold table baseline', async () => {
    const previousData = mockState.renderData;
    mockState.renderData = {
      ...previousData,
      receivers: {
        content: [],
        totalElements: 0,
        pageIndex: 0,
        pageSize: 8
      }
    };

    try {
      const { default: AlertNoticePage } = await import('./page');
      const html = renderToStaticMarkup(<AlertNoticePage />);

      expect(html).toContain('data-alert-notice-receiver-empty-state="cold-empty-state"');
      expect(html).toContain('data-alert-notice-receiver-empty-icon="cold-empty-icon"');
      expect(html).toContain('暂无数据');
      expect(html).not.toContain('总量 0');
    } finally {
      mockState.renderData = previousData;
    }
  });
});
