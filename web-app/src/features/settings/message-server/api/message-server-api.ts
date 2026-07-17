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

import { ApiMessageError, apiMessageGet, apiMessagePost } from '@/core/http/api-message';

export type EmailSecret = 'emailPassword';
export type SmsProviderType = 'tencent' | 'alibaba' | 'unisms' | 'smslocal' | 'aws' | 'twilio';
export type SmsSecret = 'secretId' | 'secretKey' | 'accessKeySecret' | 'apiKey' | 'authToken';
export type SmsProviderFieldContract = {
  key: string;
  secret: boolean;
  kind?: 'authMode';
};

export const smsProviderFieldContracts: Record<SmsProviderType, readonly SmsProviderFieldContract[]> = {
  tencent: [secret('secretId'), secret('secretKey'), field('appId'), field('signName'), field('templateId')],
  alibaba: [field('accessKeyId'), secret('accessKeySecret'), field('signName'), field('templateCode')],
  unisms: [field('accessKeyId'), field('authMode', 'authMode'), secret('accessKeySecret'), field('signature'),
    field('templateId')],
  smslocal: [secret('apiKey')],
  aws: [field('accessKeyId'), secret('accessKeySecret'), field('region')],
  twilio: [field('accountSid'), secret('authToken'), field('twilioPhoneNumber')]
};

export type EmailServerConfig = {
  type: number;
  emailHost: string;
  emailUsername: string;
  emailPort: number;
  emailSsl: boolean;
  emailStarttls: boolean;
  enable: boolean;
  configuredSecrets: EmailSecret[];
};

export type EmailServerPayload = Omit<EmailServerConfig, 'configuredSecrets'> & {
  emailPassword?: string;
  clearSecrets?: EmailSecret[];
};

export type SmsServerConfig = {
  enable: boolean;
  type: SmsProviderType;
  options: Record<string, string>;
  configuredSecrets: SmsSecret[];
};

export type SmsServerPayload = Omit<SmsServerConfig, 'configuredSecrets'> & {
  clearSecrets?: SmsSecret[];
};

export type EmailServerEvidence =
  | { status: 'configured'; config: EmailServerConfig }
  | { status: 'missing'; config: null };
export type SmsServerEvidence =
  | { status: 'configured'; config: SmsServerConfig }
  | { status: 'missing'; config: null };
export type MessageServerReadFailure = 'unavailable' | 'error' | 'invalid';

export class MessageServerContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageServerContractError';
  }
}

export async function loadEmailServerConfig(signal?: AbortSignal) {
  const value = signal ? await apiMessageGet<unknown>('/api/config/email', { signal })
    : await apiMessageGet<unknown>('/api/config/email');
  return parseEmailEvidence(value);
}

export async function loadSmsServerConfig(signal?: AbortSignal) {
  const value = signal ? await apiMessageGet<unknown>('/api/config/sms', { signal })
    : await apiMessageGet<unknown>('/api/config/sms');
  return parseSmsEvidence(value);
}

export async function saveEmailServerConfig(payload: EmailServerPayload) {
  return parseEmailEvidence(await apiMessagePost<unknown>('/api/config/email', payload));
}

export async function saveSmsServerConfig(payload: SmsServerPayload) {
  return parseSmsEvidence(await apiMessagePost<unknown>('/api/config/sms', payload));
}

export function classifyMessageServerReadError(error: unknown): MessageServerReadFailure {
  if (error instanceof MessageServerContractError) return 'invalid';
  if (error instanceof ApiMessageError && (error.status === undefined || error.status >= 500)) return 'unavailable';
  return 'error';
}

function parseEmailEvidence(value: unknown): EmailServerEvidence {
  const evidence = exactRecord(value, ['status', 'config'], 'email evidence');
  if (evidence.status === 'missing') {
    if (evidence.config !== null) throw contract('missing email config must be null');
    return { status: 'missing', config: null };
  }
  if (evidence.status !== 'configured') throw contract('invalid email status');
  const config = exactRecord(evidence.config, ['type', 'emailHost', 'emailUsername', 'emailPort', 'emailSsl',
    'emailStarttls', 'enable', 'configuredSecrets'], 'email config');
  const parsed: EmailServerConfig = {
    type: integer(config.type, 'email type'),
    emailHost: nonemptyString(config.emailHost, 'email host'),
    emailUsername: nonemptyString(config.emailUsername, 'email username'),
    emailPort: port(config.emailPort),
    emailSsl: boolean(config.emailSsl, 'email ssl'),
    emailStarttls: boolean(config.emailStarttls, 'email starttls'),
    enable: boolean(config.enable, 'email enable'),
    configuredSecrets: secretList(config.configuredSecrets, ['emailPassword'], 'email configured secrets')
  };
  return { status: 'configured', config: parsed };
}

function parseSmsEvidence(value: unknown): SmsServerEvidence {
  const evidence = exactRecord(value, ['status', 'config'], 'sms evidence');
  if (evidence.status === 'missing') {
    if (evidence.config !== null) throw contract('missing sms config must be null');
    return { status: 'missing', config: null };
  }
  if (evidence.status !== 'configured') throw contract('invalid sms status');
  const config = exactRecord(evidence.config, ['enable', 'type', 'options', 'configuredSecrets'], 'sms config');
  const type = smsProvider(config.type);
  const fields = smsProviderFieldContracts[type];
  const optionFields = fields.filter(item => !item.secret);
  const options = exactRecord(config.options, optionFields.map(item => item.key), 'sms options');
  const parsedOptions = Object.fromEntries(optionFields.map(item => [item.key,
    item.kind === 'authMode' ? authMode(options[item.key]) : nonemptyString(options[item.key], `sms ${item.key}`)]));
  const allowedSecrets = fields.filter(item => item.secret).map(item => item.key) as SmsSecret[];
  const configuredSecrets = secretList(config.configuredSecrets, allowedSecrets, 'sms configured secrets');
  return { status: 'configured', config: {
    enable: boolean(config.enable, 'sms enable'), type, options: parsedOptions, configuredSecrets
  } };
}

function field(key: string, kind?: 'authMode'): SmsProviderFieldContract {
  return kind ? { key, secret: false, kind } : { key, secret: false };
}

function secret(key: SmsSecret): SmsProviderFieldContract {
  return { key, secret: true };
}

function exactRecord(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw contract(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) {
    throw contract(`${label} fields do not match the contract`);
  }
  return record;
}

function nonemptyString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw contract(`${label} must be a nonempty string`);
  return value;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw contract(`${label} must be boolean`);
  return value;
}

function integer(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw contract(`${label} must be an integer`);
  return value;
}

function port(value: unknown) {
  const parsed = integer(value, 'email port');
  if (parsed < 1 || parsed > 65_535) throw contract('email port is out of range');
  return parsed;
}

function smsProvider(value: unknown): SmsProviderType {
  if (typeof value === 'string' && value in smsProviderFieldContracts) return value as SmsProviderType;
  throw contract('unsupported sms provider');
}

function authMode(value: unknown) {
  if (value === 'simple' || value === 'hmac') return value;
  throw contract('invalid UniSMS authentication mode');
}

function secretList<T extends string>(value: unknown, allowed: readonly T[], label: string): T[] {
  if (!Array.isArray(value)) throw contract(`${label} is invalid`);
  const result = value.map(item => {
    if (typeof item !== 'string' || !allowed.includes(item as T)) throw contract(`${label} is invalid`);
    return item as T;
  });
  if (new Set(result).size !== result.length) throw contract(`${label} must be unique`);
  return result;
}

function contract(message: string) {
  return new MessageServerContractError(message);
}
