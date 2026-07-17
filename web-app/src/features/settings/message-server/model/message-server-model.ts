/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  smsProviderFieldContracts,
  type EmailSecret,
  type EmailServerEvidence,
  type EmailServerPayload,
  type SmsProviderType,
  type SmsSecret,
  type SmsServerEvidence,
  type SmsServerPayload
} from './message-server-contract';

export type { EmailSecret, SmsProviderType, SmsSecret } from './message-server-contract';

export type EmailServerDraft = Omit<EmailServerPayload, 'emailPassword' | 'clearSecrets'> & {
  emailPassword: string;
  configuredSecrets: EmailSecret[];
  clearSecrets: EmailSecret[];
};

type TencentDraft = { secretId: string; secretKey: string; appId: string; signName: string; templateId: string };
type AlibabaDraft = { accessKeyId: string; accessKeySecret: string; signName: string; templateCode: string };
type UnismsDraft = { accessKeyId: string; accessKeySecret: string; signature: string; templateId: string;
  authMode: 'simple' | 'hmac' };
type SmslocalDraft = { apiKey: string };
type AwsDraft = { accessKeyId: string; accessKeySecret: string; region: string };
type TwilioDraft = { accountSid: string; authToken: string; twilioPhoneNumber: string };

export type SmsServerDraft = {
  enable: boolean;
  type: SmsProviderType;
  configuredSecrets: SmsSecret[];
  clearSecrets: SmsSecret[];
  tencent: TencentDraft;
  alibaba: AlibabaDraft;
  unisms: UnismsDraft;
  smslocal: SmslocalDraft;
  aws: AwsDraft;
  twilio: TwilioDraft;
};

type SmsProviderFieldDefinition = { key: string; labelKey: string; secret: boolean; kind?: 'text' | 'authMode' };
type SmsProviderDefinition = { type: SmsProviderType; labelKey: string; fields: SmsProviderFieldDefinition[] };

export const smsProviderDefinitions: SmsProviderDefinition[] = Object.entries(smsProviderFieldContracts)
  .map(([type, fields]) => ({
    type: type as SmsProviderType,
    labelKey: `messageServer.sms.providers.${type}`,
    fields: fields.map(item => ({ ...item, kind: item.kind ?? 'text',
      labelKey: `messageServer.sms.fields.${item.key}` }))
  }));

export function createEmailServerDraft(evidence?: EmailServerEvidence): EmailServerDraft {
  if (!evidence || evidence.status === 'missing') {
    return {
      type: 0, emailHost: '', emailPort: 465, emailUsername: '', emailPassword: '', emailSsl: true,
      emailStarttls: false, enable: false, configuredSecrets: [], clearSecrets: []
    };
  }
  const config = evidence.config;
  return {
    type: config.type,
    emailHost: config.emailHost,
    emailPort: config.emailPort,
    emailUsername: config.emailUsername,
    emailPassword: '',
    emailSsl: config.emailSsl,
    emailStarttls: config.emailStarttls,
    enable: config.enable,
    configuredSecrets: config.configuredSecrets,
    clearSecrets: []
  };
}

export function createSmsServerDraft(evidence?: SmsServerEvidence): SmsServerDraft {
  const config = evidence?.status === 'configured' ? evidence.config : undefined;
  const draft: SmsServerDraft = {
    enable: config?.enable ?? false,
    type: config?.type ?? 'tencent',
    configuredSecrets: config?.configuredSecrets ?? [],
    clearSecrets: [],
    tencent: { secretId: '', secretKey: '', appId: '', signName: '', templateId: '' },
    alibaba: { accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '' },
    unisms: { accessKeyId: '', accessKeySecret: '', signature: '', templateId: '', authMode: 'simple' },
    smslocal: { apiKey: '' },
    aws: { accessKeyId: '', accessKeySecret: '', region: '' },
    twilio: { accountSid: '', authToken: '', twilioPhoneNumber: '' }
  };
  if (!config) return draft;
  return { ...draft, [config.type]: { ...draft[config.type], ...config.options } };
}

export function buildEmailServerPayload(draft: EmailServerDraft): EmailServerPayload {
  const password = draft.emailPassword.trim();
  const payload: EmailServerPayload = {
    type: draft.type,
    emailHost: draft.emailHost.trim(),
    emailUsername: draft.emailUsername.trim(),
    emailPort: draft.emailPort,
    emailSsl: draft.emailSsl,
    emailStarttls: draft.emailStarttls,
    enable: draft.enable
  };
  if (password) payload.emailPassword = password;
  else if (draft.clearSecrets.includes('emailPassword')) payload.clearSecrets = ['emailPassword'];
  return payload;
}

