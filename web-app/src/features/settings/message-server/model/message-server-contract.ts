/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type EmailSecret = 'emailPassword';
export type SmsProviderType = 'tencent' | 'alibaba' | 'unisms' | 'smslocal' | 'aws' | 'twilio';
export type SmsSecret = 'secretId' | 'secretKey' | 'accessKeySecret' | 'apiKey' | 'authToken';

export type SmsProviderFieldContract = {
  key: string;
  secret: boolean;
  kind?: 'authMode';
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

export const smsProviderFieldContracts: Record<SmsProviderType, readonly SmsProviderFieldContract[]> = {
  tencent: [secret('secretId'), secret('secretKey'), field('appId'), field('signName'), field('templateId')],
  alibaba: [field('accessKeyId'), secret('accessKeySecret'), field('signName'), field('templateCode')],
  unisms: [field('accessKeyId'), field('authMode', 'authMode'), secret('accessKeySecret'), field('signature'),
    field('templateId')],
  smslocal: [secret('apiKey')],
  aws: [field('accessKeyId'), secret('accessKeySecret'), field('region')],
  twilio: [field('accountSid'), secret('authToken'), field('twilioPhoneNumber')]
};

function field(key: string, kind?: 'authMode'): SmsProviderFieldContract {
  return kind ? { key, secret: false, kind } : { key, secret: false };
}

function secret(key: SmsSecret): SmsProviderFieldContract {
  return { key, secret: true };
}
