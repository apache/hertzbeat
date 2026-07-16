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

import type { EmailServerDraft, SmsProviderType, SmsServerDraft } from '../api/message-server-api';

export { buildEmailServerPayload, buildSmsServerPayload } from '../api/message-server-api';
export type { EmailServerDraft, SmsProviderType, SmsServerDraft };

type SmsProviderFieldDefinition = { key: string; labelKey: string; secret?: boolean; kind?: 'text' | 'authMode' };
type SmsProviderDefinition = { type: SmsProviderType; labelKey: string; fields: SmsProviderFieldDefinition[] };

const smsField = (key: string, secret = false, kind: SmsProviderFieldDefinition['kind'] = 'text'): SmsProviderFieldDefinition => ({
  key, secret, kind, labelKey: `messageServer.sms.fields.${key}`
});

export const smsProviderDefinitions: SmsProviderDefinition[] = [
  { type: 'tencent', labelKey: 'messageServer.sms.providers.tencent', fields: [smsField('secretId'), smsField('secretKey', true), smsField('appId'), smsField('signName'), smsField('templateId')] },
  { type: 'alibaba', labelKey: 'messageServer.sms.providers.alibaba', fields: [smsField('accessKeyId'), smsField('accessKeySecret', true), smsField('signName'), smsField('templateCode')] },
  { type: 'unisms', labelKey: 'messageServer.sms.providers.unisms', fields: [smsField('accessKeyId'), smsField('authMode', false, 'authMode'), smsField('accessKeySecret', true), smsField('signature'), smsField('templateId')] },
  { type: 'smslocal', labelKey: 'messageServer.sms.providers.smslocal', fields: [smsField('apiKey', true)] },
  { type: 'aws', labelKey: 'messageServer.sms.providers.aws', fields: [smsField('accessKeyId'), smsField('accessKeySecret', true), smsField('region')] },
  { type: 'twilio', labelKey: 'messageServer.sms.providers.twilio', fields: [smsField('accountSid'), smsField('authToken', true), smsField('twilioPhoneNumber')] }
];

export function createEmailServerDraft(config?: Partial<EmailServerDraft> | null): EmailServerDraft {
  const defaults: EmailServerDraft = {
    type: 0, emailHost: '', emailPort: 465, emailUsername: '', emailPassword: '',
    emailSsl: true, emailStarttls: false, enable: false
  };
  return { ...defaults, ...config };
}

export function createSmsServerDraft(config?: Partial<SmsServerDraft> | null): SmsServerDraft {
  return {
    enable: config?.enable ?? false,
    type: config?.type ?? 'tencent',
    tencent: { secretId: '', secretKey: '', appId: '', signName: '', templateId: '', ...config?.tencent },
    alibaba: { accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '', ...config?.alibaba },
    unisms: { accessKeyId: '', accessKeySecret: '', signature: '', templateId: '', authMode: 'simple', ...config?.unisms },
    smslocal: { apiKey: '', ...config?.smslocal },
    aws: { accessKeyId: '', accessKeySecret: '', region: '', ...config?.aws },
    twilio: { accountSid: '', authToken: '', twilioPhoneNumber: '', ...config?.twilio }
  };
}

export function validateEmailServerDraft(draft: EmailServerDraft) {
  const invalid: string[] = [];
  const username = draft.emailUsername.trim();
  if (!draft.emailHost.trim()) invalid.push('emailHost');
  if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) invalid.push('emailUsername');
  if (!draft.emailPassword) invalid.push('emailPassword');
  if (!Number.isInteger(draft.emailPort) || draft.emailPort < 1 || draft.emailPort > 65_535) invalid.push('emailPort');
  return invalid;
}

function activeSmsFields(draft: SmsServerDraft) {
  const provider = smsProviderDefinitions.find(definition => definition.type === draft.type)!;
  const values = draft[draft.type] as unknown as Record<string, string>;
  return { provider, values };
}

export function validateSmsServerDraft(draft: SmsServerDraft) {
  const { provider, values } = activeSmsFields(draft);
  return provider.fields
    .filter(field => !(draft.type === 'unisms' && field.key === 'accessKeySecret' && draft.unisms.authMode !== 'hmac'))
    .filter(field => !String(values[field.key] ?? '').trim())
    .map(field => field.key);
}

export function updateSmsProviderField(draft: SmsServerDraft, key: string, value: string): SmsServerDraft {
  const provider = { ...(draft[draft.type] as unknown as Record<string, string>), [key]: value };
  return { ...draft, [draft.type]: provider };
}

export function messageServerStatus(enable: boolean, invalidFields: string[]) {
  if (invalidFields.length > 0) return 'unconfigured' as const;
  return enable ? 'enabled' as const : 'disabled' as const;
}
