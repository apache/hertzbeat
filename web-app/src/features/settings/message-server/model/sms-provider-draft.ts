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
  smsProviderTypes,
  type SmsProviderFieldContract,
  type SmsProviderType,
  type SmsSecret
} from './message-server-contract';

type TencentDraft = { secretId: string; secretKey: string; appId: string; signName: string; templateId: string };
type AlibabaDraft = { accessKeyId: string; accessKeySecret: string; signName: string; templateCode: string };
type UnismsDraft = {
  accessKeyId: string;
  accessKeySecret: string;
  signature: string;
  templateId: string;
  authMode: 'simple' | 'hmac';
};
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

type SmsProviderFieldDefinition =
  | { key: SmsSecret; labelKey: string; secret: true; kind: 'text' }
  | { key: string; labelKey: string; secret: false; kind: 'text' | 'authMode' };
export type SmsProviderDefinition = {
  type: SmsProviderType;
  labelKey: string;
  fields: SmsProviderFieldDefinition[];
};

export const smsProviderDefinitions = smsProviderTypes.map(smsProviderDefinition);

/** Builds presentation metadata from the single provider contract catalog. */
export function smsProviderDefinition(type: SmsProviderType): SmsProviderDefinition {
  return {
    type,
    labelKey: `messageServer.sms.providers.${type}`,
    fields: smsProviderFieldContracts[type].map(providerFieldDefinition)
  };
}

function providerFieldDefinition(field: SmsProviderFieldContract): SmsProviderFieldDefinition {
  const labelKey = `messageServer.sms.fields.${field.key}`;
  if (field.secret) return { key: field.key, labelKey, secret: true, kind: 'text' };
  return { key: field.key, labelKey, secret: false, kind: field.kind ?? 'text' };
}

/**
 * Returns the selected provider as a string map for allowlisted catalog reads.
 * The explicit switch keeps every provider draft visible to TypeScript when a
 * new provider is added, without an unchecked indexed-access assertion.
 */
export function activeSmsProviderValues(draft: SmsServerDraft): Record<string, string> {
  switch (draft.type) {
    case 'tencent':
      return { ...draft.tencent };
    case 'alibaba':
      return { ...draft.alibaba };
    case 'unisms':
      return { ...draft.unisms };
    case 'smslocal':
      return { ...draft.smslocal };
    case 'aws':
      return { ...draft.aws };
    case 'twilio':
      return { ...draft.twilio };
  }
}

/** Updates only fields owned by the active provider; unknown keys are ignored. */
export function updateSmsProviderField(draft: SmsServerDraft, key: string, value: string): SmsServerDraft {
  if (!smsProviderFieldContracts[draft.type].some(field => field.key === key)) return draft;
  const clearSecrets = value.trim() ? draft.clearSecrets.filter(item => item !== key) : draft.clearSecrets;
  switch (draft.type) {
    case 'tencent':
      return { ...draft, tencent: { ...draft.tencent, [key]: value }, clearSecrets };
    case 'alibaba':
      return { ...draft, alibaba: { ...draft.alibaba, [key]: value }, clearSecrets };
    case 'unisms':
      if (key === 'authMode' && value !== 'simple' && value !== 'hmac') return draft;
      return { ...draft, unisms: { ...draft.unisms, [key]: value }, clearSecrets };
    case 'smslocal':
      return { ...draft, smslocal: { ...draft.smslocal, [key]: value }, clearSecrets };
    case 'aws':
      return { ...draft, aws: { ...draft.aws, [key]: value }, clearSecrets };
    case 'twilio':
      return { ...draft, twilio: { ...draft.twilio, [key]: value }, clearSecrets };
  }
}

export function selectSmsProvider(draft: SmsServerDraft, type: SmsProviderType): SmsServerDraft {
  if (type === draft.type) return draft;
  return { ...draft, type, configuredSecrets: [], clearSecrets: [] };
}

export function setSmsSecretCleared(draft: SmsServerDraft, secret: SmsSecret, cleared: boolean): SmsServerDraft {
  const ownsSecret = smsProviderFieldContracts[draft.type].some(field => field.secret && field.key === secret);
  if (!ownsSecret) return draft;
  const nextDraft = cleared ? updateSmsProviderField(draft, secret, '') : draft;
  return {
    ...nextDraft,
    clearSecrets: cleared
      ? [...new Set([...draft.clearSecrets, secret])]
      : draft.clearSecrets.filter(item => item !== secret)
  };
}
