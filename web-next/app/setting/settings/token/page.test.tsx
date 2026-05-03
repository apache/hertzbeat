import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { React?: typeof React }).React = React;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    tokens: [
      {
        id: 1,
        name: 'OTLP ingestion',
        tokenMask: 'hb_xxx',
        creator: 'admin',
        gmtCreate: '2026-04-10T08:00:00Z',
        expireTime: '2026-04-11T08:00:00Z',
        lastUsedTime: '2026-04-10T10:00:00Z'
      },
      {
        id: 2,
        name: 'Expired token',
        tokenMask: 'hb_yyy',
        creator: 'ops',
        gmtCreate: '2026-04-01T08:00:00Z',
        expireTime: '2026-04-02T08:00:00Z',
        lastUsedTime: null
      },
      {
        id: 3,
        name: 'Never expires',
        tokenMask: 'hb_zzz',
        creator: 'admin',
        gmtCreate: '2026-04-12T08:00:00Z',
        expireTime: null,
        lastUsedTime: null
      }
    ]
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const loadTokenData = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'setting.token.loading': '正在加载令牌管理',
        'settings.token': '令牌管理',
        'settings.token.console.kicker': 'API 密钥',
        'settings.token.console.title': '统一管理遥测和自动化令牌',
        'settings.token.console.copy': '在同一页查看令牌状态、最近使用情况和撤销入口。',
        'settings.token.console.result.total': '令牌总数',
        'settings.token.console.result.active': '可用令牌',
        'settings.token.console.result.expired': '过期令牌',
        'settings.token.generate': '生成令牌',
        'settings.token.desc': '管理用于 API 集成访问的长期令牌，可随时创建或撤销。',
        'settings.token.name': '令牌名称',
        'settings.token.value': '令牌值',
        'settings.token.creator': '创建者',
        'settings.token.create-time': '创建时间',
        'settings.token.expire-time': '过期时间',
        'settings.token.expire.never': '永不过期',
        'settings.token.last-used': '最近使用时间',
        'common.edit': '操作',
        'common.button.delete': '删除'
      }
    })
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../../components/settings/settings-console-shell', () => ({
  SettingsConsoleTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-settings-console-title="true">{children}</div>
  )
}));

vi.mock('../../../../lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('../../../../lib/setting-token/controller', () => ({
  loadTokenData
}));

vi.mock('../../../../lib/setting-token/view-model', () => ({
  isExpired: (token: { expireTime?: string | null }) => token.expireTime === '2026-04-02T08:00:00Z'
}));

describe('setting token page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.tokens);
    loadTokenData.mockReset().mockImplementation(async apiGetFn => {
      const tokens = await apiGetFn('/account/token');
      return { tokens };
    });
  });

  it('renders the cold settings token console with counts and the token table', async () => {
    const { default: SettingTokenPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingTokenPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-token-surface="otlp-cold-token-console"');
    expect(html).toContain('data-setting-token-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(html).toContain('data-setting-token-header="cold-compact-header"');
    expect(html).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(html).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-setting-token-strip="cold-token-strip"');
    expect(html).toContain('data-setting-token-strip-style="cold-inline-counts"');
    expect(html).toContain('data-setting-token-table-panel="cold-dense-table"');
    expect(html).toContain('data-setting-token-table="cold-token-table"');
    expect(html).toContain('data-setting-token-row-action="cold-row-action"');
    expect(html).toContain('令牌管理');
    expect(html).toContain('API 密钥');
    expect(html).toContain('统一管理遥测和自动化令牌');
    expect(html).toContain('在同一页查看令牌状态、最近使用情况和撤销入口。');
    expect(html).toContain('生成令牌');
    expect(html).toContain('令牌总数');
    expect(html).toContain('可用令牌');
    expect(html).toContain('过期令牌');
    expect(html).toContain('令牌名称');
    expect(html).toContain('令牌值');
    expect(html).toContain('创建者');
    expect(html).toContain('创建时间');
    expect(html).toContain('过期时间');
    expect(html).toContain('最近使用时间');
    expect(html).toContain('操作');
    expect(html).toContain('删除');
    expect(html).toContain('永不过期');
    expect(html).toContain('OTLP ingestion');
    expect(html).toContain('Expired token');
    expect(html).toContain('hb_xxx');
    expect(html).toContain('hb_yyy');
    expect(html).not.toContain('data-setting-token-surface="angular-token-console"');
    expect(html).not.toContain('data-setting-token-summary-rail=');
    expect(html).not.toContain('data-setting-token-header="angular-token-header"');
    expect(html).not.toContain('data-setting-token-strip-style="angular-inline-counts"');
    expect(html).not.toContain('data-setting-token-table-panel="angular-token-table-panel"');
    expect(html).not.toContain('data-setting-token-table="angular-token-table"');
    expect(html).not.toContain('data-workbench-page="true"');
    expect(html).not.toContain('data-stage-section=');
    expect(html).not.toContain('API Keys');
    expect(html).not.toContain('令牌摘要');
    expect(html).not.toContain('当前令牌');
    expect(html).not.toContain('Generate token');
    expect(html).not.toContain('Token management');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/account/token');
  });

  it('keeps the token route on the settings owner instead of observability workbench primitives', () => {
    const source = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-setting-token-surface="otlp-cold-token-console"');
    expect(source).toContain('data-setting-token-style-baseline={coldTokenVisual.canvasName}');
    expect(source).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(source).toContain('data-setting-token-header="cold-compact-header"');
    expect(source).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(source).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-setting-token-table="cold-token-table"');
    expect(source).toContain('data-setting-token-strip-style="cold-inline-counts"');
    expect(source).toContain('SettingsConsoleTitle');
    expect(source).not.toContain('data-setting-token-summary-rail');
    expect(source).not.toContain('angular-token-console');
    expect(source).not.toContain('angular-token-header');
    expect(source).not.toContain('angular-inline-counts');
    expect(source).not.toContain('angular-token-table-panel');
    expect(source).not.toContain('angular-token-table');
    expect(source).not.toContain('@/components/observability');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('StageSection');
  });
});
