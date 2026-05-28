import { describe, expect, it, vi } from 'vitest';
import {
  SMS_PROVIDER_OPTIONS,
  UNISMS_AUTH_MODE_OPTIONS,
  buildMessageServerSummaryItems,
  canSaveEmailSender,
  canSaveSmsSender,
  cloneSmsSender,
  isUniSmsAccessKeySecretRequired,
  normalizeEmailSender,
  normalizeSmsProviderType,
  normalizeSmsSender,
  resolveBooleanText,
  resolveSmsTypeLabel,
  resolveUniSmsAuthModeLabel,
  updateSmsProviderField,
  updateSmsType
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

describe('setting server view model', () => {
  it('normalizes email and sms senders into compatible defaults', () => {
    expect(normalizeEmailSender({ emailHost: 'smtp.example.com' } as any)).toEqual({
      emailHost: 'smtp.example.com',
      emailPort: undefined,
      emailUsername: '',
      emailPassword: '',
      emailSsl: true,
      emailStarttls: false,
      enable: false
    });
    expect(normalizeSmsSender({ type: 'unknown', twilio: { accountSid: 'sid' } } as any)).toEqual({
      type: 'tencent',
      enable: false,
      tencent: { secretId: '', secretKey: '', signName: '', appId: '', templateId: '' },
      alibaba: { accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '' },
      unisms: { accessKeyId: '', accessKeySecret: '', signature: '', authMode: 'hmac', templateId: '' },
      smslocal: { apiKey: '' },
      aws: { accessKeyId: '', accessKeySecret: '', region: '' },
      twilio: { accountSid: 'sid', authToken: '', twilioPhoneNumber: '' }
    });
  });

  it('builds compatible summary rows for email and sms', () => {
    expect(
      buildMessageServerSummaryItems(
        {
          emailHost: 'smtp.example.com',
          emailPort: 587,
          emailUsername: 'ops',
          emailSsl: true,
          emailStarttls: false,
          enable: true
        } as any,
        {
          type: 'twilio',
          enable: false,
          twilio: { accountSid: 'AC-1', twilioPhoneNumber: '+86-10000' }
        } as any,
        t
      )
    ).toEqual([
      {
        key: 'email',
        title: 'Email server',
        lines: [
          'Email server address: smtp.example.com',
          'Email account: ops',
          'Email port: 587',
          'Enable SSL: Yes',
          'Enable STARTTLS: No',
          'Enable email configuration: Yes'
        ]
      },
      {
        key: 'sms',
        title: 'SMS settings',
        lines: [
          'SMS type: Twilio Sms',
          'Twilio account SID: AC-1',
          'Twilio phone number: +86-10000',
          'Enable: No'
        ]
      }
    ]);
  });

  it('uses localized empty fallbacks for missing summary facts', () => {
    const scopedT = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.none': '无消息配置值',
        'common.enable': '启用',
        'common.yes': '是',
        'common.no': '否',
        'settings.server.email': '邮件服务',
        'settings.server.sms': '短信服务',
        'alert.notice.sender.mail.host': '邮件服务器地址',
        'alert.notice.sender.mail.username': '邮件账户',
        'alert.notice.sender.mail.port': '邮件端口',
        'alert.notice.sender.mail.ssl': '启用 SSL',
        'alert.notice.sender.mail.starttls': '启用 STARTTLS',
        'alert.notice.sender.mail.enable': '启用邮件配置',
        'alert.notice.sender.sms.type': '短信类型',
        'alert.notice.sender.sms.type.tencent': '腾讯云短信',
        'alert.notice.sender.sms.tencent.appId': '腾讯云 App ID',
        'alert.notice.sender.sms.tencent.signName': '短信签名',
        'alert.notice.sender.sms.tencent.templateId': '短信模板'
      }
    });

    expect(
      buildMessageServerSummaryItems(
        { emailHost: '', emailUsername: '  ', emailPort: undefined, emailSsl: true, emailStarttls: false, enable: false } as any,
        { type: 'tencent', enable: false, tencent: { appId: '', signName: ' ', templateId: null } } as any,
        scopedT
      )
    ).toEqual([
      {
        key: 'email',
        title: '邮件服务',
        lines: [
          '邮件服务器地址: 无消息配置值',
          '邮件账户: 无消息配置值',
          '邮件端口: 无消息配置值',
          '启用 SSL: 是',
          '启用 STARTTLS: 否',
          '启用邮件配置: 否'
        ]
      },
      {
        key: 'sms',
        title: '短信服务',
        lines: [
          '短信类型: 腾讯云短信',
          '腾讯云 App ID: 无消息配置值',
          '短信签名: 无消息配置值',
          '短信模板: 无消息配置值',
          '启用: 否'
        ]
      }
    ]);
  });

  it('updates sms provider state immutably and keeps deep clones for cancel recovery', () => {
    const current = normalizeSmsSender({ type: 'tencent', tencent: { appId: 'old' } } as any);

    expect(updateSmsType(current, 'twilio').type).toBe('twilio');
    expect(updateSmsProviderField(current, 'tencent', 'appId', 'new')).toEqual({
      ...current,
      tencent: { secretId: '', secretKey: '', signName: '', appId: 'new', templateId: '' }
    });

    const cloned = cloneSmsSender(current);
    (cloned.tencent as Record<string, unknown>).appId = 'mutated';
    expect((current.tencent as Record<string, unknown>).appId).toBe('old');
  });

  it('applies provider-specific validation for email and sms dialogs', () => {
    expect(
      canSaveEmailSender({
        emailHost: 'smtp.example.com',
        emailPort: 465,
        emailUsername: 'ops',
        emailPassword: 'secret'
      } as any)
    ).toBe(true);
    expect(canSaveEmailSender({ emailHost: 'smtp.example.com' } as any)).toBe(false);

    expect(
      canSaveSmsSender({
        type: 'unisms',
        unisms: {
          accessKeyId: 'ak',
          accessKeySecret: 'sk',
          signature: 'sig',
          authMode: 'hmac',
          templateId: 'tpl'
        }
      } as any)
    ).toBe(true);
    expect(
      canSaveSmsSender({
        type: 'twilio',
        twilio: { accountSid: 'sid', authToken: 'token' }
      } as any)
    ).toBe(false);
  });

  it('resolves provider labels and auth-mode gating', () => {
    expect(normalizeSmsProviderType('aws')).toBe('aws');
    expect(normalizeSmsProviderType('aliyun')).toBe('tencent');
    expect(resolveSmsTypeLabel('alibaba', t)).toBe('Alibaba SMS');
    expect(resolveUniSmsAuthModeLabel('simple', t)).toBe('Simple');
    expect(resolveBooleanText(true, t)).toBe('Yes');
    expect(
      isUniSmsAccessKeySecretRequired({
        type: 'unisms',
        unisms: { authMode: 'simple' }
      } as any)
    ).toBe(false);
    expect(
      isUniSmsAccessKeySecretRequired({
        type: 'unisms',
        unisms: { authMode: 'hmac' }
      } as any)
    ).toBe(true);
    expect(SMS_PROVIDER_OPTIONS.map(option => option.value)).toEqual(['tencent', 'alibaba', 'unisms', 'smslocal', 'aws', 'twilio']);
    expect(UNISMS_AUTH_MODE_OPTIONS.map(option => option.value)).toEqual(['hmac', 'simple']);
  });
});
