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

import {
  smsProviderFieldContracts,
  type EmailServerPayload,
  type MessageServerReadFailure,
  type SmsProviderFieldContract,
  type SmsSecret,
  type SmsServerEvidence,
  type SmsServerPayload
} from '../model/message-server-contract';
import {
  MessageServerContractError,
  parseEmailEvidenceWire,
  parseSmsEvidenceWire,
  type SmsEvidenceWire
} from './message-server-schema';

export { smsProviderFieldContracts } from '../model/message-server-contract';
export type {
  EmailSecret,
  EmailServerConfig,
  EmailServerEvidence,
  EmailServerPayload,
  MessageServerReadFailure,
  SmsProviderFieldContract,
  SmsProviderType,
  SmsSecret,
  SmsServerConfig,
  SmsServerEvidence,
  SmsServerPayload
} from '../model/message-server-contract';
export { MessageServerContractError } from './message-server-schema';

export async function loadEmailServerConfig(signal?: AbortSignal) {
  const value = signal ? await apiMessageGet<unknown>('/api/config/email', { signal })
    : await apiMessageGet<unknown>('/api/config/email');
  return parseEmailEvidenceWire(value);
}

export async function loadSmsServerConfig(signal?: AbortSignal) {
  const value = signal ? await apiMessageGet<unknown>('/api/config/sms', { signal })
    : await apiMessageGet<unknown>('/api/config/sms');
  return mapSmsEvidence(parseSmsEvidenceWire(value));
}

export async function saveEmailServerConfig(payload: EmailServerPayload) {
  return parseEmailEvidenceWire(await apiMessagePost<unknown>('/api/config/email', payload));
}

export async function saveSmsServerConfig(payload: SmsServerPayload) {
  return mapSmsEvidence(parseSmsEvidenceWire(await apiMessagePost<unknown>('/api/config/sms', payload)));
}

export function classifyMessageServerReadError(error: unknown): MessageServerReadFailure {
  if (error instanceof MessageServerContractError) return 'invalid';
  if (error instanceof ApiMessageError && (error.status === undefined || error.status >= 500)) return 'unavailable';
  return 'error';
}

function mapSmsEvidence(evidence: SmsEvidenceWire): SmsServerEvidence {
  if (evidence.status === 'missing') return evidence;

  const fields = smsProviderFieldContracts[evidence.config.type];
  return {
    status: 'configured',
    config: {
      enable: evidence.config.enable,
      type: evidence.config.type,
      options: mapSmsOptions(evidence.config.options, fields),
      configuredSecrets: mapSmsSecrets(evidence.config.configuredSecrets, fields)
    }
  };
}

function mapSmsOptions(
  options: Record<string, unknown>,
  fields: readonly SmsProviderFieldContract[]
): Record<string, string> {
  const optionFields = fields.filter(field => !field.secret);
  const expectedKeys = new Set(optionFields.map(field => field.key));
  const actualKeys = Object.keys(options);
  if (actualKeys.length !== expectedKeys.size || actualKeys.some(key => !expectedKeys.has(key))) {
    throw new MessageServerContractError('SMS option fields do not match the selected provider');
  }
  return Object.fromEntries(optionFields.map(field => [field.key, mapSmsOption(field, options[field.key])]));
}

function mapSmsOption(field: SmsProviderFieldContract, value: unknown): string {
  if (field.kind === 'authMode') {
    if (value !== 'simple' && value !== 'hmac') {
      throw new MessageServerContractError('Invalid UniSMS authentication mode');
    }
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new MessageServerContractError(`SMS option ${field.key} must be nonempty text`);
  }
  return value;
}

function mapSmsSecrets(
  secrets: string[],
  fields: readonly SmsProviderFieldContract[]
): SmsSecret[] {
  const allowedSecrets = new Set(fields.filter(field => field.secret).map(field => field.key));
  return secrets.map(secret => {
    if (!allowedSecrets.has(secret)) {
      throw new MessageServerContractError('Configured SMS secrets do not match the selected provider');
    }
    return secret as SmsSecret;
  });
}
