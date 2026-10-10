/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type EmailSecret = 'emailPassword';
export const smsProviderTypes = ['tencent', 'alibaba', 'smslocal', 'aws', 'twilio'] as const;
export type SmsProviderType = (typeof smsProviderTypes)[number];
export const smsSecrets = ['secretId', 'secretKey', 'accessKeySecret', 'apiKey', 'authToken'] as const;
export type SmsSecret = (typeof smsSecrets)[number];

export type SmsProviderFieldContract = { key: SmsSecret; secret: true } | { key: string; secret: false };

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
  | { status: 'configured'; revision: string; config: EmailServerConfig }
  | { status: 'missing'; revision: 'missing'; config: null };
export type SmsServerEvidence =
  | { status: 'configured'; revision: string; config: SmsServerConfig }
  | { status: 'missing'; revision: 'missing'; config: null };
export type MessageServerReadFailure = 'permission' | 'unavailable' | 'error' | 'invalid';

export const smsProviderFieldContracts: Record<SmsProviderType, readonly SmsProviderFieldContract[]> = {
  tencent: [secret('secretId'), secret('secretKey'), field('appId'), field('signName'), field('templateId')],
  alibaba: [field('accessKeyId'), secret('accessKeySecret'), field('signName'), field('templateCode')],
  smslocal: [secret('apiKey')],
  aws: [field('accessKeyId'), secret('accessKeySecret'), field('region')],
  twilio: [field('accountSid'), secret('authToken'), field('twilioPhoneNumber')]
};

function field(key: string): SmsProviderFieldContract {
  return { key, secret: false };
}

function secret(key: SmsSecret): SmsProviderFieldContract {
  return { key, secret: true };
}
