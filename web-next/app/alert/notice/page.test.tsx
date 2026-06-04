import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Link from 'next/link';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertNoticeRouteState } from '../../../lib/alert-notice/query-state';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
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
    },
    templateOptions: {
      content: [
        {
          id: 9,
          name: 'WebhookTemplate',
          preset: true,
          type: 2,
          content: 'Preset template body',
          gmtUpdate: 1712730000000
        },
        {
          id: 10,
          name: 'CustomTemplate',
          preset: false,
          type: 2,
          content: 'Custom template body',
          gmtUpdate: 1712730000000
        }
      ],
      totalElements: 2,
      pageIndex: 0,
      pageSize: 2
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

vi.mock('../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    }),
    locale: 'zh-CN'
  })
}));

vi.mock('../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    load,
    loadingCopy,
    children
  }: {
    load: () => Promise<unknown>;
    loadingCopy?: string;
    children: (data: any) => React.ReactNode;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
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
        <div data-alert-notice-tabs="hertzbeat-ui-segmented-tabs">
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
  buildNoticeListUrl: (path: '/notice/receivers' | '/notice/rules', query: { search?: string; pageIndex?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams({
      pageIndex: String(query.pageIndex ?? 0),
      pageSize: String(query.pageSize ?? 8)
    });
    const search = query.search?.trim();
    if (search) {
      params.set('name', search);
    }
    return `${path}?${params.toString()}`;
  },
  buildNoticeTemplateListUrl: (query: { search?: string; pageIndex?: number; pageSize?: number; preset?: boolean } = {}) => {
    const params = new URLSearchParams({
      pageIndex: String(query.pageIndex ?? 0),
      pageSize: String(query.pageSize ?? 8)
    });
    const search = query.search?.trim();
    if (search) {
      params.set('name', search);
    }
    params.set('preset', String(query.preset ?? true));
    return `/notice/templates?${params.toString()}`;
  },
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
  buildNoticeRuleDisplayNames: vi.fn(() => ({
    receiverName: ['Receiver page 0-Email'],
    templateName: 'WebhookTemplate'
  })),
  createNoticeReceiver: vi.fn(),
  createNoticeRule: vi.fn(),
  createNoticeTemplate: vi.fn(),
  deleteNoticeReceiver: vi.fn(),
  deleteNoticeRule: vi.fn(),
  deleteNoticeTemplate: vi.fn(),
  loadAlertNoticeData: mockLoadAlertNoticeData,
  loadAlertNoticeDataFromFacade: mockLoadAlertNoticeData,
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
  })),
  loadAlertLabelOptionsFromFacade: vi.fn(async () => ({
    keys: ['alertname', 'severity', 'service'],
    valuesByKey: { severity: ['critical', 'warning'], service: ['checkout'] }
  }))
}));

vi.mock('../../../lib/format', () => ({
  formatTime: () => '2026-04-10 18:00:00'
}));

const EMPTY_ROUTE_STATE: AlertNoticeRouteState = {
  signal: null,
  signalContext: {}
};

async function renderAlertNoticePage(initialRouteState: AlertNoticeRouteState = EMPTY_ROUTE_STATE) {
  const { default: AlertNoticePage } = await import('./alert-notice-page');
  return renderToStaticMarkup(<AlertNoticePage initialRouteState={initialRouteState} />);
}

