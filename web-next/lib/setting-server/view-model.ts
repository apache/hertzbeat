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

export function serializeEmailSender(email?: EmailNoticeSender | null) {
  const resolved = normalizeEmailSender(email);

  return JSON.stringify({
    emailHost: String(resolved.emailHost || '').trim(),
    emailPort: Number(resolved.emailPort) || null,
    emailUsername: String(resolved.emailUsername || '').trim(),
    emailPassword: String(resolved.emailPassword || ''),
    emailSsl: Boolean(resolved.emailSsl),
    emailStarttls: Boolean(resolved.emailStarttls),
    enable: Boolean(resolved.enable)
  });
}

export function isEmailSenderDirty(current?: EmailNoticeSender | null, baseline?: EmailNoticeSender | null) {
  return serializeEmailSender(current) !== serializeEmailSender(baseline);
}

export function buildEmailSenderMissingFields(email: EmailNoticeSender, t: Translator) {
  const resolved = normalizeEmailSender(email);
  const fields: string[] = [];

  if (!hasText(resolved.emailHost)) fields.push(t('alert.notice.sender.mail.host'));
  if (!(Number(resolved.emailPort) > 0)) fields.push(t('alert.notice.sender.mail.port'));
  if (!hasText(resolved.emailUsername)) fields.push(t('alert.notice.sender.mail.username'));
  if (!hasText(resolved.emailPassword)) fields.push(t('alert.notice.sender.mail.password'));

  return fields;
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

export function serializeSmsSender(sms?: SmsNoticeSender | null) {
  const resolved = normalizeSmsSender(sms);

  return JSON.stringify({
    type: normalizeSmsProviderType(resolved.type),
    enable: Boolean(resolved.enable),
    tencent: {
      secretId: String((resolved.tencent as Record<string, unknown>)?.secretId || ''),
      secretKey: String((resolved.tencent as Record<string, unknown>)?.secretKey || ''),
      signName: String((resolved.tencent as Record<string, unknown>)?.signName || '').trim(),
      appId: String((resolved.tencent as Record<string, unknown>)?.appId || '').trim(),
      templateId: String((resolved.tencent as Record<string, unknown>)?.templateId || '').trim()
    },
    alibaba: {
      accessKeyId: String((resolved.alibaba as Record<string, unknown>)?.accessKeyId || ''),
      accessKeySecret: String((resolved.alibaba as Record<string, unknown>)?.accessKeySecret || ''),
      signName: String((resolved.alibaba as Record<string, unknown>)?.signName || '').trim(),
      templateCode: String((resolved.alibaba as Record<string, unknown>)?.templateCode || '').trim()
    },
    unisms: {
      accessKeyId: String((resolved.unisms as Record<string, unknown>)?.accessKeyId || ''),
      accessKeySecret: String((resolved.unisms as Record<string, unknown>)?.accessKeySecret || ''),
      signature: String((resolved.unisms as Record<string, unknown>)?.signature || '').trim(),
      authMode: String((resolved.unisms as Record<string, unknown>)?.authMode || 'hmac') === 'simple' ? 'simple' : 'hmac',
      templateId: String((resolved.unisms as Record<string, unknown>)?.templateId || '').trim()
    },
    smslocal: {
      apiKey: String((resolved.smslocal as Record<string, unknown>)?.apiKey || '')
    },
    aws: {
      accessKeyId: String((resolved.aws as Record<string, unknown>)?.accessKeyId || ''),
      accessKeySecret: String((resolved.aws as Record<string, unknown>)?.accessKeySecret || ''),
      region: String((resolved.aws as Record<string, unknown>)?.region || '').trim()
    },
    twilio: {
      accountSid: String((resolved.twilio as Record<string, unknown>)?.accountSid || ''),
      authToken: String((resolved.twilio as Record<string, unknown>)?.authToken || ''),
      twilioPhoneNumber: String((resolved.twilio as Record<string, unknown>)?.twilioPhoneNumber || '').trim()
    }
  });
}

export function isSmsSenderDirty(current?: SmsNoticeSender | null, baseline?: SmsNoticeSender | null) {
  return serializeSmsSender(current) !== serializeSmsSender(baseline);
}

export function buildSmsSenderMissingFields(sms: SmsNoticeSender, t: Translator) {
  const resolved = normalizeSmsSender(sms);
  const fields: string[] = [];

  const addMissing = (config: Record<string, unknown>, entries: Array<[string, string]>) => {
    entries.forEach(([key, labelKey]) => {
      if (!hasText(config[key])) fields.push(t(labelKey));
    });
  };

  switch (normalizeSmsProviderType(resolved.type)) {
    case 'tencent':
      addMissing(resolved.tencent as Record<string, unknown>, [
        ['secretId', 'alert.notice.sender.sms.tencent.secretId'],
        ['secretKey', 'alert.notice.sender.sms.tencent.secretKey'],
        ['signName', 'alert.notice.sender.sms.tencent.signName'],
        ['appId', 'alert.notice.sender.sms.tencent.appId'],
        ['templateId', 'alert.notice.sender.sms.tencent.templateId']
      ]);
      break;
    case 'alibaba':
      addMissing(resolved.alibaba as Record<string, unknown>, [
        ['accessKeyId', 'alert.notice.sender.sms.alibaba.accessKeyId'],
        ['accessKeySecret', 'alert.notice.sender.sms.alibaba.accessKeySecret'],
        ['signName', 'alert.notice.sender.sms.alibaba.signName'],
        ['templateCode', 'alert.notice.sender.sms.alibaba.templateCode']
      ]);
      break;
    case 'unisms': {
      const config = resolved.unisms as Record<string, unknown>;
      addMissing(config, [
        ['accessKeyId', 'alert.notice.sender.sms.unisms.accessKeyId'],
        ['signature', 'alert.notice.sender.sms.unisms.signature'],
        ['authMode', 'alert.notice.sender.sms.unisms.authMode'],
        ['templateId', 'alert.notice.sender.sms.unisms.templateId']
      ]);
      if (String(config.authMode || 'hmac') === 'hmac' && !hasText(config.accessKeySecret)) {
        fields.push(t('alert.notice.sender.sms.unisms.accessKeySecret'));
      }
      break;
    }
    case 'smslocal':
      addMissing(resolved.smslocal as Record<string, unknown>, [
        ['apiKey', 'alert.notice.sender.sms.smslocal.apiKey']
      ]);
      break;
    case 'aws':
      addMissing(resolved.aws as Record<string, unknown>, [
        ['accessKeyId', 'alert.notice.sender.sms.aws.accessKeyId'],
        ['accessKeySecret', 'alert.notice.sender.sms.aws.accessKeySecret'],
        ['region', 'alert.notice.sender.sms.aws.region']
      ]);
      break;
    case 'twilio':
      addMissing(resolved.twilio as Record<string, unknown>, [
        ['accountSid', 'alert.notice.sender.sms.twilio.accountSid'],
        ['authToken', 'alert.notice.sender.sms.twilio.authToken'],
        ['twilioPhoneNumber', 'alert.notice.sender.sms.twilio.twilioPhoneNumber']
      ]);
      break;
    default:
      break;
  }

  return fields;
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
