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
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'settings.server': '消息服务配置',
        'settings.server.email': '邮件服务器',
        'settings.server.sms': '短信配置',
        'settings.server.email.setting': '配置邮件服务器',
        'settings.server.sms.setting': '配置短信参数',
        'alert.notice.sender.mail.host': '邮箱服务器地址',
        'alert.notice.sender.mail.port': '邮箱端口',
        'alert.notice.sender.mail.username': '邮箱账号',
        'alert.notice.sender.mail.password': '邮箱密码',
        'alert.notice.sender.mail.ssl': '是否启用SSL',
        'alert.notice.sender.mail.starttls': '是否启用STARTTLS',
        'alert.notice.sender.mail.enable': '是否启用邮箱配置',
        'alert.notice.sender.sms.type': '短信类型',
        'alert.notice.sender.sms.type.tencent': '腾讯短信',
        'alert.notice.sender.sms.type.alibaba': '阿里短信',
        'alert.notice.sender.sms.type.unisms': '合一短信（UniSMS）',
        'alert.notice.sender.sms.type.smslocal': '当地短信（Smslocal）',
        'alert.notice.sender.sms.type.aws': 'Aws Sms',
        'alert.notice.sender.sms.type.twilio': 'Twilio Sms',
        'alert.notice.sender.sms.tencent.appId': '腾讯短信AppId',
        'alert.notice.sender.sms.tencent.signName': '腾讯短信SignName',
        'alert.notice.sender.sms.tencent.templateId': '腾讯短信TemplateId',
        'common.button.setting': '配置',
        'common.button.cancel': '取消',
        'common.button.save': '保存',
        'common.enable': '启用状态',
        'common.yes': '是',
        'common.no': '否'
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
          <button type="button" data-settings-summary-action={item.key} data-settings-summary-action-style="cold-compact-action">
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
    children
  }: {
    open: boolean;
    title: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section data-overlay-dialog="true" data-open={open ? 'true' : 'false'} data-overlay-dialog-title={title}>
      <header>{title}</header>
      <div>{children}</div>
      <footer>{footer}</footer>
    </section>
  )
}));

vi.mock('../../../../components/settings/settings-dialog-form', () => ({
  SettingsDialogForm: ({ children }: { children: React.ReactNode }) => <form data-settings-dialog-form="true">{children}</form>,
  SettingsDialogField: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label data-settings-dialog-field={label}>
      <span>{label}</span>
      {children}
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

  it('renders the cold Chinese summary list and message-server dialog wiring on the shared settings console contract', async () => {
    const { default: SettingServerPage } = await import('./page');
    const html = renderToStaticMarkup(<SettingServerPage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-settings-server-page="otlp-cold-message-server"');
    expect(html).toContain('data-settings-server-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-settings-server-layout="full-width-settings-summary"');
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
    expect(html).toContain('消息服务配置');
    expect(html).toContain('邮件服务器');
    expect(html).toContain('短信配置');
    expect(html).toContain('邮箱服务器地址: smtp.example.com');
    expect(html).toContain('邮箱账号: ops');
    expect(html).toContain('腾讯短信AppId: 10001');
    expect(html).toContain('腾讯短信SignName: old-sign');
    expect(html).toContain('启用状态: 否');
    expect(html).toContain('data-overlay-dialog-title="配置邮件服务器"');
    expect(html).toContain('data-overlay-dialog-title="配置短信参数"');
    expect(html).toContain('邮箱密码');
    expect(html).toContain('短信类型');
    expect(html).toContain('腾讯短信');
    expect(html).toContain('Twilio Sms');
    expect(html).toContain('取消');
    expect(html).toContain('保存');
    expect(html).toContain('配置');
    expect(html).not.toContain('data-settings-server-page="angular-message-server"');
    expect(html).not.toContain('data-settings-server-summary-rail=');
    expect(html).not.toContain('data-settings-summary-list-style="angular-nz-list"');
    expect(html).not.toContain('消息服务摘要');
    expect(html).not.toContain('当前消息服务');
    expect(html).not.toContain('Message Server Setting');
    expect(html).not.toContain('Email Server Address');
    expect(html).not.toContain('Setting</button>');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/config/email');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/config/sms');
  });

  it('keeps the server route on the cold settings-console summary owner', () => {
    const source = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-settings-server-page="otlp-cold-message-server"');
    expect(source).toContain('data-settings-server-style-baseline={coldServerVisual.canvasName}');
    expect(source).toContain('data-settings-server-layout="full-width-settings-summary"');
    expect(source).toContain('data-settings-server-summary="cold-summary-list"');
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
    const source = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8');

    expect(source).toContain("from '../../../../components/ui/number-stepper'");
    expect(source).toContain('data-settings-server-email-port-stepper="cold-number-stepper"');
    expect(source).not.toContain('type="number"');
    expect(html).toContain('data-settings-server-email-port-stepper="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-owner="cold-number-stepper"');
    expect(html).toContain('data-cold-number-stepper-input="true"');
    expect(html).toContain('data-cold-number-stepper-action="decrement"');
    expect(html).toContain('data-cold-number-stepper-action="increment"');
    expect(html).toContain('value="587"');
  });
});
