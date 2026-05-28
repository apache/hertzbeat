import type { EmailNoticeSender, SmsNoticeSender } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type SmsProviderType = 'tencent' | 'alibaba' | 'unisms' | 'smslocal' | 'aws' | 'twilio';
export type UniSmsAuthModeType = 'hmac' | 'simple';

export const SMS_PROVIDER_OPTIONS: Array<{ value: SmsProviderType; labelKey: string }> = [
  { value: 'tencent', labelKey: 'alert.notice.sender.sms.type.tencent' },
  { value: 'alibaba', labelKey: 'alert.notice.sender.sms.type.alibaba' },
  { value: 'unisms', labelKey: 'alert.notice.sender.sms.type.unisms' },
  { value: 'smslocal', labelKey: 'alert.notice.sender.sms.type.smslocal' },
  { value: 'aws', labelKey: 'alert.notice.sender.sms.type.aws' },
  { value: 'twilio', labelKey: 'alert.notice.sender.sms.type.twilio' }
] as const;

export const UNISMS_AUTH_MODE_OPTIONS: Array<{ value: UniSmsAuthModeType; labelKey: string }> = [
  { value: 'hmac', labelKey: 'alert.notice.sender.sms.unisms.authMode.hmac' },
  { value: 'simple', labelKey: 'alert.notice.sender.sms.unisms.authMode.simple' }
] as const;

function hasText(value: unknown) {
  return String(value ?? '').trim().length > 0;
}

function mergeRecord<T extends Record<string, unknown>>(defaults: T, value: unknown): T {
  return {
    ...defaults,
    ...((value as Record<string, unknown> | undefined) || {})
  };
}

function createTencentConfig() {
  return {
    secretId: '',
    secretKey: '',
    signName: '',
    appId: '',
    templateId: ''
  };
}

function createAlibabaConfig() {
  return {
    accessKeyId: '',
    accessKeySecret: '',
    signName: '',
    templateCode: ''
  };
}

function createUniSmsConfig() {
  return {
    accessKeyId: '',
    accessKeySecret: '',
    signature: '',
    authMode: 'hmac' as UniSmsAuthModeType,
    templateId: ''
  };
}

function createSmslocalConfig() {
  return {
    apiKey: ''
  };
}

function createAwsConfig() {
  return {
    accessKeyId: '',
    accessKeySecret: '',
    region: ''
  };
}

function createTwilioConfig() {
  return {
    accountSid: '',
    authToken: '',
    twilioPhoneNumber: ''
  };
}

export function normalizeSmsProviderType(type?: string | null): SmsProviderType {
  const match = SMS_PROVIDER_OPTIONS.find(option => option.value === type);
  return match?.value || 'tencent';
}

export function createDefaultEmailSender(): EmailNoticeSender {
  return {
    emailHost: '',
    emailPort: undefined,
    emailUsername: '',
    emailPassword: '',
    emailSsl: true,
    emailStarttls: false,
    enable: false
  };
}

export function createDefaultSmsSender(): SmsNoticeSender {
  return {
    type: 'tencent',
    enable: false,
    tencent: createTencentConfig(),
    alibaba: createAlibabaConfig(),
    unisms: createUniSmsConfig(),
    smslocal: createSmslocalConfig(),
    aws: createAwsConfig(),
    twilio: createTwilioConfig()
  };
}

export function normalizeEmailSender(email?: EmailNoticeSender | null): EmailNoticeSender {
  return {
    ...createDefaultEmailSender(),
    ...(email || {})
  };
}

export function normalizeSmsSender(sms?: SmsNoticeSender | null): SmsNoticeSender {
  const base = createDefaultSmsSender();
  const next = {
    ...base,
    ...(sms || {})
  };

  return {
    ...next,
    type: normalizeSmsProviderType(next.type),
    tencent: mergeRecord(createTencentConfig(), next.tencent),
    alibaba: mergeRecord(createAlibabaConfig(), next.alibaba),
    unisms: mergeRecord(createUniSmsConfig(), next.unisms),
    smslocal: mergeRecord(createSmslocalConfig(), next.smslocal),
    aws: mergeRecord(createAwsConfig(), next.aws),
    twilio: mergeRecord(createTwilioConfig(), next.twilio)
  };
}

