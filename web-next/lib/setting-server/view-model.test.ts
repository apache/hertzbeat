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
const zhT = createTranslatorMock({ locale: 'zh-CN' });

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
    expect(
      buildMessageServerSummaryItems(
        { emailHost: '', emailUsername: '  ', emailPort: undefined, emailSsl: true, emailStarttls: false, enable: false } as any,
        { type: 'tencent', enable: false, tencent: { appId: '', signName: ' ', templateId: null } } as any,
        zhT
      )
    ).toEqual([
      {
        key: 'email',
        title: zhT('settings.server.email'),
        lines: [
          `${zhT('alert.notice.sender.mail.host')}: ${zhT('common.none')}`,
          `${zhT('alert.notice.sender.mail.username')}: ${zhT('common.none')}`,
          `${zhT('alert.notice.sender.mail.port')}: ${zhT('common.none')}`,
          `${zhT('alert.notice.sender.mail.ssl')}: ${zhT('common.yes')}`,
          `${zhT('alert.notice.sender.mail.starttls')}: ${zhT('common.no')}`,
          `${zhT('alert.notice.sender.mail.enable')}: ${zhT('common.no')}`
        ]
      },
      {
        key: 'sms',
        title: zhT('settings.server.sms'),
        lines: [
          `${zhT('alert.notice.sender.sms.type')}: ${zhT('alert.notice.sender.sms.type.tencent')}`,
          `${zhT('alert.notice.sender.sms.tencent.appId')}: ${zhT('common.none')}`,
          `${zhT('alert.notice.sender.sms.tencent.signName')}: ${zhT('common.none')}`,
          `${zhT('alert.notice.sender.sms.tencent.templateId')}: ${zhT('common.none')}`,
          `${zhT('common.enable')}: ${zhT('common.no')}`
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
