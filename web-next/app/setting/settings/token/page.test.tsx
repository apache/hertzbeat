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
const apiGet = vi.hoisted(() => vi.fn());
const apiDelete = vi.hoisted(() => vi.fn());
const loadTokenData = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
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
  apiDelete,
  apiGet,
  apiMessageGet
}));

vi.mock('../../../../lib/setting-token/controller', () => ({
  deleteTokenById: vi.fn(),
  generateTokenValue: vi.fn(),
  loadTokenData
}));

vi.mock('../../../../lib/setting-token/view-model', () => ({
  buildTokenExpirationOptions: () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return [
      { value: '-1', label: t('setting.token.expiration.never') },
      { value: '604800', label: t('setting.token.expiration.7d') },
      { value: '2592000', label: t('setting.token.expiration.30d') },
      { value: '7776000', label: t('setting.token.expiration.90d') },
      { value: '15552000', label: t('setting.token.expiration.180d') },
      { value: '31536000', label: t('setting.token.expiration.365d') }
    ];
  },
  isExpired: (token: { expireTime?: string | null }) => token.expireTime === '2026-04-02T08:00:00Z'
}));

describe('setting token page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiDelete.mockReset();
    apiGet.mockReset();
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.tokens);
    loadTokenData.mockReset().mockImplementation(async apiGetFn => {
      const tokens = await apiGetFn('/account/token');
      return { tokens };
    });
  });

  it('renders the cold settings token console with counts and the token table', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingTokenPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingTokenPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-token-surface="otlp-hertzbeat-ui-token-console"');
    expect(html).toContain('data-setting-token-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(html).toContain('data-setting-token-generate-dialog-layout-contract="angular-vertical-form"');
    expect(html).toContain('data-setting-token-generated-dialog-width-contract="angular-width-50-percent"');
    expect(html).toContain('data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"');
    expect(html).toContain('data-setting-token-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(html).toContain('data-setting-token-generate-trigger="angular-generate-token-modal"');
    expect(html).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-setting-token-strip="hertzbeat-ui-token-strip"');
    expect(html).toContain('data-setting-token-strip-style="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-setting-token-table-panel="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
    expect(html).toContain('data-setting-token-row-action="hertzbeat-ui-row-action"');
    expect(html).toContain('data-setting-token-delete-confirm="angular-modal-confirm"');
    expect(html).toContain('data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(html).toContain('data-setting-token-delete-confirm-state="closed"');
    expect(html).toContain('data-setting-token-delete-confirm-trigger="angular-modal-confirm"');
    expect(html).toContain('data-setting-token-load-failure-contract="angular-load-failed-retry"');
    expect(html).toContain('data-setting-token-load-failure-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain(t('settings.token'));
    expect(html).toContain(t('settings.token.console.kicker'));
    expect(html).toContain(t('settings.token.console.title'));
    expect(html).toContain(t('settings.token.console.copy'));
    expect(html).toContain(t('settings.token.generate'));
    expect(html).toContain(t('settings.token.console.result.total'));
    expect(html).toContain(t('settings.token.console.result.active'));
    expect(html).toContain(t('settings.token.console.result.expired'));
    expect(html).toContain(t('settings.token.name'));
    expect(html).toContain(t('settings.token.value'));
    expect(html).toContain(t('settings.token.creator'));
    expect(html).toContain(t('settings.token.create-time'));
    expect(html).toContain(t('settings.token.expire-time'));
    expect(html).toContain(t('settings.token.last-used'));
    expect(html).toContain(t('common.edit'));
    expect(html).toContain(t('common.button.delete'));
    expect(html).toContain(`aria-label="${t('settings.token.delete-action', { name: 'OTLP ingestion' })}"`);
    expect(html).toContain(`aria-label="${t('settings.token.delete-action', { name: 'Expired token' })}"`);
    expect(html).toContain(t('settings.token.expire.never'));
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
    expect(html).not.toContain('Generate token');
    expect(html).not.toContain('Token management');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/account/token');
  });

  it('keeps the token route on the settings owner instead of observability workbench primitives', () => {
    const source = readFileSync(resolve(__dirname, 'setting-token-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-setting-token-surface="otlp-hertzbeat-ui-token-console"');
    expect(source).toContain('data-setting-token-style-baseline={coldTokenVisual.canvasName}');
    expect(source).toContain('data-setting-token-layout-contract="full-width-admin-no-rail"');
    expect(source).toContain('data-setting-token-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-setting-token-command-row="standard-equal-buttons"');
    expect(source).toContain('data-setting-token-generate-trigger="angular-generate-token-modal"');
    expect(source).toContain('data-setting-token-generate-form="angular-generate-token-modal"');
    expect(source).toContain('data-setting-token-generate-dialog-layout-contract="angular-vertical-form"');
    expect(source).toContain('data-setting-token-generate-form-layout="angular-vertical-form"');
    expect(source).toContain('layout="vertical"');
    expect(source).toContain('data-setting-token-generate-submit="angular-generate-token"');
    expect(source).toContain('data-setting-token-generated-dialog-width-contract="angular-width-50-percent"');
    expect(source).toContain('data-setting-token-generated-dialog-mask-contract="angular-mask-closable-false"');
    expect(source).toContain('md:w-[50vw] md:max-w-[50vw]');
    expect(source).toContain('maskClosable={false}');
    expect(source).toContain('data-setting-token-generated-dialog="angular-token-display-once"');
    expect(source).toContain('data-setting-token-copy-action="angular-copy-token"');
    expect(source).toContain('data-setting-token-action-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-setting-token-delete-confirm="angular-modal-confirm"');
    expect(source).toContain('data-setting-token-delete-confirm-owner="hertzbeat-ui-confirm-dialog"');
    expect(source).toContain("data-setting-token-delete-confirm-state={deleteTarget ? 'open' : 'closed'}");
    expect(source).toContain('data-setting-token-delete-confirm-trigger="angular-modal-confirm"');
    expect(source).toContain('data-setting-token-delete-confirm-dialog="angular-modal-confirm"');
    expect(source).toContain('data-setting-token-delete-confirm-ok');
    expect(source).toContain('data-setting-token-delete-confirm-cancel');
    expect(source).toContain('renderError={(message, retry) =>');
    expect(source).toContain('data-setting-token-load-failure="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-failure-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-setting-token-load-failure-contract="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-failure-contract-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('data-setting-token-load-failure-feedback="angular-load-failed-retry"');
    expect(source).toContain('data-setting-token-load-retry="angular-load-tokens-retry"');
    expect(source).toContain("t('settings.token.load-fail-title')");
    expect(source).toContain("t('settings.token.load-fail')");
    expect(source).toContain("t('common.button.retry')");
    expect(source).toContain('deleteTokenById(apiDelete');
    expect(source).toContain('generateTokenValue(apiGet');
    expect(source).toContain('buildTokenExpirationOptions(t)');
    expect(source).toContain('data-setting-token-admin-layout="full-width-admin-list"');
    expect(source).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
    expect(source).toContain('data-setting-token-strip-style="hertzbeat-ui-inline-counts"');
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

  it('renders localized empty fallbacks for blank token table cells', async () => {
    const previousRenderData = mockState.renderData;
    mockState.renderData = {
      tokens: [
        {
          id: 9,
          name: ' ',
          tokenMask: '',
          creator: null,
          gmtCreate: '',
          expireTime: null,
          lastUsedTime: null
        }
      ]
    } as any;

    try {
      const { default: SettingTokenPage } = await import('./page');
      const html = renderToStaticMarkup(<SettingTokenPage />);
      const t = createTranslatorMock({ locale: 'zh-CN' });

      expect(html).toContain('data-setting-token-table="hertzbeat-ui-token-table"');
      expect(html).toContain(t('common.none'));
      expect(html).toContain(t('settings.token.expire.never'));
      expect(html).not.toContain('<td class="border-b border-r border-[#2b3039] bg-[#0b0c0e] px-3 py-3 text-[#d0d5dd] last:border-r-0">-</td>');
      expect(html).not.toContain('<code class="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[12px] text-[#c8d2df]">-</code>');
    } finally {
      mockState.renderData = previousRenderData;
    }
  });

  it('keeps token settings remounts on a short settled cache window and refreshes after generation', () => {
    const source = readFileSync(resolve(__dirname, 'setting-token-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_TOKEN_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-token', '/account/token', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('loadTokenData(apiMessageGet)');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={settingTokenCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_TOKEN_SETTLED_CACHE_TTL_MS}');
    expect(source).not.toContain('fake');
  });
});