export function cloneSmsSender(sms?: SmsNoticeSender | null) {
  const normalized = normalizeSmsSender(sms);
  return {
    ...normalized,
    tencent: { ...(normalized.tencent as Record<string, unknown>) },
    alibaba: { ...(normalized.alibaba as Record<string, unknown>) },
    unisms: { ...(normalized.unisms as Record<string, unknown>) },
    smslocal: { ...(normalized.smslocal as Record<string, unknown>) },
    aws: { ...(normalized.aws as Record<string, unknown>) },
    twilio: { ...(normalized.twilio as Record<string, unknown>) }
  };
}

export function resolveBooleanText(value: boolean | null | undefined, t: Translator) {
  return value ? t('common.yes') : t('common.no');
}

export function resolveSmsTypeLabel(type: string | null | undefined, t: Translator) {
  const normalized = normalizeSmsProviderType(type);
  return t(`alert.notice.sender.sms.type.${normalized}`);
}

export function resolveUniSmsAuthModeLabel(mode: string | null | undefined, t: Translator) {
  const normalized = mode === 'simple' ? 'simple' : 'hmac';
  return t(`alert.notice.sender.sms.unisms.authMode.${normalized}`);
}

function formatMessageServerFact(value: unknown, fallback: string) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

function buildSmsSummaryLines(sms: SmsNoticeSender, t: Translator, emptyValue: string) {
  const lines = [`${t('alert.notice.sender.sms.type')}: ${resolveSmsTypeLabel(sms.type, t)}`];

  switch (normalizeSmsProviderType(sms.type)) {
    case 'tencent': {
      const config = sms.tencent as Record<string, unknown>;
      lines.push(`${t('alert.notice.sender.sms.tencent.appId')}: ${formatMessageServerFact(config?.appId, emptyValue)}`);
      lines.push(`${t('alert.notice.sender.sms.tencent.signName')}: ${formatMessageServerFact(config?.signName, emptyValue)}`);
      lines.push(`${t('alert.notice.sender.sms.tencent.templateId')}: ${formatMessageServerFact(config?.templateId, emptyValue)}`);
      break;
    }
    case 'alibaba': {
      const config = sms.alibaba as Record<string, unknown>;
      lines.push(`${t('alert.notice.sender.sms.alibaba.signName')}: ${formatMessageServerFact(config?.signName, emptyValue)}`);
      lines.push(`${t('alert.notice.sender.sms.alibaba.templateCode')}: ${formatMessageServerFact(config?.templateCode, emptyValue)}`);
      break;
    }
    case 'unisms': {
      const config = sms.unisms as Record<string, unknown>;
      lines.push(`${t('alert.notice.sender.sms.unisms.signature')}: ${formatMessageServerFact(config?.signature, emptyValue)}`);
      lines.push(`${t('alert.notice.sender.sms.unisms.templateId')}: ${formatMessageServerFact(config?.templateId, emptyValue)}`);
      lines.push(
        `${t('alert.notice.sender.sms.unisms.authMode')}: ${resolveUniSmsAuthModeLabel(
          String(config?.authMode || 'hmac'),
          t
        )}`
      );
      break;
    }
    case 'twilio': {
      const config = sms.twilio as Record<string, unknown>;
      lines.push(`${t('alert.notice.sender.sms.twilio.accountSid')}: ${formatMessageServerFact(config?.accountSid, emptyValue)}`);
      lines.push(
        `${t('alert.notice.sender.sms.twilio.twilioPhoneNumber')}: ${formatMessageServerFact(config?.twilioPhoneNumber, emptyValue)}`
      );
      break;
    }
    default:
      break;
  }

  lines.push(`${t('common.enable')}: ${resolveBooleanText(Boolean(sms.enable), t)}`);
  return lines;
}