describe('alert notice page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockLoadAlertNoticeData.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('renders the OTLP cold notice tab shell with the receiver console selected by default', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const html = await renderAlertNoticePage();

    expect(html).toContain(t('alert.notice.title'));
    expect(html).toContain('data-alert-notice-console="true"');
    expect(html).toContain(`data-loading-copy="${t('alert.notice.loading')}"`);
    expect(html).toContain('data-selected-tab="receiver"');
    expect(html).toContain('data-tab="receiver"');
    expect(html).toContain('data-tab="rule"');
    expect(html).toContain('data-tab="template"');
    expect(html).toContain('data-alert-notice-surface="otlp-cold-notice-console"');
    expect(html).toContain('data-alert-notice-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-alert-notice-header="cold-compact-header"');
    expect(html).toContain('data-alert-notice-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-alert-notice-inline-metrics="cold-inline-counts"');
    expect(html).toContain('data-alert-notice-command-bar="standard-equal-buttons"');
    expect(html).toContain('data-alert-notice-workbench-panel="cold-tabbed-table-panel"');
    expect(html).toContain('data-alert-notice-tabs="hertzbeat-ui-segmented-tabs"');
    expect(html).toContain('data-alert-notice-receiver-toolbar="cold-query-toolbar"');
    expect(html).toContain('data-alert-notice-receiver-toolbar-layout="compact-inline-actions-query"');
    expect(html).toContain('data-alert-notice-receiver-search="shared-compact"');
    expect(html).toContain('data-alert-notice-receiver-search-submit="angular-enter-and-clear"');
    expect(html).toContain('data-alert-notice-receiver-search-submit-owner="cold-search-row"');
    expect(html).toContain('data-alert-notice-receiver-sync="angular-load-table"');
    expect(html).toContain('data-alert-notice-receiver-sync-owner="route-refresh-contract"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-alert-notice-receiver-table-shell="cold-dense-table"');
    expect(html).toContain('data-alert-notice-pagination="cold-dense-pagination"');
    expect(html).toContain('data-alert-notice-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(html).toContain('data-hz-ui="pagination-bar"');
    expect(html).toContain('data-hz-pagination-page-size="select-menu"');
    expect(html).toContain('data-hz-pagination-page-jump="number-input"');
    expect(html).toContain('data-alert-notice-pagination-page-size-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-alert-notice-pagination-page-jump-owner="hertzbeat-ui-input"');
    expect(html).toContain(t('alert.notice.pagination.summary', { page: 1, totalPages: 3, from: 1, to: 1, total: 17 }));
    expect(html).toContain(t('alert.notice.pagination.page-size'));
    expect(html).toContain(t('alert.notice.pagination.page'));
    expect(html).toContain('data-alert-notice-receiver-row="7"');
    expect(html).toContain(t('alert.notice.receiver.new'));
    expect(html).toContain(t('alert.notice.receiver.people.name'));
    expect(html).toContain(t('alert.notice.receiver.people'));
    expect(html).toContain(t('alert.notice.receiver.type'));
    expect(html).toContain(t('alert.notice.receiver.setting'));
    expect(html).toContain(t('common.edit-time'));
    expect(html).toContain(t('common.edit'));
    expect(html).toContain('Receiver page 0');
    expect(html).toContain(t('alert.notice.type.email'));
    expect(html).toContain('ops@example.com');
    expect(html).toContain('2026-04-10 18:00:00');
    expect(html).not.toContain(`data-stage-section="${t('alert.notice.receivers.title')}"`);
    expect(html).not.toContain('data-evidence-list="true"');
    expect(html).not.toContain('WebhookTemplate||');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-tone="operator"');
    expect(html).not.toContain('notice/receivers');
    expect(html).not.toContain('${status');
    expect(html).not.toContain('<#if');
    expect(html).not.toContain('&lt;h1&gt;');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-alert-notice-style-baseline={coldNoticeVisual.canvasName}');
    expect(source).toContain('className={coldNoticeVisual.canvas.root}');
    expect(source).toContain('style={coldNoticeVisual.canvas.backgroundStyle}');
    expect(source).toContain('<section className={coldNoticeVisual.layout.pageSection}>');
    expect(source).toContain('className={coldNoticeVisual.panel.hero}');
    expect(source).toContain('className={coldNoticeVisual.button.row}');
    expect(source).toContain('coldButtonClassName');
    expect(source).toContain('coldPrimaryButtonClassName');
    expect(source).toContain('coldCommandButtonClass');
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzConfirmDialog');
    expect(source).toContain('HzPaginationBar');
    expect(source).toContain("from '../../../components/ui/search-row'");
    expect(source).toContain("from '../../../lib/alert-label-options'");
    expect(source).toContain('loadAlertLabelOptionsFromFacade(api.alertLabels.list)');
    expect(source).toContain('loadAlertNoticeDataFromFacade');
    expect(source).toContain('receivers: api.alertNotice.receivers.list');
    expect(source).toContain('rules: api.alertNotice.rules.list');
    expect(source).toContain('receiverOptions: api.alertNotice.receivers.options');
    expect(source).toContain('templates: api.alertNotice.templates.list');
    expect(source).toContain('templateOptions: api.alertNotice.templates.options');
    expect(source).not.toContain('loadAlertNoticeData(apiMessageGet, alertNoticeLoadQuery)');
    expect(source).not.toContain('loadAlertLabelOptions(apiMessageGet)');
    expect(source).not.toContain("from '../../../lib/api-client'");
    expect(source).toContain('labelOptions={labelOptions}');
    expect(source).toContain('data-alert-notice-receiver-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-rule-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-template-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-receiver-sync="angular-load-table"');
    expect(source).toContain('data-alert-notice-receiver-sync-owner="route-refresh-contract"');
    expect(source).toContain('data-alert-notice-rule-sync="angular-load-table"');
    expect(source).toContain('data-alert-notice-rule-sync-owner="route-refresh-contract"');
    expect(source).toContain('data-alert-notice-template-sync="angular-load-table"');
    expect(source).toContain('data-alert-notice-template-sync-owner="route-refresh-contract"');
    expect(source).toContain('data-alert-notice-receiver-search="shared-compact"');
    expect(source).toContain('data-alert-notice-receiver-search-submit="angular-enter-and-clear"');
    expect(source).toContain('data-alert-notice-receiver-search-submit-owner="cold-search-row"');
    expect(source).toContain('data-alert-notice-rule-search="shared-compact"');
    expect(source).toContain('data-alert-notice-template-search="shared-compact"');
    expect(source).toContain('data-alert-notice-template-search-submit="angular-enter-and-clear"');
    expect(source).toContain('data-alert-notice-template-search-submit-owner="cold-search-row"');
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
  }, 30_000);

  it('renders missing receiver table settings with the localized empty fallback', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      receivers: {
        ...mockState.renderData.receivers,
        content: [
          {
            id: 8,
            name: 'Receiver missing setting',
            email: ' ',
            type: 1,
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const html = await renderAlertNoticePage();
      const t = createTranslatorMock({ locale: 'zh-CN' });

      expect(html).toContain('Receiver missing setting');
      expect(html).toContain(`title="${t('common.none')}"`);
      expect(html).not.toContain('title="-"');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('renders missing receiver and template type badges with the localized empty fallback', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      receivers: {
        ...mockState.renderData.receivers,
        content: [
          {
            id: 9,
            name: 'Receiver missing type',
            email: 'ops@example.com',
            type: ' ',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      },
      templates: {
        ...mockState.renderData.templates,
        content: [
          {
            id: 11,
            name: 'Template missing type',
            type: null,
            preset: true,
            content: 'Template body',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const html = await renderAlertNoticePage();
      const t = createTranslatorMock({ locale: 'zh-CN' });
      const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

      expect(html).toContain('Receiver missing type');
      expect(html).toContain(`>${t('common.none')}</span>`);
      expect(html).not.toContain('>-</span>');
      expect(source).toContain('getNoticeTemplateTypeLabel(template.type, t, emptyValue)');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('keeps template Telegram type labels separate from receiver Telegram bot copy', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      templates: {
        ...mockState.renderData.templates,
        content: [
          {
            id: 17,
            name: 'TelegramTemplate',
            type: 7,
            preset: true,
            content: 'Telegram template body',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const html = await renderAlertNoticePage();
      const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

      expect(html).toContain('data-selected-tab="receiver"');
      expect(source).toContain('const NOTICE_TEMPLATE_TYPE_LABEL_KEYS');
      expect(source).toContain("'7': 'alert.notice.type.telegram'");
      expect(source).toContain("'7': 'alert.notice.type.telegram-bot'");
      expect(source).toContain('getNoticeTemplateTypeLabel(template.type, t, emptyValue)');
      expect(source).toContain('data-alert-notice-template-telegram-label="angular-template-telegram"');
      expect(source).toContain('data-alert-notice-template-telegram-label-owner="route-i18n-contract"');
      expect(source).toContain('<AlertSurfaceValuePill>{getNoticeTemplateTypeLabel(template.type, t, emptyValue)}</AlertSurfaceValuePill>');
      expect(source).not.toContain('<AlertSurfaceValuePill>{getNoticeTypeLabel(template.type, t, emptyValue)}</AlertSurfaceValuePill>');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('keeps the rule tab on the OTLP cold table contract when the console switches tabs', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

    expect(source).toContain('data-alert-notice-rule-panel="true"');
    expect(source).toContain('data-alert-notice-rule-template-display="angular-template-id-fallback"');
    expect(source).toContain('data-alert-notice-rule-template-display-owner="route-table-contract"');
    expect(source).toContain('data-alert-notice-rule-receiver-display="angular-array-interpolation"');
    expect(source).toContain('data-alert-notice-rule-receiver-display-owner="route-table-contract"');
    expect(source).toContain('data-alert-notice-rule-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-rule-toolbar-layout="compact-inline-actions-query"');
    expect(source).toContain('data-alert-notice-rule-search-submit="angular-enter-and-clear"');
    expect(source).toContain('data-alert-notice-rule-search-submit-owner="cold-search-row"');
    expect(source).toContain('onSearch={commitRuleSearch}');
    expect(source).toContain('onClear={ruleSearchDraft || ruleSearch ? resetRuleSearch : undefined}');
    expect(source).toContain('setRulePageIndex(0);');
    expect(source).toContain('data-alert-notice-rule-table-shell="cold-dense-table"');
    expect(source).toContain('function NoticeTableSwitch');
    expect(source).toContain('role="switch"');
    expect(source).toContain('data-alert-notice-rule-table-switch={field}');
    expect(source).toContain('data-alert-notice-rule-table-switch-update="angular-edit-notify"');
    expect(source).toContain('data-alert-notice-rule-table-switch-update-owner="route-action-feedback-contract"');
    expect(source).toContain('handleToggleRuleSwitch');
    expect(source).toContain('receiverName: rule.receiverName ?? []');
    expect(source).toContain('templateName: rule.templateId ? rule.templateName ?? null : null');
    expect(source).toContain("{rule.templateId ? rule.templateName || t('alert.notice.template.preset.true') : t('alert.notice.template.preset.true')}");
    expect(source).toContain("setRuleMessage(t('common.notify.edit-success'))");
    expect(source).toContain("t('common.notify.edit-fail')");
    expect(source).not.toContain("t('common.save-failed')");
    expect(source).toContain('async function handleEditRule(rule = selectedRule)');
    expect(source).toContain('const ruleId = rule?.id;');
    expect(source).toContain('const detail = await api.alertNotice.rules.detail(ruleId);');
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
    expect(source).toContain("filter(Boolean).join(',')");
    expect(source).not.toContain("filter(Boolean).join(', ')");
    expect(source).not.toContain('accent-[var(--ops-primary)]');
    expect(source).not.toContain('<input type="checkbox"');
    expect(source).not.toContain('data-alert-notice-rule-table-checkbox');
    expect(source).not.toContain('setRuleDraft(buildNoticeRuleDraft(rule));');
    expect(source).not.toContain('buildNoticeRuleRows');
  }, 30_000);

  it('renders notice rule receiver arrays with Angular interpolation spacing', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      rules: {
        ...mockState.renderData.rules,
        content: [
          {
            id: 8,
            name: 'Multi receiver rule',
            enable: true,
            filterAll: true,
            receiverName: ['ops-email', 'pager-webhook'],
            templateId: 9,
            templateName: 'Default',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const html = await renderAlertNoticePage({
        signal: 'metrics',
        signalContext: {}
      });

      expect(html).toContain('data-alert-notice-rule-receiver-display="angular-array-interpolation"');
      expect(html).toContain('ops-email,pager-webhook');
      expect(html).not.toContain('ops-email, pager-webhook');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('renders missing rule receiver cells with the localized no-receiver fallback', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      rules: {
        ...mockState.renderData.rules,
        content: [
          {
            id: 6,
            name: 'Rule without receivers',
            enable: true,
            filterAll: false,
            receiverName: [' ', ''],
            templateId: null,
            templateName: '',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const t = createTranslatorMock({ locale: 'zh-CN' });
      const html = await renderAlertNoticePage({
        signal: 'metrics',
        signalContext: {}
      });

      expect(html).toContain('data-selected-tab="rule"');
      expect(html).toContain('Rule without receivers');
      expect(html).toContain(t('alert.notice.row.no-receiver'));
      expect(html).toContain(t('alert.notice.template.preset.true'));
      expect(html).not.toContain('<td class="px-3 py-3 text-center">-</td>');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('renders preset template fallback from templateId instead of stale templateName', async () => {
    const originalRenderData = mockState.renderData;
    mockState.renderData = {
      ...mockState.renderData,
      rules: {
        ...mockState.renderData.rules,
        content: [
          {
            id: 7,
            name: 'Preset template rule',
            enable: true,
            filterAll: true,
            receiverName: ['ops-email'],
            templateId: null,
            templateName: 'Stale template',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1
      }
    };

    try {
      const t = createTranslatorMock({ locale: 'zh-CN' });
      const html = await renderAlertNoticePage({
        signal: 'metrics',
        signalContext: {}
      });

      expect(html).toContain('data-alert-notice-rule-template-display="angular-template-id-fallback"');
      expect(html).toContain('Preset template rule');
      expect(html).toContain(t('alert.notice.template.preset.true'));
      expect(html).not.toContain('Stale template');
    } finally {
      mockState.renderData = originalRenderData;
    }
  }, 30_000);

  it('keeps the template tab on the OTLP cold table contract when the console switches tabs', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

    expect(source).toContain('data-alert-notice-template-panel="true"');
    expect(source).toContain('data-alert-notice-template-query-owner="backend-paginated"');
    expect(source).toContain('data-alert-notice-template-query-url={alertNoticeTemplateListUrl}');
    expect(source).toContain('data-alert-notice-template-preset-query="server-param"');
    expect(source).toContain('data-alert-notice-template-toolbar="cold-query-toolbar"');
    expect(source).toContain('data-alert-notice-template-toolbar-layout="compact-inline-actions-query"');
    expect(source).toContain('data-alert-notice-template-preset-filter="cold-select"');
    expect(source).toContain('onSearch={commitTemplateSearch}');
    expect(source).toContain('onClear={templateSearchDraft || templateSearch ? resetTemplateSearch : undefined}');
    expect(source).toContain('setTemplatePageIndex(0);');
    expect(source).toContain('data-alert-notice-template-table-shell="cold-dense-table"');
    expect(source).toContain('data-alert-notice-pagination="cold-dense-pagination"');
    expect(source).toContain('data-alert-notice-pagination-owner="hertzbeat-ui-pagination-bar"');
    expect(source).toContain('data-alert-notice-pagination-page-jump-owner');
    expect(source).toContain('data-alert-notice-pagination-page-size-owner');
    expect(source).toContain('testIdPrefix="notice-template"');
    expect(source).not.toContain('ChevronLeft');
    expect(source).not.toContain('ChevronRight');
    expect(source).toContain("t('alert.notice.pagination.summary'");
    expect(source).toContain("t('alert.notice.pagination.page-size')");
    expect(source).toContain("t('alert.notice.pagination.page')");
    expect(source).toContain("t('alert.notice.template.name')");
    expect(source).toContain("t('alert.notice.template.type')");
    expect(source).toContain("t('alert.notice.template.preset')");
    expect(source).toContain("t('alert.notice.template.preset.true')");
    expect(source).toContain("t('alert.notice.template.preset.false')");
    expect(source).toContain("t('common.edit-time')");
    expect(source).toContain("t('common.edit')");
    expect(source).not.toContain('buildNoticeTemplateRows');
  }, 30_000);

  it('keeps all notice authoring flows in cold modal dialogs instead of inline cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

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
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

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
    expect(source).toContain('api.alertNotice.templates.detail(template.id)');
    expect(source).toContain('data-alert-notice-template-view-trigger="cold-modal-viewer-trigger"');
    expect(source).toContain('data-alert-notice-template-viewer-dialog="cold-modal-viewer"');
    expect(source).toContain('readOnly={templateReadOnly}');
    expect(source).toContain('onClick={() => void handleViewTemplate(template)}');
    expect(source).toContain('onClick={() => void handleEditTemplate(template)}');
    expect(source).toContain("title={templateReadOnly ? t('alert.notice.template.content') : templateDraft.id ? t('alert.notice.template.edit') : t('alert.notice.template.new')}");
    expect(source).not.toContain("onClick={() => setSelectedTemplateId(template.id)} title={t('alert.notice.template.show')}");
    expect(source).not.toContain('async function handleViewTemplate(template: NoticeTemplate) {\n          if (!template.id) return;');
  });

  it('keeps Angular notice-rule receiver/template names in the save payload', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const controllerSource = readFileSync(resolve(process.cwd(), 'lib/alert-notice/controller.ts'), 'utf8');

    expect(source).toContain('buildNoticeRuleDisplayNames(ruleDraft, receiverOptions, templateOptions)');
    expect(source).toContain('await api.alertNotice.rules.update(ruleDraft, displayNames)');
    expect(source).toContain('await api.alertNotice.rules.create(ruleDraft, displayNames)');
    expect(source).toContain('data-alert-notice-rule-display-names="angular-save-payload"');
    expect(source).toContain('data-alert-notice-rule-display-names-owner="route-payload-contract"');
    expect(source).toContain('data-alert-notice-rule-edit-display-names="angular-detail-options"');
    expect(source).toContain('data-alert-notice-rule-edit-display-names-owner="route-payload-contract"');
    expect(controllerSource).toContain('receiverName: string[]');
    expect(controllerSource).toContain('templateName: string | null');
    expect(controllerSource).toContain('receiverOptions');
    expect(controllerSource).toContain('templateOptions.find');
    expect(controllerSource).toContain('draft.receiverName');
    expect(controllerSource).toContain('draft.templateName');
    expect(controllerSource).toContain('...(displayNames ? displayNames : {})');
  });

  it('keeps Angular notice-rule row edit loading the full detail before opening the modal', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleEditRuleSource = source.slice(source.indexOf('async function handleEditRule('), source.indexOf('async function handleSaveRule()'));

    expect(source).toContain('data-alert-notice-rule-edit-detail="angular-detail-fetch"');
    expect(source).toContain('data-alert-notice-rule-edit-detail-owner="route-detail-fetch-contract"');
    expect(source).toContain('onClick={() => void handleEditRule(rule)}');
    expect(handleEditRuleSource).toContain('const detail = await api.alertNotice.rules.detail(ruleId)');
    expect(handleEditRuleSource).toContain('setRuleDraft(buildNoticeRuleDraft(detail))');
    expect(handleEditRuleSource).not.toContain('buildNoticeRuleDraft(rule)');
  });

  it('keeps Angular notice-rule modal OK loading wired to the save request', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveRuleSource = source.slice(source.indexOf('async function handleSaveRule()'), source.indexOf('async function handleDeleteRule()'));

    expect(source).toContain('data-alert-notice-rule-save-loading="angular-nz-ok-loading"');
    expect(source).toContain('data-alert-notice-rule-save-loading-owner="route-modal-ok-contract"');
    expect(source).toContain("data-alert-notice-rule-save-loading-state={savingRule ? 'true' : 'false'}");
    expect(source).toContain('aria-busy={savingRule}');
    expect(source).toContain('disabled={savingRule}');
    expect(source).toContain("{savingRule ? t('common.saving') : t('common.save')}");
    expect(handleSaveRuleSource).toContain('setSavingRule(true);');
    expect(handleSaveRuleSource).toContain('setSavingRule(false);');
  });

  it('keeps Angular notice-rule save failure title separate from backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveRuleSource = source.slice(source.indexOf('async function handleSaveRule()'), source.indexOf('async function handleDeleteRule()'));

    expect(source).toContain('const [ruleErrorDetail, setRuleErrorDetail] = useState<string | null>(null);');
    expect(source).toContain('data-alert-notice-rule-save-failure={ruleErrorDetail ? \'angular-notify-title-detail\' : undefined}');
    expect(source).toContain('data-alert-notice-rule-save-failure-owner={ruleErrorDetail ? \'route-action-feedback-contract\' : undefined}');
    expect(source).toContain('data-alert-notice-rule-save-failure-title={ruleErrorDetail ? ruleError : undefined}');
    expect(source).toContain('data-alert-notice-rule-save-failure-detail={ruleErrorDetail ?? undefined}');
    expect(handleSaveRuleSource).toContain("setRuleError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(handleSaveRuleSource).toContain('setRuleErrorDetail(error instanceof Error ? error.message : null)');
    expect(handleSaveRuleSource).not.toContain("setRuleError(error instanceof Error ? error.message : t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
  });

  it('keeps Angular notice-template save failure title separate from backend detail', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveTemplateSource = source.slice(source.indexOf('async function handleSaveTemplate()'), source.indexOf('async function handleDeleteTemplate()'));

    expect(source).toContain('const [templateErrorDetail, setTemplateErrorDetail] = useState<string | null>(null);');
    expect(source).toContain('data-alert-notice-template-save-failure={templateErrorDetail ? \'angular-notify-title-detail\' : undefined}');
    expect(source).toContain('data-alert-notice-template-save-failure-owner={templateErrorDetail ? \'route-action-feedback-contract\' : undefined}');
    expect(source).toContain('data-alert-notice-template-save-failure-title={templateErrorDetail ? templateError : undefined}');
    expect(source).toContain('data-alert-notice-template-save-failure-detail={templateErrorDetail ?? undefined}');
    expect(handleSaveTemplateSource).toContain("setTemplateError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(handleSaveTemplateSource).toContain('setTemplateErrorDetail(error instanceof Error ? error.message : null)');
    expect(handleSaveTemplateSource).not.toContain("setTemplateError(error instanceof Error ? error.message : t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
  });

  it('keeps new notice templates on Angular required type selection before save', () => {
    const viewModelSource = readFileSync(resolve(process.cwd(), 'lib/alert-notice/view-model.ts'), 'utf8');
    const fieldsSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-template-fields.tsx'), 'utf8');
    const routeSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

    expect(viewModelSource).toContain("type: source?.type == null ? '' : String(source.type)");
    expect(viewModelSource).toContain("return t('alert.notice.template.validation.type')");
    expect(fieldsSource).toContain("const typeValue = draft.type || '';");
    expect(fieldsSource).toContain("t('alert.notice.receiver.type.placeholder')");
    expect(fieldsSource).toContain('data-alert-notice-template-type-required="angular-required-select"');
    expect(fieldsSource).toContain('data-alert-notice-template-type-required-owner="route-validation-contract"');
    expect(routeSource).toContain('<AlertNoticeTemplateFields t={t} draft={templateDraft} readOnly={templateReadOnly} onDraftChange={setTemplateDraft} />');
  });

  it('keeps notice-rule single Boolean switches unframed inside editor rows', () => {
    const fieldsSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-rule-fields.tsx'), 'utf8');

    expect(fieldsSource).toContain('data-alert-notice-rule-single-switch-frame="none"');
    expect(fieldsSource).toContain('data-alert-notice-rule-single-switch-frame-owner="route-form-contract"');
    expect(fieldsSource).toContain('data-alert-notice-rule-template-type-filter="angular-selected-receiver-type"');
    expect(fieldsSource).toContain('data-alert-notice-rule-template-type-filter-owner="route-form-contract"');
    expect(fieldsSource).toContain('data-alert-notice-rule-template-active-type="angular-switch-receiver"');
    expect(fieldsSource).toContain('data-alert-notice-rule-template-active-type-owner="route-form-contract"');
    expect(fieldsSource).toContain('data-alert-notice-rule-optional-period-time="angular-form-validity"');
    expect(fieldsSource).toContain('data-alert-notice-rule-optional-period-time-owner="route-validation-contract"');
    expect(fieldsSource).toContain('data-alert-notice-rule-period-limit-state="angular-independent-isLimit"');
    expect(fieldsSource).toContain('data-alert-notice-rule-period-limit-state-owner="route-form-contract"');
    expect(fieldsSource).toContain('data-alert-notice-rule-edit-option-seeding="angular-detail-options"');
    expect(fieldsSource).toContain('data-alert-notice-rule-edit-option-seeding-owner="route-form-contract"');
    expect(fieldsSource).toContain('export function AlertNoticeRuleSwitch');
    expect(fieldsSource).toContain('aria-label={label}');
    expect(fieldsSource).toContain('hover:border-[#5f7df6]');
    expect(fieldsSource).toContain('data-alert-notice-rule-switch-label={row}');
    expect(fieldsSource).not.toContain('hover:text-white');
    expect(fieldsSource).not.toContain('inline-flex h-8 items-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2');
  });

  it('keeps notice editor validation feedback inside the active cold editor dialogs', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

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

  it('keeps Angular create and edit notification keys for all notice save dialogs', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveReceiverSource = source.slice(source.indexOf('async function handleSaveReceiver()'), source.indexOf('async function handleDeleteReceiver()'));
    const handleSaveTemplateSource = source.slice(source.indexOf('async function handleSaveTemplate()'), source.indexOf('async function handleDeleteTemplate()'));
    const handleSaveRuleSource = source.slice(source.indexOf('async function handleSaveRule()'), source.indexOf('async function handleDeleteRule()'));
    const saveSources = [handleSaveReceiverSource, handleSaveTemplateSource, handleSaveRuleSource];

    expect(source).toContain('data-alert-notice-save-feedback="angular-new-edit-notify"');
    expect(source).toContain('data-alert-notice-save-feedback-owner="route-action-feedback-contract"');
    for (const saveSource of saveSources) {
      expect(saveSource).toContain('const isEdit = Boolean(');
      expect(saveSource).toContain("isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'");
      expect(saveSource).toContain("isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'");
      expect(saveSource).not.toContain('common.save-success');
      expect(saveSource).not.toContain('common.save-failed');
    }
  });

  it('keeps Angular receiver save next-step copy on create and edit success', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveReceiverSource = source.slice(source.indexOf('async function handleSaveReceiver()'), source.indexOf('async function handleDeleteReceiver()'));
    const handleSaveTemplateSource = source.slice(source.indexOf('async function handleSaveTemplate()'), source.indexOf('async function handleDeleteTemplate()'));
    const handleSaveRuleSource = source.slice(source.indexOf('async function handleSaveRule()'), source.indexOf('async function handleDeleteRule()'));

    expect(source).toContain('data-alert-notice-receiver-success-next="angular-policy-next"');
    expect(source).toContain('data-alert-notice-receiver-success-next-owner="route-action-feedback-contract"');
    expect(handleSaveReceiverSource).toContain("t('alert.notice.receiver.next')");
    expect(handleSaveReceiverSource).toContain("setReceiverMessage([t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'), t('alert.notice.receiver.next')].join(' '))");
    expect(handleSaveTemplateSource).not.toContain('alert.notice.receiver.next');
    expect(handleSaveRuleSource).not.toContain('alert.notice.receiver.next');
  });

  it('keeps Angular receiver save transport-error close behavior distinct from business failures', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveReceiverSource = source.slice(source.indexOf('async function handleSaveReceiver()'), source.indexOf('async function handleDeleteReceiver()'));
    const handleSaveTemplateSource = source.slice(source.indexOf('async function handleSaveTemplate()'), source.indexOf('async function handleDeleteTemplate()'));

    expect(source).toContain('function isApiMessageBusinessError(error: unknown)');
    expect(source).toContain('data-alert-notice-receiver-save-failure-close="angular-transport-error-close"');
    expect(source).toContain('data-alert-notice-receiver-save-failure-close-owner="route-action-feedback-contract"');
    expect(handleSaveReceiverSource).toContain('if (!isApiMessageBusinessError(error))');
    expect(handleSaveReceiverSource).toContain('setEditingReceiver(false);');
    expect(handleSaveTemplateSource).not.toContain('isApiMessageBusinessError');
  });

  it('keeps Angular receiver save failure title separate from backend detail while preserving transport close', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleSaveReceiverSource = source.slice(source.indexOf('async function handleSaveReceiver()'), source.indexOf('async function handleDeleteReceiver()'));

    expect(source).toContain('const [receiverErrorDetail, setReceiverErrorDetail] = useState<string | null>(null);');
    expect(source).toContain('data-alert-notice-receiver-save-failure={receiverErrorDetail ? \'angular-notify-title-detail\' : undefined}');
    expect(source).toContain('data-alert-notice-receiver-save-failure-owner={receiverErrorDetail ? \'route-action-feedback-contract\' : undefined}');
    expect(source).toContain('data-alert-notice-receiver-save-failure-title={receiverErrorDetail ? receiverError : undefined}');
    expect(source).toContain('data-alert-notice-receiver-save-failure-detail={receiverErrorDetail ?? undefined}');
    expect(handleSaveReceiverSource).toContain("setReceiverError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
    expect(handleSaveReceiverSource).toContain('setReceiverErrorDetail(error instanceof Error ? error.message : null)');
    expect(handleSaveReceiverSource).toContain('if (!isApiMessageBusinessError(error))');
    expect(handleSaveReceiverSource).not.toContain("setReceiverError(error instanceof Error ? error.message : t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'))");
  });

  it('keeps Angular edit-fail fallback keys for all notice detail loads', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleEditReceiverSource = source.slice(source.indexOf('async function handleEditReceiver('), source.indexOf('async function handleSaveReceiver()'));
    const handleEditTemplateSource = source.slice(source.indexOf('async function handleEditTemplate('), source.indexOf('async function handleViewTemplate('));
    const handleEditRuleSource = source.slice(source.indexOf('async function handleEditRule('), source.indexOf('async function handleSaveRule()'));
    const editSources = [handleEditReceiverSource, handleEditTemplateSource, handleEditRuleSource];

    expect(source).toContain('data-alert-notice-edit-load-feedback="angular-edit-fail"');
    expect(source).toContain('data-alert-notice-edit-load-feedback-owner="route-action-feedback-contract"');
    for (const editSource of editSources) {
      expect(editSource).toContain("t('common.notify.edit-fail')");
      expect(editSource).not.toContain('common.load-failed');
    }
  });

  it('keeps Angular receiver row edit loading the full detail before opening the modal', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleEditReceiverSource = source.slice(source.indexOf('async function handleEditReceiver('), source.indexOf('async function handleSaveReceiver()'));

    expect(source).toContain('data-alert-notice-receiver-edit-detail="angular-detail-fetch"');
    expect(source).toContain('data-alert-notice-receiver-edit-detail-owner="route-detail-fetch-contract"');
    expect(source).toContain('onClick={() => void handleEditReceiver(receiver)}');
    expect(handleEditReceiverSource).toContain('async function handleEditReceiver(receiver = selectedReceiver)');
    expect(handleEditReceiverSource).toContain('await api.alertNotice.receivers.detail(receiver.id)');
    expect(handleEditReceiverSource).toContain('setReceiverDraft(buildNoticeReceiverDraft(detail))');
    expect(handleEditReceiverSource).not.toContain('buildNoticeReceiverDraft(receiver)');
  });

  it('keeps Angular custom template row edit loading the full detail before opening the modal', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleEditTemplateSource = source.slice(source.indexOf('async function handleEditTemplate('), source.indexOf('async function handleViewTemplate('));

    expect(source).toContain('data-alert-notice-template-edit-detail="angular-detail-fetch"');
    expect(source).toContain('data-alert-notice-template-edit-detail-owner="route-detail-fetch-contract"');
    expect(source).toContain('onClick={() => void handleEditTemplate(template)}');
    expect(handleEditTemplateSource).toContain('const detail = await api.alertNotice.templates.detail(template.id)');
    expect(handleEditTemplateSource).toContain('setTemplateDraft(buildNoticeTemplateDraft(detail))');
    expect(handleEditTemplateSource).not.toContain('buildNoticeTemplateDraft(template)');
  });

  it('keeps Angular preset template viewer footer using return and no OK action', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const templateDialogStart = source.indexOf('const templateEditorDialog = (');
    const templateEditorDialogSource = source.slice(templateDialogStart, source.indexOf('        return (', templateDialogStart));

    expect(source).toContain('data-alert-notice-template-viewer-return={templateReadOnly ? \'angular-cancel-return\' : undefined}');
    expect(source).toContain('data-alert-notice-template-viewer-return-owner={templateReadOnly ? \'route-modal-footer-contract\' : undefined}');
    expect(source).toContain('data-alert-notice-template-viewer-ok="none"');
    expect(source).toContain('data-alert-notice-template-viewer-ok-owner="route-modal-footer-contract"');
    expect(templateEditorDialogSource).toContain("templateReadOnly ? t('common.button.return') : t('common.cancel')");
    expect(templateEditorDialogSource).toContain('{!templateReadOnly ? (');
  });

  it('keeps Angular delete page-index clamping for all notice tabs', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const handleConfirmedDeleteSource = source.slice(source.indexOf('async function handleConfirmedDelete()'), source.indexOf('async function handleTestSend()'));

    expect(source).toContain('function clampNoticePageIndexAfterDelete');
    expect(source).toContain('Math.ceil(nextTotal / safePageSize) - 1');
    expect(source).toContain('setReceiverPageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, receiverPageSize, receiverTotal, 1))');
    expect(source).toContain('setRulePageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, rulePageSize, ruleTotal, 1))');
    expect(source).toContain('setTemplatePageIndex(pageIndex => clampNoticePageIndexAfterDelete(pageIndex, templatePageSize, templateTotal, 1))');
    expect(source).toContain('data-alert-notice-delete-page-clamp="angular-update-page-index"');
    expect(source).toContain('data-alert-notice-delete-page-clamp-owner="route-state-contract"');
    expect(source).toContain('data-alert-notice-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-alert-notice-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain('data-alert-notice-delete-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain('data-alert-notice-delete-confirm-ok');
    expect(source).toContain('data-alert-notice-delete-confirm-cancel');
    expect(source).toContain('data-alert-notice-delete-feedback="angular-delete-notify"');
    expect(source).toContain('data-alert-notice-delete-feedback-owner="route-action-feedback-contract"');
    expect(source).not.toContain("from '../../../components/ui/hz-confirm-dialog'");
    expect(handleConfirmedDeleteSource.match(/common.notify.delete-success/g)?.length).toBe(3);
    expect(handleConfirmedDeleteSource).toContain("t('common.notify.delete-fail')");
    expect(handleConfirmedDeleteSource).not.toContain('common.delete-success');
    expect(handleConfirmedDeleteSource).not.toContain('common.delete-failed');
  });

  it('keeps the old Angular receiver test-send loading guard inside the editor dialog', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const receiverFieldsSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const handleTestSendSource = source.slice(source.indexOf('async function handleTestSend()'), source.indexOf('async function handleNewTemplate()'));

    expect(source).toContain('const [testingReceiver, setTestingReceiver] = useState(false)');
    expect(source).toContain('setTestingReceiver(true);');
    expect(source).toContain('setTestingReceiver(false);');
    expect(source).toContain('buildNoticeTemplateListUrl');
    expect(source).toContain('alertNoticeTemplateListUrl');
    expect(source).toContain('data.templateOptions?.content ?? data.templates.content');
    expect(source).not.toContain('const filteredTemplates = data.templates.content.filter');
    expect(source).toContain('data-alert-notice-receiver-test-loading={testingReceiver ? \'true\' : \'false\'}');
    expect(source).toContain('data-alert-notice-receiver-test-validation="angular-backend-owned"');
    expect(source).toContain('data-alert-notice-receiver-test-validation-owner="route-mutation-contract"');
    expect(receiverFieldsSource).toContain('data-alert-notice-receiver-default-type="angular-email"');
    expect(receiverFieldsSource).toContain('data-alert-notice-receiver-default-type-owner="route-form-contract"');
    expect(source).toContain('aria-busy={testingReceiver}');
    expect(source).toContain('disabled={testingReceiver || savingReceiver}');
    expect(source).toContain('data-alert-notice-receiver-test-feedback="cold-test-feedback"');
    expect(source).toContain('editingReceiver && receiverMessage');
    expect(source).toContain('!editingReceiver && receiverMessage');
    expect(handleTestSendSource).toContain('await api.alertNotice.receivers.sendTest(receiverDraft)');
    expect(handleTestSendSource).not.toContain('validateNoticeReceiverDraft(receiverDraft, t)');
  });

  it('loads alert notice data through the default receiver and rule query contract', async () => {
    await renderAlertNoticePage();

    await mockState.lastLoad?.();

    expect(mockLoadAlertNoticeData).toHaveBeenCalledWith(expect.anything(), {
      receivers: { search: '', pageIndex: 0, pageSize: 8 },
      rules: { search: '', pageIndex: 0, pageSize: 8 },
      templates: { search: '', preset: true, pageIndex: 0, pageSize: 8 }
    });
  }, 30_000);

  it('opens notice policy context when routed from a three-signal alert investigation', async () => {
    const initialRouteState: AlertNoticeRouteState = {
      signal: 'logs',
      signalContext: {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        returnTo: '/log/manage?traceId=trace-123'
      }
    };

    const html = await renderAlertNoticePage(initialRouteState);
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

    expect(html).toContain('data-selected-tab="rule"');
    expect(html).toContain('data-alert-notice-evidence-context="signal-route"');
    expect(html).toContain('data-alert-notice-evidence-signal="logs"');
    expect(html).toContain('data-alert-notice-prefill-labels="hertzbeat.signal:logs');
    expect(html).toContain('hertzbeat.entity.id:7');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(html).toContain(
      createTranslatorMock({ locale: 'zh-CN' })('alert.rule.evidence.notice.title', {
        signal: createTranslatorMock({ locale: 'zh-CN' })('alert.rule.signal.logs')
      })
    );
    expect(html).toContain(createTranslatorMock({ locale: 'zh-CN' })('alert.rule.evidence.notice.copy'));
    expect(html).toContain('data-alert-notice-evidence-return="true"');
    expect(html).toContain('href="/log/manage?traceId=trace-123"');
    expect(source).not.toContain('useSearchParams');
    expect(source).not.toContain('readSignalRouteContext(searchParams)');
    expect(source).toContain('const alertNoticeRouteState = initialRouteState ?? EMPTY_ALERT_NOTICE_ROUTE_STATE');
    expect(source).toContain('buildAlertNoticeEvidenceContext');
    expect(source).toContain('data-alert-notice-rule-editor-return="evidence-context"');
    expect(source).toContain('noticeEvidenceContext?.returnHref');
    expect(source).toContain('buildNoticeRuleDraft(null, noticeEvidenceContext?.ruleDraftPatch)');
  }, 30_000);

  it('renders missing evidence labels with the localized empty fallback', async () => {
    const html = await renderAlertNoticePage({
      signal: null,
      signalContext: {
        returnTo: '/alert?source=logs'
      }
    });

    expect(html).toContain('data-selected-tab="rule"');
    expect(html).toContain('data-alert-notice-evidence-context="signal-route"');
    expect(html).toContain('data-alert-notice-prefill-labels=""');
    expect(html).toContain('data-alert-notice-evidence-labels="generated-labels"');
    expect(html).toContain(`>${createTranslatorMock({ locale: 'zh-CN' })('common.none')}</div>`);
    expect(html).not.toContain('data-alert-notice-prefill-labels="-"');
    expect(html).not.toContain('>-</div>');
  }, 30_000);

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
      const html = await renderAlertNoticePage();
      const t = createTranslatorMock({ locale: 'zh-CN' });

      expect(html).toContain('data-alert-notice-receiver-empty-state="cold-empty-state"');
      expect(html).toContain('data-alert-notice-receiver-empty-icon="cold-empty-icon"');
      expect(html).toContain(t('common.no-data'));
    } finally {
      mockState.renderData = previousData;
    }
  }, 30_000);

  it('keeps alert notice remounts on a short settled cache window with refresh-tick invalidation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_NOTICE_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('const [refreshTick, setRefreshTick] = useState(0)');
    expect(source).toContain("['alert-notice', alertNoticeReceiverListUrl, alertNoticeRuleListUrl, alertNoticeTemplateListUrl, refreshTick].join('|')");
    expect(source).toContain('[alertNoticeReceiverListUrl, alertNoticeRuleListUrl, alertNoticeTemplateListUrl, refreshTick]');
    expect(source).toContain('void refreshTick');
    expect(source).toContain('[alertNoticeLoadQuery, refreshTick]');
    expect(source.match(/setRefreshTick\(value => value \+ 1\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source).toContain('data-alert-notice-receiver-sync="angular-load-table"');
    expect(source).toContain('data-alert-notice-rule-sync="angular-load-table"');
    expect(source).toContain('data-alert-notice-template-sync="angular-load-table"');
    expect(source).toContain('cacheKey={alertNoticeCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_NOTICE_SETTLED_CACHE_TTL_MS}');
  });
});
