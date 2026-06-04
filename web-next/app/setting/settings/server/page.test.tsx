import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    email: {
      emailHost: 'smtp.example.com',
      emailPort: 587,
      emailUsername: 'ops',
      emailPassword: 'hidden',
      emailSsl: true,
      emailStarttls: false,
      enable: true
    },
    sms: {
      type: 'tencent',
      enable: false,
      tencent: {
        secretId: 'old-id',
        secretKey: 'old-key',
        signName: 'old-sign',
        appId: '10001',
        templateId: 'tpl-old'
      }
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: unknown) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../../components/settings/settings-console-shell', () => ({
  SettingsConsoleTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-settings-console-title="true">{children}</div>
  )
}));

vi.mock('../../../../components/settings/settings-summary-list', () => ({
  SettingsSummaryList: ({
    items
  }: {
    items: Array<{
      key: string;
      title: React.ReactNode;
      lines: React.ReactNode[];
      actionLabel: string;
      actionAriaLabel?: string;
    }>;
  }) => (
    <div
      data-settings-summary-list="true"
      data-settings-summary-list-owner="cold-settings-summary-owner"
      data-settings-summary-list-style="cold-dense-summary-list"
    >
      {items.map(item => (
        <section key={item.key} data-settings-summary-item={item.key} data-settings-summary-row-style="cold-summary-row">
          <h2>{item.title}</h2>
          <div>{item.lines.map((line, index) => <div key={`${item.key}-${index}`}>{line}</div>)}</div>
          <button
            type="button"
            data-settings-summary-action={item.key}
            data-settings-summary-action-style="cold-compact-action"
            aria-label={item.actionAriaLabel}
          >
            {item.actionLabel}
          </button>
        </section>
      ))}
    </div>
  )
}));

vi.mock('../../../../components/workbench/overlay-dialog', () => ({
  OverlayDialog: ({
    open,
    title,
    footer,
    children,
    maxWidthClassName,
    overlayProps
  }: {
    open: boolean;
    title: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    maxWidthClassName?: string;
    overlayProps?: React.HTMLAttributes<HTMLDivElement>;
  }) => (
    <section
      data-overlay-dialog="true"
      data-open={open ? 'true' : 'false'}
      data-overlay-dialog-title={title}
      data-overlay-dialog-max-width={maxWidthClassName}
      {...overlayProps}
    >
      <header>{title}</header>
      <div>{children}</div>
      <footer>{footer}</footer>
    </section>
  )
}));

vi.mock('../../../../components/settings/settings-dialog-form', () => ({
  SettingsDialogForm: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form data-settings-dialog-form="true" {...props}>{children}</form>
  ),
  SettingsDialogField: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label data-settings-dialog-field={label} data-settings-dialog-field-layout="angular-label-7-control-12">
      <span data-settings-dialog-label-span="7">{label}</span>
      <div data-settings-dialog-control-span="12">{children}</div>
    </label>
  ),
  SettingsDialogInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SettingsDialogSelect: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
  SettingsDialogToggle: ({ checked }: { checked: boolean }) => <button type="button" role="switch" aria-checked={checked} />,
  SettingsDialogFooter: ({ children }: { children: React.ReactNode }) => <div data-settings-dialog-footer="true">{children}</div>
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzInlineFeedback: ({ title, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
    </div>
  )
}));

vi.mock('../../../../lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost
}));

