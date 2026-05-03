import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertNoticeReceiverFields } from './alert-notice-receiver-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { getAlertNoticeProductCopy } from '../../lib/alert-notice/view-model';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('AlertNoticeReceiverFields', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });
  const productCopy = getAlertNoticeProductCopy('zh-CN');

  it('renders the shared receiver field owner with channel-specific field posture', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-receiver-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertNoticeReceiverFields
        t={t}
        draft={{
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
        }}
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
    expect(html).toContain('grid-cols-[132px_minmax(0,1fr)]');
    expect(html).toContain('data-testid="notice-receiver-field-name"');
    expect(html).toContain('data-testid="notice-receiver-field-type"');
    expect(html).toContain('data-alert-notice-receiver-select="type"');
    expect(html).toContain('data-alert-notice-receiver-select="larkReceiveType"');
    expect(html.match(/data-cold-select-owner="cold-custom-select"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-cold-select-control="custom-trigger"');
    expect(html).toContain('data-cold-select-control="hidden-native"');
    expect(html).toContain('data-testid="notice-receiver-field-appId"');
    expect(html).toContain('data-testid="notice-receiver-field-appSecret"');
    expect(html).toContain('data-testid="notice-receiver-field-larkReceiveType"');
    expect(html).toContain('data-testid="notice-receiver-field-chatId"');
    expect(html).not.toContain('data-testid="notice-receiver-field-userId"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(html).not.toContain('md:col-span-2');
    expect(html).not.toContain('data-alert-notice-receiver-layout="single-column-form"');
    expect(source).toContain('data-alert-notice-receiver-form-row={row}');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
    expect(source).not.toContain('NOTICE_RECEIVER_FULL_WIDTH_FIELDS');
    expect(source).not.toContain('alertAuthoringSelectClassName');
    expect(source).not.toContain('className={`w-full ${alertAuthoringSelectClassName}`}');
    expect(source).not.toContain('<select');
  });
});