export function buildSmsServerPayload(draft: SmsServerDraft): SmsServerPayload {
  const fields = smsProviderFieldContracts[draft.type];
  const values = draft[draft.type] as unknown as Record<string, string>;
  const options = Object.fromEntries(fields.flatMap(field => {
    if (skipUniSmsSecret(draft, field.key)) return [];
    const value = String(values[field.key] ?? '').trim();
    return field.secret && !value ? [] : [[field.key, value]];
  }));
  const replacedSecrets = fields.filter(field => field.secret && String(values[field.key] ?? '').trim())
    .map(field => field.key);
  const clearSecrets = draft.clearSecrets.filter(key => fields.some(field => field.secret && field.key === key)
    && !replacedSecrets.includes(key));
  return {
    enable: draft.enable,
    type: draft.type,
    options,
    ...(clearSecrets.length > 0 ? { clearSecrets } : {})
  };
}

export function validateEmailServerDraft(draft: EmailServerDraft) {
  const invalid: string[] = [];
  const username = draft.emailUsername.trim();
  if (!draft.emailHost.trim()) invalid.push('emailHost');
  if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) invalid.push('emailUsername');
  if (!emailSecretSatisfied(draft)
    || draft.enable && draft.clearSecrets.includes('emailPassword') && !draft.emailPassword.trim()) {
    invalid.push('emailPassword');
  }
  if (!Number.isInteger(draft.emailPort) || draft.emailPort < 1 || draft.emailPort > 65_535) {
    invalid.push('emailPort');
  }
  return invalid;
}

export function validateSmsServerDraft(draft: SmsServerDraft) {
  const fields = smsProviderFieldContracts[draft.type];
  const values = draft[draft.type] as unknown as Record<string, string>;
  return fields.filter(field => !skipUniSmsSecret(draft, field.key)).filter(field => {
    const value = String(values[field.key] ?? '').trim();
    if (!field.secret) return !value;
    if (draft.enable && draft.clearSecrets.includes(field.key as SmsSecret) && !value) return true;
    return !value && !draft.configuredSecrets.includes(field.key as SmsSecret)
      && !draft.clearSecrets.includes(field.key as SmsSecret);
  }).map(field => field.key);
}

export function updateSmsProviderField(draft: SmsServerDraft, key: string, value: string): SmsServerDraft {
  const provider = { ...(draft[draft.type] as unknown as Record<string, string>), [key]: value };
  const clearSecrets = value.trim() ? draft.clearSecrets.filter(item => item !== key) : draft.clearSecrets;
  return { ...draft, [draft.type]: provider, clearSecrets };
}

export function selectSmsProvider(draft: SmsServerDraft, type: SmsProviderType): SmsServerDraft {
  if (type === draft.type) return draft;
  return { ...draft, type, configuredSecrets: [], clearSecrets: [] };
}

export function setEmailSecretCleared(draft: EmailServerDraft, cleared: boolean): EmailServerDraft {
  return { ...draft, emailPassword: cleared ? '' : draft.emailPassword,
    clearSecrets: cleared ? ['emailPassword'] : [] };
}

export function setSmsSecretCleared(draft: SmsServerDraft, secret: SmsSecret, cleared: boolean): SmsServerDraft {
  const values = draft[draft.type] as unknown as Record<string, string>;
  const provider = cleared ? { ...values, [secret]: '' } : values;
  return { ...draft, [draft.type]: provider,
    clearSecrets: cleared ? [...new Set([...draft.clearSecrets, secret])]
      : draft.clearSecrets.filter(item => item !== secret) };
}

export function messageServerStatus(enable: boolean, invalidFields: string[]) {
  if (invalidFields.length > 0) return 'unconfigured' as const;
  return enable ? 'enabled' as const : 'disabled' as const;
}

function emailSecretSatisfied(draft: EmailServerDraft) {
  return Boolean(draft.emailPassword.trim()) || draft.configuredSecrets.includes('emailPassword')
    || draft.clearSecrets.includes('emailPassword');
}

function skipUniSmsSecret(draft: SmsServerDraft, key: string) {
  return draft.type === 'unisms' && key === 'accessKeySecret' && draft.unisms.authMode !== 'hmac';
}