describe('setting server page', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset()
      .mockResolvedValueOnce(mockState.renderData.email)
      .mockResolvedValueOnce(mockState.renderData.sms);
    apiMessagePost.mockReset();
  });

  it('renders the localized summary list and message-server dialog wiring on the shared settings console contract', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingServerPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingServerPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain(`data-loading-copy="${t('setting.settings.server.loading')}"`);
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-settings-server-page="otlp-cold-message-server"');
    expect(html).toContain('data-settings-server-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-settings-server-layout="full-width-settings-summary"');
    expect(html).toContain('data-settings-server-dialog-width-contract="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(html).toContain('data-settings-server-summary="cold-summary-list"');
    expect(html).toContain('data-settings-summary-list="true"');
    expect(html).toContain('data-settings-summary-list-owner="cold-settings-summary-owner"');
    expect(html).toContain('data-settings-summary-list-style="cold-dense-summary-list"');
    expect(html).toContain('data-settings-summary-row-style="cold-summary-row"');
    expect(html).toContain('data-settings-summary-item="email"');
    expect(html).toContain('data-settings-summary-item="sms"');
    expect(html).toContain('data-settings-summary-action="email"');
    expect(html).toContain('data-settings-summary-action="sms"');
    expect(html).toContain('data-settings-summary-action-style="cold-compact-action"');
    expect(html).toContain(`aria-label="${t('settings.server.summary.configure-action', { title: t('settings.server.email') })}"`);
    expect(html).toContain(`aria-label="${t('settings.server.summary.configure-action', { title: t('settings.server.sms') })}"`);
    expect(html).toContain(t('settings.server'));
    expect(html).toContain(t('settings.server.email'));
    expect(html).toContain(t('settings.server.sms'));
    expect(html).toContain(`${t('alert.notice.sender.mail.host')}: smtp.example.com`);
    expect(html).toContain(`${t('alert.notice.sender.mail.username')}: ops`);
    expect(html).toContain(`${t('alert.notice.sender.mail.enable')}: ${t('common.yes')}`);
    expect(html).toContain(`${t('alert.notice.sender.sms.tencent.appId')}: 10001`);
    expect(html).toContain(`${t('alert.notice.sender.sms.tencent.signName')}: old-sign`);
    expect(html).toContain(`${t('common.enable')}: ${t('common.no')}`);
    expect(html).toContain(`data-overlay-dialog-title="${t('settings.server.email.setting')}"`);
    expect(html).toContain(`data-overlay-dialog-title="${t('settings.server.sms.setting')}"`);
    expect(html).toContain('data-overlay-dialog-max-width="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"');
    expect(html).toContain('data-settings-server-email-dialog-width="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-email-dialog-mask="angular-mask-closable-false"');
    expect(html).toContain('data-settings-server-sms-dialog-width="angular-width-40-percent"');
    expect(html).toContain('data-settings-server-sms-dialog-mask="angular-mask-closable-false"');
    expect(html).toContain('data-settings-dialog-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-settings-dialog-label-span="7"');
    expect(html).toContain('data-settings-dialog-control-span="12"');
    expect(html).toContain('data-settings-server-email-apply-contract="angular-apply-notify"');
    expect(html).toContain('data-settings-server-sms-apply-contract="angular-apply-notify"');
    expect(html).toContain(t('alert.notice.sender.mail.password'));
    expect(html).toContain(t('alert.notice.sender.sms.type'));
    expect(html).toContain(t('alert.notice.sender.sms.type.tencent'));
    expect(html).toContain('Twilio Sms');
    expect(html).toContain(t('common.button.cancel'));
    expect(html).toContain(t('common.button.save'));
    expect(html).toContain(t('common.button.setting'));
    expect(html).not.toContain('data-settings-server-page="angular-message-server"');
    expect(html).not.toContain('data-settings-server-summary-rail=');
    expect(html).not.toContain('data-settings-summary-list-style="angular-nz-list"');
    expect(html).not.toContain('Message Server Setting');
    expect(html).not.toContain('Email Server Address');
    expect(html).not.toContain('Setting</button>');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/config/email');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/config/sms');
  }, 15000);

  it('keeps the server route on the cold settings-console summary owner', () => {
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-settings-server-page="otlp-cold-message-server"');
    expect(source).toContain('data-settings-server-style-baseline={coldServerVisual.canvasName}');
    expect(source).toContain('data-settings-server-layout="full-width-settings-summary"');
    expect(source).toContain('data-settings-server-dialog-width-contract="angular-width-40-percent"');
    expect(source).toContain('data-settings-server-dialog-field-layout-contract="angular-label-7-control-12"');
    expect(source).toContain('data-settings-server-summary="cold-summary-list"');
    expect(source).toContain('maxWidthClassName="w-[min(92vw,520px)] md:w-[40vw] md:max-w-[40vw]"');
    expect(source).toContain("'data-settings-server-email-dialog-width': 'angular-width-40-percent'");
    expect(source).toContain("'data-settings-server-sms-dialog-width': 'angular-width-40-percent'");
    expect(source).toContain("'data-settings-server-email-dialog-mask': 'angular-mask-closable-false'");
    expect(source).toContain("'data-settings-server-sms-dialog-mask': 'angular-mask-closable-false'");
    expect(source).toContain('data-settings-server-email-apply-contract="angular-apply-notify"');
    expect(source).toContain('data-settings-server-sms-apply-contract="angular-apply-notify"');
    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('data-settings-server-apply-feedback-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain('SettingsSummaryList');
    expect(source).not.toContain('data-settings-server-summary-rail');
    expect(source).not.toContain('angular-message-server');
    expect(source).not.toContain('angular-nz-list');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('@/components/observability');
  });

  it('uses the shared cold number stepper for the email port field', async () => {
    const { default: SettingServerPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingServerPage />);
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain("from '../../../../components/ui/number-stepper'");
    expect(source).toContain('data-settings-server-email-port-stepper="hertzbeat-ui-number-stepper"');
    expect(source).not.toContain('type="number"');
    expect(html).toContain('data-settings-server-email-port-stepper="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-number-stepper-owner="hertzbeat-ui-number-stepper"');
    expect(html).toContain('data-hz-number-stepper-input="true"');
    expect(html).toContain('data-hz-number-stepper-action="decrement"');
    expect(html).toContain('data-hz-number-stepper-action="increment"');
    expect(html).toContain('value="587"');
  });

  it('keeps message-server remounts on a short settled cache window while email and SMS saves invalidate it', () => {
    const source = readFileSync(resolve(__dirname, 'setting-server-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_SERVER_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-server', '/config/email', '/config/sms', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('await saveEmailConfig(apiMessagePost, email);');
    expect(source).toContain('await saveSmsConfig(apiMessagePost, sms);');
    expect(source.match(/setReloadVersion\(version => version \+ 1\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('cacheKey={settingServerCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_SERVER_SETTLED_CACHE_TTL_MS}');
  });
});