export function buildMessageServerSummaryItems(email: EmailNoticeSender, sms: SmsNoticeSender, t: Translator) {
  const resolvedEmail = normalizeEmailSender(email);
  const resolvedSms = normalizeSmsSender(sms);
  const emptyValue = t('common.none');

  return [
    {
      key: 'email',
      title: t('settings.server.email'),
      lines: [
        `${t('alert.notice.sender.mail.host')}: ${formatMessageServerFact(resolvedEmail.emailHost, emptyValue)}`,
        `${t('alert.notice.sender.mail.username')}: ${formatMessageServerFact(resolvedEmail.emailUsername, emptyValue)}`,
        `${t('alert.notice.sender.mail.port')}: ${formatMessageServerFact(resolvedEmail.emailPort, emptyValue)}`,
        `${t('alert.notice.sender.mail.ssl')}: ${resolveBooleanText(Boolean(resolvedEmail.emailSsl), t)}`,
        `${t('alert.notice.sender.mail.starttls')}: ${resolveBooleanText(Boolean(resolvedEmail.emailStarttls), t)}`,
        `${t('alert.notice.sender.mail.enable')}: ${resolveBooleanText(Boolean(resolvedEmail.enable), t)}`
      ]
    },
    {
      key: 'sms',
      title: t('settings.server.sms'),
      lines: buildSmsSummaryLines(resolvedSms, t, emptyValue)
    }
  ];
}

export function updateSmsType(sms: SmsNoticeSender, type: SmsProviderType): SmsNoticeSender {
  return {
    ...cloneSmsSender(sms),
    type
  };
}

export function updateSmsProviderField(
  sms: SmsNoticeSender,
  provider: 'tencent' | 'alibaba' | 'unisms' | 'smslocal' | 'aws' | 'twilio',
  key: string,
  value: string
): SmsNoticeSender {
  const current = cloneSmsSender(sms);
  return {
    ...current,
    [provider]: {
      ...((current[provider] as Record<string, unknown>) || {}),
      [key]: value
    }
  };
}

export function isUniSmsAccessKeySecretRequired(sms: SmsNoticeSender) {
  const resolved = normalizeSmsSender(sms);
  return String((resolved.unisms as Record<string, unknown>)?.authMode || 'hmac') === 'hmac';
}

export function canSaveEmailSender(email: EmailNoticeSender) {
  const resolved = normalizeEmailSender(email);
  return (
    hasText(resolved.emailHost) &&
    hasText(resolved.emailUsername) &&
    hasText(resolved.emailPassword) &&
    Number(resolved.emailPort) > 0
  );
}

export function canSaveSmsSender(sms: SmsNoticeSender) {
  const resolved = normalizeSmsSender(sms);

  switch (normalizeSmsProviderType(resolved.type)) {
    case 'tencent': {
      const config = resolved.tencent as Record<string, unknown>;
      return ['secretId', 'secretKey', 'signName', 'appId', 'templateId'].every(key => hasText(config[key]));
    }
    case 'alibaba': {
      const config = resolved.alibaba as Record<string, unknown>;
      return ['accessKeyId', 'accessKeySecret', 'signName', 'templateCode'].every(key => hasText(config[key]));
    }
    case 'unisms': {
      const config = resolved.unisms as Record<string, unknown>;
      const required = ['accessKeyId', 'signature', 'authMode', 'templateId'];
      if (String(config.authMode || 'hmac') === 'hmac') {
        required.push('accessKeySecret');
      }
      return required.every(key => hasText(config[key]));
    }
    case 'smslocal': {
      const config = resolved.smslocal as Record<string, unknown>;
      return hasText(config.apiKey);
    }
    case 'aws': {
      const config = resolved.aws as Record<string, unknown>;
      return ['accessKeyId', 'accessKeySecret', 'region'].every(key => hasText(config[key]));
    }
    case 'twilio': {
      const config = resolved.twilio as Record<string, unknown>;
      return ['accountSid', 'authToken', 'twilioPhoneNumber'].every(key => hasText(config[key]));
    }
    default:
      return false;
  }
}
