// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertNoticeReceiverFields, normalizeReceiverFieldValue } from './alert-notice-receiver-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { getAlertNoticeProductCopy } from '../../lib/alert-notice/view-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('AlertNoticeReceiverFields', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const productCopy = getAlertNoticeProductCopy(t);
  let interactionContainer: HTMLDivElement | null = null;
  let interactionRoot: Root | null = null;

  afterEach(async () => {
    await act(async () => {
      interactionRoot?.unmount();
      await Promise.resolve();
    });
    interactionRoot = null;
    interactionContainer?.remove();
    interactionContainer = null;
  });

  const baseDraft = {
    name: 'Lark on-call',
    type: '14',
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
    larkReceiveType: '1',
    userId: '',
    chatId: 'chat-001',
    slackWebHookUrl: '',
    corpId: '',
    agentId: '',
    appSecret: 'secret-1',
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
    appId: 'lark-app-1'
  };

  it('renders the shared receiver field owner with channel-specific field posture', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={baseDraft}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-receiver-fields="true"');
    expect(html).toContain('data-alert-notice-receiver-layout="angular-aligned-modal-form"');
    expect(html).toContain('data-alert-notice-receiver-form="aligned-label-control"');
    expect(html).toContain('data-alert-notice-receiver-form-row="name"');
    expect(html).toContain('data-alert-notice-receiver-form-row="type"');
    expect(html).toContain('data-alert-notice-receiver-form-row="appId"');
    expect(html.match(/data-alert-notice-receiver-field-help=/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-placement="inline-label"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-visual="circle-help-icon"/g)).toHaveLength(6);
    expect(html.match(/data-alert-authoring-field-help-icon="lucide-circle-help"/g)).toHaveLength(6);
    expect(html).not.toContain('data-alert-authoring-field-help-visual="borderless-question"');
    expect(html.match(/data-alert-notice-receiver-field-requirement=/g)).toHaveLength(6);
    expect(html.match(/data-alert-notice-receiver-field-requirement="required"/g)).toHaveLength(6);
    expect(html.match(/data-alert-notice-receiver-field-input-mode=/g)).toHaveLength(6);
    expect(html.match(/data-alert-notice-receiver-field-input-mode="manual"/g)).toHaveLength(4);
    expect(html.match(/data-alert-notice-receiver-field-input-mode="selection"/g)).toHaveLength(2);
    expect(html).toContain(t('alert.notice.field.requirement.required'));
    expect(html).toContain(t('alert.notice.field.input-mode.manual'));
    expect(html).toContain(t('alert.notice.field.input-mode.selection'));
    expect(html).toContain('data-alert-notice-receiver-field-help="name"');
    expect(html).toContain('data-alert-notice-receiver-field-help="type"');
    expect(html).toContain('data-alert-notice-receiver-field-help="appId"');
    expect(html).toContain('data-alert-notice-receiver-field-help="appSecret"');
    expect(html).toContain('data-alert-notice-receiver-field-help="larkReceiveType"');
    expect(html).toContain('data-alert-notice-receiver-field-help="chatId"');
    expect(html).toContain(t('alert.notice.receiver.field.type.help'));
    expect(html).toContain(t('alert.notice.receiver.field.app-secret.impact'));
    expect(html).toContain(t('alert.notice.receiver.field.chat-id.help'));
    expect(html).toContain('grid-cols-[132px_minmax(0,1fr)]');
    expect(html).toContain('data-testid="notice-receiver-field-name"');
    expect(html).toContain('data-testid="notice-receiver-field-type"');
    expect(html).toContain('data-alert-notice-receiver-select="type"');
    expect(html).toContain('data-alert-notice-receiver-default-type="angular-email"');
    expect(html).toContain('data-alert-notice-receiver-default-type-owner="route-form-contract"');
    expect(html).toContain('data-alert-notice-receiver-select="larkReceiveType"');
    expect(html.match(/data-hz-select-owner="hertzbeat-ui-select"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-hz-select-control="custom-trigger"');
    expect(html).toContain('data-hz-select-control="hidden-native"');
    expect(html).toContain('data-testid="notice-receiver-field-appId"');
    expect(html).toContain('data-testid="notice-receiver-field-appSecret"');
    expect(html).toContain('data-testid="notice-receiver-field-larkReceiveType"');
    expect(html).toContain('data-testid="notice-receiver-field-chatId"');
    expect(html).not.toContain('data-testid="notice-receiver-field-userId"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(html).not.toContain('md:col-span-2');
    expect(html).not.toContain('data-alert-notice-receiver-layout="single-column-form"');
    expect(source).toContain('data-alert-notice-receiver-form-row={row}');
    expect(source).toContain('data-alert-notice-receiver-field-help={row}');
    expect(source).toContain('getReceiverHelpKey');
    expect(source).toContain('receiverFieldHelp');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
    expect(source).not.toContain('NOTICE_RECEIVER_FULL_WIDTH_FIELDS');
    expect(source).not.toContain('alertAuthoringSelectClassName');
    expect(source).not.toContain('className={`w-full ${alertAuthoringSelectClassName}`}');
    expect(source).not.toContain('<select');
  });

  it('keeps the Angular new receiver email default visible', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{ ...baseDraft, type: '1', email: '' }}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-receiver-default-type="angular-email"');
    expect(html).toContain('data-alert-notice-receiver-default-type-owner="route-form-contract"');
    expect(html).toContain('data-testid="notice-receiver-field-email"');
    expect(html.match(/data-alert-notice-receiver-field-help=/g)).toHaveLength(3);
    expect(html.match(/data-alert-authoring-field-help-visual="circle-help-icon"/g)).toHaveLength(3);
    expect(html.match(/data-alert-authoring-field-help-icon="lucide-circle-help"/g)).toHaveLength(3);
    expect(html).not.toContain('data-alert-authoring-field-help-visual="borderless-question"');
    expect(html.match(/data-alert-notice-receiver-field-requirement="required"/g)).toHaveLength(3);
    expect(html.match(/data-alert-notice-receiver-field-input-mode="manual"/g)).toHaveLength(2);
    expect(html.match(/data-alert-notice-receiver-field-input-mode="selection"/g)).toHaveLength(1);
    expect(html).toContain('data-alert-notice-receiver-field-help="name"');
    expect(html).toContain('data-alert-notice-receiver-field-help="type"');
    expect(html).toContain('data-alert-notice-receiver-field-help="email"');
    expect(html).toContain(t('alert.notice.receiver.field.email.impact'));
    expect(html).not.toContain('data-testid="notice-receiver-field-phone"');
    expect(html).not.toContain('data-testid="notice-receiver-field-hookUrl"');
  });

  it('marks receiver validation issues on the exact fields that need input', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{ ...baseDraft, name: '', type: '1', email: '' }}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
        validationIssues={[
          { field: 'name', message: t('alert.notice.validation.name') },
          { field: 'email', message: t('alert.notice.validation.email') }
        ]}
      />
    );

    expect(html).toContain('data-alert-notice-receiver-field-error="name"');
    expect(html).toContain('data-alert-notice-receiver-field-error="email"');
    expect(html).toContain('data-alert-notice-receiver-field-invalid="true"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="notice-receiver-name-error"');
    expect(html).toContain('aria-describedby="notice-receiver-email-error"');
    expect(html).toContain(t('alert.notice.validation.name'));
    expect(html).toContain(t('alert.notice.validation.email'));
  });

  it('keeps the old Angular robot token extraction contract on receiver field changes', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const weComHtml = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{ ...baseDraft, type: '4', wechatId: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=wechat-token' }}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
      />
    );
    const dingHtml = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{ ...baseDraft, type: '5', accessToken: 'https://oapi.dingtalk.com/robot/send?access_token=ding-token' }}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
      />
    );
    const larkHtml = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{ ...baseDraft, type: '6', accessToken: 'https://open.feishu.cn/open-apis/bot/v2/hook/lark-token' }}
        productCopy={productCopy}
        onDraftChange={vi.fn()}
      />
    );

    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '4' }, 'wechatId', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=wechat-token')).toBe(
      'wechat-token'
    );
    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '5' }, 'accessToken', 'https://oapi.dingtalk.com/robot/send?access_token=ding-token')).toBe(
      'ding-token'
    );
    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '6' }, 'accessToken', 'https://open.feishu.cn/open-apis/bot/v2/hook/lark-token')).toBe(
      'lark-token'
    );
    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '4' }, 'wechatId', 'key=already-token')).toBe('key=already-token');
    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '5' }, 'accessToken', 'access_token=already-token')).toBe('access_token=already-token');
    expect(normalizeReceiverFieldValue({ ...baseDraft, type: '6' }, 'accessToken', 'hook/already-token')).toBe('hook/already-token');
    expect(weComHtml).toContain('data-alert-notice-receiver-token-normalizer="wecom-robot-key"');
    expect(dingHtml).toContain('data-alert-notice-receiver-token-normalizer="ding-access-token"');
    expect(larkHtml).toContain('data-alert-notice-receiver-token-normalizer="lark-robot-hook"');
    expect(weComHtml).toContain('data-alert-notice-receiver-token-normalizer-event="on-change"');
    expect(weComHtml).toContain(t('alert.notice.type.userId'));
    expect(weComHtml).not.toContain('alert.notice.type.userId');
    expect(source).toContain("return index > 0 ? value.slice(index + 4) : value;");
    expect(source).toContain("return index > 0 ? value.slice(index + 13) : value;");
    expect(source).toContain("return index > 0 ? value.slice(index + 5) : value;");
    expect(source).toContain('data-alert-notice-receiver-token-normalizer={tokenNormalizer}');
  });

  it('normalizes pasted DingTalk robot URLs through the receiver field interaction', async () => {
    const onDraftChange = vi.fn();
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(
        <AlertNoticeReceiverFields
          t={t}
          draft={{ ...baseDraft, type: '5', accessToken: '' }}
          productCopy={productCopy}
          onDraftChange={onDraftChange}
        />
      );
      await Promise.resolve();
    });

    const tokenInput = interactionContainer.querySelector(
      'input[data-testid="notice-receiver-field-accessToken"]'
    ) as HTMLInputElement | null;
    expect(tokenInput?.getAttribute('data-alert-notice-receiver-token-normalizer')).toBe('ding-access-token');
    expect(tokenInput?.getAttribute('data-alert-notice-receiver-token-normalizer-event')).toBe('on-change');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      valueSetter?.call(tokenInput, 'https://oapi.dingtalk.com/robot/send?access_token=ding-token');
      tokenInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    const updater = onDraftChange.mock.calls[0][0] as (draft: typeof baseDraft) => typeof baseDraft;
    expect(updater({ ...baseDraft, type: '5', accessToken: '' })).toEqual(expect.objectContaining({
      accessToken: 'ding-token'
    }));
  });
});
