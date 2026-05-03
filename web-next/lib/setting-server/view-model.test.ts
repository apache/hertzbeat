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
        title: 'Email Server',
        lines: [
          'Email Server Address: smtp.example.com',
          'Email Account: ops',
          'Email Port: 587',
          'Enable SSL: Yes',
          'Enable STARTTLS: No',
          'Enable Email Configuration: Yes'
        ]
      },
      {
        key: 'sms',
        title: 'SMS Server',
        lines: [
          'Sms Type: Twilio Sms',
          'Twilio Account SID: AC-1',
          'Twilio Phone Number: +86-10000',
          'Enable: No'
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
    expect(resolveSmsTypeLabel('alibaba', t)).toBe('Alibaba Sms');
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
